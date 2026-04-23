import type { InputJsonValue } from "@prisma/client/runtime/library";
import {
    type Chain,
    type ProcessedTransaction,
    TransactionType,
    type User,
} from "@prisma/client";
import { PointService } from "../point";
import { prisma } from "../prisma";
import { UserService } from "../user";
import { getSubgraphLatestBlockNumber } from "./constants";
import {
    fetchNewLiquidity,
    type INewMintOrBurnOperationData,
} from "./provide-liquidity";
import { fetchNewSwaps, type INewSwapData } from "./swaps";

type GraphqlTransactionPayload = {
    txHash: string;
    eventType: TransactionType;
    blockNumber: bigint;
    from: string;
    to: string;
    token0: string;
    token1?: string | null;
    token0Amount: number;
    token1Amount?: number | null;
    userId?: number | null;
    metadata?: InputJsonValue;
};

type LiquidityActionType = "MINT" | "BURN";

export class GraphQLEventIndexer {
    private static singleInstance: GraphQLEventIndexer;
    private readonly pointService = PointService.get();
    private readonly userService = UserService.get();
    private readonly chainId = Number.parseInt(
        process.env.CHAIN_ID || "10143",
        10
    );
    private readonly batchSize = Number.parseInt(
        process.env.GRAPHQL_INDEXER_BATCH_SIZE ||
            process.env.BATCH_SIZE ||
            "1000",
        10
    );
    private readonly maxBatchSteps = Number.parseInt(
        process.env.MAX_BATCH_STEPS || "10",
        10
    );
    private readonly startFromBlock =
        process.env.START_BLOCK?.trim().length &&
        +process.env.START_BLOCK >= 0
            ? BigInt(process.env.START_BLOCK)
            : undefined;

    private alreadyListening = false;
    private _defaultChain: Chain | null = null;

    static get() {
        if (GraphQLEventIndexer.singleInstance) {
            return GraphQLEventIndexer.singleInstance;
        }
        return new GraphQLEventIndexer();
    }

    private constructor() {
        if (GraphQLEventIndexer.singleInstance) {
            return GraphQLEventIndexer.singleInstance;
        }
        GraphQLEventIndexer.singleInstance = this;
    }

    lock() {
        this.alreadyListening = true;
    }

    unlock() {
        this.alreadyListening = false;
    }

    async listen() {
        if (this.alreadyListening) {
            return;
        }
        if (!process.env.GRAPHQL_ENDPOINT?.trim().length) {
            throw new Error(
                "GRAPHQL_ENDPOINT is not set while GraphQL indexer is enabled."
            );
        }

        console.log("GraphQL indexer next round started...");
        this.lock();
        try {
            const untilBlock = await getSubgraphLatestBlockNumber();
            if (untilBlock == null) {
                console.warn(
                    "GraphQL indexer skipped: subgraph latest block is unavailable."
                );
                return;
            }

            const lastSwapBlock = await this.checkoutSwapEvents(untilBlock);
            const lastMintBurnBlock =
                await this.checkoutLiquidityEvents(untilBlock);
            await this.updateLastIndexedBlock(
                lastSwapBlock < lastMintBurnBlock
                    ? lastSwapBlock
                    : lastMintBurnBlock
            );
        } catch (error) {
            console.error("GraphQL listener failed on this round:", error);
        } finally {
            this.unlock();
        }
    }

    private async getDefaultChain() {
        if (this._defaultChain) {
            return this._defaultChain;
        }
        this._defaultChain = await prisma.chain.findFirst({
            where: { id: this.chainId },
        });
        if (!this._defaultChain) {
            throw new Error(
                `Chain#${this.chainId} is missing in DB; seed/create it before using GraphQL indexer.`
            );
        }
        return this._defaultChain;
    }

    private async getInitialBlock(untilBlock: bigint) {
        const chain = await this.getDefaultChain();
        return chain.lastIndexedBlock ?? this.startFromBlock ?? untilBlock;
    }

    private async updateLastIndexedBlock(blockNumber: bigint) {
        const chain = await this.getDefaultChain();
        chain.lastIndexedBlock = blockNumber;
        await prisma.chain.update({
            where: { id: chain.id },
            data: { lastIndexedBlock: blockNumber },
        });
    }

    private async findUserByAddress(address: string) {
        try {
            const { user } =
                await this.userService.findOrCreateUserByAddress(address);
            return user;
        } catch (error) {
            console.error(
                `GraphQL indexer failed creating/finding user by address "${address}":`,
                error
            );
            return null;
        }
    }

    private async markTransactionProcessed({
        txHash,
        eventType,
        blockNumber,
        from,
        to,
        token0,
        token1 = null,
        token0Amount,
        token1Amount = null,
        userId = null,
        metadata = undefined,
    }: GraphqlTransactionPayload) {
        const tx = await prisma.processedTransaction.findFirst({
            where: { hash: txHash, type: eventType },
        });

        if (!tx) {
            const newTx = await prisma.processedTransaction.create({
                data: {
                    hash: txHash,
                    type: eventType,
                    blockNumber,
                    from,
                    to,
                    token0,
                    token1,
                    token0Amount,
                    token1Amount,
                    processedAt: new Date(),
                    userId,
                    chainId: this.chainId,
                    metadata,
                },
            });
            return { tx: newTx, alreadyProcessed: false };
        }

        if (tx.processedAt) {
            return { tx, alreadyProcessed: true };
        }

        const updatedTx = await prisma.processedTransaction.update({
            where: { id: tx.id },
            data: {
                from,
                to,
                token0,
                token1,
                token0Amount,
                token1Amount,
                processedAt: new Date(),
                userId,
                metadata: metadata ?? (tx.metadata as InputJsonValue),
            },
        });
        return { tx: updatedTx, alreadyProcessed: false };
    }

    private async processNewIndexedEvent(
        tx: ProcessedTransaction,
        user?: User | null
    ) {
        if (!user) {
            return;
        }
        await Promise.all([
            this.pointService.update(user, tx),
            prisma.processedTransaction.update({
                data: { userId: user.id },
                where: { id: tx.id },
            }),
        ]);
    }

    private async processSwapEvent(swap: INewSwapData) {
        const user = await this.findUserByAddress(swap.from);
        const { tx, alreadyProcessed } = await this.markTransactionProcessed({
            txHash: swap.transaction.id,
            eventType: TransactionType.SWAP,
            blockNumber: swap.blockNumber,
            from: swap.from,
            to: swap.to,
            token0: swap.pair.token0.symbol,
            token1: swap.pair.token1.symbol,
            token0Amount: swap.amount0In - swap.amount0Out,
            token1Amount: swap.amount1In - swap.amount1Out,
            userId: user?.id,
            metadata: {
                provider: "graphql",
                pairId: swap.pair.id,
                timestamp: swap.timestamp,
                rawAmounts: {
                    amount0In: swap.amount0In,
                    amount0Out: swap.amount0Out,
                    amount1In: swap.amount1In,
                    amount1Out: swap.amount1Out,
                },
            },
        });

        if (!alreadyProcessed) {
            await this.processNewIndexedEvent(tx, user);
        }
    }

    private async processLiquidityEvent(
        action: LiquidityActionType,
        event: INewMintOrBurnOperationData
    ) {
        const user = await this.findUserByAddress(event.sender);
        const sign = action === TransactionType.BURN ? -1 : 1;
        const { tx, alreadyProcessed } = await this.markTransactionProcessed({
            txHash: event.transaction.id,
            eventType: action,
            blockNumber: event.blockNumber,
            from: event.sender,
            to: event.to,
            token0: event.pair.token0.symbol,
            token1: event.pair.token1.symbol,
            token0Amount: sign * event.amount0,
            token1Amount: sign * event.amount1,
            userId: user?.id,
            metadata: {
                provider: "graphql",
                pairId: event.pair.id,
                timestamp: event.timestamp,
                action,
                rawAmounts: {
                    amount0: event.amount0,
                    amount1: event.amount1,
                },
            },
        });

        if (!alreadyProcessed) {
            await this.processNewIndexedEvent(tx, user);
        }
    }

    async checkoutSwapEvents(untilBlock: bigint) {
        let lastSuccessfullyIndexedBlock =
            await this.getInitialBlock(untilBlock);

        for (
            let step = 0;
            lastSuccessfullyIndexedBlock < untilBlock &&
            step < this.maxBatchSteps;
            step++
        ) {
            const swaps = await fetchNewSwaps({
                lastBlock: lastSuccessfullyIndexedBlock,
                first: this.batchSize,
            });

            const swapsInRange = swaps.filter(
                (swap) => swap.blockNumber <= untilBlock
            );
            if (!swapsInRange.length) {
                break;
            }

            let maxBlockInBatch = lastSuccessfullyIndexedBlock;
            for (const swap of swapsInRange) {
                await this.processSwapEvent(swap);
                if (swap.blockNumber > maxBlockInBatch) {
                    maxBlockInBatch = swap.blockNumber;
                }
            }

            if (maxBlockInBatch <= lastSuccessfullyIndexedBlock) {
                break;
            }

            lastSuccessfullyIndexedBlock = maxBlockInBatch;
            if (swaps.length < this.batchSize) {
                break;
            }
        }

        console.log(
            `GraphQL swap events were processed until block#${lastSuccessfullyIndexedBlock}.`
        );
        return lastSuccessfullyIndexedBlock;
    }

    async checkoutLiquidityEvents(untilBlock: bigint) {
        let lastSuccessfullyIndexedBlock =
            await this.getInitialBlock(untilBlock);

        for (
            let step = 0;
            lastSuccessfullyIndexedBlock < untilBlock &&
            step < this.maxBatchSteps;
            step++
        ) {
            const { mints, burns } = await fetchNewLiquidity({
                lastBlock: lastSuccessfullyIndexedBlock,
                first: this.batchSize,
            });

            const events: Array<{
                type: LiquidityActionType;
                data: INewMintOrBurnOperationData;
            }> = [
                ...mints
                    .filter((mint) => mint.blockNumber <= untilBlock)
                    .map((mint) => ({
                        type: TransactionType.MINT,
                        data: mint,
                    })),
                ...burns
                    .filter((burn) => burn.blockNumber <= untilBlock)
                    .map((burn) => ({
                        type: TransactionType.BURN,
                        data: burn,
                    })),
            ].sort((a, b) => {
                if (a.data.blockNumber === b.data.blockNumber) {
                    return a.data.id.localeCompare(b.data.id);
                }
                return a.data.blockNumber < b.data.blockNumber ? -1 : 1;
            });

            if (!events.length) {
                break;
            }

            let maxBlockInBatch = lastSuccessfullyIndexedBlock;
            for (const event of events) {
                await this.processLiquidityEvent(event.type, event.data);
                if (event.data.blockNumber > maxBlockInBatch) {
                    maxBlockInBatch = event.data.blockNumber;
                }
            }

            if (maxBlockInBatch <= lastSuccessfullyIndexedBlock) {
                break;
            }

            lastSuccessfullyIndexedBlock = maxBlockInBatch;
            if (mints.length + burns.length < this.batchSize) {
                break;
            }
        }

        console.log(
            `GraphQL liquidity events were processed until block#${lastSuccessfullyIndexedBlock}.`
        );
        return lastSuccessfullyIndexedBlock;
    }
}

import {
    toBigInt,
    toNumber,
    type IPairTokenMinimalData,
    type IPairTokenSufficientData,
    type ITransactionMinimalData,
} from "./common";
import { tayaswapSubpgrah } from "./constants";
import { GET_NEW_SWAPS, GET_USER_SWAPS } from "./queries";

export interface ISwapOperation {
    id: string;
    pair: IPairTokenMinimalData;
    amount0In: number;
    amount0Out: number;
    amount1In: number;
    amount1Out: number;
    timestamp: number; // TODO: string, Date, ...
}

export interface ISwapQueryResult {
    swaps: ISwapOperation[];
}

export async function fetchUserSwaps(address: string) {
    const { swaps } = (await tayaswapSubpgrah(GET_USER_SWAPS, {
        address,
    })) as {
        swaps: Array<{
            id: string;
            pair: IPairTokenMinimalData;
            amount0In: string | number;
            amount0Out: string | number;
            amount1In: string | number;
            amount1Out: string | number;
            timestamp: string | number;
        }>;
    };
    return swaps.map((swap) => ({
        ...swap,
        amount0In: toNumber(swap.amount0In),
        amount0Out: toNumber(swap.amount0Out),
        amount1In: toNumber(swap.amount1In),
        amount1Out: toNumber(swap.amount1Out),
        timestamp: toNumber(swap.timestamp),
    }));
}

export interface INewSwapData extends ISwapOperation {
    pair: IPairTokenSufficientData;
    from: string;
    to: string;
    blockNumber: bigint;
    transaction: ITransactionMinimalData;
}

export interface INewSwapQueryResult {
    swaps: INewSwapData[];
}

export async function fetchNewSwaps({
    lastBlock,
    first = 1000,
}: {
    lastBlock: bigint;
    first?: number;
}): Promise<INewSwapData[]> {
    const { swaps } = (await tayaswapSubpgrah(GET_NEW_SWAPS, {
        lastBlock: lastBlock.toString(),
        first,
    })) as {
        swaps: Array<{
            id: string;
            from: string;
            to: string;
            amount0In: string | number;
            amount1In: string | number;
            amount0Out: string | number;
            amount1Out: string | number;
            blockNumber: string | number;
            timestamp: string | number;
            transaction: ITransactionMinimalData;
            pair: {
                id: string;
                token0: {
                    symbol: string;
                    decimals: string | number;
                };
                token1: {
                    symbol: string;
                    decimals: string | number;
                };
            };
        }>;
    };

    return swaps.map((swap) => ({
        ...swap,
        amount0In: toNumber(swap.amount0In),
        amount1In: toNumber(swap.amount1In),
        amount0Out: toNumber(swap.amount0Out),
        amount1Out: toNumber(swap.amount1Out),
        blockNumber: toBigInt(swap.blockNumber),
        timestamp: toNumber(swap.timestamp),
        pair: {
            id: swap.pair.id,
            token0: {
                symbol: swap.pair.token0.symbol,
                decimals: toNumber(swap.pair.token0.decimals),
            },
            token1: {
                symbol: swap.pair.token1.symbol,
                decimals: toNumber(swap.pair.token1.decimals),
            },
        },
    }));
}

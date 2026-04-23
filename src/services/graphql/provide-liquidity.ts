import {
    toBigInt,
    toNumber,
    type IPairTokenMinimalData,
    type IPairTokenSufficientData,
    type ITransactionMinimalData,
} from "./common";
import { tayaswapSubpgrah } from "./constants";
import { GET_NEW_LIQUIDITY, GET_USER_LIQUIDITY } from "./queries";

export interface IMintOrBurnOperation {
    id: string;
    pair: IPairTokenMinimalData;
    amount0: number;
    amount1: number;
    timestamp: number; // TODO: string, Date, ...
}

export interface ILiquidityProvisionQueryResult {
    mints: IMintOrBurnOperation[];
    burns: IMintOrBurnOperation[];
}

export async function fetchUserLiquidityProvisions(address: string) {
    const { mints, burns } = (await tayaswapSubpgrah(GET_USER_LIQUIDITY, {
        address,
    })) as {
        mints: Array<{
            id: string;
            pair: IPairTokenMinimalData;
            amount0: string | number;
            amount1: string | number;
            timestamp: string | number;
        }>;
        burns: Array<{
            id: string;
            pair: IPairTokenMinimalData;
            amount0: string | number;
            amount1: string | number;
            timestamp: string | number;
        }>;
    };

    return {
        mints: mints.map((mint) => ({
            ...mint,
            amount0: toNumber(mint.amount0),
            amount1: toNumber(mint.amount1),
            timestamp: toNumber(mint.timestamp),
        })),
        burns: burns.map((burn) => ({
            ...burn,
            amount0: toNumber(burn.amount0),
            amount1: toNumber(burn.amount1),
            timestamp: toNumber(burn.timestamp),
        })),
    };
}

export interface INewMintOrBurnOperationData extends IMintOrBurnOperation {
  pair: IPairTokenSufficientData;
  sender: string;
  to: string;
  blockNumber: bigint;
  transaction: ITransactionMinimalData;
}

export interface INewLiquidityProvisionQueryResult {
    mints: INewMintOrBurnOperationData[];
    burns: INewMintOrBurnOperationData[];
}

export async function fetchNewLiquidity({
    lastBlock,
    first = 1000,
}: {
    lastBlock: bigint;
    first?: number;
}): Promise<INewLiquidityProvisionQueryResult> {
    const { mints, burns } = (await tayaswapSubpgrah(GET_NEW_LIQUIDITY, {
        lastBlock: lastBlock.toString(),
        first,
    })) as {
        mints: Array<{
            id: string;
            sender: string;
            to: string;
            amount0: string | number;
            amount1: string | number;
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
        burns: Array<{
            id: string;
            sender: string;
            to: string;
            amount0: string | number;
            amount1: string | number;
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

    return {
        mints: mints.map((mint) => ({
            ...mint,
            amount0: toNumber(mint.amount0),
            amount1: toNumber(mint.amount1),
            blockNumber: toBigInt(mint.blockNumber),
            timestamp: toNumber(mint.timestamp),
            pair: {
                id: mint.pair.id,
                token0: {
                    symbol: mint.pair.token0.symbol,
                    decimals: toNumber(mint.pair.token0.decimals),
                },
                token1: {
                    symbol: mint.pair.token1.symbol,
                    decimals: toNumber(mint.pair.token1.decimals),
                },
            },
        })),
        burns: burns.map((burn) => ({
            ...burn,
            amount0: toNumber(burn.amount0),
            amount1: toNumber(burn.amount1),
            blockNumber: toBigInt(burn.blockNumber),
            timestamp: toNumber(burn.timestamp),
            pair: {
                id: burn.pair.id,
                token0: {
                    symbol: burn.pair.token0.symbol,
                    decimals: toNumber(burn.pair.token0.decimals),
                },
                token1: {
                    symbol: burn.pair.token1.symbol,
                    decimals: toNumber(burn.pair.token1.decimals),
                },
            },
        })),
    };
}

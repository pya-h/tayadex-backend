export interface ISingleTokenMinimalData {
    symbol: string;
}

export interface ISingleTokenSufficientData extends ISingleTokenMinimalData {
    decimals: number;
}
export interface IPairTokenMinimalData {
    id: string;
    token0: ISingleTokenMinimalData;
    token1: ISingleTokenMinimalData;
}

export interface IPairTokenSufficientData {
    id: string;
    token0: ISingleTokenSufficientData;
    token1: ISingleTokenSufficientData;
}

export interface ISingleTokenData extends ISingleTokenSufficientData {
    id: string;
    name: string;
}

export interface IPairTokenData {
    id: string;
    reserve0: string;
    reserve1: string;
    token0: ISingleTokenData;
    token1: ISingleTokenData;
    totalSupply: string;
    volumeUSD: string;
    reserveUSD: string;
}

export interface ITransactionMinimalData {
    id: string; // tx hash in subgraph entities
}

export type GraphNumberish = string | number | bigint | null | undefined;

export const toBigInt = (
    value: GraphNumberish,
    fallback: bigint = 0n
): bigint => {
    if (typeof value === "bigint") {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return BigInt(Math.trunc(value));
    }
    if (typeof value === "string" && value.trim().length) {
        try {
            return BigInt(value.trim());
        } catch {
            return fallback;
        }
    }
    return fallback;
};

export const toNumber = (
    value: GraphNumberish,
    fallback: number = 0
): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "string" && value.trim().length) {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

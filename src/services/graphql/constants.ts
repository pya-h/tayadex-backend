import request, { type RequestDocument } from "graphql-request";
import { GET_SUBGRAPH_META } from "./queries";
import { toBigInt } from "./common";

export async function tayaswapSubpgrah(query: RequestDocument, variables = {}) {
    if (!process.env.GRAPHQL_ENDPOINT) {
        throw new Error("GRAPHQL_ENDPOINT is not set");
    }
    return await request(process.env.GRAPHQL_ENDPOINT, query, variables);
}

export async function getSubgraphLatestBlockNumber() {
    const data = (await tayaswapSubpgrah(GET_SUBGRAPH_META, {})) as {
        _meta?: {
            block?: {
                number?: string | number;
            };
        };
    };

    const blockNumber = data?._meta?.block?.number;
    if (blockNumber == null) {
        return null;
    }
    return toBigInt(blockNumber, 0n);
}

export const POOLS_CACHE_KEY = "pools";

export const POOLS_CACHE = 300; // 5 minutes

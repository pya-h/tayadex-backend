import { serve } from "@hono/node-server";
import cron from "node-cron";
import { CacheService, EventIndexer, GraphQLEventIndexer } from "@/services";
import app from "./app";

const port = Number.parseInt(process.env.PORT || "3000", 10);

const indexerProvider = (
    process.env.INDEXER_PROVIDER || "direct"
).toLowerCase();
const indexerInterval = +(process.env.INDEXER_INTERVAL ?? 0);
if (indexerInterval > 0) {
    const eventIndexerService =
        indexerProvider === "graphql"
            ? GraphQLEventIndexer.get()
            : EventIndexer.get();
    const secondsInterval = Math.max(1, Math.min(59, indexerInterval));
    // Schedule the cron job to run based on interval
    cron.schedule(`*/${secondsInterval} * * * * *`, () => {
        eventIndexerService.listen().catch((error) => {
            console.error("Event indexer failed:", error);
        });
    });
}

const cacheService = CacheService.getStore();

cron.schedule("*/5 * * * *", () => {
    console.log('Cleaning up cache for reassurance...')
    cacheService.cleanup();
});

console.log(`Server is running on port ${port}`);
console.log(`Indexer provider: ${indexerProvider}`);

serve({
    fetch: app.fetch,
    port,
});

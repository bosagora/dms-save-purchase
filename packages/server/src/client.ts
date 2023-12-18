import * as dotenv from "dotenv";
import { RollupClientScheduler } from "./client/ClientScheduler";

dotenv.config({ path: "env/.env.client" });

async function clientMain() {
    const scheduler = new RollupClientScheduler();
    await scheduler.start();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
clientMain().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

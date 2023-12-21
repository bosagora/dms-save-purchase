import * as fs from "fs";
async function main() {
    const records = [];
    for (let idx = 0; idx < 1000; idx++) {
        const productId = "PD" + idx.toString().padStart(6, "0");
        const amount = Math.floor(Math.random() * 100) * 100;
        const providerPercent = Math.floor(Math.random() * 100) / 10;

        records.push({
            productId,
            amount,
            providerPercent,
        });
    }
    fs.writeFileSync("./src/client/data/products.json", JSON.stringify(records), "utf8");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

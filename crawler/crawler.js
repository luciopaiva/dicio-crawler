
const db = require("./db");

/** @returns {void} */
async function run() {
    console.info("Connecting...");
    await db.connect();
    console.info("Connected.");

    await db.removeAllOpenWords();

    console.info(await db.getOpenWords());
    await db.addOpenWords("cadeira");
    console.info(await db.getOpenWords());
    await db.addOpenWords("mesa", "sofá");
    console.info(await db.getOpenWords());

    await db.close();
    console.info("Done.");
}

run();

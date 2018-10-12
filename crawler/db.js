
const sqlite3 = require("sqlite3").verbose();

const INSERTION_BATCH_SIZE = 100;

let db;

function sync(cmd) {
    return new Promise((resolve, reject) => cmd((err, ...result) => err ? reject(err) : resolve(...result)));
}

async function runSync(...query) {
    return await sync(db.run.bind(db, ...query));
}

async function connect() {
    await new Promise((resolve, reject) => {
        db = new sqlite3.Database(__dirname + "/../dicionario.db", err => err ? reject(err) : resolve());
    });
    await runSync("create table if not exists words (word text not null unique, definition text, url text)");
    await runSync("create table if not exists open_urls (url text not null unique)");
}

function close() {
    return new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
}

async function getVisitedUrls() {
    const sql = `select url from words`;
    const rows = await sync(db.all.bind(db, sql, []));
    return rows.map(row => row["url"]);
}

async function getOpenUrls() {
    const sql = `select url from open_urls`;
    const rows = await sync(db.all.bind(db, sql, []));
    return rows.map(row => row["url"]);
}

async function addOpenUrls(allUrls) {
    for (let i = 0; i < allUrls.length; i += INSERTION_BATCH_SIZE) {  // to avoid SQLITE_ERROR: too many SQL variables
        const urls = allUrls.slice(i, i + INSERTION_BATCH_SIZE);
        const values = Array.from(Array(urls.length), () => "(?)").join(",");
        await runSync(`insert or ignore into open_urls (url) values ${values}`, urls);
    }
}

async function removeAllOpenUrls() {
    return await runSync("delete from open_urls");
}

async function addWord(word, definition, url) {
    return await runSync(`insert or ignore into words (word, definition, url) values (?, ?, ?)`, word, definition, url);
}

module.exports = {
    connect,
    close,
    getOpenUrls,
    addOpenUrls,
    removeAllOpenUrls,
    addWord,
    getVisitedUrls,
};

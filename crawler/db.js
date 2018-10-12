
const sqlite3 = require("sqlite3").verbose();

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
    await runSync("create table if not exists open_words (word text not null unique)");
}

function close() {
    return new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
}

async function getOpenWords() {
    const sql = `select word from open_words`;
    const rows = await sync(db.all.bind(db, sql, []));
    return rows.map(row => row["word"]);
}

async function addOpenWords(...words) {
    const values = Array.from(Array(words.length), () => "(?)").join(",");
    return await runSync(`insert or ignore into open_words (word) values ${values}`, words);
}

async function removeAllOpenWords() {
    return await runSync("delete from open_words");
}

module.exports = {
    connect,
    close,
    getOpenWords,
    addOpenWords,
    removeAllOpenWords,
};

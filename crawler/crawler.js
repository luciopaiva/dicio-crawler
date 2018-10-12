
const
    db = require("./db"),
    Throttler = require("./throttler"),
    DicioComBr = require("./bots/dicio-com-br");

const
    REPORT_PERIOD_IN_MILLIS = 5000,
    MAX_CONCURRENCY = 15,
    NUMBER_OF_REQUESTS_TO_MAKE = 1000;

class Crawler {

    constructor () {
        /** @type {Set<String>} */
        this.visitedUrls = new Set();
        /** @type {Set<String>} */
        this.openUrls = new Set();

        this.throttler = new Throttler(MAX_CONCURRENCY, NUMBER_OF_REQUESTS_TO_MAKE);
        this.throttler.onDrain(this.close.bind(this));
        this.throttler.onMaxRunsReached(this.close.bind(this));

        this.crawler = new DicioComBr(MAX_CONCURRENCY);
        this.reportIntervalTimer = setInterval(this.reportMetrics.bind(this), REPORT_PERIOD_IN_MILLIS);
    }

    reportMetrics() {
        console.info(`Metrics> current-requests:${this.crawler.getNumberOfOngoingRequests()}`);
    }

    async getOpenUrls() {
        console.info("Fetching list of open URLs...");
        const urlQueue = await db.getOpenUrls();

        if (urlQueue.length === 0) {
            // list of words to start from
            urlQueue.push("/cadeira/", "/mesa/", "/carro/", "/macaco/", "/pessoa/", "/livro/", "/computador/");
        }

        this.openUrls = new Set(urlQueue);
    }

    /**
     * @param {String} url
     * @returns {Promise<void>}
     */
    async doUrl(url) {
        console.info(url);
        const {word, definition, urls} = await this.crawler.fetchWordUrl(url);
        this.visitedUrls.add(url);
        this.openUrls.delete(url);
        await db.addWord(word, definition, url);

        for (const url of urls) {
            if (!this.openUrls.has(url) && !this.visitedUrls.has(url)) {
                this.openUrls.add(url);
                this.throttler.offer(this.doUrl.bind(this, url));
            }
        }
    }

    /** @returns {void} */
    async run() {
        await db.connect();
        console.info("Connected to database.");

        this.visitedUrls = new Set(await db.getVisitedUrls());
        await this.getOpenUrls();
        await db.removeAllOpenUrls();

        for (const url of this.openUrls.values()) {
            this.throttler.offer(this.doUrl.bind(this, url));
        }
    }

    async close() {
        console.info("Closing crawler...");
        await db.addOpenUrls([...this.openUrls.values()]);  // save URLs still to visit
        await db.close();
        clearInterval(this.reportIntervalTimer);
        console.info("Done.");
    }
}

(new Crawler()).run();

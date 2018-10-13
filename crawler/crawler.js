
const
    chalk = require("chalk"),
    db = require("./db"),
    Throttler = require("./throttler"),
    DicioComBr = require("./bots/dicio-com-br");

const
    MAX_OPEN_URLS_TO_KEEP_IN_DB = 10000,
    MAX_OPEN_URLS_TO_KEEP_IN_MEMORY = 100000,
    REPORT_PERIOD_IN_MILLIS = 1000,
    MAX_CONCURRENCY = 25,
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
        this.previousTotalTasks = 0;

        this.crawler = new DicioComBr(MAX_CONCURRENCY);
        this.reportIntervalTimer = setInterval(this.reportMetrics.bind(this), REPORT_PERIOD_IN_MILLIS);
    }

    reportMetrics() {
        const metrics = [];
        metrics.push(`current-requests:${chalk.green(this.crawler.getNumberOfOngoingRequests())}`);
        metrics.push(`open:${chalk.green(this.openUrls.size)}`);
        metrics.push(`visited:${chalk.green(this.visitedUrls.size)}`);
        metrics.push(`total-completed-requests:${chalk.green(this.throttler.totalTasks)}`);
        metrics.push(`completed-requests-last-period:${chalk.green(this.throttler.totalTasks - this.previousTotalTasks)}`);
        this.previousTotalTasks = this.throttler.totalTasks;
        console.info(`Metrics> ${metrics.map(metric => chalk.yellow(metric)).join(" ")}`);
    }

    async getOpenUrls() {
        console.info("Fetching list of open URLs...");
        const urlQueue = await db.getOpenUrls();

        if (urlQueue.length === 0) {
            // list of words to start from
            urlQueue.push("/almoco/");  // ToDo replace with call to endpoint to fetch random word
        }

        this.openUrls = new Set(urlQueue);

        // make sure visited URLs do not appear among open ones
        let removedCount = 0;
        for (const url of this.visitedUrls.values()) {
            if (this.openUrls.delete(url)) removedCount++;
        }
        if (removedCount > 0) {
            console.info(`Removed ${removedCount} URLs from open set that were already visited.`);
        }
    }

    /**
     * @param {String} url
     * @returns {Promise<void>}
     */
    async doUrl(url) {
        const {word, definition, urls} = await this.crawler.fetchWordUrl(url);
        this.visitedUrls.add(url);
        this.openUrls.delete(url);
        await db.addWord(word, definition, url);

        for (const url of urls) {
            if (!this.openUrls.has(url) && !this.visitedUrls.has(url) && this.openUrls.size < MAX_OPEN_URLS_TO_KEEP_IN_MEMORY) {
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

        for (const url of this.openUrls.values()) {
            this.throttler.offer(this.doUrl.bind(this, url));
        }
    }

    async close() {
        this.throttler.close();
        clearInterval(this.reportIntervalTimer);
        console.info("Persisting open URLs... " + chalk.red("WAIT! This can take a while."));
        // remove all old open urls
        await db.removeAllOpenUrls();
        // introduce new ones. We're not saving all of them here since it would take forever to save all of them as the crawler database grows
        await db.addOpenUrls([...this.openUrls.values()].slice(0, MAX_OPEN_URLS_TO_KEEP_IN_DB));  // save URLs still to visit
        await db.close();
        console.info("Done.");
    }
}

(() => {
    const app = new Crawler();
    app.run();
    process.on("SIGINT", () => app.close());
})();

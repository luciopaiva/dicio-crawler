
const
    request = require("request-promise-native"),
    iconv = require("iconv-lite"),
    http = require("http"),
    https = require("https");

const MAX_CONCURRENCY = 15;

class HttpClient {

    /**
     * @param {Boolean} isHttps
     * @param {String} pageEncoding
     */
    constructor (isHttps, pageEncoding = "utf-8") {
        const Agent = (isHttps ? https : http).Agent;
        this.pageEncoding = pageEncoding;

        this.maximumConcurrentRequests = MAX_CONCURRENCY;
        this.numberOfOngoingRequests = 0;

        this.options = {
            agent: new Agent({ keepAlive: true, keepAliveMsecs: 10000, maxSockets: MAX_CONCURRENCY }),
            encoding: null,
        }
    }

    async fetchHtml(url) {
        this.numberOfOngoingRequests++;
        let result = null;
        try {
            result = iconv.decode(await request(url, this.options), this.pageEncoding);
        } catch (e) {
            console.error("Failed fetching url " + url);
            console.error(e);
        }
        this.numberOfOngoingRequests--;
        return result;
    }

    getAvailableSockets() {
        return Math.max(0, this.maximumConcurrentRequests - this.numberOfOngoingRequests);
    }
}

module.exports = HttpClient;

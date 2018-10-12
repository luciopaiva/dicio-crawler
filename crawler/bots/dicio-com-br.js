
const
    cheerio = require("cheerio"),
    HttpClient = require("../http-client");

const BASE_URL = "https://www.dicio.com.br";


class DicioComBr {

    constructor () {
        /** @type {Function[]} */
        this.pendingRequests = [];
        this.httpClient = new HttpClient(true, "ISO-8859-1");
    }

    getNumberOfOngoingRequests() {
        return this.httpClient.numberOfOngoingRequests;
    }

    hasPendingOrOngoingRequests() {
        return this.httpClient.numberOfOngoingRequests > 0 || this.pendingRequests.length > 0;
    }

    async waitForHttpClient() {
        if (this.httpClient.getAvailableSockets() === 0) {
            return new Promise(resolve => this.pendingRequests.push(resolve));
        }
        return Promise.resolve();
    }

    async fetchWordUrl(wordUrl) {
        const url = BASE_URL + wordUrl;
        const html = await this.httpClient.fetchHtml(url);

        while (this.pendingRequests.length > 0 && this.httpClient.getAvailableSockets() > 0) {
            const resolve = this.pendingRequests.pop();
            resolve();
        }

        const $ = cheerio.load(html);

        const word = this.extractWord($);
        const definition = this.extractDefinition($);
        const urls = this.extractLinkedWords($);

        return {word, definition, urls};
    }

    extractWord($) {
        return $('h1[itemprop="name"]').text();
    }

    extractDefinition($) {
        return $(`.sg-social`).attr("data-text");
    }

    extractLinkedWords($) {
        return $("#wrapper > .container a")
            .map((index, element) => {
                return element.attribs["href"];
                // let text = null;
                // for (const node of element.children) {
                //     if (node.type === "text") {
                //         text = node.data;
                //         break;
                //     }
                // }
                // return {href, text};
            })
            .get();
    }
}

module.exports = DicioComBr;

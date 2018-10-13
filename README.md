
# Dicionario

An experimental crawler for dicio.com.br. Makes throttled, concurrent requests and saves results to local sqlite database.

## License

You should use this only for educational purposes. Please see `LICENSE.md`. I am not involved with `dicio.com.br` in any way, so run it at your own risk.

## How to install and run the crawler

    nvm use
    npm install

## How the crawler works

Starting with some seed words (see `crawler.js::getOpenUrls()`), it crawls `dicio.com.br`, fetching each word's page, which in turn contains links to other words.

For each word, the crawler persists that word's definition and uses linked words found in the page to continue crawling the website (I call it "open URLs").

Whenever the crawler stops (be it because it was commanded to, via `crawler.js::NUMBER_OF_REQUESTS_TO_MAKE`, be it because the user hit Ctrl+C to stop the application), it persists the current list of open URLs to the database before terminating.

The list of open URLs has its size constrained by two limits: one in-memory and the other on the database. This is to prevent memory from being totally depleted and also to avoid increasingly big delays when saving data to the database. There's no need to keep huge amounts of open URLs anyway.

## Future improvements

Later I found out that dicio's mobile app uses a JSON API to fetch word definitions:

    https://www.dicio.com.br/api/indexv2.php?p=cadeira

And another one for synonyms:

    https://www.sinonimos.com.br/api/?method=getSinonimos&palavra=cadeira

An improvement would be to start using them instead of parsing HTML. One drawback is that we loose links to other words. Synonyms could be used, but we'd end up trapped in a subset of known words (e.g.: starting with "cadeira", you would probably never find "mesa" through its synonyms and their synonyms, and so on and so on.

const express = require('express');
const bodyParser = require('body-parser');
const booleanParser = require('express-query-boolean');
const numberParser = require('express-query-int');

const merge = require('pdf-merge');
const tmp = require('tmp');

const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.text({ type: 'text/html' }));
app.use(booleanParser());
app.use(numberParser());

async function print({ browser, htmlContents, options }) {
  const page = await browser.newPage();
  await page.setContent(htmlContents, { waitUntil: 'networkidle0' });
  return page.pdf(options);
}

function parseRequest(request) {
  const { groups: { filename } } = (request.query.filename || 'document').match(/^(?<filename>.+?)(?:\.pdf)?$/);
  return { filename, options: { format: 'a4', landscape: false, printBackground: true, ...request.query, path: null } }; // discard potential `path` parameter
}

export function use(puppeteer) {
  function launchBrowser() {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  app.post('/', async (request, response) => {
    const browser = await launchBrowser();
    const { filename, options } = parseRequest(request);
    const res = await print({ htmlContents: request.body, browser, options });
    await browser.close();
    response.attachment(`${filename}.pdf`).send(res);
  });

  app.post('/multiple', async (request, response) => {
    const browser = await launchBrowser();
    const { filename, options } = parseRequest(request);
    const files = await Promise.all(request.body.pages.map(htmlContents => {
      const { name: path, removeCallback: rm } = tmp.fileSync();
      return print({ htmlContents, browser, options: { ...options, path: path } }).then(() => ({ path, rm }));
    }));

    const res = await merge(files.map(({ path }) => path), { oupput: 'Stream' });
    files.forEach(({ rm }) => rm());
    await browser.close();
    response.attachment(`${filename}.pdf`).send(res);
  });

  app.use((err, _, response) => {
    response.status(500).send(err);
  });

  app.listen(port, (err) => {
    if (err) {
      return console.error('ERROR: ', err);
    }

    console.log(`HTML to PDF converter listening on port: ${port}`);
  });
}

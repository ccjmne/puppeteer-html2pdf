const express = require('express');
const bodyParser = require('body-parser');
const booleanParser = require('express-query-boolean');
const numberParser = require('express-query-int');
const cors = require('cors');

const pdf = require('pdfjs');
const tmp = require('tmp');

const app = express();
const port = 3000;

const limit = process.env.BODY_LIMIT || '1mb';

app.use(express.json({ limit }));
app.use(bodyParser.text({ type: 'text/html', limit }));
app.use(booleanParser());
app.use(numberParser());

async function print({ browser, htmlContents, options }) {
  const page = await browser.newPage();
  await page.setContent(htmlContents, { waitUntil: 'networkidle0' });
  return page.pdf(options);
}

function parseRequest(request) {
  return {
    filename: (request.query.filename || 'document').replace(/(\.pdf)?$/, '.pdf'),                    // add .pdf extension if necessary
    options: { format: 'a4', landscape: false, printBackground: true, ...request.query, path: null }  // discard potential `path` parameter
  };
}

export function use(puppeteer) {
  function launchBrowser() {
    return puppeteer.launch({
      executablePath: 'chromium-browser',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  app.post('/', cors(), async (request, response) => {
    const browser = await launchBrowser();
    const { filename, options } = parseRequest(request);
    const res = await print({ htmlContents: request.body, browser, options });
    await browser.close();
    response.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(res);
  });

  app.post('/multiple', cors(), async (request, response) => {
    const browser = await launchBrowser();
    const { filename, options } = parseRequest(request);
    const files = await Promise.all(request.body.map(htmlContents => {
      const { name: path, removeCallback: rm } = tmp.fileSync();
      return print({ htmlContents, browser, options: { ...options, path: path } }).then(() => ({ path, rm }));
    }));

    const res = files.reduce((merged, { path, rm }) => {
      merged.addPagesOf(new pdf.ExternalDocument(fs.readFileSync(path)));
      rm();
      return merged;
    }, new pdf.Document());

    await browser.close();
    const buffer = await res.asBuffer();
    response.attachment(filename).send(buffer);
  });

  app.options('/*', cors());

  /**
   * Error-handling middleware always takes **four** arguments.
   *
   * You must provide four arguments to identify it as an error-handling middleware function.
   * Even if you don’t need to use the next object, you must specify it to maintain the signature.
   * Otherwise, the next object will be interpreted as regular middleware and will fail to handle errors.
   * For details about error-handling middleware, see: https://expressjs.com/en/guide/error-handling.html.
   */
  app.use((err, _, response, __) => {
    response.status(500).send(err.stack);
  });

  app.listen(port, (err) => {
    if (err) {
      return console.error('ERROR: ', err);
    }

    console.log(`HTML to PDF converter listening on port: ${port}`);
  });
}

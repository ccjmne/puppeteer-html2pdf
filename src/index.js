const express = require('express');
const booleanParser = require('express-query-boolean');
const numberParser = require('express-query-int');

const app = express();
const port = 3000;

app.use(express.json());
app.use(booleanParser());
app.use(numberParser());

module.exports = {
  async with(puppeteer) {
    app.post('/', async (request, response) => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(`data:text/html,${(request.body).page}`, { waitUntil: 'networkidle0' });

      const res = await page.pdf({ format: 'a4', landscape: false, printBackground: true, ...request.query });
      await browser.close();
      response.attachment(`${request.query.name || 'document'}.pdf`);
      response.send(res);
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
};

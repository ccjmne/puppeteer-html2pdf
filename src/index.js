import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import puppeteer from 'puppeteer-core'

import pdf from 'pdfjs'
import tmp from 'tmp'

const app = express()
const port = 3000

const limit = process.env.BODY_LIMIT || '1mb'

app.use(express.json({ limit }))
app.use(bodyParser.text({ type: 'text/html', limit }))

async function print({ browser, htmlContents, options }) {
  const page = await browser.newPage()
  await page.setContent(htmlContents, { waitUntil: 'networkidle0' })
  return page.pdf(options)
}

function parseRequest(query) {
  // Parse all the parameters to Page#pdf that cannot accept strings
  // See https://pptr.dev/api/puppeteer.pdfoptions
  const sanitised = Object.fromEntries(Object.entries(query).map(([k, v]) => {
    if (['displayHeaderFooter', 'landscape', 'omitBackground', 'outline', 'preferCSSPageSize', 'printBackground', 'tagged', 'waitForFonts'].includes(k)) return [k, v === 'true']
    if (['scale', 'timeout'].includes(k)) return [k, +v]
    return [k, v]
  }))
  return {
    filename: (sanitised.filename || 'document').replace(/(\.pdf)?$/, '.pdf'),
    options: { format: 'a4', landscape: false, printBackground: true, ...sanitised, path: null }
  }
}

let _browser = null
async function launchBrowser() {
  return _browser |= puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
}

app.post('/', cors(), async (req, res) => {
  const browser = await launchBrowser()
  const { filename, options } = parseRequest(req.query)
  const page = await print({ htmlContents: req.body, browser, options })
  res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(page)
})

app.post('/multiple', cors(), async (req, res) => {
  const browser = await launchBrowser()
  const { filename, options } = parseRequest(req.query)
  const files = await Promise.all(req.body.map(htmlContents => {
    const { name: path, removeCallback: rm } = tmp.fileSync()
    return print({ htmlContents, browser, options: { ...options, path: path } }).then(() => ({ path, rm }))
  }))
  const doc = files.reduce((merged, { path, rm }) => {
    merged.addPagesOf(new pdf.ExternalDocument(fs.readFileSync(path)))
    rm()
    return merged
  }, new pdf.Document())
  const buffer = await doc.asBuffer()
  res.attachment(filename).send(buffer)
})

app.options('/{*anything}', cors())

/**
  * Error-handling middleware always takes **four** arguments.
  *
  * You must provide four arguments to identify it as an error-handling middleware function.
  * Even if you don’t need to use the next object, you must specify it to maintain the signature.
  * Otherwise, the next object will be interpreted as regular middleware and will fail to handle errors.
  * For details about error-handling middleware, see: https://expressjs.com/en/guide/error-handling.html.
  */
  app.use((err, _req, res, next) => {
    if (res.headersSent) {
      return next(err)
    }
    res.status(500).send(err.stack)
  })

app.listen(port, err => {
  if (err) {
    return console.error('ERROR: ', err)
  }
  console.log(`HTML to PDF converter listening on port: ${port}`)
})

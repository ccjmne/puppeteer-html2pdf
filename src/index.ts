import type { NextFunction, Request, Response } from 'express'
import type { Browser, PDFOptions } from 'puppeteer-core/lib/types'
import process from 'node:process'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { Document, ExternalDocument } from 'pdfjs'
import { withBrowser } from './shared-browser'

const app = express()
const port = 3000

const limit = process.env.BODY_LIMIT || '1mb'

app.use(express.json({ limit }))
app.use(bodyParser.text({ type: 'text/html', limit }))

async function print(browser: Browser, html: string, opts: PDFOptions): Promise<Uint8Array<ArrayBufferLike>> {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  return page.pdf(opts)
}

function parseRequest(query: Record<string, string>): { filename: string, opts: PDFOptions } {
  // Parse all the parameters to Page#pdf that cannot accept strings
  // See https://pptr.dev/api/puppeteer.pdfoptions
  const sanitised = Object.fromEntries(Object.entries(query).map(([k, v]) => {
    if (['displayHeaderFooter', 'landscape', 'omitBackground', 'outline', 'preferCSSPageSize', 'printBackground', 'tagged', 'waitForFonts'].includes(k)) { return [k, v === 'true'] }
    if (['scale', 'timeout'].includes(k)) { return [k, +v] }
    return [k, v]
  }))
  return {
    filename: (sanitised.filename || 'document').replace(/(\.pdf)?$/, '.pdf'),
    opts: { format: 'a4', landscape: false, printBackground: true, ...sanitised, path: null },
  }
}

app.post('/', cors(), async (req: Request, res: Response) => {
  const { filename, opts } = parseRequest(req.query as Record<string, string>)
  await withBrowser(async (browser) => {
    const page = await print(browser, req.body, opts)
    res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(page)
  })
})

app.post('/multiple', cors(), async (req: Request, res: Response) => {
  const { filename, opts } = parseRequest(req.query as Record<string, string>)
  const pages = await withBrowser(browser => Promise.all((req.body as string[]).map(html => print(browser, html, { ...opts }))))
  const doc = pages.reduce((merged, content) => (merged.addPagesOf(new ExternalDocument(content)), merged), new Document())
  res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(await doc.asBuffer())
})

app.options('/{*anything}', cors())

app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) { return next(err) }
  res.status(500).send(err.stack)
})

app.listen(port, (err?: Error) => {
  if (err) { return console.error('ERROR: ', err) }
  console.log(`HTML to PDF converter listening on port: ${port}`)
})

import type { NextFunction, Request, Response } from 'express'
import type { Buffer } from 'node:buffer'
import type { PDFOptions } from 'puppeteer-core/lib/types'
import fs from 'node:fs'
import process from 'node:process'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import pdf from 'pdfjs'
import tmp from 'tmp'
import { withBrowser } from './shared-browser'

const app = express()
const port = 3000

const limit = process.env.BODY_LIMIT || '1mb'

app.use(express.json({ limit }))
app.use(bodyParser.text({ type: 'text/html', limit }))

async function print({ browser, htmlContents, options }: { browser: any, htmlContents: string, options: PDFOptions }): Promise<Buffer> {
  const page = await browser.newPage()
  await page.setContent(htmlContents, { waitUntil: 'networkidle0' })
  return page.pdf(options)
}

function parseRequest(query: Record<string, string>): { filename: string, options: PDFOptions } {
  // Parse all the parameters to Page#pdf that cannot accept strings
  // See https://pptr.dev/api/puppeteer.pdfoptions
  const sanitised = Object.fromEntries(Object.entries(query).map(([k, v]) => {
    if (['displayHeaderFooter', 'landscape', 'omitBackground', 'outline', 'preferCSSPageSize', 'printBackground', 'tagged', 'waitForFonts'].includes(k)) { return [k, v === 'true'] }
    if (['scale', 'timeout'].includes(k)) { return [k, +v] }
    return [k, v]
  }))
  return {
    filename: (sanitised.filename || 'document').replace(/(\.pdf)?$/, '.pdf'),
    options: { format: 'a4', landscape: false, printBackground: true, ...sanitised, path: null },
  }
}

app.post('/', cors(), async (req: Request, res: Response) => {
  const { filename, options } = parseRequest(req.query as Record<string, string>)
  await withBrowser(async (browser) => {
    const page = await print({ htmlContents: req.body, browser, options })
    res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(page)
  })
})

app.post('/multiple', cors(), async (req: Request, res: Response) => {
  const { filename, options } = parseRequest(req.query as Record<string, string>)
  await withBrowser(async (browser) => {
    const files = await Promise.all((req.body as string[]).map(async (htmlContents) => {
      const { name: path, removeCallback: rm } = tmp.fileSync()
      await print({ htmlContents, browser, options: { ...options, path } })
      return { path, rm }
    }))
    const doc = files.reduce((merged, { path, rm }) => {
      merged.addPagesOf(new pdf.ExternalDocument(fs.readFileSync(path)))
      rm()
      return merged
    }, new pdf.Document())
    const buffer = await doc.asBuffer()
    res.attachment(filename).send(buffer)
  })
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

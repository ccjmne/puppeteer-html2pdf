import type { Request, Response } from 'express'
import type { PDFOptions } from 'puppeteer-core'
import type { ExtraOptions } from './shared-browser'
import { parse } from 'node:path'
import process from 'node:process'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { Document, ExternalDocument } from 'pdfjs'
import { print } from './shared-browser'

const port = 3000
const limit = process.env.BODY_LIMIT || '1mb'

express()
  .use(express.json({ limit }))
  .use(bodyParser.text({ type: 'text/html', limit }))
  .use(bodyParser.text({ type: 'text/plain', limit }))

  // Accepts a single HTML document in the body
  .post('/', cors(), async (req: Request, res: Response) => {
    const { filename, opts, extraOpts } = parseRequest(req.query as Record<string, string>)
    res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send((await print(req.body, opts, extraOpts)))
  })

  // Accepts multiple HTML documents in the body as a Json array of strings
  .post('/multiple', cors(), async (req: Request, res: Response) => {
    const { filename, opts, extraOpts } = parseRequest(req.query as Record<string, string>)
    const pages = await Promise.all((req.body as string[]).map(html => print(html, { ...opts }, { ...extraOpts })))
    const doc = pages.reduce((merged, content) => (merged.addPagesOf(new ExternalDocument(content)), merged), new Document())
    if (!doc.info.title && extraOpts.title)
      doc.info.title = extraOpts.title
    res.attachment(filename.replace(/(?:\.pdf)?$/, '.pdf')).send(await doc.asBuffer())
  })

  .options('/{*anything}', cors())
  .listen(port, (err?: Error) => {
    if (err) return console.error('ERROR: ', err)
    console.log(`HTML-to-PDF converter listening on port: ${port}`)
  })

// Parse all the parameters to Page#pdf that cannot accept strings
// See https://pptr.dev/api/puppeteer.pdfoptions
function parseRequest(query: Record<string, string>): { filename: string, opts: PDFOptions, extraOpts: ExtraOptions } {
  const { singlePage, title, filename, ...pdfopts } = query

  const sanitised = Object.fromEntries(Object.entries(pdfopts).map(([k, v]) => {
    if (['displayHeaderFooter', 'landscape', 'omitBackground', 'outline', 'preferCSSPageSize', 'printBackground', 'tagged', 'waitForFonts'].includes(k)) return [k, v === 'true']
    if (['scale', 'timeout'].includes(k)) return [k, +v]
    return [k, v]
  }))

  return {
    filename:  (filename || 'document').replace(/(\.pdf)?$/, '.pdf'),
    opts:      { format: 'a4', landscape: false, printBackground: true, ...sanitised, path: null },
    extraOpts: { singlePage: singlePage === 'true', title: title || parse(filename ?? '').name || undefined },
  }
}

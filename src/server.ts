import type { Request, Response } from 'express'
import type { PrinterConfig } from './printer'
import process from 'node:process'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { homepage, name, version } from '../package.json'
import { printHTML, printURLs } from './printer'

const port = 3000
const limit = process.env.BODY_LIMIT || '1mb'

express()
  .use(cors())
  .use(express.json({ limit }))
  .use(bodyParser.text({ type: 'text/html', limit }))
  .use(bodyParser.text({ type: 'text/plain', limit }))

  // Accepts a single HTML document in the body
  .post('/', async (req: Request, res: Response) => {
    const { filename, cfg } = parseRequest(req.query as Record<string, string>)
    res.attachment(filename).send(await printHTML({ cfg, data: [req.body as string] }))
  })

  // Accepts a list of URLs in the body
  .post('/url', async (req: Request, res: Response) => {
    const { filename, cfg } = parseRequest(req.query as Record<string, string>)
    res.attachment(filename).send(await printURLs({ cfg, data: (req.body as string).split(/\s*\n\s*/).filter(({ length }) => length) }))
  })

  // Accepts multiple HTML documents in the body as a JSON array of strings
  .post('/multiple', async (req: Request, res: Response) => {
    const { filename, cfg } = parseRequest(req.query as Record<string, string>)
    res.attachment(filename).send(await printHTML({ cfg, data: req.body as string[] }))
  })

  // Error-handling middleware must come last and take *four* arguments
  .use((err: Error & Partial<{ status: number }>, _req: Request, res: Response, _next: any) => {
    res.status(err.status ?? 500).send(err.message)
  })

  .listen(port, (err?: Error) => {
    if (err) return console.error('ERROR: ', err)
    console.log(`HTML-to-PDF converter listening on port: ${port}`)
  })

// Parse:
// - the parameters to Page#pdf that cannot accept strings        (see https://pptr.dev/api/puppeteer.pdfoptions)
// - the non-string fields of standard PDF Information Dictionary (keywords, creationDate and modDate)
// - this service's own properties                                (filename and onepage)
function parseRequest(query: Record<string, string>): { filename: `${string}.pdf`, cfg: PrinterConfig['cfg'] } {
  return {
    filename: (query.filename || 'document').replace(/(\.pdf)?$/, '.pdf') as `${string}.pdf`,
    cfg:      Object.assign({ producer: `${name} v${version} (${homepage})` }, Object.fromEntries(Object.entries(query).map(([k, v]) => {
      if (/* pptr#pdf: */ ['displayHeaderFooter', 'landscape', 'omitBackground', 'outline', 'preferCSSPageSize', 'printBackground', 'tagged', 'waitForFonts'].includes(k)) return [k, v === 'true']
      if (/* pptr#pdf: */ ['scale', 'timeout'].includes(k)) return [k, +v]
      if (/* infodict: */ ['keywords'].includes(k)) return [k, Array.isArray(v) ? v : [v]]
      if (/* infodict: */ ['creationDate', 'modDate'].includes(k)) return [k, new Date(v)]
      if (/* html2pdf: */ ['onepage'].includes(k)) return [k, v === 'true']
      return [k, v]
    }))),
  }
}

import type { PDFOptions } from 'puppeteer-core'
import { Buffer } from 'node:buffer'
import { PDFDocument } from 'pdf-lib'
import { Page, ProtocolError } from 'puppeteer-core'
import { withBrowser } from './shared-browser'

export interface PDFInfo { title?: string, author?: string, subject?: string, keywords?: string[], creator?: string, producer?: string, creationDate?: Date, modificationDate?: Date }
export interface ExtraOpts { onepage?: boolean  }
export interface PrinterConfig {
  data: string[]
  cfg:  PDFOptions & PDFInfo & ExtraOpts
}

export function printHTML(cfg: PrinterConfig) {
  return print(cfg, Page.prototype.setContent)
}

export function printURLs(cfg: PrinterConfig) {
  return print(cfg, Page.prototype.goto).catch((e) => {
    if (e instanceof ProtocolError) throw err(e.message)
    else throw e
  })
}

function print({ data, cfg }: PrinterConfig, load: typeof Page.prototype.setContent | typeof Page.prototype.goto) {
  if (!data.length) throw err('No document source provided')
  return withBrowser(async browser => await combine(await Promise.all(data.map(async function (datum) {
    const page = await browser.newPage()
    await page.setViewport(viewport(cfg))
    await load.call(page, datum, { waitUntil: 'networkidle0' })
    const content = await page.pdf({
      format:          'a4',
      landscape:       false,
      printBackground: true,
      ...cfg,
      ...cfg.onepage ? { format: undefined, landscape: undefined, ...(await page.evaluate(docDimensions)) } : {},
      margin:          { top: 0, right: 0, bottom: 0, left: 0 },
      path:            undefined,
    })
    await page.close()
    return content
  })), cfg))
}

async function combine(pdfs: Uint8Array[], info: PDFInfo): Promise<Buffer> {
  const [out, ...docs] = await Promise.all(pdfs.map(buf => PDFDocument.load(buf)))
  await allSequential(docs, async doc => (await out.copyPages(doc, doc.getPageIndices())).forEach(p => out.addPage(p)))
  Object.entries(info).forEach(([k, v]) => out['set' + k[0].toUpperCase() + k.slice(1)]?.(v))
  return Buffer.from(await out.save())
}

function docDimensions() {
  const body = document.body
  const html = document.documentElement
  return {
    height: Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight) + 'px',
    width:  Math.max(body.scrollWidth,  body.offsetWidth,  html.clientWidth,  html.scrollWidth,  html.offsetWidth)  + 'px',
  }
}

// Ideal viewport to render a0..9 documents at 96dpi
function viewport({ format, landscape }: PDFOptions) {
  if (!format || !landscape || !format.match(/^a\d$/i)) return null
  const [w, h] = [4494, 3179, 2245, 1587, 1123, 794, 559, 397, 280, 197, 140].slice(+format[2])
  return Object.assign(landscape ? { width: w, height: h } : { width: h, height: w }, { deviceScaleFactor: 1 })
}

function allSequential<I, R>(input: I[], fn: (i: I) => Promise<R>): Promise<R[]> {
  return input.reduce(
    (prev, next) => prev.then(res => fn(next).then(r => [...res, r])),
    Promise.resolve([] as R[]),
  )
}

function err(message: string, status = 400) {
  return Object.assign(new Error(message), { status })
}

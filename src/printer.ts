import type { PDFOptions } from 'puppeteer-core'
import { Buffer } from 'node:buffer'
import { PDFDocument } from 'pdf-lib'
import { Page } from 'puppeteer-core'
import { withBrowser } from './shared-browser'

export interface PDFInfo { title?: string, author?: string, subject?: string, keywords?: string, creator?: string, producer?: string, creationDate?: Date, modificationDate?: Date }
export interface ExtraOpts { onepage?: boolean  }
export interface PrinterConfig {
  data: string[]
  cfg:  PDFOptions & PDFInfo & ExtraOpts
}

export function printHTML(cfg: PrinterConfig) {
  return print(cfg, Page.prototype.setContent)
}

export function printURLs(cfg: PrinterConfig) {
  return print(cfg, Page.prototype.goto)
}

function print({ data, cfg }: PrinterConfig, load: typeof Page.prototype.setContent | typeof Page.prototype.goto) {
  return withBrowser(async browser => await combine(await Promise.all(data.map(async function (datum) {
    const page = await browser.newPage()
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
  if (!pdfs.length) return Buffer.from(await (await PDFDocument.create()).save())
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

function allSequential<I, R>(input: I[], fn: (i: I) => Promise<R>): Promise<R[]> {
  return input.reduce(
    (prev, next) => prev.then(res => fn(next).then(r => [...res, r])),
    Promise.resolve([] as R[]),
  )
}

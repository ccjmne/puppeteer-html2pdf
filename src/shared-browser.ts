import type { Browser, PDFOptions } from 'puppeteer-core'
import process from 'node:process'
import puppeteer from 'puppeteer-core'
import { BehaviorSubject, firstValueFrom, from, Observable, of, Subject } from 'rxjs'
import { delay, distinctUntilChanged, filter, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs/operators'
import which from 'which'

export interface ExtraOptions {
  singlePage?: boolean
  title?:      string
}

const keepalive = +(process.env.BROWSER_KEEPALIVE || '30000')
const executablePath = process.env.BROWSER_EXECUTABLE || ['chrome-headless-shell', 'chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome']
  .map(name => which.sync(name, { nothrow: true }))
  .find(ex => !!ex)
if (!executablePath) throw new Error('No suitable browser executable found.')

// Shared browser instance created on demand, closed after `keepalive` milliseconds of inactivity
const browser$ = (function sharedBrowser(): Observable<Browser> {
  const request$ = new Subject<boolean>()
  const instance$ = new BehaviorSubject<Browser | null>(null)
  request$.pipe(
    withLatestFrom(instance$),
    switchMap(([requested, instance]) => {
      if (requested === !!instance) return of(instance)
      return requested
        ? from(puppeteer.launch({
            executablePath,
            args: [
              '--disable-web-security', // Circumvent hypermodern CORS policies even w/ local file://
              '--no-sandbox',
              '--disable-setuid-sandbox',
            ],
            headless: true,
          }))
        : of(null).pipe(delay(keepalive), tap(() => instance?.close()))
    }),
    distinctUntilChanged(),
  ).subscribe(instance$)
  return new Observable<Browser>((observer) => {
    instance$.pipe(filter(instance => !!instance)).subscribe(observer)
    request$.next(true)
    return () => request$.next(false)
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
})()

export function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  return firstValueFrom(browser$.pipe(switchMap(fn)))
}

function docDimensions() {
  const body = document.body
  const html = document.documentElement
  return {
    height: Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight),
    width:  Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth),
  }
}

export async function print(htmlOrUrl: string, opts: PDFOptions, extraOpts: ExtraOptions): Promise<Uint8Array<ArrayBufferLike>> {
  return withBrowser(async (browser) => {
    const page = await browser.newPage()
    if (/^https?:\/\//i.test(htmlOrUrl)) {
      await page.goto(htmlOrUrl, { waitUntil: 'networkidle0' })
    }
    else {
      await page.setContent(htmlOrUrl, { waitUntil: 'networkidle0' })
    }

    if (extraOpts.singlePage) {
      delete opts.format
      delete opts.landscape
      const { width, height } = await page.evaluate(docDimensions)
      opts.width = `${width}px`
      opts.height = `${height}px`
    }

    if (extraOpts.title && !(await page.title())) {
      await page.evaluate((t: string) => document.title = t, extraOpts.title)
    }

    const pdf = await page.pdf(opts)
    await page.close()
    return pdf
  })
}

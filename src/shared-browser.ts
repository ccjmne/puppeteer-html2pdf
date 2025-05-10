import type { Browser, PDFOptions } from 'puppeteer-core'
import puppeteer from 'puppeteer-core'
import { BehaviorSubject, firstValueFrom, from, Observable, of, Subject } from 'rxjs'
import { delay, distinctUntilChanged, filter, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs/operators'

// This is a shared browser instance that is created on demand and closed after 30 seconds of inactivity.
const browser$ = (function sharedBrowser(): Observable<Browser> {
  const request$ = new Subject<boolean>()
  const instance$ = new BehaviorSubject<Browser | null>(null)
  request$.asObservable().pipe(
    distinctUntilChanged(),
    withLatestFrom(instance$),
    switchMap(([requested, instance]) => {
      if (requested ? !!instance : !instance /* !XOR */) { return of(instance) }
      return requested
        ? from(puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
          }))
        : of(null).pipe(delay(30 * 1000), tap(() => instance?.close()))
    }),
  ).subscribe(instance$)
  return new Observable<Browser>((observer) => {
    instance$.pipe(filter(instance => !!instance)).subscribe(observer)
    request$.next(true)
    return () => request$.next(false)
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
})()

function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  return firstValueFrom(browser$).then(fn)
}

export async function print(html: string, opts: PDFOptions): Promise<Uint8Array<ArrayBufferLike>> {
  return withBrowser(browser => browser.newPage()).then(async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return page.pdf(opts)
  })
}

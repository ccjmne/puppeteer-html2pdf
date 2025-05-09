import type { Browser } from 'puppeteer-core'
import puppeteer from 'puppeteer-core'
import { BehaviorSubject, firstValueFrom, from, Observable, of, Subject } from 'rxjs'
import { delay, distinctUntilChanged, filter, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs/operators'

const browser$ = (function sharedBrowser(): Observable<Browser> {
  const request$ = new Subject<boolean>()
  const instance$ = new BehaviorSubject<Browser | null>(null)
  request$.asObservable().pipe(
    distinctUntilChanged(),
    withLatestFrom(instance$),
    switchMap(([need, latest]) => {
      if (need ? !!latest : !latest /* !XOR */) { return of(latest) }
      return need
        ? from(puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
          }))
        : of(null).pipe(delay(5 * 60 * 1000), tap(() => latest?.close()))
    }),
  ).subscribe(instance$)
  return new Observable<Browser>((observer) => {
    instance$.pipe(filter(instance => !!instance)).subscribe(observer)
    request$.next(true)
    return () => request$.next(false)
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
})()

export function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  return firstValueFrom(browser$).then(fn)
}

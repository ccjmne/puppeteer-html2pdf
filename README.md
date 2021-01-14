# ccjmne/puppeteer-html2pdf

Print your HTML to PDF via Puppeteer in a Docker container.

## What exactly

This is a simple [Express](https://expressjs.com/) server listening for `POST` requests passing some custom HTML to print as PDF for generating fancy reports.

Technologies used:

- [Docker](https://www.docker.com/)
- [Puppeteer](https://github.com/GoogleChrome/puppeteer)
- [Express](https://expressjs.com/)
- [NodeJS](https://nodejs.org/en/)

## Run it

As a webserver, on the port of your choosing.

- Testing:

      docker run -it --rm -p=<port>:3000 ccjmne/puppeteer-html2pdf:<version>

  Kill with: `Ctrl^C`

- Production:

      docker run --detach --shm-size 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 \
                 --name html2pdf -p=<port>:3000 ccjmne/puppeteer-html2pdf:<version>

  Stop with: `docker stop html2pdf`

## Use it

The webserver listens on the port (specified in the [Run it](#run-it) section) and exposes two endpoints:

1. Single-page document

   - path: `/`
   - method: `POST`
   - `Content-Type`: `text/html`
   - body: `<html content>`

2. Multi-page document

   - path: `/multiple`
   - method: `POST`
   - `Content-Type`: `application/json`
   - body: `{ pages: [<html 1>, <html 2>, ... <html n>] }` where `<html x>` are JSON strings of the DOMs to print

Both methods handle the following query parameters:

- `filename`: the name of the resulting PDF file (will automatically append the `.pdf` extension if absent)
- all the options supported by [Puppeteer's page#pdf(\[options\])](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagepdfoptions), except:
  - `path`
  - `headerTemplate`
  - `margin`

## Examples

Single-page document, default settings (format: `A4`, orientation: `portrait`):

```bash
curl -X POST \
  'http://localhost:3000' \
  -H 'Content-Type: text/html' \
  -d '<html><body><h1>Hello World!</h1></body></html>'
```

Single-page document (format: `A3`, orientation: `landscape`)

```bash
curl -X POST \
  'http://localhost:3000?format=a3&landscape=true' \
  -H 'Content-Type: text/html' \
  -d '<html><body><h1>Hello World!</h1></body></html>'
```

Multi-page document

```bash
curl -X POST \
  'http://localhost:3000/multiple' \
  -H 'Content-Type: application/json' \
  -d '{
    "pages": [
        "<html><body><h1>Hello World!</h1></body></html>",
        "This is the <strong>second</strong> page"
    ]
}'
```

## Build

Builds automatically when pushed onto `master` branch.

~~Includes a comprehensive script that lets you build and publish new versions of the image: `./compose.sh <version>`~~

## License

MIT. Do as you please.  
Refer to the [LICENSE](./LICENSE) file for more details.

# ccjmne/puppeteer-html2pdf

Print your HTML to PDF through a Web server.

[![Docker Image CI](https://github.com/ccjmne/puppeteer-html2pdf/actions/workflows/publish-to-ghcr.yml/badge.svg)](https://github.com/ccjmne/puppeteer-html2pdf/actions/workflows/publish-to-ghcr.yml)

## Inside the box

This is a simple [Express](https://expressjs.com/) server listening for `POST` requests passing some custom HTML to print as PDF for generating fancy reports.

Technologies used:

- [Docker](https://www.docker.com/)
- [Puppeteer](https://github.com/GoogleChrome/puppeteer)
- [Express](https://expressjs.com/)
- [NodeJS](https://nodejs.org/en/)

It offers images for both ARM and AMD architectures.

## Quick Start

As a webserver, on the port of your choosing.

```shell
docker run -it --rm -p=3000:3000 ghcr.io/ccjmne/puppeteer-html2pdf:latest
# Or as a long-lived container:
# docker run --name html2pdf --detach --port=3000:3000 --memory 500M ghcr.io/ccjmne/puppeteer-html2pdf:latest

curl localhost:3000 -H 'Content-Type: text/html' --data '
<h1>Hello World!</h1>
<blockquote>
  I love deadlines. I like the whooshing sound they make as they fly by.
  <br>
  <small style="float:right">— Douglas Adams</small>
</blockquote>
' > out.pdf && xdg-open out.pdf
```

## Docker Environment Variables

| Name              | Description                                                                                                               | Default Value |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| BODY_LIMIT        | Maximum request body size. Passed on to [body-parser](https://github.com/expressjs/body-parser#limit) and `express.json`. | `1mb`         |
| BROWSER_KEEPALIVE | Period (in ms) of inactivity after which the shared browser instance is shut down.                                        | `30000` (30s) |

## Use it

The webserver listens on the port (specified in the [Quick Start](#quick-start) section) and exposes two endpoints:

Single-page document, default settings (format: `A4`, orientation: `portrait`):

|                        | Single-page document    | Multi-page document                       |
| ---------------------- | ----------------------- | ----------------------------------------- |
| Request Path           | `/`                     | `/multiple`                               |
| Request Method         | `POST`                  | `POST`                                    |
| `Content-Type` header  | `text/html`             | `application/json`                        |
| Request Body           | HTML content            | JSON array of strings containing HTML     |
| Request Body (example) | `<h1>Hello World!</h1>` | `["<h1>Page 1</h2>", "<h1>Page 2</h1>" ]` |

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

Single-page document (format: `A3`, orientation: `landscape`):

```bash
curl -X POST \
  'http://localhost:3000?format=a3&landscape=true' \
  -H 'Content-Type: text/html' \
  -d '<html><body><h1>Hello World!</h1></body></html>'
```

Multi-page document:

```bash
curl -X POST \
  'http://localhost:3000/multiple' \
  -H 'Content-Type: application/json' \
  -d '[
    "<html><body><h1>Hello World!</h1></body></html>",
    "This is the <strong>second</strong> page"
  ]'
```

## Maintainer notes

**Automatically builds and publishes to GitHub Packages** (GitHub Container Registry) with each **GitHub Release**.

Includes a comprehensive script that lets you build and publish new versions of the image: `./compose.sh <version>`

## License

MIT. Do as you please.  
Refer to the [LICENSE](./LICENSE) file for more details.

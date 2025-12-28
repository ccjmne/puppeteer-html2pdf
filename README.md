# ccjmne/puppeteer-html2pdf

Print your HTML to PDF through a Web server.

[![Docker Image CI](https://github.com/ccjmne/puppeteer-html2pdf/actions/workflows/publish-to-ghcr.yml/badge.svg)](https://github.com/ccjmne/puppeteer-html2pdf/actions/workflows/publish-to-ghcr.yml)

## Inside the box

This is a simple [Express](https://expressjs.com/) server listening for `POST` requests passing some arbitrary HTML to print as PDF for generating fancy reports.

Technologies used:

- [Docker](https://www.docker.com/)
- [Puppeteer](https://github.com/GoogleChrome/puppeteer)
- [Express](https://expressjs.com/)
- [NodeJS](https://nodejs.org/en/)

It offers images for both ARM and AMD architectures.

## Quick Start

This example (which you can copy and directly paste into your shell interpreter) will run it on port `3000` and print a simple HTML document to PDF.

```shell
docker run --name html2pdf --detach --publish=3000:3000 --memory 500M ghcr.io/ccjmne/puppeteer-html2pdf:latest
# It may take a second to precompute fonts cache on the first start-up
until curl -q localhost:3000 >/dev/null 2>&1; do sleep 0.1; done

# Or for a quick test, to be killed with Ctrl-C:
# docker run -it --rm -p=3000:3000 ghcr.io/ccjmne/puppeteer-html2pdf:latest

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

## Setting PDF Information Dictionary

The [properties of the PDF Information Dictionary](https://www.verypdf.com/document/pdf-format-reference/pg_0844.htm) can also be controlled via query parameters. These are:

| Parameter      | Description                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | The document's title                                                                                                                                        |
| `author`       | The name of the person who created the document                                                                                                             |
| `subject`      | The subject of the document                                                                                                                                 |
| `keywords`     | Keywords associated with the document                                                                                                                       |
| `creator`      | If the document was converted to PDF from another format, the name of the conforming product that created the original document from which it was converted |
| `producer`     | If the document was converted to PDF from another format, the name of the conforming product that converted it to PDF                                       |
| `creationDate` | The date and time the document was created                                                                                                                  |
| `modDate`      | The date and time the document was most recently modified                                                                                                   |

Default values are provided for five of these:

| Parameter      | Default value                                                                          |
| -------------- | -------------------------------------------------------------------------------------- |
| `title`        | The first (or only) HTML document or Web page's title                                  |
| `creator`      | The full name and version of Chromium driven that generated the PDFs through Puppeteer |
| `producer`     | The name and version of this application                                               |
| `creationDate` | The current date and time                                                              |
| `modDate`      | The current date and time                                                              |

## Custom Fonts

The simplest way to add fonts is to mount a volume with the fonts you want to use to the `/usr/share/fonts` directory in the container.

```shell
# Obtain a font
longcang=$(curl -L 'https://fonts.googleapis.com/css2?family=Long+Cang' | grep -Po '(?<=url\()[^)]+')
curl -L "$longcang" -o LongCang-Regular.ttf

# Add it to the container
docker run -it --rm -p3000:3000                                          \
    -v./LongCang-Regular.ttf:/usr/local/share/fonts/LongCang-Regular.ttf \
    ghcr.io/ccjmne/puppeteer-html2pdf:latest

# Use it in your HTML
curl localhost:3000 -H 'Content-Type: text/html' --data '
<html>
  <body style="font-family: '\''Long Cang'\'', cursive;">
    <h1>I play nice with custom fonts, too!</h1>
    <p>鉴于对人类家庭所有成员的固有尊严及其平等的和不移的权利的承认,乃是世界自由、正义与和平的基础</p>
  </body>
</html>' > out.pdf && xdg-open out.pdf
```

## Endpoints

The Web server listens on a port of your choosing (see the [Quick Start](#quick-start) section) and exposes two endpoints:

Single-page document, default settings (format: `A4`, orientation: `portrait`):

|                        | Single-page document    | Multi-page document                       | List of URLs to render    |
| ---------------------- | ----------------------- | ----------------------------------------- | ------------------------- |
| Request Path           | `/`                     | `/multiple`                               | `/urls`                   |
| Request Method         | `POST`                  | `POST`                                    | `POST`                    |
| `Content-Type` header  | `text/html`             | `application/json`                        | `text/plain`              |
| Request Body           | HTML content            | JSON array of strings containing HTML     | One absolute URL per line |
| Request Body (example) | `<h1>Hello World!</h1>` | `["<h1>Page 1</h2>", "<h1>Page 2</h1>" ]` | `https://google.com`      |

All endpoints handle the following query parameters:

- `filename`: the name of the resulting PDF file (will automatically append the `.pdf` extension if absent)
- `onepage`: `true` to force the creation of a single (possibly gigantic) page for each individual URL or HTML document. If set, overrules `format` and `landscape`
- all the [properties of the PDF Information Dictionary](https://www.verypdf.com/document/pdf-format-reference/pg_0844.htm), except `trapped`:
  - `title`
  - `author`
  - `subject`
  - `keywords` (you may provide several, e.g.: `?keywords=travelling&keywords=korea&keywords=beautiful`)
  - `creator`
  - `producer`
  - `creationDate` (parsed as `ISO-8601`, e.g.: `2025-12-28`)
  - `modDate` (parsed as `ISO-8601`, e.g.: `2025-12-28`)
- all the options supported by [Puppeteer's `page#pdf(\[options\])`](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagepdfoptions), except:
  - `path`
  - `headerTemplate`
  - `margin`

### Examples

Single-page document, default settings (format: `A4`, orientation: `portrait`):

```bash
curl 'http://localhost:3000'                           \
  -H 'Content-Type: text/html'                         \
  -d '<html><body><h1>Hello World!</h1></body></html>' \
  > out.pdf && xdg-open out.pdf
```

Single-page document (format: `A3`, orientation: `landscape`):

```bash
curl 'http://localhost:3000?format=a3&landscape=true'  \
  -H 'Content-Type: text/html'                         \
  -d '<html><body><h1>Hello World!</h1></body></html>' \
  > out.pdf && xdg-open out.pdf
```

Specify Information Dictionary:

```bash
curl 'http://localhost:3000?author=ccjmne&title=Hello+World' \
  -H 'Content-Type: text/html'                               \
  -d '<html><body><h1>Hello World!</h1></body></html>'       \
  > out.pdf && xdg-open out.pdf
```

Multi-page document:

```bash
curl 'http://localhost:3000/multiple'                  \
  -H 'Content-Type: application/json'                  \
  -d '[
    "<html><body><h1>Hello World!</h1></body></html>",
    "This is the <strong>second</strong> page"
  ]'                                                   \
  > out.pdf && xdg-open out.pdf
```

Converting a Web page to PDF:

```bash
curl 'http://localhost:3000/url?onepage=true' \
  -H 'Content-Type: text/plain'               \
  -d 'https://justinjackson.ca/webmaster/'    \
  > out.pdf && xdg-open out.pdf
```

Converting several Web pages into a single PDF:

```bash
curl 'http://localhost:3000/url?onepage=true' \
  -H 'Content-Type: text/plain'               \
  -d '
    https://justinjackson.ca/webmaster/
    https://ccjmne.sh/blog/
  '                                           \
  > out.pdf && xdg-open out.pdf
```

## Maintainer Notes

**Automatically builds and publishes to GitHub Packages** (GitHub Container Registry) with each **GitHub Release**.

Includes a comprehensive script that lets you build and publish new versions of the image: `./compose.sh <version>`

### TODO

- [ ] Support printing screenshots as images
  - [ ] Rename to html-printer?
- [ ] Provide as plain TypeScript library rather than a Web server
  - [ ] Publish library to [npm](https://www.npmjs.com/)

## License

MIT. Do as you please.  
Refer to the [LICENSE](./LICENSE) file for more details.

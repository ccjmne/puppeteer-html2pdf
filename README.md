# docker-puppeteer-html2pdf

Print your HTML to PDF via Puppeteer in a Docker container. It's all in the repo name 👌

## What exactly

This is a simple [Express](https://expressjs.com/) server listening for `POST` requests passing some custom HTML to print as PDF for generating fancy reports.

Technologies:

-   [Docker@^18.09](https://www.docker.com/)
-   [Puppeteer@1.14.0](https://github.com/GoogleChrome/puppeteer)
-   [Express@^4.16](https://expressjs.com/)
-   [NodeJS@~^10.15](https://nodejs.org/en/)

## Run it

-   Testing:
        docker run -it --rm -p=<port>:3000 puppeteer-html2pdf:<version>
    Kill with: `Ctrl^C`

-   Production:
        docker run --detach --shm-size 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 \
                   --name puppeteer-html2pdf -p=<port>:3000 puppeteer-html2pdf:<version>
    Stop with: `docker stop puppeteer-html2pdf`

## Use it

-   port: `<port>` (specified in the [Run it](#run-it) section)
-   path: `/`
-   method: `POST`
-   `Content-Type`: `application/json`
-   body: `{ page: <html> }` where `<html>` is a JSON string of the DOM to print
-   query parameters:
    -   all the options described in [Puppeteer's page#pdf(\[options\]) method](https://github.com/GoogleChrome/puppeteer/blob/v1.14.0/docs/api.md#pagepdfoptions), except:
        -   `headerTemplate`
        -   `margin`
    -   `filename`: the name of the resulting PDF file (will automatically append the `.pdf` extension if absent)

## Build

Includes a comprehensive script that lets you build and publish new versions of the image:

    ./compose.sh <version>

## License

MIT. Do as you please.

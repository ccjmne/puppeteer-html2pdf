FROM ghcr.io/puppeteer/puppeteer:latest
LABEL org.opencontainers.image.source https://github.com/ccjmne/puppeteer-html2pdf

USER root

# https://github.com/Yelp/dumb-init
RUN apt-get update && apt-get install -y dumb-init

WORKDIR /app
ADD . .
RUN npm install -y && npm run build

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "-e", "require('./dist/server.js').use(require('puppeteer'))"]

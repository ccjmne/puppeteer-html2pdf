FROM buildkite/puppeteer:latest

WORKDIR /app

# merge w/ PDFtk
RUN apt-get update -y && apt-get install -y pdftk

# https://github.com/Yelp/dumb-init
RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.4/dumb-init_1.2.4_amd64.deb
RUN dpkg -i dumb-init_*.deb && rm -f dumb-init_*.deb

COPY dist/server.js .

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "-e", "require('./server.js').use(require('puppeteer'))"]

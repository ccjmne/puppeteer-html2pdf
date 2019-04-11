FROM schliflo/docker-puppeteer:latest

WORKDIR /app

COPY dist/server.js .
RUN echo "require('./server.js').use(require('puppeteer'));" > index.js

EXPOSE 3000

CMD ["node", "index.js"]

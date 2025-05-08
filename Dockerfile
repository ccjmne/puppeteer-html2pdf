FROM node:slim

LABEL org.opencontainers.image.source=https://github.com/ccjmne/puppeteer-html2pdf

USER root
RUN apt-get update
# https://github.com/Yelp/dumb-init
RUN apt-get install -y chromium dumb-init

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN mkdir -p /app
COPY pnpm-lock.yaml /app
WORKDIR /app
RUN pnpm fetch --prod
COPY . /app
RUN pnpm install

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]

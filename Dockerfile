FROM node:slim

LABEL org.opencontainers.image.source=https://github.com/ccjmne/puppeteer-html2pdf

USER root
RUN apt-get update
# https://github.com/Yelp/dumb-init
RUN apt-get install -y chromium dumb-init fontconfig

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI="true"
RUN npm install --global pnpm

WORKDIR /app
ADD pnpm-lock.yaml .
RUN pnpm fetch --prod
ADD . .
RUN pnpm install

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "fc-cache -f && exec ./node_modules/.bin/tsx src/server.ts"]

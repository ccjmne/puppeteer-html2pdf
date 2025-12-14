#! /usr/bin/env bash
set -e

ok() { printf "   [[1;32m ok [0m] %s\n" "$*"; }
ko() { printf "[[1;31m error [0m] %s\n" "$*"; }
nf() { printf " [[1;34m info [0m] %s\n" "$*"; }

usage() { ko "Usage: $0 <semver> [--push|--load]" 1>&2; exit 1; }
if [[ ! $1 =~ [0-9]+\.[0-9]+\.[0-9]+ || ! $2 =~ ^(--push|--load)?$ ]]; then
  usage
fi

catch() {
  local parent_lineno="$1"
  local message="$2"
  local code="${3:-1}"
  if [[ -n "$message" ]] ; then
    ko "Error on or near line ${parent_lineno}: ${message}; exiting with status ${code}"
  else
    ko "Error on or near line ${parent_lineno}; exiting with status ${code}"
  fi
  exit "${code}"
}
trap 'catch ${LINENO}' ERR

reg=ghcr.io
img=ccjmne/puppeteer-html2pdf
ver=$1

nf "Build and push Docker image..."
docker buildx build $2 --platform arm64,amd64 \
  --tag ${reg}/${img}:${ver} \
  --tag ${reg}/${img}:latest .
ok "Build complete"

nf "[2mTesting:[0m"
nf "   docker run -it --rm -p=[1;34m<port>[0m:3000 ${reg}/${img}:[1;34m${ver}[0m"
nf "[0m - [2mkill: [0mCtrl^C"
nf
nf "[2mProduction:[0m"
nf "   docker run --detach --name html2pdf --memory 500M \\"
nf "              --port=[1;34m<port>[0m:3000      ${reg}/${img}:[1;34m${ver}[0m"
nf "[0m - [2mstop: [0mdocker stop html2pdf"
nf
nf "[2mWith custom fonts:[0m"
nf "   docker run --detach --name html2pdf --memory 500M \\"
nf "              --mount type=bind,source=[1;34m</path/to/local/fonts>[0m,target=/usr/share/fonts \\"
nf "              --port=[1;34m<port>[0m:3000      ${reg}/${img}:[1;34m${ver}[0m"
nf "[0m - [2mstop: [0mdocker stop html2pdf"

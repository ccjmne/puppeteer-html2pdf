#! /usr/bin/env bash
set -e

ok() { printf "   [\e[0;32m ok \e[0m] $1\n"; }
ko() { printf "[\e[0;31m error \e[0m] $1\n"; }
nf() { printf " [\e[1;34m info \e[0m] $1\n"; }

usage() { ko "Usage: $0 <version number>" 1>&2; exit 1; }
if [[ ! $1 =~ [0-9]+\.[0-9]+\.[0-9]+ ]]; then
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

registry=ghcr.io
img=ccjmne/puppeteer-html2pdf
version=$1

nf "Build and push Docker image..."
docker buildx build --push --platform arm64,amd64 \
  --tag ${registry}/${img}:${version} \
  --tag ${registry}/${img}:latest .
ok "Build complete"

nf "\e[2mTesting:\e[0m"
nf "   docker run -it --rm -p=\e[1;34m<port>\e[0m:3000 ${registry}/${img}:\e[1;34m${version}\e[0m"
nf "\e[0m - \e[2mkill w/: \e[0mCtrl^C"
nf "\e[2mProduction:\e[0m"
nf "   docker run --detach --memory 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 \\
                        --name html2pdf -p=\e[1;34m<port>\e[0m:3000 ${registry}/${img}:\e[1;34m${version}\e[0m"
nf "\e[0m - \e[2mstop w/: \e[0mdocker stop html2pdf"

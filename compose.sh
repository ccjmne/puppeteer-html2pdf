#!/bin/sh
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

registry=424880512736.dkr.ecr.eu-west-1.amazonaws.com
img=puppeteer-html2pdf
version=$1

nf "Build Express server..."
npm run build
ok "Build complete"

nf "Build Docker image..."
docker build -t ${img}:${version} -t ${registry}/${img}:${version} -t ${img}:latest -t ${registry}/${img}:latest .
ok "Build complete"

nf "Push to our private container registry..."
docker push ${registry}/${img}:${version}
docker push ${registry}/${img}:latest
ok "Push complete"

nf "\e[2mTesting:\e[0m"
nf "   docker run -it --rm -p=\e[1;34m<port>\e[0m:3000 ${img}:\e[1;34m${version}"
nf "\e[0m - \e[2mkill w/: \e[0mCtrl^C"
nf "\e[2mProduction:\e[0m"
nf "   docker run --detach --memory 1G --sysctl net.ipv6.conf.all.disable_ipv6=1 \\
                        --name ${img} -p=\e[1;34m<port>\e[0m:3000 ${img}:\e[1;34m${version}"
nf "\e[0m - \e[2mstop w/: \e[0mdocker stop ${img}"

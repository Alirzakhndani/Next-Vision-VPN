#!/usr/bin/env bash
set -euo pipefail

# Fixes npm installs when a machine has broken proxy env vars such as
# npm_config_http_proxy=http://proxy:8080 that cause registry 403 errors.
unset npm_config_http_proxy npm_config_https_proxy npm_config_proxy
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy

npm install --registry=https://registry.npmjs.org/ "$@"

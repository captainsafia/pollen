#!/usr/bin/env bash
set -euo pipefail

if ! command -v hurl >/dev/null 2>&1; then
  echo "hurl is required but was not found in PATH."
  echo "Install Hurl locally: https://hurl.dev/docs/installation.html"
  exit 1
fi

PORT="${PORT:-4010}"
HOST="http://127.0.0.1:${PORT}"
LOG_FILE="${LOG_FILE:-/tmp/feedback-intake-next.log}"

export NODE_ENV=test
export GITHUB_MOCK_ENABLED=true
export ATTACHMENT_STORAGE_BACKEND=mock
export RATE_LIMIT_BACKEND=memory
export RATE_LIMIT_API_KEY_WINDOW_SECONDS=120
export RATE_LIMIT_API_KEY_MAX_REQUESTS=1
export RATE_LIMIT_IP_WINDOW_SECONDS=120
export RATE_LIMIT_IP_MAX_REQUESTS=100
export SPAM_DEDUPE_WINDOW_SECONDS=120
export SPAM_MAX_URLS=3
export ALLOW_ZIP_ATTACHMENTS=false
export FEEDBACK_API_KEYS_JSON='[
  {"keyId":"success","keyHash":"ea8546ed079032a97d99415df8f26aa3d07dacedb496a823670144dd7c3fbd2b","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"validation","keyHash":"d3a81022a564d032db35254b80181f39e82fd57a094149f738ba1cc2d04b3f4b","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"attachment","keyHash":"7525e71808275645385ae2fcebf29b6f0ecfa6f59dd8400f6305eff14c13734d","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"repo","keyHash":"e058161fb2fda02f7fc64ee97e0f3f45f873939f620af17042ebdeb894dbab98","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/another-repo"]},
  {"keyId":"rate","keyHash":"f3998058fdd84cc89439bcacdfeabde4163343cdf928172e3f03fb2871013927","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"gh-auth","keyHash":"3917a3ffe9970396bf6f893b9fb7ba7eb3bf0ccbb252e8696b16ea3e5adb6424","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"gh-issue","keyHash":"43b5e1100d519c4daa2b95df3b0a39e10bba064081ac54d383107d0b961c3611","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"app-mismatch","keyHash":"88cb2e4dbb0831e2f2567cb3aee01afcdd5cef40fa26452960e6f918997d4966","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/product-feedback"]},
  {"keyId":"repo-disabled","keyHash":"1b97693aa7756d30195cbb956c2cdfb65d5c39e61ef999c58f8bf09e6a04266c","applicationId":"desktop-app","enabled":true,"allowedRepositories":["acme/disabled-feedback"]},
  {"keyId":"disabled","keyHash":"612ecefa50f3af323e670c214ce5ca7bb0f4eb6b0e639a649a172f5820c395ab","applicationId":"desktop-app","enabled":false,"allowedRepositories":["acme/product-feedback"]}
]'
export FEEDBACK_REPOSITORIES_JSON='[
  {"name":"acme/product-feedback","installationId":1,"enabled":true,"defaultLabels":["feedback"],"labelsByType":{"bug_report":["bug"],"feature_request":["enhancement"]}},
  {"name":"acme/disabled-feedback","installationId":1,"enabled":false,"defaultLabels":["feedback"],"labelsByType":{"bug_report":["bug"],"feature_request":["enhancement"]}}
]'

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

npm run dev -- --hostname 127.0.0.1 --port "${PORT}" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${HOST}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${HOST}" >/dev/null 2>&1; then
  echo "Next.js server failed to start. Log output:"
  sed -n '1,200p' "${LOG_FILE}" || true
  exit 1
fi

hurl --test tests/hurl/*.hurl \
  --variable host="${HOST}" \
  --variable api_key_success="test-key-success" \
  --variable api_key_validation="test-key-validation" \
  --variable api_key_attachment="test-key-attachment" \
  --variable api_key_repo="test-key-repo" \
  --variable api_key_rate="test-key-rate" \
  --variable api_key_gh_auth="test-key-gh-auth" \
  --variable api_key_gh_issue="test-key-gh-issue" \
  --variable api_key_app_mismatch="test-key-app-mismatch" \
  --variable api_key_repo_disabled="test-key-repo-disabled"

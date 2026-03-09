# pollen feedback intake service

Stateless feedback intake API for Vercel using **Next.js Route Handlers** (Node.js runtime).

## Endpoint

- `POST /api/v1/feedback`
- Content-Type: `multipart/form-data`
  - `payload` (required): JSON string
  - `attachments[]` (optional): binary files, max 5

## Submission payload

Types are defined in `src/types/feedback.ts`.

Required fields:

- `type` (`bug_report | feature_request`)
- `title` (trimmed, non-empty, <= 200 chars)
- `description` (trimmed, non-empty, <= 20,000 chars)
- `targetRepository` (`owner/repo`)
- `source.applicationId`
- `source.applicationName`
- `systemTelemetry.clientType`
- `systemTelemetry.appVersion`
- `systemTelemetry.platform`

Optional fields include:

- `source.channel`, `source.surface`
- telemetry details such as `buildNumber`, `platformVersion`, `architecture`, `locale`, `deviceName`, `deviceModel`, `sessionId`, `releaseChannel`
- `githubUser`
- `contact.email`, `contact.allowFollowUp`
- `clientRequestId`
- `metadata`

## Security model

Authentication is app-level API key:

- `Authorization: Bearer <api-key>`

Validation enforces:

- valid and enabled key
- `source.applicationId` matches key config
- `targetRepository` is allowed for that key
- `targetRepository` exists in global repo config and is enabled

Only **hashed API keys** are stored in config (`sha256` hex).

## Repo and key config shape

Runtime config is provided via:

- `FEEDBACK_API_KEYS_JSON`
- `FEEDBACK_REPOSITORIES_JSON`

Sample config is in `config/sample-feedback-config.json`.

## Abuse protection

- per API key rate limit
- per IP rate limit
- spam heuristics:
  - repeated identical text (dedupe window)
  - excessive URLs
  - common spam phrases
  - gibberish detection

The service uses an external backing store in production (`RATE_LIMIT_BACKEND=upstash`) and supports `memory` backend for local tests.

## Attachments

- max 5 files
- max 10MB per file
- max 25MB request/attachment payload
- allowlist: `png`, `jpg/jpeg`, `webp`, `txt/log`, `json`, `xml`, `yaml/yml`, optional `zip`
- dangerous file types are rejected

Accepted files are streamed to object storage (S3-compatible). Issue bodies include artifact links and optional redacted excerpts for small text files.

## GitHub integration

- GitHub App auth (App ID + private key)
- installation token minted per configured repository installation
- issues created in target repository with server-controlled labels

Issue title format:

- bug: `[Bug]: ${title}`
- feature: `[Feature]: ${title}`

Issue body includes submission details, telemetry, optional metadata, attachments, and request correlation IDs.
`contact.email` is intentionally not included in public issue body by default.

## Environment variables

See `.env.example` for full contract.

For deployment to Vercel, configure all required variables from `.env.example`, especially:

- `FEEDBACK_API_KEYS_JSON`
- `FEEDBACK_REPOSITORIES_JSON`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- storage variables (`OBJECT_STORAGE_*`) when `ATTACHMENT_STORAGE_BACKEND=s3`
- GitHub App credentials (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`)

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Generate API key hash:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your-raw-key').digest('hex'))"
```

## Response contract

Success:

```json
{
  "status": "ok",
  "githubIssue": {
    "repository": "owner/repo",
    "number": 123,
    "url": "https://github.com/owner/repo/issues/123"
  },
  "requestId": "uuid",
  "submittedAt": "2026-03-09T00:00:00.000Z"
}
```

Failure:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "payload failed validation",
    "details": {}
  },
  "requestId": "uuid"
}
```

## Hurl integration tests

Hurl tests are under `tests/hurl/` and cover:

- success path
- auth failures
- validation failures
- attachment validation
- repository authorization/disabled repo
- rate limiting
- GitHub auth failure
- GitHub issue creation failure

Run:

```bash
npm run test:hurl
```

The suite uses mock GitHub behavior (`GITHUB_MOCK_ENABLED=true`) and memory rate-limit backend for deterministic local/CI runs.

### CI example

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- run: npm run typecheck
- run: npm run test:hurl
```

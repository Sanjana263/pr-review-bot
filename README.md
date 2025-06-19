# 🤖 PR Review Bot

An automated code reviewer for GitHub pull requests. When a PR is opened or
updated, the bot fetches the diff, sends it to Google's Gemini API for
analysis, and posts the review back as a comment on the PR — no human
reviewer required to get a first pass.

## How it works

```
GitHub PR opened/updated
        │
        ▼
 GitHub Webhook  ──POST /webhook──▶  Express server (index.js)
        │                                   │
        │                          verify signature (HMAC SHA-256)
        │                                   │
        │                          fetch PR diff (github.js)
        │                                   │
        │                          send diff to Gemini (gemini.js)
        │                                   │
        │                          post review as PR comment
        ▼                                   ▼
   PR page now shows an AI-generated code review comment
```

1. **`server.js`** — entry point. Loads environment variables, validates
   required config, and starts the Express server.
2. **`index.js`** — the webhook route. Verifies the GitHub signature, checks
   that the event is a relevant `pull_request` action (`opened` or
   `synchronize`), and hands off to the review pipeline.
3. **`github.js`** — talks to the GitHub REST API: fetches the raw PR diff
   and posts the generated review as an issue comment on the PR.
4. **`gemini.js`** — builds a code-review prompt from the diff and calls the
   Gemini API to generate the review text.

## Features

- ✅ Verifies GitHub webhook signatures (HMAC SHA-256) so only genuine
  GitHub events are processed
- ✅ Automatically reviews PRs on `opened` and `synchronize` (new commits
  pushed to an existing PR)
- ✅ Reviews focus on bugs, security issues, performance, missing error
  handling, and readability
- ✅ Truncates very large diffs to stay within Gemini's context limits
- ✅ Fails fast with a clear error if required configuration is missing

## Prerequisites

- Node.js 18+
- A GitHub repository you can add a webhook to
- A [GitHub personal access token](https://github.com/settings/tokens) (or
  GitHub App token) with `repo` scope
- A [Gemini API key](https://aistudio.google.com/app/apikey) from Google AI
  Studio

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/Sanjana263/pr-review-bot.git
   cd pr-review-bot
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   | Variable                | Description                                                        |
   | ----------------------- | ------------------------------------------------------------------ |
   | `PORT`                  | Port the server listens on (default `3000`)                        |
   | `GITHUB_TOKEN`          | GitHub token with `repo` scope, used to read diffs & post comments |
   | `GITHUB_WEBHOOK_SECRET` | Secret shared with the GitHub webhook, used to verify requests     |
   | `GEMINI_API_KEY`        | API key for the Gemini API                                         |

3. **Run the server**

   ```bash
   npm run dev      # with nodemon, auto-restarts on file changes
   # or
   npm start        # plain node
   ```

4. **Expose the server to the internet**

   GitHub needs a public URL to send webhook events to. For local
   development, a tunnel tool like [ngrok](https://ngrok.com/) works well:

   ```bash
   ngrok http 3000
   ```

5. **Add the webhook on GitHub**

   In your repo, go to **Settings → Webhooks → Add webhook**:
   - **Payload URL**: `https://<your-public-url>/webhook`
   - **Content type**: `application/json`
   - **Secret**: same value as `GITHUB_WEBHOOK_SECRET`
   - **Events**: select "Let me select individual events" → check
     **Pull requests**

That's it — open or update a PR on the repo and the bot will post an AI
review comment within a few seconds.

## Project structure

```
.
├── server.js       # loads env vars, validates config, starts the server
├── index.js        # Express app + webhook route + signature verification
├── github.js       # GitHub API calls (fetch diff, post comment)
├── gemini.js       # Gemini API call + review prompt
├── package.json
└── .env.example
```

## Limitations / notes

- Diffs larger than 15,000 characters are truncated before being sent to
  Gemini, so very large PRs may only get a partial review.
- The bot posts a single review comment per event; it doesn't yet leave
  inline, line-specific comments.
- Every `synchronize` event (each new push to the PR) triggers a fresh
  review comment, so active PRs may accumulate multiple review comments
  over time.

## Possible improvements

- Post inline review comments on specific diff lines instead of one
  general comment
- Update/replace the previous bot comment on `synchronize` instead of
  posting a new one each time
- Add retry/backoff for transient GitHub/Gemini API failures
- Add automated tests for the webhook and API integration logic

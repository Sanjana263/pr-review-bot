const express = require('express');
const crypto  = require('crypto');
const { handlePullRequest } = require('./github');

const app = express();

// Keep raw body so we can verify GitHub's signature
app.use(express.raw({ type: 'application/json' }));

// ── Verify the request truly came from GitHub ──────────────────────────────
function verifySignature(req) {
  const secret    = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers['x-hub-signature-256'];

  if (!secret || !signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);

  // timingSafeEqual throws if buffers differ in length, so guard first
  if (sigBuffer.length !== expBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

// ── Webhook endpoint ───────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Step 1: verify signature
  if (!verifySignature(req)) {
    console.log('❌ Invalid signature');
    return res.status(401).send('Unauthorized');
  }

  // Step 2: parse the raw body into JSON
  const payload = JSON.parse(req.body.toString());
  const event   = req.headers['x-github-event'];

  console.log(`📨 Event: ${event}, Action: ${payload.action}`);

  // Step 3: only handle pull_request opened or updated
  if (
    event === 'pull_request' &&
    ['opened', 'synchronize'].includes(payload.action)
  ) {
    const owner      = payload.repository.owner.login;
    const repo       = payload.repository.name;
    const pullNumber = payload.number;

    try {
      await handlePullRequest(owner, repo, pullNumber);
      return res.status(200).send('Review posted');
    } catch (err) {
      console.error('❌ Error:', err.message);
      return res.status(500).send('Internal error');
    }
  }

  res.status(200).send('Event ignored');
});

module.exports = app;

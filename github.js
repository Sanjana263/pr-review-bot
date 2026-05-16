const axios  = require('axios');
const { getGeminiReview } = require('./gemini');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Common headers for all GitHub API calls
const githubHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

// ── Fetch the raw diff of the PR ───────────────────────────────────────────
async function getPullRequestDiff(owner, repo, pullNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

  const response = await axios.get(url, {
    headers: {
      ...githubHeaders,
      Accept: 'application/vnd.github.v3.diff', // tells GitHub: give me the diff, not JSON
    },
    // axios might try to parse the response as JSON — prevent that
    responseType: 'text',
  });

  return response.data; // raw diff string
}

// ── Post a comment on the PR ───────────────────────────────────────────────
async function postComment(owner, repo, pullNumber, reviewText) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

  const body = [
    '## 🤖 AI Code Review (Gemini)',
    '',
    reviewText,
    '',
    '---',
    '*This review was generated automatically by Gemini AI.*',
  ].join('\n');

  await axios.post(
    url,
    { body },
    { headers: { ...githubHeaders, Accept: 'application/vnd.github+json' } }
  );

  console.log(`✅ Comment posted on PR #${pullNumber}`);
}

// ── Orchestrate: diff → Gemini → comment ──────────────────────────────────
async function handlePullRequest(owner, repo, pullNumber) {
  console.log(`🔍 Fetching diff for PR #${pullNumber} in ${owner}/${repo}`);
  const diff = await getPullRequestDiff(owner, repo, pullNumber);

  if (!diff || diff.trim().length === 0) {
    console.log('⚠️  Empty diff — nothing to review');
    return;
  }

  // Cap diff size so we don't exceed Gemini's token limit
  const MAX_LENGTH = 15000;
  const trimmed = diff.length > MAX_LENGTH
    ? diff.slice(0, MAX_LENGTH) + '\n\n[...diff truncated]'
    : diff;

  console.log(`🧠 Sending diff to Gemini...`);
  const review = await getGeminiReview(trimmed);

  console.log(`💬 Posting review comment...`);
  await postComment(owner, repo, pullNumber, review);
}

module.exports = { handlePullRequest };
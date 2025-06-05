require('dotenv').config();
const app = require('./index');

// ── Fail fast if required configuration is missing ─────────────────────────
const REQUIRED_ENV_VARS = ['GITHUB_TOKEN', 'GEMINI_API_KEY', 'GITHUB_WEBHOOK_SECRET'];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in the values before starting the bot.');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🤖 PR Review Bot running on port ${PORT}`);
});

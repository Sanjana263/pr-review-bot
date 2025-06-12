const axios = require('axios');

// ── Send the diff to Gemini and get a code review back ────────────────────
async function getGeminiReview(diff) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `
You are a senior software engineer performing a code review.
Analyze the following pull request diff carefully.

Check for:
- Bugs or logical errors
- Security vulnerabilities (e.g. SQL injection, exposed secrets, unvalidated input)
- Performance issues
- Missing error handling or edge cases
- Code readability and naming clarity
- Anything that should be refactored or improved

Be specific: mention the file name and line context when possible.
Be constructive and concise. If the code looks good overall, say so.

Here is the diff:
\`\`\`diff
${diff}
\`\`\`
`;

  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Gemini returns candidates — grab the first one's text
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned no reviewable content (empty or blocked response)');
  }

  return text;
}

module.exports = { getGeminiReview };

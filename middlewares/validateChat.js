// checks the body of POST /api/chat { question, history? }
//   question -> what the visitor asks (500 characters max, like chat_logs.question)
//   history  -> optional, the last messages of the conversation so Teta remembers the context:
//               [{ role: 'user' | 'teta', text }], 6 messages max

const MAX_HISTORY = 6;

const isMessage = (m) => m && (m.role === 'user' || m.role === 'teta')
  && typeof m.text === 'string' && m.text.length <= 1000;

const RULES = {
  question: { required: true, check: (v) => typeof v === 'string' && v.trim() !== '' && v.length <= 500, message: 'question must be a non-empty string (500 characters max)' },
  history: { required: false, check: (v) => Array.isArray(v) && v.length <= MAX_HISTORY && v.every(isMessage), message: `history must be a list of at most ${MAX_HISTORY} messages { role: 'user' | 'teta', text }` },
};

function validateChat(req, res, next) {
  const body = req.body || {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (body[field] === undefined) {
      if (rule.required) return res.status(400).json({ error: `${field} is required` });
      continue;
    }
    if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }

  next();
}

module.exports = validateChat;

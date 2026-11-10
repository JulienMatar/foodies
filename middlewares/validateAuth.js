// checks the body of POST /api/auth/register and POST /api/auth/login

// simple email check: something@something.something, no spaces
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REGISTER_RULES = {
  name: { check: (v) => typeof v === 'string' && v.trim() !== '' && v.length <= 100, message: 'name must be a non-empty string (100 characters max)' },
  email: { check: (v) => typeof v === 'string' && EMAIL.test(v) && v.length <= 255, message: 'email must be a valid email address' },
  password: { check: (v) => typeof v === 'string' && v.length >= 8 && v.length <= 72, message: 'password must be 8 to 72 characters' },
};

const LOGIN_RULES = {
  email: { check: (v) => typeof v === 'string' && v !== '', message: 'email must be a string' },
  password: { check: (v) => typeof v === 'string' && v !== '', message: 'password must be a string' },
};

// returns a middleware that checks the body against some rules
function checkBody(rules) {
  return (req, res, next) => {
    const body = req.body || {};

    for (const [field, rule] of Object.entries(rules)) {
      if (body[field] === undefined) return res.status(400).json({ error: `${field} is required` });
      if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
    }

    next();
  };
}

const validateRegister = checkBody(REGISTER_RULES);
const validateLogin = checkBody(LOGIN_RULES);

module.exports = { validateRegister, validateLogin };

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const usersModule = require('../modules/users.module');
const { COOKIE_OPTIONS, setLoginCookie, clearLoginCookie, publicUser } = require('../utils/helper1');

// bcrypt "cost": the hash is computed 2^10 times, slow on purpose so stolen hashes are hard to crack
const SALT_ROUNDS = 10;

// POST /api/auth/register { name, email, password }
async function register(req, res) {
  const { name, email, password } = req.body;

  if (await usersModule.findByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // we never save the password itself, only its bcrypt hash
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await usersModule.create({ name: name.trim(), email, password_hash });

  setLoginCookie(res, user); // logged in right after creating the account
  res.status(201).json(publicUser(user));
}

// POST /api/auth/login { email, password }
async function login(req, res) {
  const { email, password } = req.body;
  const user = await usersModule.findByEmail(email);

  // same message for a wrong email and a wrong password: we don't tell strangers which emails exist.
  // a Google-only account has no password_hash, so it can't log in with a password
  const ok = user && user.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Wrong email or password' });

  setLoginCookie(res, user);
  res.json(publicUser(user));
}

// POST /api/auth/logout
function logout(req, res) {
  clearLoginCookie(res);
  res.status(204).end();
}

// GET /api/auth/me
async function me(req, res) {
  const user = await usersModule.findById(req.user.id);
  if (!user) {
    // the account was deleted after the login
    clearLoginCookie(res);
    return res.status(401).json({ error: 'You need to log in' });
  }
  res.json(publicUser(user));
}

// ---------- Google sign-in (OAuth 2.0) ----------
// 1. GET /api/auth/google sends the browser to Google's sign-in page
// 2. Google sends it back to GET /api/auth/google/callback?code=...&state=...
// 3. we trade the code for the user's Google profile, then log them in with our own cookie

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

// GET /api/auth/google
function googleStart(req, res) {
  if (!googleConfigured()) {
    return res.status(500).json({ error: 'Google sign-in is not set up on this server (see GOOGLE_CLIENT_ID in .env)' });
  }

  // a random "state" saved in a cookie and sent to Google: when Google comes back with the same value,
  // we know the sign-in was started here and not by another site (CSRF protection)
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { ...COOKIE_OPTIONS, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
}

// GET /api/auth/google/callback
async function googleCallback(req, res) {
  if (!googleConfigured()) {
    return res.status(500).json({ error: 'Google sign-in is not set up on this server (see GOOGLE_CLIENT_ID in .env)' });
  }

  const { code, state } = req.query;
  const savedState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state', COOKIE_OPTIONS);

  if (!code || !state || state !== savedState) {
    return res.status(400).json({ error: 'Google sign-in failed, please try again' });
  }

  // trade the one-time code for an access token
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return res.status(400).json({ error: 'Google sign-in failed, please try again' });
  const { access_token } = await tokenRes.json();

  // ask Google who the user is: { sub (their Google id), email, email_verified, name }
  const profileRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!profileRes.ok) return res.status(400).json({ error: 'Google sign-in failed, please try again' });
  const profile = await profileRes.json();

  if (!profile.email || !profile.email_verified) {
    return res.status(400).json({ error: 'Your Google email is not verified' });
  }

  // 1. already signed in with Google before  2. has an account with the same email  3. new account
  let user = await usersModule.findByGoogleId(profile.sub);
  if (!user) {
    const existing = await usersModule.findByEmail(profile.email);
    user = existing
      ? await usersModule.linkGoogle(existing.id, profile.sub)
      : await usersModule.createWithGoogle({ name: profile.name || profile.email, email: profile.email, google_id: profile.sub });
  }

  setLoginCookie(res, user);
  res.redirect('/'); // back to the home page, now logged in
}

module.exports = { register, login, logout, me, googleStart, googleCallback };

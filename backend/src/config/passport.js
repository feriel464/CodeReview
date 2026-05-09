const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const pool = require('./db');
const jwt = require('jsonwebtoken');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── GOOGLE STRATEGY ───────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const googleId = profile.id;
    const avatar = profile.photos[0]?.value;

    let result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1, avatar = $2 WHERE id = $3',
          [googleId, avatar, user.id]
        );
      }
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, google_id, avatar, role, created_at) 
         VALUES ($1, $2, $3, $4, 'user', NOW()) 
         RETURNING id, name, email, role`,
        [name, email, googleId, avatar]
      );
      user = newUser.rows[0];
    }

    const token = generateToken(user.id, user.role);
    return done(null, { user, token });

  } catch (error) {
    return done(error, null);
  }
}));

// ─── GITHUB STRATEGY ───────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/api/auth/github/callback`,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `github_${profile.id}@noemail.com`;
    const name = profile.displayName || profile.username || `user_${profile.id}`;
    const githubId = String(profile.id);
    const avatar = profile.photos[0]?.value;

    let result = await pool.query(
      'SELECT * FROM users WHERE github_id = $1 OR email = $2',
      [githubId, email]
    );

    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
      if (!user.github_id) {
        await pool.query(
          'UPDATE users SET github_id = $1, avatar = $2 WHERE id = $3',
          [githubId, avatar, user.id]
        );
      }
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, github_id, avatar, role, created_at) 
         VALUES ($1, $2, $3, $4, 'user', NOW()) 
         RETURNING id, name, email, role`,
        [name, email, githubId, avatar]
      );
      user = newUser.rows[0];
    }

    const token = generateToken(user.id, user.role);
    return done(null, { user, token });

  } catch (error) {
    return done(error, null);
  }
}));

module.exports = passport;
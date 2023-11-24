const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const FindUser = require('./FindUser.js');

const app = express();

// Your existing user authentication logic (FindUser.findByIdPw) goes here

passport.use(new LocalStrategy(
  {
    usernameField: 'Student_id',
    passwordField: 'Student_pw'
  },
  function verify(Student_id, Student_pw, cb) {
    FindUser.findByIdPw(Student_id, Student_pw, function (user) {
      if (user !== false) return cb(null, user);
      return cb(null, false, { message: 'no' });
    });
  }
));

// Serialize user information to store in the token
passport.serializeUser(function (user, done) {
  done(null, user.Student_id);
});

// Deserialize user information from the token
passport.deserializeUser(function (Student_id, done) {
  FindUser.findById(Student_id, function (user) {
    done(null, user);
  });
});

// Middleware to generate and sign a token after successful login
function generateToken(req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      return res.json({ success: false, message: 'login failed' });
    }

    const token = jwt.sign({ user }, 'your_secret_key', { expiresIn: '1h' });
    res.json({ success: true, message: 'login success', token });
  })(req, res, next);
}

// Route for login
app.post('/login', express.json(), generateToken);

// Middleware to protect routes that require authentication
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, 'your_secret_key', (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
}

// Example route that requires authentication
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route', user: req.user });
});

// Example route that requires authentication
app.post('/protected2', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route2', user: req.user });
});

// Your other routes go here

app.listen(1234, () => {
  console.log('Server is running on port 1234');
});

const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const FindUser = require('./FindUser.js');

const app = express();

app.use(passport.initialize());

// 사용자 인증 로직인 FindUser.findByIdPw를 여기에 추가하세요.

passport.use(new LocalStrategy(
    {
      usernameField: 'Student_id',
      passwordField: 'Student_pw'
    },
    function verify(Student_id, Student_pw, cb) {
      console.log(Student_id, Student_pw)
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
    console.log(user);
    if (!user) {
      return res.json({ success: false, message: '로그인 실패' });
    }

    const token = jwt.sign({ user }, 'your_secret_key', { expiresIn: '1h' });
    return res.json({ success: true, message: '로그인 성공', token, Student_id: user.Student_id });
  })(req, res, next);
}

// Route for login
app.post('/login', 
  passport.authenticate('local', { session: false }), 
  (req, res) => {
    // 이 부분은 토큰 발급 후의 로직입니다.
    const token = generateToken(req.user);
    res.json({ success: true, message: 'login success', token });
  }
);

// Your other routes go here

app.listen(1234, () => {
  console.log('서버가 1234 포트에서 실행 중입니다.');
});

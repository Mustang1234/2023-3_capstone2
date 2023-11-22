const express = require('express');
const bodyParser = require('body-parser');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require('passport');
const FindUser = require('./FindUser'); // FindUser는 사용자를 데이터베이스에서 찾는 함수입니다.
const port = 1234;

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your-secret-key',
};

passport.use(new JwtStrategy(opts, (jwtPayload, done) => {
  // 이 부분에서 유효한 토큰을 검증하고 사용자를 찾아야 합니다.
  FindUser.findById(jwtPayload.id, (err, user) => {
    if (err) {
      return done(err, false);
    }
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  });
}));

app.post('/login', async (req, res, next) => {
  try {
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err); }
      if (!user) {
        // 로그인 실패 시 JSON 응답과 함께 리다이렉트
        return res.json({ success: false, message: 'login failed' });
      }
      // 로그인 성공 시 JSON 응답과 함께 리다이렉트
      return res.json({ success: true, message: 'login success', data: user });
    })(req, res, next);
    //res.json({ result: 'success' });
  } catch (error) {
      console.error('Error during first POST request:', error);
      res.status(500).json({ result: 'error', error: error.message });
  }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
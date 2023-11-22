const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require('passport');
const FindUser = require('./FindUser'); // FindUser는 사용자를 데이터베이스에서 찾는 함수입니다.

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
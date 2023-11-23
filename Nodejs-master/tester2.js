const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');

const app = express();

// 사용자 인증 로직인 FindUser.findByIdPw를 여기에 추가하세요.

passport.use(new LocalStrategy(
    {
        usernameField: 'Student_id',
        passwordField: 'Student_pw'
    },
    function verify(Student_id, Student_pw, cb) {
        FindUser.findByIdPw(Student_id, Student_pw, function (user) {
            console.log(Student_id, Student_pw, user)
            if (user !== false) return cb(null, user);
            return cb(null, false, { message: 'no' });
        });
    }
));

// 로그인 성공 후 토큰을 생성하고 서명하는 미들웨어
function generateToken(req, res, next) {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        console.log(user)
        if (err) { return next(err); }
        if (!user) {
            return res.json({ success: false, message: '로그인 실패' });
        }

        const token = jwt.sign({ user }, 'your_secret_key', { expiresIn: '1h' });
        return res.json({ success: true, message: '로그인 성공', token });
    })(req, res, next);
}

// 로그인 라우트
app.post('/login', generateToken);

// 인증이 필요한 라우트를 보호하는 미들웨어
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, 'your_secret_key', (err, payload) => {
        if (err) {
            return res.sendStatus(403);
        }

        req.user = payload.user;
        next();
    });
}

// 인증이 필요한 예제 라우트
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: '보호된 라우트', user: req.user });
});

// 다른 라우트는 여기에 추가하세요.

app.listen(1234, () => {
    console.log('서버가 1234 포트에서 실행 중입니다.');
});

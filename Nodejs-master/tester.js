const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = 1234;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 사용자 데이터베이스 (간단하게 메모리에 저장)
const users = [];

function email_generateToken() {
    return crypto.randomBytes(4).toString('hex');
}

async function sendEmail(email, token) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '32gurihs@gmail.com',
            pass: 'ofqh ukjz kycn orlv'
        }
    });

    const mailOptions = {
        from: '32gurihs@gmail.com',
        to: email,
        subject: '이메일 인증',
        text: `인증을 완료하려면 다음 값을 입력하세요: ${token}`
    };

    await transporter.sendMail(mailOptions);
}

app.get('/verify1', (req, res) => {
    const email = req.query.email;

    // 새로운 사용자 생성
    const user = { email, id: '', pw:'', verified: false, token: email_generateToken(), verified: false };
    users.push(user);

    // 이메일 발송
    sendEmail(email, user.token);

    res.json({ message: '이메일을 확인하세요.' });
});

app.get('/verify2', (req, res) => {
    const email = req.query.email;
    const user_token = req.query.token;

    // 새로운 사용자 생성
    const user = users.find(u => u.token === token);
    if(user && user.email === email){
        user.verified = true;
        res.json({ message: '인증 성공' });
    }
    else{
        res.json({ message: '인증 실패' });
    }
});

app.post('/signup', (req, res) => {
    const email = req.query.email;
    const id = req.query.id;
    const pw = req.query.pw;


    // 토큰을 가진 사용자 찾기
    const user = users.find(u => u.email === email);

    if (user && user.email === email) {
        user.id = id;
        user.pw = pw;
        res.send('회원가입 성공');
    } else {
        res.send('인증되지 않은 이메일 입니다');
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

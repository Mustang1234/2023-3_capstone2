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

// 이메일 인증 토큰 생성 함수
function generateToken() {
  return crypto.randomBytes(20).toString('hex');
}

// 이메일 발송 함수
async function sendEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '32gurihs@gmail.com',
      pass: 'fdsahrEAHJREAJ5eaj43qa#$Q#4qaj43ewkjaa'//jssn mmgn ytdc insn
    }
  });

  const mailOptions = {
    from: '32gurihs@gmail.com',
    to: email,
    subject: '이메일 인증',
    text: `인증을 완료하려면 다음 링크를 클릭하세요: http://20.39.186.138:1234/verify/${token}`
  };

  await transporter.sendMail(mailOptions);
}

// 회원가입 라우트
app.post('/signup', (req, res) => {
  const { email, password } = req.body;

  // 새로운 사용자 생성
  const user = { email, password, verified: false, token: generateToken() };
  users.push(user);

  // 이메일 발송
  sendEmail(email, user.token);

  res.json({ message: '회원가입이 완료되었습니다. 이메일을 확인하세요.' });
});

// 이메일 인증 라우트
app.get('/verify/:token', (req, res) => {
  const token = req.params.token;

  // 토큰을 가진 사용자 찾기
  const user = users.find(u => u.token === token);

  if (user) {
    // 사용자 인증 상태 변경
    user.verified = true;
    res.send('이메일 인증이 완료되었습니다.');
  } else {
    res.status(404).send('유효하지 않은 토큰입니다.');
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

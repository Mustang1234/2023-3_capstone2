const express = require('express');
const bodyParser = require('body-parser');
const template = require('./template.js');

const app = express();
const port = 3000;

// body-parser middleware 설정
app.use(bodyParser.json());

// 첫 번째 POST 요청 처리
app.post('/first-post', (req, res) => {``
    const requestData = req.body;

    // 받은 데이터 확인 (예시: 콘솔 출력)
    console.log('Received data from first POST request:', requestData);

    // 여기에서 필요한 작업 수행

    // 두 번째 POST 요청을 보내기
    const secondPostData = { message: 'Hello from server!' };

    fetch('http://localhost:3000/second-post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(secondPostData),
    })
        .then(response => response.json())
        .then(data => {
            // 두 번째 POST 요청에 대한 응답 확인 (예시: 콘솔 출력)
            console.log('Response from second POST request:', data);
        })
        .catch(error => {
            console.error('Error during second POST request:', error);
        });

    // 첫 번째 POST 요청에 대한 응답
    res.redirect('/login');
});

app.post('/second-post', (req, res) => {
    const requestData = req.body;

    // 받은 데이터 확인 (예시: 콘솔 출력)
    console.log('Received data from second POST request:', requestData);

    // 여기에서 필요한 작업 수행

    // 두 번째 POST 요청을 보내기
    const secondPostData = { message: 'Hello from server2!' };

    res.json({ result: 'success', message: 'First POST request processed.', PostData2: secondPostData });
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
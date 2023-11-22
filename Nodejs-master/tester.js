const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 1234;
const ip = '20.39.186.138';

// body-parser middleware 설정
app.use(bodyParser.json());

// 첫 번째 POST 요청 처리
app.post('/login', async (req, res) => {
    try {
        const requestData = req.body;
        console.log('Received data from first POST request:', requestData);

        const secondPostData = {
            Student_id: requestData.Student_id,
            Student_pw: requestData.Student_pw
        };

        // 두 번째 POST 요청을 보내고 응답을 기다림
        const response = await fetch(`http://${ip}:${port}/login_process`, {
            method: 'POST',
            body: JSON.stringify(secondPostData),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        // 응답이 JSON 형식인지 확인
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }

        const data = await response.json();
        console.log('Response from second POST request:', data);

        // 첫 번째 POST 요청에 응답
        res.json({ result: 'success', data });
    } catch (error) {
        console.error('Error during first POST request:', error);
        res.status(500).json({ result: 'error', error: error.message });
    }
});

app.post('/login_process', (req, res) => {
    const requestData = req.body;
    console.log('Received data from second POST request:', requestData);

    // 두 번째 POST 요청에 응답
    res.json({ result: 'success', data: requestData });
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
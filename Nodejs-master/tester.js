const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 1234;
const ip = '20.39.186.138';

// body-parser middleware 설정
app.use(bodyParser.json());

// 첫 번째 POST 요청 처리
app.post('/first-post', (req, res) => {
    const requestData = req.body;
    
    console.log('Received data from first POST request:', requestData);
    
    const secondPostData = {
        Student_id: requestData.Student_id,
        Student_pw: requestData.Student_pw
      };
      
    console.log('to send:', requestData);

    var data;
    fetch(`http://${ip}:${port}/second-post`, {
        method: 'POST',
        body: JSON.stringify(secondPostData),
    })
        .then(response => response.json())
        .then(_data => {
            data = _data;
            console.log('Response from second POST request:', data);
        })
        .catch(error => {
            console.error('Error during second POST request:', error);
        });

    res.json({ result: 'success', result: data });
});

app.post('/second-post', (req, res) => {
    const requestData = req.body;

    console.log('Received data from second POST request:', requestData);
    const { Student_id, Student_pw } = req.body;
    const secondPostData = { Student_id: Student_id, Student_pw: Student_pw };

    res.json({ result: 'success', result: secondPostData });
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
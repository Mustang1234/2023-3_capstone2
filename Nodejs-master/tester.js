const express = require('express');
const app = express();
const port = 1234;

app.get('/', (req, res) => {
    res.send('Hello, this is your Node.js server!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
/*
npm install -s compression
npm install -s express
npm install -s express-session
npm install -s helmet
npm install -s lodash
npm install -s mysql2
npm install -s passport
npm install -s passport-local
npm install -s puppeteer
npm install -s request
npm install -s sanitize-html
npm install -s session-file-store
npm install -s socket.io
npm install -s xml-js
npm install -s xml2js

    "compression": "^1.7.4",
    "cookie": "^0.5.0",
    "crypto": "^1.0.1",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "helmet": "^7.0.0",
    "lodash": "^4.17.21",
    "mysql": "^2.18.1",
    "mysql2": "^3.6.2",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "puppeteer": "^21.4.1",
    "request": "^2.88.2",
    "sanitize-html": "^1.18.2",
    "session-file-store": "^1.5.0",
    "socket.io": "^4.7.2",
    "xml-js": "^1.6.11",
    "xml2js": "^0.6.2"
*/

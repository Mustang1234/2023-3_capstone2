const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerAutogen = require('swagger-autogen')({ language: 'ko' });

const app = express();
const PORT = 1235;

// Swagger 자동 생성 설정
const doc = {
  info: {
    title: "swagger_api",
    description: "swagger_api",
  },
  host: "http://20.39.186.138",
  schemes: ["http"],
  // schemes: ["https" ,"http"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./main6.js", './db_io.js', './Eclass.js', './FindUser.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);

// Swagger 미들웨어 추가
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger-output.json')));

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
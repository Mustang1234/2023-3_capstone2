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

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./main7.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);

// Swagger 미들웨어 추가
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger_output.json')));

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
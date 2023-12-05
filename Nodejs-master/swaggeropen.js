const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json'); // swagger-autogen이 생성한 파일 경로로 변경

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

const PORT = 1235;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const upload = multer({ limits: { fileSize: 1024 * 1024 } }); // 1MB 제한

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { buffer } = await sharp(req.file.buffer).resize({ width: 500, height: 500 }).jpeg().toBuffer();
    
    // 여기에서 buffer를 사용하여 DB에 저장하거나 다른 작업을 수행합니다.
    console.log(buffer);

    res.status(200).send('Uploaded successfully');
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(4321, () => {
  console.log('Server is running on port 3000');
});
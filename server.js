const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Działa na Koyeb!');
});

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});

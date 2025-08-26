const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '/')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});

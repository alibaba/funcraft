const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'src')));

app.listen(9000, () => {
    console.log(`Express app listening at port 9000`);
})

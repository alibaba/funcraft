const fs = require('fs');

module.exports.handler = function (request, response, context) {
  const puppeteer = require('puppeteer');

  (async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    let url = request.queries['url'];

    if (!url) {
      url = 'https://www.baidu.com';
    }

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'http://' + url;
    }

    const page = await browser.newPage();
    await page.emulateTimezone('Asia/Shanghai');
    await page.goto(url, {
      'waitUntil': 'networkidle2'
    });

    let path = '/tmp/example';
    let contentType;

    if (request.queries['pdf']) {
      contentType = 'application/pdf';
      await page.pdf({
        path: path,
        displayHeaderFooter: false
      });
    } else {
      contentType = 'image/png';
      await page.screenshot({ path: path, fullPage: true, type: 'png' });
    }

    await browser.close();

    response.setStatusCode(200);
    response.setHeader('content-type', contentType);
    response.send(fs.readFileSync(path))
  })();
};
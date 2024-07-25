import puppeteer from 'puppeteer'
import express from 'express'

const app = express()
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app.post('/convert', async(req, res) => {
    try {
        const {html, format, width, height} = req.body
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setContent(html)
        const pdfBuffer = await page.pdf({ format, printBackground: true, width, height })
        await browser.close()
        const text = pdfBuffer.toString('base64')
        res.json({success: true, output: text})
    } catch (error) {
        res.json({success: false, output: error.toString()})
    }
});

app.listen(3002, () => console.log(`Started server at http://localhost:8080!`));

// const server = createServer(async(req, res) => {
//     const browser = await puppeteer.launch()
//     const page = await browser.newPage()
//     const stringHtml = '<div style=display:flex;justify-content:space-between><img alt=test src=data:image/jpeg;base64,{{IMAGE_BASE64}} style=width:20%;text-align:center><h3 style=width:50%;text-align:center>HISTORIA CLÍNICA ODONTOLÓGICA</h3><h4 style=width:20%;text-align:center>HC N°: <span style=text-decoration:underline;text-underline-offset:7px;text-decoration-style:dashed>{{ID_HC}}</span></h4></div>'
//     await page.setContent(stringHtml)
//     const pdfBuffer = await page.pdf({ format: 'a4' })
//     await browser.close()
//     const text = pdfBuffer.toString('base64')

//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'application/json');
//     res.end(JSON.stringify({ a: text }));
// });
// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });
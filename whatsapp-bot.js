const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Initialize WhatsApp client with Render.com-friendly Puppeteer config
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-features=site-per-process'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
        userDataDir: '/opt/render/.cache/puppeteer/userData'
    }
});

// Session handling (simple in-memory store)
const userSessions = new Map();

// Offline state
let isOffline = false;
const offlineMessage = '🌙 Sorry, I’m offline right now! I’ll be back online after 8 AM. Type .menu when I’m back!';

// Admin number (replace with your WhatsApp number, e.g., '1234567890@c.us')
const adminNumber = 'YOUR_ADMIN_NUMBER@c.us';

// Log file setup
const logFile = path.join(__dirname, 'message-logs.txt');
const logMessage = (from, message) => {
    const logEntry = `[${new Date().toISOString()}] ${from}: ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
};

// Menu configuration
const menu = {
    main: `📋 *Main Menu*  
1. .help - Get help  
2. .about - About this bot  
3. .menu - Show this menu  
4. .image - Get a sample image  
Type a command to proceed!`,
    help: `ℹ️ *Help*  
Use commands like .menu, .about, or .image.  
For support, contact admin.`,
    about: `🤖 *About*  
This is a simple WhatsApp bot built with Node.js.  
Features: Auto-replies, commands, media support, and offline mode.`
};

// Check if bot is offline (time-based or manual)
const isBotOffline = () => {
    const currentHour = new Date().getHours();
    // Offline between 10 PM and 8 AM
    const timeBasedOffline = currentHour >= 22 || currentHour < 8;
    return isOffline || timeBasedOffline;
};

// QR code for WhatsApp authentication
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code to log in.');
});

// When client is ready
client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
});

// Message handling
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const from = msg.from;
    const message = msg.body.trim().toLowerCase();

    // Log every message
    logMessage(from, message);

    // Check if bot is offline
    if (isBotOffline() && message !== '.offline') {
        msg.reply(offlineMessage);
        return;
    }

    // Session handling: Track user state
    if (!userSessions.has(from)) {
        userSessions.set(from, { lastCommand: null, language: 'en' });
    }
    const session = userSessions.get(from);

    // Admin command to toggle offline mode
    if (message === '.offline' && from === adminNumber) {
        isOffline = !isOffline;
        msg.reply(`Bot is now ${isOffline ? 'OFFLINE' : 'ONLINE'}.`);
        session.lastCommand = 'offline';
        userSessions.set(from, session);
        return;
    }

    // Auto-reply for non-commands
    if (!message.startsWith('.')) {
        if (chat.isGroup) {
            // Group chat auto-reply
            msg.reply('👋 Hey, I’m active in groups! Use .menu for commands.');
        } else {
            // Individual chat auto-reply
            msg.reply('😊 Hi! Type .menu to see what I can do.');
        }
        return;
    }

    // Command handling
    switch (message) {
        case '.menu':
            session.lastCommand = 'menu';
            msg.reply(menu.main);
            break;

        case '.help':
            session.lastCommand = 'help';
            msg.reply(menu.help);
            break;

        case '.about':
            session.lastCommand = 'about';
            msg.reply(menu.about);
            break;

        case '.image':
            session.lastCommand = 'image';
            try {
                // Sample image (use URL for Render.com)
                const media = await MessageMedia.fromUrl('https://via.placeholder.com/150');
                await client.sendMessage(from, media, { caption: 'Here’s a sample image! 🖼️' });
            } catch (error) {
                msg.reply('❌ Error sending image. Try again later.');
                console.error('Image error:', error);
            }
            break;

        default:
            msg.reply('🤔 Unknown command. Type .menu for options.');
            break;
    }

    // Update session
    userSessions.set(from, session);
});

// Group chat handling
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    if (chat.isGroup && msg.body.startsWith('.group')) {
        msg.reply(`👥 Group: ${chat.name}\nUse .menu for group commands.`);
    }
});

// Error handling with retry logic
client.on('error', async (error) => {
    console.error('Client error:', error);
    if (error.message.includes('Session closed')) {
        console.log('Retrying client initialization...');
        await client.destroy();
        await client.initialize();
    }
});

// Initialize client with retry
async function initializeClient() {
    try {
        await client.initialize();
    } catch (error) {
        console.error('Initialization failed:', error);
        setTimeout(initializeClient, 5000); // Retry after 5 seconds
    }
}

initializeClient();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
});

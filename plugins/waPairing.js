const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@fizzxydev/baileys-pro');

const pino = require('pino');
const NodeCache = require('node-cache');
const path = require('path');
const fs = require('fs');

async function connectWithPairing(phoneNumber) {
const sessionDir = path.join(__dirname, '../Storage/session');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    printQRInTerminal: false,
  });

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(phoneNumber, 'NETLIFYBOT');
    return { status: 'success', pairingCode: code };
  }

  return { status: 'already_connected' };
}

module.exports = { connectWithPairing };

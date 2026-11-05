/* ══ AUDIT DE SÉCURITÉ DU 5 NOVEMBRE 2026 — DEUX FAILLES CONFIRMÉES SUR LE VRAI SERVEUR, ISOLÉ ══════════════════════════════════════
   1. `/api/sendmail`, mode avancé : le serveur SMTP vient de l'appelant (`smtp.host`, `smtp.port`). Joué avant le correctif, avec un service local qui parle
      en premier : sa bannière revenait mot pour mot dans l'erreur (`Invalid greeting. response=SSH-2.0-…`) et un port fermé répondait `ECONNREFUSED`. Toute
      entreprise cliente (une clé d'équipe suffit) faisait de TEAM OP un balayeur de ports de son propre réseau. Le correctif (`server/hote-public.js`) refuse
      toute adresse non publique AVANT de se connecter : le service interne ne voit pas même une connexion.
   2. `/api/devis/generer` : l'authentification est le NOM de l'entreprise, qui n'est pas un secret — et l'espace de la bêta est activé d'office, son nom écrit
      dans `beta.html`. Un anonyme épuisait le quota GLOBAL (100 par jour) : le Devis IA de TOUTES les entreprises répondait 429. Bornes : par adresse, par
      entreprise, et une réserve de la bêta HORS du quota commun.
   Ce que ce banc joue : le VRAI serveur (config, données, port à lui, 127.0.0.1), un faux fournisseur de modèle (`ANTHROPIC_BASE_URL`) qui COMPTE ses appels,
   une entreprise de l'annuaire avec sa clé. Rien ne sort de la machine. Les adresses privées se jouent aussi en unités (DNS injecté).
   Mutations jouées APRÈS le commit : retirer le contrôle d'hôte (bannière qui revient), retirer la réserve de la bêta (le quota commun se vide). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const dormir = ms => new Promise(r => setTimeout(r, ms));
let webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
catch (e) { console.log('  … banc non exécuté : server/node_modules absent'); console.log('\n0 ✓  0 ✗'); process.exit(0); }
const { hotePublic, adressePrivee } = require(path.join(RACINE, 'server', 'hote-public.js'));

(async () => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3281-'));
  let enfant = null; const fermer = [];
  const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} for (const s of fermer) { try { s.close(); } catch (e) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  try {
    /* ── 0. Les adresses, en unités (aucun réseau) ── */
    for (const a of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.0.9', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1'])
      vrai('adresse non publique refusée : ' + a, adressePrivee(a));
    for (const a of ['8.8.8.8', '51.38.0.1', '172.32.0.1', '2606:4700:4700::1111', '2001:4860:4860::8888'])
      vrai('adresse publique acceptée : ' + a, !adressePrivee(a));
    const lookupDe = (liste) => async () => liste;
    let r = await hotePublic('smtp.exemple.fr', { lookup: lookupDe([{ address: '51.38.0.1', family: 4 }]) });
    v('un nom public rend l\'ADRESSE à joindre et garde le nom pour le certificat', r, { ip: '51.38.0.1', nom: 'smtp.exemple.fr' });
    const refuse = async (h, lk, code) => { try { await hotePublic(h, { lookup: lk }); return 'accepté'; } catch (e) { return e.code; } };
    v('un nom qui se résout sur 127.0.0.1 est refusé (le DNS d\'un attaquant)', await refuse('mail.attaquant.fr', lookupDe([{ address: '127.0.0.1', family: 4 }])), 'hote_non_public');
    v('un nom qui mêle une adresse publique et une privée est refusé', await refuse('mix.attaquant.fr', lookupDe([{ address: '51.38.0.1', family: 4 }, { address: '10.0.0.5', family: 4 }])), 'hote_non_public');
    v('un nom qui ne se résout pas est dit introuvable', await refuse('nexiste.pas', async () => { throw new Error('ENOTFOUND'); }), 'hote_introuvable');
    v('« localhost » est refusé sans même interroger le DNS', await refuse('localhost', async () => { throw new Error('ne devait pas être appelé'); }), 'hote_non_public');
    v('un hôte à caractères de contrôle est refusé', await refuse('a b\r\nc', lookupDe([])), 'hote_invalide');
    v('le drapeau des bancs ouvre la boucle locale', (await hotePublic('127.0.0.1', { autoriseLocal: true })).ip, '127.0.0.1');

    /* ── le serveur, isolé ── */
    const interne = net.createServer(s => { interne.vues = (interne.vues || 0) + 1; s.on('error', () => {}); s.write('SSH-2.0-OpenSSH_9.6 BANNIERE-INTERNE-QZW\r\n'); s.end(); });
    await new Promise(res => interne.listen(0, '127.0.0.1', res)); fermer.push(interne);
    const PI = interne.address().port;
    /* faux fournisseur de modèle : compte ses appels, répond un devis minimal */
    let appelsModele = 0;
    const faux = http.createServer((q, s) => { let c = ''; q.on('data', d => c += d); q.on('end', () => {
      appelsModele++;
      s.setHeader('content-type', 'application/json');
      s.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: 'claude-x', stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: JSON.stringify({ lignes: [{ designation: 'Prestation banc', quantite: 1, unite: 'u', prixUnitaire: 10 }] }) }], usage: { input_tokens: 1, output_tokens: 1 } }));
    }); });
    await new Promise(res => faux.listen(0, '127.0.0.1', res)); fermer.push(faux);
    const PF = faux.address().port;

    const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
    const vap = webpush.generateVAPIDKeys();
    const CLE = 'cle-privee-banc-3281', kh = crypto.createHash('sha256').update(CLE).digest('hex');
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
    fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      smtp: { host: '127.0.0.1', port: 9, user: 'plateforme@banc-3281.fr', pass: 'x', from: '"P" <plateforme@banc-3281.fr>' },
      anthropic: { cleApi: 'cle-banc', quotaJour: 6, quotaBeta: 3, quotaEquipeJour: 4 } }));
    const espace = (t, nom) => ({ slug: nom, nom, email: nom + '@exemple.fr', t, code: b64({ t, k: CLE }), ts: 1 });
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'ent-a': espace('ent-a-9x', 'ent-a'), 'ent-b': espace('ent-b-7y', 'ent-b') }));
    fs.writeFileSync(path.join(D, 'devis-acces.json'), JSON.stringify({ 'ent-a-9x': { actif: true, moteur: 'deux' }, 'ent-b-7y': { actif: true, moteur: 'deux' } }));
    const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
    let journal = '';
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + PF, TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9',
      TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    const base = 'http://127.0.0.1:' + PORT;
    let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(base + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    vrai('le serveur démarre', vivant, journal.slice(-300));
    let n = 0;
    const appel = async (m, p, corps, ent) => {
      const rep = await fetch(base + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.' + (++n >> 8 & 255) + '.' + (n & 255) }, ent || {}), body: m === 'GET' ? undefined : JSON.stringify(corps || {}) });
      const t = await rep.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
      return { code: rep.status, t, j };
    };
    const preuve = { 'x-teamop-kh': kh };

    /* ── 1. sendmail, mode avancé ── */
    const envoi = (hote, port) => appel('POST', '/api/sendmail', { teamId: 'ent-a-9x', to: 'dest@exemple.fr', subject: 'banc', text: 'x', smtp: { host: hote, port, user: 'u', pass: 'p' } }, preuve);
    r = await envoi('127.0.0.1', PI);
    v('⛔ SMTP « avancé » vers un service local : 400 hote_non_public', [r.code, r.j && r.j.code], [400, 'hote_non_public']);
    vrai('… la bannière du service interne ne revient PAS dans la réponse', !/BANNIERE-INTERNE-QZW|SSH-2/.test(r.t), r.t);
    await dormir(300);
    v('… et le service interne n\'a vu AUCUNE connexion', interne.vues || 0, 0);
    r = await envoi('127.0.0.1', 1);
    vrai('un port fermé ne se dit plus ECONNREFUSED (pas d\'oracle de balayage)', r.code === 400 && !/ECONNREFUSED/.test(r.t), r.t);
    for (const h of ['10.0.0.1', '169.254.169.254', '[::1]', '::1', '::ffff:127.0.0.1', '192.168.1.1', '100.64.0.1', 'localhost']) {
      r = await envoi(h, 25);
      vrai('refusé : ' + h, r.code === 400 && r.j && /^hote_/.test(r.j.code || ''), [r.code, r.t]);
    }
    r = await appel('POST', '/api/sendmail', { teamId: 'ent-a-9x', to: 'dest@exemple.fr', subject: 'banc', text: 'x', smtp: { host: 'x'.repeat(300) + '.fr', port: 25, user: 'u', pass: 'p' } }, preuve);
    vrai('un nom trop long est refusé proprement (400, pas 500)', r.code === 400, r.t);

    /* ── 2. Devis IA ── */
    const devis = (team) => appel('POST', '/api/devis/generer', { team, demande: 'Remplacer un robinet dans une cuisine' });
    const etat = async () => (await appel('GET', '/api/devis/etat')).j;
    const beta = []; for (let i = 0; i < 5; i++) beta.push((await devis('opgestion-beta')).code);
    v('⛔ la bêta : 3 devis puis 429 (sa réserve à elle)', beta, [200, 200, 200, 429, 429]);
    v('… le fournisseur de modèle n\'a été appelé que 3 fois', appelsModele, 3);
    v('⛔ … et le quota COMMUN n\'a pas bougé : la bêta ne peut pas priver un client', (await etat()).utilises, 0);
    const a = []; for (let i = 0; i < 6; i++) a.push((await devis('ent-a-9x')).code);
    v('une entreprise : 4 devis (sa part du jour) puis 429', a, [200, 200, 200, 200, 429, 429]);
    v('… le quota commun compte ses 4 devis', (await etat()).utilises, 4);
    const b = []; for (let i = 0; i < 3; i++) b.push((await devis('ent-b-7y')).code);
    v('⛔ une AUTRE entreprise garde sa réserve : 2 devis puis le plafond commun (6)', b, [200, 200, 429]);
    r = await devis('inconnue-xyz');
    v('une entreprise non activée reste refusée (401)', r.code, 401);
    v('… sans consommer le modèle : 3 + 4 + 2 = 9 appels au total', appelsModele, 9);
    r = await appel('POST', '/api/devis/generer', { team: 'ent-b-7y', demande: 'ok' });
    v('une demande trop courte reste un 400 (la validation d\'avant est intacte)', r.code, 400);
    vrai('rien d\'inattendu au journal du serveur', !/TypeError|ReferenceError|unhandled/i.test(journal), journal.slice(-300));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  finally { fin(); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
})();

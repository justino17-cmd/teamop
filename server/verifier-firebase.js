#!/usr/bin/env node
/* ══ AVANT DE FERMER LA RÈGLE FIRESTORE — LA LISTE DE CONTRÔLE, AUTOMATISÉE ══════════════════
 *
 * Usage, SUR LE VPS :   node /opt/teamop/repo/server/verifier-firebase.js
 *
 * ⛔ POURQUOI CE FICHIER EXISTE. Le 18 septembre 2026, mesuré depuis l'extérieur avec un compte
 * anonyme et des identifiants d'espace INEXISTANTS : la règle publiée chez Google n'est PAS
 * celle du dépôt. `firestore.rules` dit « publié le 11 septembre, chaque entreprise enfermée
 * chez elle » ; en réalité `allow read` laisse passer n'importe quel compte anonyme, et la clé
 * d'accès Firebase est dans `app.html`, qui est public.
 *
 * Refermer n'est PAS un clic sans risque : la règle exige un jeton qui NOMME l'entreprise, et
 * tout appareil incapable d'en présenter un perd l'accès aux données de SA PROPRE entreprise.
 * Les quatre conditions du 11 septembre doivent donc être revérifiées — et les vérifier à la
 * main, dans la Tour, en lisant des compteurs, c'est précisément ce qui a permis à l'écart
 * entre le dépôt et la console de passer inaperçu pendant une semaine.
 *
 * Ce programme les vérifie POUR DE VRAI, en demandant un vrai jeton pour chaque espace de
 * l'annuaire, par le vrai chemin (`POST /api/fb/jeton` en local), et en faisant ÉCHANGER l'un
 * d'eux par Google. Il ne modifie rien, n'écrit rien, ne publie rien.
 *
 * ⛔ IL N'AFFICHE AUCUN SECRET : ni clé d'équipe, ni jeton, ni contenu. Seulement des
 * identifiants d'espace — ce sont ceux que la Tour affiche déjà à son patron — et des verdicts.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const FB_ADMIN_PATH = process.env.TEAMOP_FB_ADMIN || '/opt/teamop/firebase-admin.json';
const LOCAL = process.env.TEAMOP_LOCAL || 'http://127.0.0.1:8080';

const lire = (p, defaut) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return defaut; } };
const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');

(async () => {
  console.log('\n══ Firestore — ce qu\'il faut AVANT de publier la règle ══\n');

  /* ── 1. La clé d'administration ─────────────────────────────────────────────────────────
     Sans elle, le serveur ne signe aucun jeton : publier la règle couperait TOUT LE MONDE.
     On ne se contente pas de « le fichier existe » — c'est Google qui décide s'il l'accepte
     encore. Une clé révoquée dans la console ressemble en tout point à une clé valable. */
  const admin = lire(FB_ADMIN_PATH, null);
  const adminOk = !!(admin && admin.client_email && admin.private_key);
  console.log('1. Clé d\'administration Firebase : ' + (adminOk ? '✓ présente (' + String(admin.client_email).split('@')[0].slice(0, 12) + '…)' : '⛔ ABSENTE OU INCOMPLÈTE'));
  if (!adminOk) { console.log('\n⛔ ON S\'ARRÊTE LÀ. Sans cette clé, aucun appareil ne peut être authentifié :\n   publier la règle couperait toutes les entreprises, sans exception.\n'); process.exit(1); }

  /* ── 2. Le serveur répond-il, et l'annuaire est-il là ? ─────────────────────────────── */
  let sante = null;
  try { sante = await (await fetch(LOCAL + '/health')).json(); } catch (e) {}
  console.log('2. Serveur local : ' + (sante && sante.ok ? '✓ en route' : '⛔ injoignable sur ' + LOCAL));
  if (!sante || !sante.ok) { console.log('\n   Lancer d\'abord : systemctl start teamop-api\n'); process.exit(1); }

  const espaces = lire(path.join(DATA_DIR, 'espaces.json'), {});
  const lignes = Object.values(espaces || {}).filter(e => e && e.code);
  console.log('3. Annuaire : ' + lignes.length + ' espace(s) enregistré(s)\n');
  if (!lignes.length) { console.log('   Annuaire vide — rien à vérifier.\n'); process.exit(0); }

  /* ── 3. UN VRAI JETON POUR CHAQUE ESPACE ────────────────────────────────────────────────
     C'est le cœur : on rejoue, espace par espace, exactement ce que fera l'application le jour
     où la règle sera fermée. Un espace qui reçoit 200 passera ; tout le reste sera coupé. */
  console.log('── Chaque espace obtiendrait-il un jeton, une fois la règle fermée ? ──');
  const bons = [], partagee = [], techniques = [], autres = [];
  let unJeton = '';
  for (const e of lignes) {
    let t = e.t || '', k = '';
    try { const d = JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')); t = t || d.t || ''; k = String(d.k || ''); } catch (err) {}
    if (!t || !k) { autres.push({ t: t || '(illisible)', motif: 'code d\'espace illisible' }); continue; }
    let r = null, j = {};
    try {
      r = await fetch(LOCAL + '/api/fb/jeton', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t, kh: sha(k) }) });
      j = await r.json().catch(() => ({}));
    } catch (err) { autres.push({ t, motif: 'appel impossible : ' + err.message }); continue; }
    if (r.status === 200 && j.jeton) { bons.push(t); if (!unJeton) unJeton = j.jeton; console.log('  ✓ ' + t.padEnd(28) + 'jeton délivré'); }
    else if (r.status === 409) { partagee.push(t); console.log('  ⛔ ' + t.padEnd(28) + 'ENCORE SUR LA CLÉ PARTAGÉE — serait coupé'); }
    /* ⛔ UN ESPACE TECHNIQUE N'EST PAS UNE ANOMALIE, et le confondre rendrait ce programme
       inutilisable : l'annuaire en contient par construction (le repli, la bêta), le serveur
       leur refuse un jeton EXPRÈS — leur clé est publique, une preuve venant d'eux ne prouve
       rien. Sans cette distinction, le verdict dirait « ne pas publier » à tout jamais, et on
       finirait par publier en l'ignorant : une liste de contrôle qui crie toujours ne protège
       plus personne. Ils n'hébergent aucune entreprise ; la règle fermée ne coupe personne. */
    else if (r.status === 403 && /repli|technique/i.test(String(j.error || ''))) {
      techniques.push(t); console.log('  · ' + t.padEnd(28) + 'espace technique — pas de jeton, c\'est voulu');
    }
    else { autres.push({ t, motif: 'HTTP ' + r.status + ' ' + (j.error || '') }); console.log('  ⚠ ' + t.padEnd(28) + 'HTTP ' + r.status + ' ' + (j.error || '')); }
  }

  /* ── 4. GOOGLE ACCEPTE-T-IL CE QUE LE SERVEUR SIGNE ? ───────────────────────────────────
     Un jeton signé par une clé RÉVOQUÉE se fabrique parfaitement et se fait refuser à
     l'échange. C'est la panne qui ne se voit qu'au moment où plus rien ne marche. On échange
     donc pour de vrai — et on s'arrête là : on ne LIT aucun document d'entreprise. */
  console.log('\n── Google accepte-t-il un jeton signé par ce serveur ? ──');
  if (!unJeton) console.log('  (aucun jeton à éprouver — aucun espace n\'en a obtenu)');
  else {
    const cleApi = ((lire(CONFIG_PATH, {}) || {}).firebase || {}).apiKey || 'AIzaSyAbah03sO4f4LyNhvmig0Pn00lz1sHSpT8';
    try {
      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + cleApi,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: unJeton, returnSecureToken: true }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 200 && j.idToken) console.log('  ✓ échange RÉUSSI — la clé d\'administration est valable chez Google');
      else console.log('  ⛔ ÉCHANGE REFUSÉ (HTTP ' + r.status + ') : ' + ((j.error && j.error.message) || '') + '\n     La clé d\'administration est peut-être révoquée côté console Firebase.');
    } catch (err) { console.log('  ⚠ échange impossible (réseau) : ' + err.message); }
  }

  /* ── 5. LES APPAREILS — LA CONDITION QUI PEUT COUPER UN CLIENT QUI TRAVAILLE ────────────
     C'est la quatrième condition du 11 septembre, et la seule que ce programme ne rejouait pas :
     « tous les appareils présentent le jeton ». Le seuil qui compte n'est PAS la version exigée
     du moment (695 aujourd'hui) mais la **v640** — celle à partir de laquelle l'application
     DEMANDE un jeton. Un appareil en dessous se connectera en anonyme, et la règle fermée ne
     lui donnera rien : il perdra l'accès aux données de sa propre entreprise sans comprendre
     pourquoi. Un appareil au-dessus se met à jour tout seul et va bien.
     ⛔ Et l'autre moitié du même risque : un espace ACTIF qui n'est pas dans l'annuaire n'a
     aucun code enregistré, donc aucune preuve vérifiable, donc jamais de jeton. */
  const PLANCHER_JETON = 640;
  console.log('\n── Les appareils vus ces 7 derniers jours savent-ils demander un jeton ? ──');
  const cnx = lire(path.join(DATA_DIR, 'connexions.json'), {});
  const j7 = Date.now() - 7 * 86400000;
  const connus = new Set(lignes.map(e => { try { return e.t || JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t; } catch (err) { return e.t || ''; } }));
  let vieux = 0, recents = 0, sansVersion = 0;
  const horsAnnuaire = [];
  for (const t of Object.keys(cnx || {})) {
    const app = new Map();
    for (const x of (cnx[t] || [])) {
      if ((x.ts || 0) < j7 || !x.dev) continue;
      const v = parseInt(String(x.version || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (!app.has(x.dev) || (x.ts || 0) > app.get(x.dev).ts) app.set(x.dev, { ts: x.ts || 0, v });
    }
    if (!app.size) continue;
    if (!connus.has(t)) horsAnnuaire.push({ t, n: app.size });
    for (const d of app.values()) {
      if (!d.v) sansVersion++;
      else if (d.v < PLANCHER_JETON) vieux++;
      else recents++;
    }
  }
  console.log('  ' + recents + ' appareil(s) en v' + PLANCHER_JETON + ' ou plus — ils demanderont un jeton');
  if (vieux) console.log('  ⛔ ' + vieux + ' appareil(s) SOUS la v' + PLANCHER_JETON + ' — ils seraient coupés');
  if (sansVersion) console.log('  ⚠ ' + sansVersion + ' appareil(s) sans version connue — à regarder dans la Tour');
  if (!recents && !vieux && !sansVersion) console.log('  (aucune connexion enregistrée sur 7 jours — rien à conclure)');
  if (horsAnnuaire.length) {
    console.log('  ⛔ ' + horsAnnuaire.length + ' espace(s) ACTIFS mais HORS ANNUAIRE — sans code enregistré, jamais de jeton :');
    horsAnnuaire.forEach(h => console.log('      · ' + h.t + ' (' + h.n + ' appareil(s) sur 7 j)'));
  } else console.log('  ✓ aucun espace actif hors annuaire');

  /* ── 6. LE VERDICT ──────────────────────────────────────────────────────────────────────
     Une liste de contrôle ne sert à rien si elle laisse le lecteur décider. Elle tranche. */
  console.log('\n══ VERDICT ══');
  console.log('  ' + bons.length + ' espace(s) passeraient la règle fermée');
  console.log('  ' + partagee.length + ' espace(s) SERAIENT COUPÉS (encore sur la clé partagée)');
  console.log('  ' + techniques.length + ' espace(s) technique(s) — sans jeton par construction, aucune entreprise dessus');
  console.log('  ' + autres.length + ' espace(s) en anomalie');
  autres.forEach(a => console.log('      · ' + a.t + ' — ' + a.motif));
  console.log('  ' + recents + ' appareil(s) prêts · ' + vieux + ' trop anciens · ' + horsAnnuaire.length + ' espace(s) actifs hors annuaire');
  console.log();
  if (partagee.length || autres.length || vieux || horsAnnuaire.length) {
    console.log('⛔ NE PAS PUBLIER LA RÈGLE EN L\'ÉTAT.');
    console.log('   Ce qui est signalé ci-dessus perdrait l\'accès à ses propres données.');
    if (partagee.length) console.log('   · clé partagée : donner sa clé personnelle depuis la Tour, puis rouvrir l\'application une fois.');
    if (vieux) console.log('   · appareils trop anciens : les faire rouvrir l\'application (elle se met à jour seule).');
    if (horsAnnuaire.length) console.log('   · espace hors annuaire : l\'inscrire, ou vérifier que plus personne ne s\'en sert.');
    console.log();
    process.exit(2);
  }
  console.log('✅ TOUT EST PRÊT. La règle de firestore.rules peut être publiée dans la console.');
  console.log('   Firestore Database → onglet Règles → tout remplacer → Publier.');
  console.log('   ⚠️ Et faire revérifier juste après : une règle publiée se vérifie de l\'extérieur,');
  console.log('      pas sur la foi de la console.\n');
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });

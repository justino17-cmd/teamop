#!/usr/bin/env node
/* ══ VÉRIFIER L'OUVRIER DE TRANSCRIPTION — CE QUE L'INSTALLATION PROUVE AVANT DE RIEN PROPOSER AUX PERSONNES ══════════════════════════════════════
 *
 * Usage, sur le VPS, en root (la configuration de l'ouvrier n'est lisible que par root et par son compte) — `install-transcription.sh` le lance lui-même :
 *
 *      OPMSG_TRANSCRIRE_CONFIG=/etc/opmsg/transcrire-beta.json node /opt/opmsg/beta/current/outils/verifier-transcription.js beta <échantillon.wav>
 *
 * Ce que ça répond, ligne à ligne, ✓ ou ✗ :
 *   · sa SOCKET n'est joignable que par son groupe (0660 : le service de l'instance, et personne d'autre — relecture du gardien : un port de la boucle
 *     locale se squattait) ;
 *   · l'ouvrier REFUSE qui ne présente pas le secret (401), et qui en présente un faux (401) : un processus qui atteindrait la socket ne lui ferait
 *     rien calculer ;
 *   · avec le secret, sa sonde répond, et dit ses programmes et son modèle EN PLACE (`ok`) ;
 *   · il TRANSCRIT pour de vrai l'échantillon de whisper.cpp (un discours public de 1961, en anglais — « … what your country can do for you … ») : le texte
 *     rendu doit contenir « country ». C'est la seule preuve que ffmpeg, whisper.cpp, le modèle ET le bac à sable de l'unité (mémoire, cœurs, dossier de
 *     travail en mémoire vive, aucune sortie réseau) marchent ensemble.
 *
 * ⛔ AUCUN SECRET NE S'AFFICHE : ni le secret, ni la configuration. Justin recolle toutes les sorties du VPS dans la conversation (règle du 24 septembre 2026) :
 * la sortie de ce fichier ne porte que des ✓/✗, des codes de réponse, des durées. Le texte de l'échantillon n'est pas recopié non plus (un mot cherché suffit).
 * Aucune dépendance : `http` de Node, sur la socket (ou un port de la boucle locale, pour les bancs).
 */
'use strict';
const fs = require('fs'), http = require('http');

const DELAI_SONDE_MS = 5000;
const DELAI_CALCUL_MS = 180000;      // l'échantillon dure 11 s : ~15 s de calcul sur 2 cœurs, bien davantage sur une machine chargée — on laisse de la marge

/* une requête à l'ouvrier, par sa socket (`cfg.socket`) ou un port de la boucle locale (`cfg.port`, les bancs) — la réponse bornée à 1 Mo */
function requete(cfg, chemin, init, delaiMs) {
  init = init || {};
  return new Promise((resolve) => {
    let fini = false;
    const finir = (v) => { if (!fini) { fini = true; resolve(v); } };
    const q = http.request(Object.assign(cfg.socket ? { socketPath: cfg.socket } : { host: '127.0.0.1', port: cfg.port },
      { path: chemin, method: init.method || 'GET', headers: Object.assign({}, init.headers || {}, init.body ? { 'content-length': init.body.length } : {}) }), (r) => {
      const morceaux = []; let n = 0;
      r.on('data', (d) => { n += d.length; if (n <= 1048576) morceaux.push(d); else r.destroy(); });
      r.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(morceaux).toString('utf8')); } catch (e) { j = null; } finir({ statut: r.statusCode, json: j }); });
      r.on('error', () => finir({ statut: 0, json: null, erreur: 'coupee' }));
    });
    q.setTimeout(delaiMs || DELAI_SONDE_MS, () => { q.destroy(); finir({ statut: 0, json: null, erreur: 'delai' }); });
    q.on('error', (e) => finir({ statut: 0, json: null, erreur: (e && e.code) || 'erreur' }));
    q.end(init.body || undefined);
  });
}
const ditStatut = (r) => r.statut ? 'HTTP ' + r.statut : 'injoignable (' + String(r.erreur).replace(/[^A-Za-z_]/g, '') + ')';

async function verifier(cfg, echantillon) {
  const res = [];
  if (cfg.socket) {
    let m = null; try { const st = fs.statSync(cfg.socket); m = st.isSocket() ? (st.mode & 0o777) : -1; } catch (e) { m = null; }
    res.push({ nom: 'sa socket n\'est joignable que par son groupe (0660)', ok: m === 0o660, detail: m === null ? 'absente' : m === -1 ? 'ce n\'est pas une socket' : 'droits ' + m.toString(8) });
    if (m !== 0o660) return res;           // ⛔ une socket qui n'est pas la sienne (ou ouverte à tous) ne reçoit pas le secret
  }
  const sans = await requete(cfg, '/sante');
  res.push({ nom: 'l\'ouvrier refuse qui ne présente pas le secret', ok: sans.statut === 401, detail: ditStatut(sans) });
  const faux = await requete(cfg, '/sante', { headers: { authorization: 'Bearer ' + 'x'.repeat(48) } });
  res.push({ nom: 'l\'ouvrier refuse un secret faux', ok: faux.statut === 401, detail: ditStatut(faux) });
  const auth = { authorization: 'Bearer ' + cfg.secret };
  const sante = await requete(cfg, '/sante', { headers: auth });
  res.push({ nom: 'avec le secret, sa sonde répond et dit ses programmes et son modèle en place', ok: sante.statut === 200 && !!sante.json && sante.json.ok === true, detail: ditStatut(sante) + (sante.json && sante.json.ok === false ? ' — whisper-cli, ffmpeg ou un modèle manque ou n\'est pas lisible par son compte' : '') });
  if (!(sante.statut === 200 && sante.json && sante.json.ok === true)) return res;
  let octets;
  try { octets = fs.readFileSync(echantillon); } catch (e) { res.push({ nom: 'l\'échantillon se lit', ok: false, detail: String(e && e.code) }); return res; }
  const t0 = Date.now();
  const tr = await requete(cfg, '/transcrire', { method: 'POST', headers: Object.assign({ 'content-type': 'application/octet-stream', 'x-langue': 'en' }, auth), body: octets }, DELAI_CALCUL_MS);
  const s = ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',');
  const texte = tr.json && typeof tr.json.texte === 'string' ? tr.json.texte : '';
  res.push({ nom: 'il transcrit l\'échantillon de whisper.cpp (le mot « country » y est reconnu)', ok: tr.statut === 200 && !!tr.json && tr.json.ok === true && /\bcountry\b/i.test(texte),
    detail: ditStatut(tr) + ' en ' + s + ' s' + (tr.json && tr.json.error ? ' — ' + String(tr.json.error).replace(/[^a-z_]/g, '') + (tr.json.etape ? ' (' + String(tr.json.etape).replace(/[^a-z_]/g, '') + ')' : '') : '') + (tr.statut === 200 && !/\bcountry\b/i.test(texte) ? ' — texte rendu sans le mot attendu (' + texte.length + ' signes)' : '') });
  return res;
}

if (require.main === module) {
  (async () => {
    const [instance, echantillon] = process.argv.slice(2);
    if (!/^(beta|prod)$/.test(instance || '') || !echantillon) { console.log('usage : OPMSG_TRANSCRIRE_CONFIG=<fichier> node verifier-transcription.js <beta|prod> <échantillon.wav>'); process.exit(2); }
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(process.env.OPMSG_TRANSCRIRE_CONFIG || '', 'utf8')); } catch (e) { console.log('  ✗ la configuration de l\'ouvrier est illisible (OPMSG_TRANSCRIRE_CONFIG)'); process.exit(1); }
    if (!cfg || typeof cfg.secret !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(cfg.secret) || !((typeof cfg.socket === 'string' && cfg.socket.startsWith('/')) || Number.isInteger(cfg.port))) { console.log('  ✗ la configuration de l\'ouvrier n\'a pas de secret, ni de socket ou de port lisible'); process.exit(1); }
    const res = await verifier(cfg, echantillon);
    for (const r of res) console.log('  ' + (r.ok ? '✓' : '✗') + ' ' + r.nom + (r.detail ? ' · ' + r.detail : ''));
    const ko = res.filter(r => !r.ok).length;
    if (ko) { console.log('\n⛔ ' + ko + ' contrôle(s) en échec.'); process.exit(1); }
    console.log('\n✓ L\'ouvrier de transcription (' + instance + ') fait ce qu\'il doit.');
  })();
}

module.exports = { verifier };

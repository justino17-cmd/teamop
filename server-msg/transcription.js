/* ══ LA TRANSCRIPTION DES VOCAUX — CÔTÉ SERVICE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * « Possible de faire une transcription écrite, comme sur Instagram » (Justin, 11 octobre 2026), et ses trois décisions : le calcul se fait SUR NOTRE SERVEUR (whisper.cpp, jamais un
 * service tiers : aucune voix ne sort, pas de sous-traitant), il est ouvert à TOUS pendant la bêta (avec un plafond), et il se fait À LA DEMANDE (« Voir la transcription ») — calculé
 * une seule fois, puis partagé par tous ceux qui peuvent écouter ce vocal.
 *
 * Ce module est tout ce que le service en connaît : une FILE (un travail à la fois — le modèle prend plusieurs centaines de Mo et tous les cœurs qu'on lui donne), une SONDE de
 * l'ouvrier, et l'appel à l'ouvrier (`transcripteur.js`, dans son unité systemd à part, sur une SOCKET UNIX, avec un secret partagé). Le stockage décide de tout ce qui touche les
 * droits (`transcriptionDemander`, `transcriptionPoser`) ; ce module ne lit une pièce QUE pour un travail que le stockage lui a remis, et encore en attente.
 *
 * ⛔ SANS CONFIGURATION, RIEN : pas de bloc `transcription` (l'ouvrier n'est pas installé), `configure` est faux, `/api/config` le dit, la page ne propose rien et la route répond 503.
 * ⛔ UNE PANNE DE L'OUVRIER NE CASSE RIEN : le travail en cours devient un ÉCHEC dit (« la transcription n'a pas pu se faire — Réessayer ») ; `/health` dit `ok:false` et la
 *    surveillance crie (un ouvrier installé qui ne répond plus).
 * ⛔ UN VOCAL NE DIT RIEN DE LA SANTÉ DE L'OUVRIER (relecture du gardien, 11 octobre 2026) : un vocal illisible, une langue inconnue, un vocal supprimé pendant l'attente ratent CE
 *    vocal — seuls la socket muette et un programme absent mettent l'ouvrier « hors service ». Sinon n'importe qui coupait la transcription de tout le monde, à volonté.
 * ⛔ PERSONNE NE PREND TOUTE LA FILE : deux travaux par personne au plus (en attente et en cours), et un budget de secondes de vocal par personne et par heure.
 * ⛔ LE SECRET ne s'affiche ni ne se journalise (non énumérable, posé par `config.js`) ; le journal ne reçoit que des issues, jamais un texte, une langue, une personne.
 * ⛔ L'OUVRIER SUIT LE CODE DÉPLOYÉ : il tourne depuis le dossier de la release (`current`) ; le déploiement ne relance que le service. À chaque sonde, le service compare l'empreinte
 *    de l'ouvrier à la sienne et lui demande de sortir s'il tourne sur un code d'AVANT — systemd le relance aussitôt sur le bon.
 */
'use strict';

const http = require('http');

const RE_LANGUE = /^([a-z]{2,3})(?:[-_][A-Za-z]{2,4})?$/;
const REPONSE_MAX = 1048576;            // une réponse de l'ouvrier au-delà d'un Mo est refusée en route (un « ouvrier » qui n'en est pas un ne remplit pas la mémoire du service)
const ORPHELINE_MS = 20000;             // une ligne « en attente » que ni la file ni le calcul en cours ne portent, plus vieille que ça : un échec dit (la pose et la mise en file se suivent dans le même tour de boucle : 20 s de marge, c'est large)
const OCCUPE_ESSAIS = 20;               // un ouvrier « occupé » (un calcul d'avant qu'il finit) : le travail repasse en tête, jusqu'à 20 fois (deux secondes d'écart)

/* L'appel HTTP à l'ouvrier, sur sa socket (`unix:/run/…/ouvrier.sock`) ou un port de la boucle locale (les bancs) : la réponse est BORNÉE en octets, le délai coupe la connexion.
   Rend { status, text() } comme `fetch`, pour qu'un banc puisse injecter le sien. */
function appelerOuvrier(url, chemin, { method = 'GET', headers = {}, body = null, delaiMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const m = /^unix:(\/.+)$/.exec(url);
    let cible;
    try { cible = m ? { socketPath: m[1] } : (() => { const u = new URL(url); return { host: u.hostname, port: Number(u.port) }; })(); } catch (e) { return reject(e); }
    let minuteur = null;
    const q = http.request(Object.assign(cible, { method, path: chemin, headers: Object.assign({}, headers, body ? { 'content-length': body.length } : {}) }), (r) => {
      const morceaux = []; let n = 0, coupe = false;
      r.on('data', (d) => { n += d.length; if (n > REPONSE_MAX) { coupe = true; r.destroy(); } else morceaux.push(d); });
      r.on('end', () => { clearTimeout(minuteur); if (coupe) return reject(Object.assign(new Error('reponse_trop_longue'), { code: 'reponse_trop_longue' })); const t = Buffer.concat(morceaux).toString('utf8'); resolve({ status: r.statusCode, text: async () => t }); });
      r.on('error', (e) => { clearTimeout(minuteur); reject(e); });
      r.on('close', () => { clearTimeout(minuteur); if (coupe) reject(Object.assign(new Error('reponse_trop_longue'), { code: 'reponse_trop_longue' })); });
    });
    minuteur = setTimeout(() => { q.destroy(Object.assign(new Error('delai'), { code: 'ETIMEDOUT', name: 'TimeoutError' })); }, delaiMs);
    q.on('error', (e) => { clearTimeout(minuteur); reject(e); });
    if (body) q.end(body); else q.end();
  });
}

/**
 * @param {object} o
 * @param {object|null} o.cfg       `config.transcription` : { url, secret (non énumérable), dureeMaxS, file, parPersonne, budgetHeureS, essais, parHeure, sondeMs, delaiBaseMs, delaiParSMs } — null : pas d'ouvrier
 * @param {object} o.stockage       `transcriptionPoser`, `transcriptionEnAttente`, `transcriptionsInterrompues`, `transcriptionsEchues`
 * @param {object} o.pieces         `lire(id)` : les octets clairs d'une pièce, par blocs
 * @param {object} o.hub            `reveiller({ conv })`
 * @param {number} o.octetsMax      le plafond d'un vocal (`config.pieces.vocalMax`)
 * @param {string} [o.sha]          l'empreinte du code de CE service (`config.sha`)
 * @param {function} [o.appeler]    un `fetch` (les bancs) ; par défaut, l'appel sur la socket ci-dessus
 */
function creerTranscription({ cfg, stockage, pieces, hub, octetsMax = 10485760, sha = null, horloge = Date.now, appeler = null, journal = () => {} } = {}) {
  const c = cfg || null;
  const configure = !!c;
  const etat = { ok: false, sondes: 0, echecsSonde: 0, dernierOk: 0, faites: 0, vides: 0, echecs: 0, relances: 0 };
  const file = [];
  const budgets = new Map();                 // uid → [{ t, s }] : les secondes de vocal demandées dans l'heure
  let enCours = null, arrete = false, minuterie = null, sondeEnCours = null, derniereRelance = 0, relancePompe = null;
  /* le délai d'un travail : celui du PLUS LONG vocal permis, jamais la durée annoncée par l'appareil (elle peut mentir) — et il dépasse les délais de l'ouvrier lui-même */
  const delaiTravailMs = () => c.delaiBaseMs + c.dureeMaxS * c.delaiParSMs;

  const entetes = (plus) => Object.assign({ authorization: 'Bearer ' + (c ? c.secret : '') }, plus || {});
  async function requete(methode, chemin, { corps = null, delaiMs, entetesPlus } = {}) {
    const r = appeler
      ? await appeler(c.url + chemin, { method: methode, headers: entetes(entetesPlus), body: corps, signal: AbortSignal.timeout(delaiMs) })
      : await appelerOuvrier(c.url, chemin, { method: methode, headers: entetes(entetesPlus), body: corps, delaiMs });
    let j = null;
    try { const t = await r.text(); j = t && t.length <= REPONSE_MAX ? JSON.parse(t) : null; } catch (e) { j = null; }
    return { statut: r.status, json: j };
  }

  /* la sonde : l'ouvrier répond-il, ses programmes et son modèle sont-ils là ? Et tourne-t-il sur le code déployé ? Elle ramasse aussi les lignes « en attente » trop vieilles */
  async function sonder() {
    if (!configure || arrete) return;
    if (sondeEnCours) return sondeEnCours;
    sondeEnCours = (async () => {
      etat.sondes++;
      try {
        const r = await requete('GET', '/sante', { delaiMs: c.delaiSondeMs });
        etat.ok = r.statut === 200 && !!(r.json && r.json.ok === true);
        if (etat.ok) { etat.dernierOk = horloge(); etat.echecsSonde = 0; } else etat.echecsSonde++;
        const sien = r.json && typeof r.json.sha === 'string' ? r.json.sha : null;
        if (r.statut === 200 && sien && sha && /^[0-9a-f]{7,64}$/.test(sha) && /^[0-9a-f]{7,64}$/.test(sien) && sien !== sha && !enCours && horloge() - derniereRelance > 60000) {
          derniereRelance = horloge(); etat.relances++;
          journal('ouvrier_relance');
          try { await requete('POST', '/quitter', { delaiMs: c.delaiSondeMs }); } catch (e) { /* il est peut-être déjà parti */ }
          etat.ok = false;
        }
      } catch (e) { etat.ok = false; etat.echecsSonde++; }
      /* ⛔ une ligne « en attente » que plus aucun travail ne porte (une pose ratée, une file perdue) passerait « en cours » pour toujours : au-delà du temps qu'une file
         PLEINE met à se vider, elle devient un échec DIT (retentable) */
      /* ① les lignes que PLUS RIEN ne porte (ni la file, ni le calcul en cours) : un échec dit au bout de ORPHELINE_MS, pas de l'attente d'une file pleine (28 octobre 2026 — « Transcription en cours… » pour
            deux heures et demie après une pose perdue). ② le filet d'avant, en dernier recours. */
      try {
        if (typeof stockage.transcriptionsEchues === 'function') {
          const portees = new Set(file.map(x => x.conv + '#' + x.seq)); if (enCours) portees.add(enCours.conv + '#' + enCours.seq);
          const o = stockage.transcriptionsEchues(horloge() - ORPHELINE_MS, portees); if (o) journal('attentes_orphelines');
          const n = stockage.transcriptionsEchues(horloge() - (c.file + 1) * delaiTravailMs()); if (n) journal('attentes_echues');
        }
      } catch (e) { journal('balayage_echec'); }
      finally { sondeEnCours = null; }
    })();
    return sondeEnCours;
  }

  async function lireVocal(id) {
    const morceaux = []; let taille = 0;
    for await (const m of pieces.lire(id)) { taille += m.length; if (taille > octetsMax) throw Object.assign(new Error('trop_lourd'), { code: 'trop_lourd' }); morceaux.push(m); }
    return Buffer.concat(morceaux);
  }
  const langueDe = (l) => { const m = typeof l === 'string' ? RE_LANGUE.exec(l.trim()) : null; return m ? m[1].toLowerCase() : 'fr'; };
  /* une panne DE L'OUVRIER (et seulement elle) : la socket ne répond pas, ou il dit qu'un de ses programmes manque */
  const panneTransport = (e) => !!e && (e.name === 'TimeoutError' || ['ECONNREFUSED', 'ENOENT', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'EACCES', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'].includes(e.code || (e.cause && e.cause.code)));

  async function traiter(t) {
    /* ⛔ supprimé, masqué, échu pendant l'attente : on ne lit pas sa pièce, on ne calcule rien, on ne pose rien */
    if (typeof stockage.transcriptionEnAttente === 'function' && !stockage.transcriptionEnAttente(t.conv, t.seq)) { journal('abandon'); return; }
    let issue = 'echec', texte = null, langue = null, octets;
    try { octets = await lireVocal(t.piece); }
    catch (e) { octets = null; }                 // la pièce partie ou trop lourde : ce vocal rate, l'ouvrier n'y est pour rien
    if (octets) {
      try {
        const r = await requete('POST', '/transcrire', { corps: octets, delaiMs: delaiTravailMs(), entetesPlus: { 'content-type': 'application/octet-stream', 'x-langue': langueDe(t.langue) } });
        if (r.statut === 200 && r.json && r.json.ok === true && typeof r.json.texte === 'string') {
          texte = r.json.texte.trim() || null; langue = typeof r.json.langue === 'string' ? r.json.langue : null;
          issue = texte ? 'prete' : 'vide';
        } else if (r.statut === 503 && r.json && r.json.error === 'occupe' && (t.occupe || 0) < OCCUPE_ESSAIS) {
          /* l'ouvrier finit un calcul d'avant : ce travail repasse en TÊTE, sans compter comme un essai raté */
          t.occupe = (t.occupe || 0) + 1; file.unshift(t); journal('ouvrier_occupe');
          return 'reprendre';
        } else if (r.statut === 500 && r.json && /^(ffmpeg|whisper)_absent$/.test(String(r.json.etape || ''))) etat.ok = false;      // un programme a disparu : c'est l'ouvrier
      } catch (e) { if (panneTransport(e)) etat.ok = false; }
    }
    if (issue === 'prete') etat.faites++; else if (issue === 'vide') etat.vides++; else etat.echecs++;
    journal(issue);
    try {
      const p = stockage.transcriptionPoser({ conv: t.conv, seq: t.seq, etat: issue, texte, langue });
      if (p && p.gid) hub.reveiller({ conv: t.conv });
    } catch (e) { journal('pose_echec'); }       // la ligne reste « en attente » : la sonde la fera passer en échec (`transcriptionsEchues`)
  }

  function pomper() {
    if (enCours || arrete || !file.length || relancePompe) return;
    enCours = file.shift();
    traiter(enCours).then((x) => {
      enCours = null;
      if (x === 'reprendre') { relancePompe = setTimeout(() => { relancePompe = null; pomper(); }, 2000); if (relancePompe.unref) relancePompe.unref(); }
      else setImmediate(pomper);
    }, () => { enCours = null; setImmediate(pomper); });
  }
  const dePersonne = (uid) => file.filter(x => x.uid === uid).length + (enCours && enCours.uid === uid ? 1 : 0);
  const budgetUtilise = (uid) => {
    const l = (budgets.get(uid) || []).filter(x => horloge() - x.t < 3600000);
    if (l.length) budgets.set(uid, l); else budgets.delete(uid);
    return l.reduce((a, x) => a + x.s, 0);
  };

  return {
    configure,
    /* l'ouvrier répond (sondé) */
    actif: () => configure && etat.ok,
    /* une place dans la file (le travail en cours compte) — et, pour une personne, `parPersonne` au plus */
    placeLibre: (uid) => configure && file.length + (enCours ? 1 : 0) < c.file && (uid === undefined || dePersonne(uid) < c.parPersonne),
    /* les secondes de vocal de cette personne dans l'heure, plus celles-ci, tiennent-elles dans son budget ? → 0 si oui, sinon l'attente en secondes */
    budgetAttente(uid, dur) {
      if (!configure) return 0;
      const s = Math.max(1, Math.ceil(Number(dur) || 1));
      if (budgetUtilise(uid) + s <= c.budgetHeureS) return 0;
      const l = budgets.get(uid) || [];
      return l.length ? Math.max(1, Math.ceil((l[0].t + 3600000 - horloge()) / 1000)) : 60;
    },
    dureeMaxS: () => (c ? c.dureeMaxS : 0),
    essais: () => (c ? c.essais : 0),
    parHeure: () => (c ? c.parHeure : 0),
    /* un travail que le stockage vient de créer (`transcriptionDemander` → `travail`) ; il est compté dans le budget de la personne qui l'a demandé */
    mettreEnFile(t) {
      if (!configure || arrete) return false;
      if (file.some(x => x.conv === t.conv && x.seq === t.seq) || (enCours && enCours.conv === t.conv && enCours.seq === t.seq)) return true;
      file.push({ conv: t.conv, seq: t.seq, piece: t.piece, dur: t.dur, langue: t.langue, uid: t.uid });
      if (t.uid) { const l = budgets.get(t.uid) || []; l.push({ t: horloge(), s: Math.max(1, Math.ceil(Number(t.dur) || 1)) }); budgets.set(t.uid, l); }
      pomper();
      return true;
    },
    demarrer() {
      if (!configure) return;
      /* un calcul en cours au moment d'un arrêt est perdu : ces lignes passent en échec (dit, retentable), au lieu de rester « en cours » pour toujours */
      try { const n = stockage.transcriptionsInterrompues(); if (n) journal('reprises_en_echec'); } catch (e) { journal('reprise_echec'); }
      setTimeout(() => sonder(), 200).unref();
      minuterie = setInterval(() => sonder(), c.sondeMs); minuterie.unref();
    },
    arreter() { arrete = true; if (minuterie) clearInterval(minuterie); minuterie = null; if (relancePompe) clearTimeout(relancePompe); relancePompe = null; file.length = 0; },
    sonder,
    /* ⛔ /health est PUBLIQUE : des booléens et des nombres — jamais un texte, une conversation, une personne, ni le chemin d'un programme */
    /* `ok` publié : une sonde ratée isolée n'est pas une panne (l'ouvrier redémarre après un déploiement) — deux de suite, si ; et jamais « ok » avant la première sonde réussie */
    sante: () => ({ configuree: configure, ok: configure && (etat.ok || (etat.dernierOk > 0 && etat.echecsSonde < 2)), file: file.length + (enCours ? 1 : 0), faites: etat.faites, vides: etat.vides, echecs: etat.echecs, echecsSonde: etat.echecsSonde }),
  };
}

module.exports = { creerTranscription, appelerOuvrier };

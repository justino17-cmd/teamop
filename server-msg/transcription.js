/* ══ LA TRANSCRIPTION DES VOCAUX — CÔTÉ SERVICE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * « Possible de faire une transcription écrite, comme sur Instagram » (Justin, 11 octobre 2026), et ses trois décisions : le calcul se fait SUR NOTRE SERVEUR (whisper.cpp, jamais un
 * service tiers : aucune voix ne sort, pas de sous-traitant), il est ouvert à TOUS pendant la bêta (avec un plafond), et il se fait À LA DEMANDE (« Voir la transcription ») — calculé
 * une seule fois, puis partagé par tous ceux qui peuvent écouter ce vocal.
 *
 * Ce module est tout ce que le service en connaît : une FILE (un travail à la fois — le modèle prend plusieurs centaines de Mo et tous les cœurs qu'on lui donne), une SONDE de
 * l'ouvrier, et l'appel à l'ouvrier (`transcripteur.js`, dans son unité systemd à part, sur la boucle locale, avec un secret partagé). Le stockage décide de tout ce qui touche les
 * droits (`transcriptionDemander`, `transcriptionPoser`) ; ce module ne lit une pièce QUE pour un travail que le stockage lui a remis.
 *
 * ⛔ SANS CONFIGURATION, RIEN : pas de bloc `transcription` (l'ouvrier n'est pas installé), `configure` est faux, `/api/config` le dit, la page ne propose rien et la route répond 503.
 * ⛔ UNE PANNE DE L'OUVRIER NE CASSE RIEN : le travail en cours devient un ÉCHEC dit (« la transcription n'a pas pu se faire — Réessayer ») ; `/health` dit `ok:false` et la
 *    surveillance crie (un ouvrier installé qui ne répond plus).
 * ⛔ LE SECRET ne s'affiche ni ne se journalise (non énumérable, posé par `config.js`) ; le journal ne reçoit que des issues et des durées, jamais un texte, une langue, une personne.
 * ⛔ L'OUVRIER SUIT LE CODE DÉPLOYÉ : il tourne depuis le dossier de la release (`current`) ; le déploiement ne relance que le service. À chaque sonde, le service compare l'empreinte
 *    de l'ouvrier à la sienne et lui demande de sortir s'il tourne sur un code d'AVANT — systemd le relance aussitôt sur le bon.
 */
'use strict';

const RE_LANGUE = /^([a-z]{2,3})(?:[-_][A-Za-z]{2,4})?$/;

/**
 * @param {object} o
 * @param {object|null} o.cfg       `config.transcription` : { url, secret (non énumérable), dureeMaxS, file, essais, parHeure, sondeMs, delaiBaseMs, delaiParSMs } — null : pas d'ouvrier
 * @param {object} o.stockage       `transcriptionPoser`, `transcriptionsInterrompues`
 * @param {object} o.pieces         `lire(id)` : les octets clairs d'une pièce, par blocs
 * @param {object} o.hub            `reveiller({ conv })`
 * @param {number} o.octetsMax      le plafond d'un vocal (`config.pieces.vocalMax`)
 * @param {string} [o.sha]          l'empreinte du code de CE service (`config.sha`)
 */
function creerTranscription({ cfg, stockage, pieces, hub, octetsMax = 10485760, sha = null, horloge = Date.now, appeler = (...a) => fetch(...a), journal = () => {} } = {}) {
  const c = cfg || null;
  const configure = !!c;
  const etat = { ok: false, sondes: 0, echecsSonde: 0, dernierOk: 0, faites: 0, vides: 0, echecs: 0, relances: 0 };
  const file = [];
  let enCours = null, arrete = false, minuterie = null, sondeEnCours = null, derniereRelance = 0;

  const entetes = (plus) => Object.assign({ authorization: 'Bearer ' + (c ? c.secret : '') }, plus || {});
  async function requete(methode, chemin, { corps = null, delaiMs, entetesPlus } = {}) {
    const r = await appeler(c.url + chemin, { method: methode, headers: entetes(entetesPlus), body: corps, signal: AbortSignal.timeout(delaiMs) });
    let j = null;
    try { const t = await r.text(); j = t && t.length <= 1048576 ? JSON.parse(t) : null; } catch (e) { j = null; }
    return { statut: r.status, json: j };
  }

  /* la sonde : l'ouvrier répond-il, ses programmes et son modèle sont-ils là ? Et tourne-t-il sur le code déployé ? */
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

  async function traiter(t) {
    let issue = 'echec', texte = null, langue = null;
    try {
      const octets = await lireVocal(t.piece);
      const dur = Math.max(1, Math.min(c.dureeMaxS, Math.ceil(Number(t.dur) || 1)));
      const r = await requete('POST', '/transcrire', { corps: octets, delaiMs: c.delaiBaseMs + dur * c.delaiParSMs, entetesPlus: { 'content-type': 'application/octet-stream', 'x-langue': langueDe(t.langue) } });
      if (r.statut === 200 && r.json && r.json.ok === true && typeof r.json.texte === 'string') {
        texte = r.json.texte.trim() || null; langue = typeof r.json.langue === 'string' ? r.json.langue : null;
        issue = texte ? 'prete' : 'vide';
      } else {
        issue = 'echec';
        if (r.statut === 500) etat.ok = false;      // l'ouvrier ou ses programmes ont un problème (la sonde le redira) ; un délai (504), un format illisible (400) ne disent rien de l'ouvrier
      }
    } catch (e) { issue = 'echec'; if (!(e && e.code === 'trop_lourd')) etat.ok = false; }
    if (issue === 'prete') etat.faites++; else if (issue === 'vide') etat.vides++; else etat.echecs++;
    journal(issue);
    try {
      const p = stockage.transcriptionPoser({ conv: t.conv, seq: t.seq, etat: issue, texte, langue });
      if (p && p.gid) hub.reveiller({ conv: t.conv });
    } catch (e) { journal('pose_echec'); }
  }

  function pomper() {
    if (enCours || arrete || !file.length) return;
    enCours = file.shift();
    traiter(enCours).catch(() => {}).finally(() => { enCours = null; setImmediate(pomper); });
  }

  return {
    configure,
    /* l'ouvrier répond (sondé) */
    actif: () => configure && etat.ok,
    /* une place dans la file (le travail en cours compte) */
    placeLibre: () => configure && file.length + (enCours ? 1 : 0) < c.file,
    dureeMaxS: () => (c ? c.dureeMaxS : 0),
    essais: () => (c ? c.essais : 0),
    parHeure: () => (c ? c.parHeure : 0),
    /* un travail que le stockage vient de créer (`transcriptionDemander` → `travail`) */
    mettreEnFile(t) {
      if (!configure || arrete) return false;
      if (file.some(x => x.conv === t.conv && x.seq === t.seq) || (enCours && enCours.conv === t.conv && enCours.seq === t.seq)) return true;
      file.push({ conv: t.conv, seq: t.seq, piece: t.piece, dur: t.dur, langue: t.langue });
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
    arreter() { arrete = true; if (minuterie) clearInterval(minuterie); minuterie = null; file.length = 0; },
    sonder,
    /* ⛔ /health est PUBLIQUE : des booléens et des nombres — jamais un texte, une conversation, une personne, ni le chemin d'un programme */
    /* `ok` publié : une sonde ratée isolée n'est pas une panne (l'ouvrier redémarre après un déploiement) — deux de suite, si ; et jamais « ok » avant la première sonde réussie */
    sante: () => ({ configuree: configure, ok: configure && (etat.ok || (etat.dernierOk > 0 && etat.echecsSonde < 2)), file: file.length + (enCours ? 1 : 0), faites: etat.faites, vides: etat.vides, echecs: etat.echecs, echecsSonde: etat.echecsSonde }),
  };
}

module.exports = { creerTranscription };

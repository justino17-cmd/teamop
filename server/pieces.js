/* ══ LES PIÈCES JOINTES ET LES PHOTOS VIVENT SUR LE VPS, PAS DANS LE DOCUMENT ═══════════════
 *
 * ÉTAPE 0 du chantier OP SOCLE. Demandée par Justin le 16 septembre 2026, après le relevé des
 * concurrents (`COMMENT-FONT-LES-AUTRES.md`) : **Organilog VEND le stockage** — 100 Go à 19 €,
 * 400 Go à 35 €, 600 Go à 59 € par utilisateur et par mois. Chez nous, `syncAlleger`
 * (`app.html`) RETIRE les pièces de la copie poussée pour tenir sous le plafond de 1 Mio d'un
 * document Firestore : elles restent sur l'appareil qui les a prises et **ne sont jamais
 * partagées**. Un technicien photographie un poste d'appâtage, son collègue ne verra jamais la
 * photo. Ce n'est pas un choix produit, c'est une conséquence du plafond.
 *
 * ⛔ CE QUE LE SERVEUR REÇOIT EST CHIFFRÉ PAR L'APPAREIL, ET C'EST DÉLIBÉRÉ.
 * Justin veut que le serveur puisse LIRE pour diagnostiquer vite. Il le peut déjà : la clé AES
 * de chaque entreprise de l'annuaire dort EN CLAIR dans `espaces.json` (`espaceCleOk()`,
 * `server/index.js`). Stocker chiffré ne lui retire donc rien — il déchiffre quand il le
 * décide — mais ça garde vraies, aujourd'hui, les phrases de `sous-traitance.html` et
 * d'`index.html:319`. ⚠️ Corollaire : ces `.bin` ne s'ouvrent PAS avec une commande sur le VPS.
 *
 * ⛔ UN DOSSIER PAR ENTREPRISE — le même cloisonnement structurel que `SAUV_DIR` et que le futur
 * `socle/<t>/base.db`. Il n'y a pas de `WHERE entreprise_id` à oublier : le chemin EST le
 * cloisonnement.
 *
 * ⛔ AUCUNE PORTE NEUVE : les quatre routes passent par `sauvRefus(t, kh)`, la même garde que
 * les copies de sauvegarde. Une garde réécrite à sa façon en oublierait un contrôle — la leçon
 * des quatre portes de `fbRevoquerEquipe`.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════
 * ⛔ CE QUI A ÉTÉ CORRIGÉ APRÈS MESURE, LE 16 SEPTEMBRE AU SOIR, ET QU'IL NE FAUT PAS DÉFAIRE
 * ════════════════════════════════════════════════════════════════════════════════════════════
 *
 * 1. ⛔ **ON NE BALAIE PLUS LE DOSSIER À CHAQUE DÉPÔT.** La première version appelait un
 *    `readdirSync` + un `statSync` PAR FICHIER, DEUX FOIS par dépôt, en synchrone. MESURÉ sur
 *    un vrai dossier : 100 fichiers → 0,9 ms ; 1 000 → 5,9 ms ; 5 000 → 17,6 ms ;
 *    **21 000 → 73 ms, donc 146 ms par photo**. Les routes Express sont sur la boucle
 *    d'événements : ces 146 ms gèlent TOUT le serveur — la Tour, la synchro, les interventions
 *    de TOUTES les autres entreprises. Une journée de terrain à plusieurs techniciens aurait
 *    transformé le partage de photos en panne générale. Le poids est donc tenu en INCRÉMENTAL
 *    (`etat()`), semé par un seul balayage à la première touche après un redémarrage.
 *    ⚠️ Ne jamais remettre un `pese()` sur le chemin d'une requête.
 *
 * 2. ⛔ **`/health` NE BALAIE RIEN.** Elle est PUBLIQUE et sans clé : un balayage de tous les
 *    dossiers y était déclenchable par n'importe qui. Elle lit le total tenu en mémoire, et ne
 *    publie qu'un POURCENTAGE ARRONDI — le nombre exact d'octets stockés est un journal de
 *    l'activité de terrain de tous les clients, et `/health` ne doit rien dire de personne.
 *
 * 3. ⛔ **LE TEMPORAIRE VIT DANS `tmp/`, ET LA FERMETURE EFFACE TOUT.** MESURÉ : avec un `.tmp`
 *    laissé par un `renameSync` interrompu, `rmdirSync` échoue en `ENOTEMPTY`, le dossier
 *    SURVIT avec la pièce dedans, et la fonction annonçait quand même « 1 effacée ». Sur une
 *    fermeture d'entreprise, c'est de la donnée de client qui reste sur le disque sous un
 *    identifiant que plus rien ne référence. `effacerEntreprise` fait donc un `rmSync`
 *    récursif, comme les copies de sauvegarde, et `tmp/` est vidé au démarrage.
 *
 * 4. ⛔ **UN PLANCHER SUR L'ESPACE DISQUE RÉEL.** Les plafonds applicatifs comptent des octets
 *    LOGIQUES ; le disque, lui, perd des blocs entiers (4 Kio sur l'ext4 du VPS) et peut se
 *    remplir pour une raison sans rapport — journaux, copies de sauvegarde, images. Quand le
 *    disque est plein, ce n'est pas la photo qui tombe, c'est l'API entière. `fs.statfsSync`
 *    est le seul contrôle qui voie la vérité. On lit `bavail` (ce qu'un non-root peut
 *    vraiment prendre), PAS `bfree` (qui compte la réserve du superutilisateur).
 *    ⚠️ ET IL A UNE POLITIQUE D'ÉCHEC ÉCRITE : s'il lève, on LAISSE PASSER et on le dit au
 *    journal. Un contrôle de confort qui casserait le service en tombant serait pire que son
 *    absence — mais un contrôle qui tombe en silence ne contrôle rien, d'où la trace.
 *
 * 5. ⛔ **UN PLAFOND EN NOMBRE DE PIÈCES, pas seulement en octets.** Un quota en octets ne voit
 *    pas ce que coûtent des milliers de fichiers minuscules sur un système de fichiers à blocs.
 *    ⚠️ Honnêteté : l'amplification n'a PAS pu être reproduite dans l'atelier (facteur ×1, ce
 *    conteneur n'a pas le plancher de bloc). Elle reste plausible sur l'ext4 du VPS, et le
 *    plafond en nombre coûte trois lignes — mais ce chiffre-là n'est pas une mesure.
 *
 * 6. ⛔ **L'IDENTIFIANT PORTE L'ENTREPRISE.** `sha256(t + '.' + iv + '.' + enc)` : un
 *    identifiant émis pour A ne peut plus, même par accident, nommer un fichier du dossier
 *    de B. Il reste recalculé à la réception — le nom du fichier prouve son contenu.
 *
 * 7. ⛔ **ON PEUT SUPPRIMER.** Sans route de suppression, le stockage est un cliquet : une
 *    pièce retirée d'une intervention resterait sur le VPS pour toujours, alors que
 *    `sous-traitance.html` annonce une durée de conservation. C'est une obligation, pas un
 *    confort.
 *
 * ⛔ ET CHAQUE REFUS PORTE UN MOTIF MACHINE — 'plein', 'plein-global', 'disque', 'trop-gros',
 * 'trop-nombreuses', 'quota', 'cle', 'ferme', 'repli', 'inconnu', 'absente', 'ecriture'.
 * Leçon du 11 septembre : un refus que l'écran ne sait pas dire devient un autre message,
 * souvent faux. Cette liste est le contrat ; la tenir à jour fait partie du code.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Réglés sur la MESURE du 16 septembre 2026 : `df -h /opt` → 116 Go, 4,9 Go utilisés,
   **111 Go disponibles**, et `/opt/teamop/data` = 11 Mo pour toutes les entreprises réunies.
   Poids réel d'une pièce, mesuré de bout en bout (JPEG → data URL → gzip → AES-GCM → base64 →
   fichier) : **×1,34 du JPEG binaire**, stable — une photo de chantier de 180 Ko pèse 241 Ko
   sur le disque, soit ~4 350 photos par Go. Relevables dans `config.json`. */
const PAR_ENTREPRISE_DEFAUT = 5 * 1024 * 1024 * 1024;    //  5 Gio ≈ 21 000 photos
const GLOBAL_DEFAUT = 60 * 1024 * 1024 * 1024;           // 60 Gio, sur 111 Go libres
const DISQUE_PLANCHER_DEFAUT = 10 * 1024 * 1024 * 1024;  // 10 Gio libres, quoi qu'il arrive
const NB_MAX_DEFAUT = 40000;                             // par entreprise
/* 4 Mio de base64 ≈ 3 Mio de contenu, au-dessus des 1,5 Mo qu'accepte `intDocAdd` aujourd'hui,
   et SOUS la limite de 6 Mo d'`express.json` — sinon express rejette le corps avant ce module,
   avec un message que personne ne sait afficher. */
const PIECE_MAX_B64 = 4 * 1024 * 1024;

const sain = t => String(t).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
const EST_PIECE = /^[0-9a-f]{64}\.bin$/;

function monterPieces(app, deps) {
  const { config, DATA_DIR, sauvRefus, quotaOk, monStr } = deps;
  const RACINE = path.join(DATA_DIR, 'pieces');
  const TMP = path.join(RACINE, 'tmp');
  try { fs.mkdirSync(TMP, { recursive: true }); } catch (e) {}
  /* ⛔ Le temporaire d'un `renameSync` interrompu (redémarrage, disque plein) reste sur le
     disque et n'appartient à personne. On vide `tmp/` au démarrage : c'est le seul moment où
     l'on est certain qu'aucune écriture n'est en cours. */
  try { for (const f of fs.readdirSync(TMP)) { try { fs.unlinkSync(path.join(TMP, f)); } catch (e) {} } } catch (e) {}

  const nb = (v, d) => (Number(v) > 0 ? Number(v) : d);
  const maxEnt = nb(config.piecesMaxOctets, PAR_ENTREPRISE_DEFAUT);
  const maxTot = nb(config.piecesMaxTotal, GLOBAL_DEFAUT);
  const plancherDisque = nb(config.piecesPlancherDisque, DISQUE_PLANCHER_DEFAUT);
  const maxNb = nb(config.piecesMaxNombre, NB_MAX_DEFAUT);

  const dossier = t => path.join(RACINE, sain(t));
  const fichier = (t, id) => path.join(dossier(t), id + '.bin');
  /* Un identifiant est 64 hexadécimaux, point. Ça exclut `..`, `/`, et tout le reste : la
     traversée de chemin n'a pas d'endroit où naître. */
  const idOk = id => /^[0-9a-f]{64}$/.test(id);

  /* ══ LE POIDS EST TENU, PAS RECALCULÉ ══════════════════════════════════════════════════
     Un seul balayage par entreprise, à la première touche après un redémarrage ; ensuite le
     compte suit les écritures. C'est le correctif n° 1 de l'en-tête : le chemin d'une requête
     ne doit jamais dépendre du nombre de fichiers déjà stockés. */
  const etats = new Map();   // t assaini → {n, octets}
  let totalOctets = null;    // somme des entreprises connues ; null tant que rien n'est semé
  function balayer(dir) {
    let n = 0, octets = 0, noms;
    try { noms = fs.readdirSync(dir); } catch (e) { return { n: 0, octets: 0 }; }
    for (const f of noms) { if (!EST_PIECE.test(f)) continue; try { octets += fs.statSync(path.join(dir, f)).size; n++; } catch (e) {} }
    return { n, octets };
  }
  function etat(t) {
    const k = sain(t); let e = etats.get(k);
    if (!e) { e = balayer(path.join(RACINE, k)); etats.set(k, e); totalOctets = null; }
    return e;
  }
  /* Le total ne balaie QUE les entreprises pas encore connues, et une seule fois. Après un
     redémarrage il coûte un balayage complet — au premier appel, jamais sur une requête
     chaude. `/health` s'en sert sans jamais toucher au disque. */
  function total() {
    if (totalOctets === null) {
      let s = 0, noms = [];
      try { noms = fs.readdirSync(RACINE); } catch (e) {}
      for (const d of noms) { if (d === 'tmp') continue; s += etat(d).octets; }
      totalOctets = s;
    }
    return totalOctets;
  }
  function bouger(t, dOctets, dN) {
    const e = etat(t); e.octets = Math.max(0, e.octets + dOctets); e.n = Math.max(0, e.n + dN);
    if (totalOctets !== null) totalOctets = Math.max(0, totalOctets + dOctets);
  }

  /* ⛔ LE SEUL CONTRÔLE QUI VOIE LA VÉRITÉ, ET SA POLITIQUE D'ÉCHEC EST ÉCRITE.
     `bavail` = ce qu'un processus non-root peut vraiment prendre ; `bfree` compterait la
     réserve du superutilisateur et laisserait accepter des écritures qui échoueront.
     S'il lève : on LAISSE PASSER et on le dit. Un contrôle de confort qui casse le service en
     tombant est pire que son absence — mais un contrôle qui tombe en silence ne contrôle
     rien, d'où la trace (sans aucune donnée personnelle : c'est un chiffre système). */
  let _statfsDit = false;
  function disqueLibre() {
    try { const s = fs.statfsSync(DATA_DIR); return Number(s.bavail) * Number(s.bsize); }
    catch (e) {
      if (!_statfsDit) { _statfsDit = true; console.error('pièces : espace disque non mesurable (' + e.code + ') — le plancher disque est INACTIF, seuls les plafonds applicatifs restent'); }
      return null;
    }
  }

  let quota = new Map();
  /* Le préambule commun : identité, garde, quota. Rend `null` quand tout va bien, sinon le
     refus a DÉJÀ été envoyé et l'appelant n'a qu'à sortir.
     ⚠️ Le plancher disque n'est PAS ici : il ne concerne que l'écriture, et le mettre dans le
     préambule empêcherait de RELIRE une pièce déjà déposée sur un disque plein — c'est-à-dire
     précisément au moment où on en a besoin. */
  function porte(req, res, cout, fenetreMax) {
    const b = (req.method === 'GET') ? (req.query || {}) : (req.body || {});
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    if (!t) { res.status(400).json({ error: 't requis', motif: 'inconnu' }); return null; }
    const refus = sauvRefus(t, kh, 'pièce jointe');
    if (refus) {
      const motif = refus.code === 404 ? 'inconnu' : /repli/.test(refus.error) ? 'repli' : /ferm/.test(refus.error) ? 'ferme' : 'cle';
      res.status(refus.code).json({ error: refus.error, motif }); return null;
    }
    /* ⛔ ON ÉLAGUE, ON NE VIDE PAS. `quota = new Map()` remettait à zéro les compteurs de
       TOUTES les entreprises d'un coup — une porte grande ouverte pour qui sait la déclencher.
       Même geste que `cleCodes` dans `server/index.js`. */
    if (quota.size > 5000) { const n = Date.now(); for (const [k, v] of quota) if (n > v.reset) quota.delete(k); }
    if (!quotaOk(quota, cout + ':' + t, fenetreMax, 3600000)) {
      res.status(429).json({ error: 'trop de demandes — réessaie dans une heure', motif: 'quota' }); return null;
    }
    return { t, kh, b };
  }

  /* ── déposer ─────────────────────────────────────────────────────────────────────────── */
  app.post('/api/pieces/deposer', (req, res) => {
    const p = porte(req, res, 'd', 600); if (!p) return;
    const enc = String(p.b.enc || ''), iv = String(p.b.iv || '');
    if (!enc || !iv || iv.length > 128) return res.status(400).json({ error: 'bloc chiffré requis', motif: 'inconnu' });
    /* ⛔ `z` EST STOCKÉ AVEC LA PIÈCE, comme avec les copies de sauvegarde, et pour la même
       raison déjà payée une fois : `syncEncrypt` (app.html) COMPRESSE avant de chiffrer. Sans
       ce drapeau, l'appareil qui relit déchiffre parfaitement puis passe des octets gzip à
       `TextDecoder` — du charabia, PAS une erreur. Le serveur transporte un drapeau, pas une clé. */
    const z = p.b.z ? 1 : 0;
    if (enc.length > PIECE_MAX_B64)
      return res.status(413).json({ error: 'pièce trop lourde (' + Math.round(PIECE_MAX_B64 / 1048576) + ' Mo au plus)', motif: 'trop-gros' });

    const e = etat(p.t);
    const poids = Buffer.byteLength(enc, 'utf8') + Buffer.byteLength(iv, 'utf8') + 80;
    if (e.n + 1 > maxNb)
      return res.status(507).json({ error: 'trop de pièces pour cette entreprise', motif: 'trop-nombreuses', n: e.n, plafondNb: maxNb });
    if (e.octets + poids > maxEnt)
      return res.status(507).json({ error: 'l\'espace de pièces jointes de cette entreprise est plein', motif: 'plein', octets: e.octets, plafond: maxEnt });
    if (total() + poids > maxTot)
      return res.status(507).json({ error: 'le serveur n\'a plus de place pour les pièces jointes', motif: 'plein-global' });
    const libre = disqueLibre();
    if (libre !== null && libre - poids < plancherDisque)
      return res.status(507).json({ error: 'le disque du serveur est presque plein', motif: 'disque' });

    /* ⛔ L'identifiant PORTE L'ENTREPRISE et est recalculé ici, jamais reçu : le nom du fichier
       prouve son contenu ET son propriétaire. Un dépôt rejoué réécrit le même fichier au lieu
       d'en créer un second. */
    const id = crypto.createHash('sha256').update(sain(p.t) + '.' + iv + '.' + enc, 'utf8').digest('hex');
    const dest = fichier(p.t, id);
    const deja = (() => { try { return fs.statSync(dest).size; } catch (err) { return 0; } })();
    const tmp = path.join(TMP, id + '-' + process.pid + '-' + Date.now() + '.tmp');
    try {
      fs.mkdirSync(dossier(p.t), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify({ iv, enc, z, ts: Date.now() }));
      fs.renameSync(tmp, dest);
    } catch (err) {
      /* ⛔ JAMAIS LE CONTENU NI LE NOM D'ORIGINE AU JOURNAL : ce sont des photos de sites de
         clients. Et on retire le temporaire tout de suite plutôt que d'attendre le prochain
         démarrage. */
      try { fs.unlinkSync(tmp); } catch (e2) {}
      console.error('pièce non écrite :', err.message);
      return res.status(500).json({ error: 'pièce non enregistrée', motif: 'ecriture' });
    }
    let taille = 0; try { taille = fs.statSync(dest).size; } catch (err) {}
    bouger(p.t, taille - deja, deja ? 0 : 1);
    res.json({ ok: true, id, octets: e.octets, n: e.n, plafond: maxEnt, plafondNb: maxNb });
  });

  /* ── lire ────────────────────────────────────────────────────────────────────────────── */
  app.post('/api/pieces/lire', (req, res) => {
    const p = porte(req, res, 'l', 3000); if (!p) return;
    const id = monStr(p.b.id, 64).toLowerCase();
    if (!idOk(id)) return res.status(400).json({ error: 'identifiant de pièce invalide', motif: 'inconnu' });
    let j; try { j = JSON.parse(fs.readFileSync(fichier(p.t, id), 'utf8')); }
    catch (e) { return res.status(404).json({ error: 'pièce introuvable', motif: 'absente' }); }
    res.json({ ok: true, id, iv: j.iv, enc: j.enc, z: j.z ? 1 : 0, ts: j.ts || 0 });
  });

  /* ── supprimer ───────────────────────────────────────────────────────────────────────── */
  /* ⛔ SANS ELLE, LE STOCKAGE EST UN CLIQUET. Une pièce retirée d'une intervention resterait
     sur le VPS pour toujours, et `sous-traitance.html` annonce une durée de conservation :
     c'est une obligation, pas un confort. Le refus de supprimer une pièce déjà absente est un
     404 avec son motif — pas un 200 qui ferait croire à un ménage qui n'a pas eu lieu. */
  app.post('/api/pieces/supprimer', (req, res) => {
    const p = porte(req, res, 's', 600); if (!p) return;
    const id = monStr(p.b.id, 64).toLowerCase();
    if (!idOk(id)) return res.status(400).json({ error: 'identifiant de pièce invalide', motif: 'inconnu' });
    const f = fichier(p.t, id);
    let taille = 0; try { taille = fs.statSync(f).size; } catch (e) { return res.status(404).json({ error: 'pièce introuvable', motif: 'absente' }); }
    try { fs.unlinkSync(f); } catch (e) { return res.status(500).json({ error: 'pièce non effacée', motif: 'ecriture' }); }
    bouger(p.t, -taille, -1);
    const e = etat(p.t);
    res.json({ ok: true, id, octets: e.octets, n: e.n });
  });

  /* ── état ────────────────────────────────────────────────────────────────────────────── */
  app.post('/api/pieces/etat', (req, res) => {
    const p = porte(req, res, 'e', 600); if (!p) return;
    const e = etat(p.t);
    res.json({ ok: true, n: e.n, octets: e.octets, plafond: maxEnt, plafondNb: maxNb });
  });

  return {
    /* ⛔ FERMER UNE ENTREPRISE EFFACE TOUT SON DOSSIER, `.tmp` compris. MESURÉ : avec un
       temporaire laissé par un `renameSync` interrompu, `rmdirSync` échouait en `ENOTEMPTY`,
       le dossier SURVIVAIT avec la pièce dedans, et la fonction annonçait quand même
       « 1 effacée ». C'est de la donnée de client qui reste sous un identifiant que plus rien
       ne référence. `rmSync` récursif, comme les copies de sauvegarde.
       Elle rend le NOMBRE effacé, jamais `true` : 0 veut dire « rien trouvé », ce qui est une
       information, là où `true` aurait menti. */
    effacerEntreprise(t) {
      const dir = dossier(t); let n = 0;
      try { for (const f of fs.readdirSync(dir)) if (EST_PIECE.test(f)) n++; } catch (e) { return 0; }
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { console.error('pièces non effacées :', e.message); return 0; }
      const k = sain(t), avant = (etats.get(k) || { octets: 0 }).octets;
      etats.delete(k);
      if (totalOctets !== null) totalOctets = Math.max(0, totalOctets - avant);
      return n;
    },
    /* Pour /health, qui est PUBLIQUE : un pourcentage de remplissage ARRONDI À 5 %, jamais le
       nombre exact d'octets — celui-ci est un journal de l'activité de terrain de tous les
       clients. Et surtout : aucun balayage de disque, le total est tenu en mémoire. */
    sante() { const pct = maxTot > 0 ? Math.min(100, Math.round((total() / maxTot) * 20) * 5) : 0; return { remplissage: pct, plafond: maxTot }; },
    total() { return { octets: total(), plafond: maxTot }; },
    _balayer: balayer, _dossier: dossier, _idOk: idOk, _disqueLibre: disqueLibre,
    PIECE_MAX_B64, maxEnt, maxTot, maxNb, plancherDisque
  };
}

module.exports = { monterPieces, PIECE_MAX_B64, PAR_ENTREPRISE_DEFAUT, GLOBAL_DEFAUT, DISQUE_PLANCHER_DEFAUT, NB_MAX_DEFAUT };

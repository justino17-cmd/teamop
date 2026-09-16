/* ══ LES PIÈCES JOINTES ET LES PHOTOS VIVENT SUR LE VPS, PAS DANS LE DOCUMENT ═══════════════
 *
 * ÉTAPE 0 du chantier OP SOCLE (`PLAN-OP-SOCLE.md`, `CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md`).
 * Demandée par Justin le 16 septembre 2026, après le relevé des concurrents
 * (`COMMENT-FONT-LES-AUTRES.md`) : **Organilog VEND le stockage** — 100 Go à 19 €, 400 Go à
 * 35 €, 600 Go à 59 € par utilisateur et par mois. Chez nous, `syncAlleger` (`app.html`) RETIRE
 * les pièces de la copie poussée pour tenir sous le plafond de 1 Mio d'un document Firestore :
 * elles restent sur l'appareil qui les a prises et **ne sont jamais partagées**. Un technicien
 * photographie un poste d'appâtage, son collègue ne verra jamais la photo. Ce n'est pas un
 * choix produit, c'est une conséquence du plafond.
 *
 * Ce module range ces pièces hors du document. Il est utile SEUL : même si le reste du socle
 * n'était jamais écrit, la base d'une entreprise redescend très en dessous du plafond et les
 * photos se partagent enfin.
 *
 * ⛔ CE QUE LE SERVEUR REÇOIT EST CHIFFRÉ PAR L'APPAREIL, ET C'EST DÉLIBÉRÉ.
 * Justin veut que le serveur puisse LIRE les données pour diagnostiquer vite. Il le peut déjà,
 * et c'est écrit dans `REPRISE.md` : la clé AES de chaque entreprise de l'annuaire dort EN
 * CLAIR dans `espaces.json` (`espaceCleOk()`, `server/index.js:2265`). Stocker les pièces
 * chiffrées ne lui retire donc RIEN — il déchiffre quand il en a besoin, délibérément — mais ça
 * garde vraies, aujourd'hui, les phrases de `sous-traitance.html` et d'`index.html:319`. Le
 * jour où ces pages seront réécrites, ce module n'aura pas à changer.
 * ⚠️ Corollaire à ne pas oublier : ces fichiers ne sont PAS lisibles par une commande sur le
 * VPS. Pour en ouvrir un, il faut passer par la clé de l'entreprise. Ne jamais écrire dans un
 * outil d'exploitation « regarde le fichier », ça ne marchera pas.
 *
 * ⛔ UN DOSSIER PAR ENTREPRISE — le même cloisonnement structurel que `SAUV_DIR`
 * (`server/index.js:2561`) et que le futur `socle/<t>/base.db`. Il n'y a pas de
 * `WHERE entreprise_id` à oublier : le chemin EST le cloisonnement. Fermer une entreprise,
 * c'est effacer un dossier.
 *
 * ⛔ AUCUNE PORTE NEUVE. Les trois routes passent par `sauvRefus(t, kh)`, exactement la même
 * garde que les copies de sauvegarde : espace de repli refusé (ses deux clés sont écrites en
 * clair dans `app.html`, une pièce déposée là serait lisible par n'importe qui), espace fermé
 * refusé, clé d'équipe fausse refusée. Une quatrième porte qui referait ces contrôles à sa
 * façon en oublierait un — c'est la leçon des quatre portes de `fbRevoquerEquipe`.
 *
 * ⛔ L'IDENTIFIANT EST LE SHA-256 DE CE QUI EST REÇU, ET LE SERVEUR LE RECALCULE.
 * Un identifiant fourni par l'appareil ne se vérifie pas : n'importe quel corps pourrait être
 * rangé sous n'importe quel nom, et une pièce corrompue ne se distinguerait plus d'une pièce
 * juste. Ici, `id` est calculé à la réception — donc le nom du fichier PROUVE son contenu, et
 * un dépôt rejoué deux fois écrit deux fois le même fichier au lieu d'en créer deux.
 * ⚠️ Ce que ça ne fait PAS : dédoublonner deux envois de la même photo. Le chiffrement tire un
 * IV neuf à chaque fois, donc deux chiffrés de la même image ont deux empreintes. Le
 * dédoublonnage, s'il devient utile, se fera côté appareil (il connaît le clair) — pas ici.
 *
 * ⛔ UN PLAFOND PAR ENTREPRISE, ET UN GLOBAL. Sans eux, une entreprise remplit le disque du VPS
 * et TOUTES les autres s'arrêtent — y compris l'API, les copies de sauvegarde et les journaux.
 * La capacité réelle du VPS n'a jamais été mesurée (aucun accès SSH depuis l'atelier au
 * 16 septembre 2026) : les défauts ci-dessous sont donc volontairement PRUDENTS, et à relever
 * dans `config.json` une fois `df -h /opt` connu.
 *
 * ⛔ ET UN REFUS DOIT POUVOIR S'AFFICHER. Leçon du 11 septembre (`CLAUDE.md`) : un refus que
 * l'écran ne sait pas dire devient un autre message, souvent faux. Chaque refus porte donc un
 * `motif` machine — 'plein', 'plein-global', 'trop-gros', 'quota', 'cle', 'ferme', 'repli',
 * 'inconnu' — pour que l'application dise ce qui s'est VRAIMENT passé plutôt que « erreur ».
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Défauts prudents, tant que `df -h /opt` n'a pas été lu. Relevables par config.json. */
const PAR_ENTREPRISE_DEFAUT = 512 * 1024 * 1024;   // 512 Mio
const GLOBAL_DEFAUT = 4 * 1024 * 1024 * 1024;      //   4 Gio
/* 4 Mio de base64 ≈ 3 Mio de contenu : au-dessus des 1,5 Mo qu'accepte l'application
   aujourd'hui, et SOUS la limite de 6 Mo d'`express.json` — sinon le corps est rejeté par
   express avant d'atteindre ce module, avec un message que personne ne sait afficher. */
const PIECE_MAX_B64 = 4 * 1024 * 1024;

/* Le même assainissement que `sauvDossier` : un `t` ne peut pas sortir de son dossier. */
const sain = t => String(t).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);

function monterPieces(app, deps) {
  const { config, DATA_DIR, sauvRefus, quotaOk, monStr } = deps;
  const RACINE = path.join(DATA_DIR, 'pieces');
  try { fs.mkdirSync(RACINE, { recursive: true }); } catch (e) {}

  const maxEnt = Number(config.piecesMaxOctets) > 0 ? Number(config.piecesMaxOctets) : PAR_ENTREPRISE_DEFAUT;
  const maxTot = Number(config.piecesMaxTotal) > 0 ? Number(config.piecesMaxTotal) : GLOBAL_DEFAUT;

  const dossier = t => path.join(RACINE, sain(t));
  const fichier = (t, id) => path.join(dossier(t), id + '.bin');
  /* Un identifiant est 64 caractères hexadécimaux, point. Ça exclut `..`, `/`, et tout le
     reste — la traversée de chemin n'a pas d'endroit où naître. */
  const idOk = id => /^[0-9a-f]{64}$/.test(id);

  function pese(dir) {
    let n = 0, octets = 0;
    let noms; try { noms = fs.readdirSync(dir); } catch (e) { return { n: 0, octets: 0 }; }
    for (const f of noms) {
      if (!/^[0-9a-f]{64}\.bin$/.test(f)) continue;
      try { octets += fs.statSync(path.join(dir, f)).size; n++; } catch (e) {}
    }
    return { n, octets };
  }
  /* Le total du VPS est relu au plus une fois par minute : il balaie tous les dossiers, et le
     faire à chaque dépôt ferait payer à chacun le poids de tous. */
  let totCache = { ts: 0, octets: 0 };
  function peseTout() {
    if (Date.now() - totCache.ts < 60000) return totCache.octets;
    let octets = 0;
    try { for (const d of fs.readdirSync(RACINE)) octets += pese(path.join(RACINE, d)).octets; } catch (e) {}
    totCache = { ts: Date.now(), octets };
    return octets;
  }

  let quota = new Map();
  /* Le préambule commun aux trois routes : identité, garde, quota. Il rend `null` quand tout
     va bien, sinon l'objet de refus DÉJÀ envoyé — l'appelant n'a qu'à sortir. */
  function porte(req, res, cout, fenetreMax) {
    const b = (req.method === 'GET') ? (req.query || {}) : (req.body || {});
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    if (!t) { res.status(400).json({ error: 't requis', motif: 'inconnu' }); return null; }
    const refus = sauvRefus(t, kh, 'pièce jointe');
    if (refus) {
      const motif = refus.code === 404 ? 'inconnu' : /repli/.test(refus.error) ? 'repli' : /ferm/.test(refus.error) ? 'ferme' : 'cle';
      res.status(refus.code).json({ error: refus.error, motif }); return null;
    }
    if (quota.size > 5000) quota = new Map();
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
    if (enc.length > PIECE_MAX_B64)
      return res.status(413).json({ error: 'pièce trop lourde (' + Math.round(PIECE_MAX_B64 / 1048576) + ' Mo au plus)', motif: 'trop-gros' });

    const dir = dossier(p.t);
    const dejaEnt = pese(dir).octets, dejaTot = peseTout();
    const poids = Buffer.byteLength(enc, 'utf8') + Buffer.byteLength(iv, 'utf8') + 64;
    if (dejaEnt + poids > maxEnt)
      return res.status(507).json({ error: 'l\'espace de pièces jointes de cette entreprise est plein', motif: 'plein', octets: dejaEnt, plafond: maxEnt });
    if (dejaTot + poids > maxTot)
      return res.status(507).json({ error: 'le serveur n\'a plus de place pour les pièces jointes', motif: 'plein-global' });

    /* L'identifiant est recalculé ici, jamais reçu : le nom du fichier prouve son contenu. */
    const id = crypto.createHash('sha256').update(iv + '.' + enc, 'utf8').digest('hex');
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = fichier(p.t, id) + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ iv, enc, ts: Date.now() }));
      fs.renameSync(tmp, fichier(p.t, id));
      totCache.ts = 0;   // le total vient de bouger : qu'il se relise
    } catch (e) {
      /* ⛔ JAMAIS LE CONTENU NI LE NOM D'ORIGINE AU JOURNAL. Ce sont des photos de sites de
         clients : `CLAUDE.md` interdit d'écrire des données personnelles dans les journaux. */
      console.error('pièce non écrite :', e.message);
      return res.status(500).json({ error: 'pièce non enregistrée', motif: 'ecriture' });
    }
    const apres = pese(dir);
    res.json({ ok: true, id, octets: apres.octets, n: apres.n, plafond: maxEnt });
  });

  /* ── lire ────────────────────────────────────────────────────────────────────────────── */
  app.post('/api/pieces/lire', (req, res) => {
    const p = porte(req, res, 'l', 3000); if (!p) return;
    const id = monStr(p.b.id, 64).toLowerCase();
    if (!idOk(id)) return res.status(400).json({ error: 'identifiant de pièce invalide', motif: 'inconnu' });
    let j; try { j = JSON.parse(fs.readFileSync(fichier(p.t, id), 'utf8')); }
    catch (e) { return res.status(404).json({ error: 'pièce introuvable', motif: 'absente' }); }
    res.json({ ok: true, id, iv: j.iv, enc: j.enc, ts: j.ts || 0 });
  });

  /* ── état ────────────────────────────────────────────────────────────────────────────── */
  app.post('/api/pieces/etat', (req, res) => {
    const p = porte(req, res, 'e', 600); if (!p) return;
    const e = pese(dossier(p.t));
    res.json({ ok: true, n: e.n, octets: e.octets, plafond: maxEnt });
  });

  /* ⛔ FERMER UNE ENTREPRISE DOIT EFFACER SES PIÈCES. Exporté plutôt que branché ici : c'est
     `server/index.js` qui connaît les portes de fermeture, et la leçon des quatre portes de
     `fbRevoquerEquipe` est qu'une seule oubliée rend le geste aléatoire. La fonction rend le
     NOMBRE de fichiers effacés, jamais `true` — un appelant qui reçoit 0 sait que rien n'a été
     trouvé, là où `true` lui aurait menti. */
  return {
    effacerEntreprise(t) {
      const dir = dossier(t); let n = 0;
      let noms; try { noms = fs.readdirSync(dir); } catch (e) { return 0; }
      for (const f of noms) { if (!/^[0-9a-f]{64}\.bin$/.test(f)) continue; try { fs.unlinkSync(path.join(dir, f)); n++; } catch (e) {} }
      try { fs.rmdirSync(dir); } catch (e) {}
      totCache.ts = 0;
      return n;
    },
    /* Pour /health : agrégé, jamais par espace — `/health` est publique, y nommer une
       entreprise dirait au monde laquelle existe (`CLAUDE.md`). */
    total() { return { octets: peseTout(), plafond: maxTot }; },
    _pese: pese, _dossier: dossier, _idOk: idOk, PIECE_MAX_B64
  };
}

module.exports = { monterPieces, PIECE_MAX_B64, PAR_ENTREPRISE_DEFAUT, GLOBAL_DEFAUT };

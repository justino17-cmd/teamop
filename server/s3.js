/* ══ PARLER À UN STOCKAGE S3 SANS BIBLIOTHÈQUE ═════════════════════════════════════════════
 *
 * Étape 0 du socle, suite : Justin a créé un bucket IONOS Object Storage
 * (`teamop-pieces`, eu-central-4 / Francfort) le 17 septembre 2026.
 *
 * ⛔ POURQUOI PAS LE SDK AWS. `CLAUDE.md` : « Fait main plutôt qu'une dépendance de plus, quand
 * c'est raisonnable : le serveur est exposé sur Internet, chaque dépendance est une surface
 * d'attaque. » Le précédent est écrit dans le même fichier : **Stripe n'est pas une dépendance**,
 * l'API est appelée directement par `fetch`. Ici c'est le même calcul, et il est encore plus
 * favorable : signer une requête S3, c'est quatre HMAC-SHA256 et une empreinte — une centaine de
 * lignes contre un arbre de dépendances de plusieurs dizaines de paquets.
 *
 * ⛔ ET LA SIGNATURE SE PROUVE, elle ne se relit pas. `tests/test-716.js` fait passer ce fichier
 * sur les EXEMPLES PUBLIÉS PAR AWS, dont la signature attendue est donnée au caractère près.
 * Une implémentation de SigV4 qui « a l'air juste » échoue en production sur un 403 sans message,
 * et on cherche une journée. Le banc a d'ailleurs trouvé un défaut avant toute mise en service :
 * un DOUBLE ENCODAGE du chemin (voir `uriEncode`), invisible sur quatre vecteurs sur cinq.
 *
 * ⚠️ CE MODULE N'EST PAS LE CHEMIN CHAUD, ET LA MESURE L'A TRANCHÉ. Le disque du VPS dépose une
 * pièce en 2,1 ms, et il reste 111 Go libres pour 11 Mo occupés (mesuré le 17 septembre 2026) :
 * un aller-retour réseau vers Francfort sur chaque photo serait plus lent, plus fragile, et ne
 * réparerait rien. `server/pieces.js` garde donc le disque, et ne dépend pas de ce fichier.
 *
 * ⛔ CE QUE LE STOCKAGE OBJET RÉPARE, LUI, C'EST UN DÉFAUT QU'ON A CRÉÉ NOUS-MÊMES. Avant l'étape 0,
 * une photo d'intervention vivait DANS le document Firestore : répliquée par Google, et présente
 * sur chaque appareil synchronisé. Depuis que `syncSortirPieces` la retire du document, elle vit
 * dans UN SEUL endroit — un disque, sur une machine. Si ce disque meurt, ELAN perd les photos qui
 * prouvent que le travail a été fait : registre biocide, dossier sanitaire, preuves de passage.
 * Le rôle de ce module est donc la COPIE DE SÛRETÉ, pas le service des pièces. Tant qu'elle n'est
 * pas en place, l'étape 0 a échangé une contrainte de place contre un risque de perte.
 */
const crypto = require('crypto'), fs = require('fs');

const sha256hex = (x) => crypto.createHash('sha256').update(x).digest('hex');
const hmac = (cle, msg) => crypto.createHmac('sha256', cle).update(msg, 'utf8').digest();

/* ⛔ L'ENCODAGE DE L'URI EST LA PREMIÈRE CAUSE DE 403 INEXPLICABLES. `encodeURIComponent` laisse
   passer ! ' ( ) * que S3 veut encodés, et il encode / qu'il ne faut PAS encoder dans un chemin.
   On règle les deux ici plutôt que de le découvrir sur une clé qui contient une apostrophe.

   ⛔ ET LE TROISIÈME PIÈGE EST LE DOUBLE ENCODAGE, mesuré le 17 septembre 2026 sur le vecteur
   « PUT Object » d'AWS : `client.url()` encode pour fabriquer une URL valide, puis `signer` relit
   cette URL et ré-encodait le `%` en `%25` — `/test%24file.text` devenait `/test%2524file.text`,
   signature fausse, 403 muet. `garderEchappements` laisse passer un triplet `%XX` déjà formé.
   Un `%` isolé, lui, reste encodé : il n'est pas un échappement, c'est un caractère. */
function uriEncode(s, garderSlash, garderEchappements) {
  const t = String(s);
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (garderEchappements && c === '%' && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) {
      out += '%' + t.slice(i + 1, i + 3).toUpperCase(); i += 2; continue;
    }
    if (/[A-Za-z0-9_\-~.]/.test(c)) { out += c; continue; }
    if (c === '/' && garderSlash) { out += '/'; continue; }
    /* Une paire de substitution (emoji, par exemple) compte deux unités UTF-16 : on la prend
       entière, sinon Buffer.from rend le caractère de remplacement et la signature part fausse. */
    const brut = (c >= '\uD800' && c <= '\uDBFF' && i + 1 < t.length) ? (c + t[++i]) : c;
    out += Array.from(Buffer.from(brut, 'utf8')).map(b => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
  }
  return out;
}

/* Rend { url, headers } prêts pour `fetch`. `corps` est un Buffer ou une chaîne (vide pour GET
   et DELETE). `quand` permet de rejouer un instant précis — c'est ce qui rend les vecteurs
   d'essai d'AWS reproductibles. */
function signer(o) {
  const methode = String(o.methode || 'GET').toUpperCase();
  const service = o.service || 's3';
  const corps = o.corps == null ? '' : o.corps;
  const d = o.quand || new Date();
  const iso = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');   // 20150830T123600Z
  const jour = iso.slice(0, 8);

  const hote = new URL(o.url).host;
  /* `pathname` est déjà percent-encodé par `URL` : on garde ses échappements et on encode
     seulement ce qu'il a laissé passer (l'apostrophe, la parenthèse, l'astérisque). */
  const chemin = uriEncode(new URL(o.url).pathname || '/', true, true) || '/';
  /* Les paramètres de requête se trient par NOM, puis par valeur — l'ordre du tri est une
     partie de la signature, pas une commodité de lecture. */
  const q = new URL(o.url).searchParams;
  const params = [...q.entries()].map(([k, v]) => [uriEncode(k), uriEncode(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (a[1] < b[1] ? -1 : 1)));
  const requete = params.map(([k, v]) => k + '=' + v).join('&');

  const empreinte = o.empreinteCorps || sha256hex(corps);
  const enTetes = Object.assign({ host: hote, 'x-amz-content-sha256': empreinte, 'x-amz-date': iso }, o.enTetes || {});
  if (o.sansContentSha) delete enTetes['x-amz-content-sha256'];
  /* Les en-têtes signés se trient par nom EN MINUSCULES, et leurs valeurs sont réduites : les
     espaces de bord tombent, les espaces internes se condensent. */
  const noms = Object.keys(enTetes).map(n => n.toLowerCase()).sort();
  const canonEnTetes = noms.map(n => {
    const cle = Object.keys(enTetes).find(k => k.toLowerCase() === n);
    return n + ':' + String(enTetes[cle]).trim().replace(/\s+/g, ' ') + '\n';
  }).join('');
  const signes = noms.join(';');

  const canonique = [methode, chemin, requete, canonEnTetes, signes, empreinte].join('\n');
  const portee = jour + '/' + o.region + '/' + service + '/aws4_request';
  const aSigner = ['AWS4-HMAC-SHA256', iso, portee, sha256hex(canonique)].join('\n');

  /* La chaîne de dérivation : quatre HMAC, dans cet ordre exact. Une inversion et le serveur
     rend 403 sans jamais dire pourquoi. */
  const kDate = hmac('AWS4' + o.secretKey, jour);
  const kRegion = hmac(kDate, o.region);
  const kService = hmac(kRegion, service);
  const kSign = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSign).update(aSigner, 'utf8').digest('hex');

  enTetes.Authorization = 'AWS4-HMAC-SHA256 Credential=' + o.accessKey + '/' + portee
    + ', SignedHeaders=' + signes + ', Signature=' + signature;
  return { url: o.url, headers: enTetes, canonique, aSigner, signature };
}

/* ── le client, trois verbes, rien de plus ────────────────────────────────────────────────── */
/* Les cinq entités XML que S3 peut mettre dans un nom d'objet ou un jeton de suite. */
const dexml = x => String(x).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function client(conf) {
  if (!conf || !conf.endpoint || !conf.bucket || !conf.accessKey || !conf.secretKey) return null;
  const base = String(conf.endpoint).replace(/\/+$/, '');
  const region = conf.region || 'eu-central-4';
  /* ⛔ LA CLÉ D'OBJET PORTE L'ENTREPRISE, comme le nom de fichier sur le disque : le
     cloisonnement reste structurel même quand le stockage change de nature. */
  const url = (t, id) => base + '/' + uriEncode(conf.bucket, false) + '/' + uriEncode(String(t), false) + '/' + uriEncode(String(id), false);
  /* ⛔ UNE CLÉ COMPLÈTE, AVEC SES BARRES OBLIQUES — et ce n'est pas un raffinement, c'est un
     défaut trouvé EN FAISANT TOURNER la chaîne pour de vrai, le 17 septembre 2026. `url(t, id)`
     est fait pour les pièces jointes : l'entreprise puis l'identifiant, deux segments sans
     barre, chacun encodé en entier. La sauvegarde, elle, range sous `teamop/<date>…`, donc sa
     clé CONTIENT une barre. Passée à `url('', cle)` elle donnait deux défauts d'un coup : un
     segment vide (`/coffre//teamop/…`, double barre), et à la relecture des barres transformées
     en `%2F` — donc une clé DIFFÉRENTE de celle déposée. Résultat mesuré : le dépôt réussissait,
     la liste montrait bien l'archive, et le téléchargement répondait « objet absent ». Autrement
     dit une sauvegarde qui part tous les jours et qu'on ne peut PAS restaurer — la panne exacte
     que ce chantier existe pour empêcher, découverte seulement parce qu'on a lancé le programme
     au lieu de le relire. */
  const urlCle = (cle) => base + '/' + uriEncode(conf.bucket, false) + '/' + uriEncode(String(cle).replace(/^\/+/, ''), true);
  const commun = { region, accessKey: conf.accessKey, secretKey: conf.secretKey };

  async function envoyer(o, tempsMax) {
    const s = signer(Object.assign({}, commun, o));
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), tempsMax || 15000);
    try { return await fetch(s.url, { method: o.methode, headers: s.headers, body: o.corps || undefined, signal: ctrl.signal }); }
    finally { clearTimeout(tm); }
  }
  return {
    async poser(t, id, corps, tempsMax) {
      /* Le délai suit la taille : 15 s suffisent à une photo, pas à une archive de sauvegarde
         de plusieurs dizaines de Mo vers Francfort. 50 octets par milliseconde, c'est un débit
         de 400 kbit/s — en dessous, c'est le réseau qui est en panne, pas le délai. */
      const octets = Buffer.byteLength(corps);
      const r = await envoyer({ methode: 'PUT', url: url(t, id), corps: Buffer.from(corps), enTetes: { 'content-type': 'application/octet-stream' } },
        tempsMax || Math.min(600000, 15000 + Math.ceil(octets / 50)));
      /* ⛔ ON NE JOURNALISE NI LE CONTENU NI LA CLÉ : ce sont des photos de sites de clients. */
      if (!r.ok) { console.error('objet non posé : HTTP ' + r.status); return { ok: false, statut: r.status }; }
      return { ok: true, octets: Buffer.byteLength(corps) };
    },
    async lire(t, id, tempsMax) {
      const r = await envoyer({ methode: 'GET', url: url(t, id) }, tempsMax);
      if (r.status === 404) return { ok: false, absente: true };
      if (!r.ok) { console.error('objet non lu : HTTP ' + r.status); return { ok: false, statut: r.status }; }
      return { ok: true, corps: Buffer.from(await r.arrayBuffer()) };
    },
    async effacer(t, id) {
      const r = await envoyer({ methode: 'DELETE', url: url(t, id) });
      /* S3 rend 204 sur une suppression réussie ET sur un objet déjà absent : le résultat voulu
         est le même, on ne fabrique pas une différence qui n'existe pas côté serveur. */
      if (r.status === 204 || r.status === 200 || r.status === 404) return { ok: true };
      console.error('objet non effacé : HTTP ' + r.status); return { ok: false, statut: r.status };
    },
    /* Liste ce qui se trouve sous un préfixe (ListObjectsV2), page après page. Le XML de S3 se
       lit avec trois expressions régulières — Key, LastModified, Size — pas avec une
       bibliothèque : c'est le seul endroit du serveur qui reçoive du XML, et il ne porte que
       des noms d'objets que nous avons nous-mêmes choisis. Ajouté pour la sauvegarde hors site
       (17 septembre 2026) : sans liste, la rétention ne peut pas savoir quoi effacer, et une
       restauration sur un VPS neuf ne peut pas savoir ce qui existe. */
    /* Les trois mêmes verbes, mais sur une clé complète. Ce sont ceux qu'emploient la
       sauvegarde et la restauration ; `poser`/`lire`/`effacer` restent aux pièces jointes. */
    async poserCle(cle, corps, tempsMax) {
      const octets = Buffer.byteLength(corps);
      const r = await envoyer({ methode: 'PUT', url: urlCle(cle), corps: Buffer.from(corps), enTetes: { 'content-type': 'application/octet-stream' } },
        tempsMax || Math.min(600000, 15000 + Math.ceil(octets / 50)));
      if (!r.ok) { console.error('objet non posé : HTTP ' + r.status); return { ok: false, statut: r.status }; }
      return { ok: true, octets };
    },
    async lireCle(cle, tempsMax) {
      const r = await envoyer({ methode: 'GET', url: urlCle(cle) }, tempsMax || 600000);
      if (r.status === 404) return { ok: false, absente: true };
      if (!r.ok) { console.error('objet non lu : HTTP ' + r.status); return { ok: false, statut: r.status }; }
      return { ok: true, corps: Buffer.from(await r.arrayBuffer()) };
    },
    async effacerCle(cle) {
      const r = await envoyer({ methode: 'DELETE', url: urlCle(cle) });
      if (r.status === 204 || r.status === 200 || r.status === 404) return { ok: true };
      console.error('objet non effacé : HTTP ' + r.status); return { ok: false, statut: r.status };
    },
    /* ⛔ ET LES MÊMES EN FLUX, parce qu'une archive ne tient pas en mémoire. Relevé par
       `gardien` le 17 septembre 2026 : `lancer()` lisait l'archive ENTIÈRE dans un Buffer, puis
       la relisait ENTIÈRE dans un autre — l'en-tête du module promettait « rien n'est tenu en
       mémoire », ce qui était vrai de la fabrication et faux de l'envoi. Sans conséquence à
       11 Mo de données ; avec le plafond de pièces jointes à 60 Gio posé par `install.sh`, c'est
       l'API par terre pour tout le monde, au milieu de la nuit.
       L'empreinte est FOURNIE (calculée pendant la fabrication) : S3 exige `x-amz-content-sha256`
       avant d'envoyer le corps, donc on ne peut pas la découvrir en chemin. */
    async poserCleFlux(cle, chemin, octets, empreinteHex, tempsMax) {
      const { Readable } = require('stream');
      const s = signer(Object.assign({}, commun, {
        methode: 'PUT', url: urlCle(cle), empreinteCorps: empreinteHex,
        enTetes: { 'content-type': 'application/octet-stream', 'content-length': String(octets) },
      }));
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), tempsMax || Math.min(3600000, 60000 + Math.ceil(octets / 20)));
      try {
        const r = await fetch(s.url, { method: 'PUT', headers: s.headers, body: Readable.toWeb(fs.createReadStream(chemin)), duplex: 'half', signal: ctrl.signal });
        if (!r.ok) { console.error('objet non posé : HTTP ' + r.status); return { ok: false, statut: r.status }; }
        return { ok: true, octets };
      } catch (e) { console.error('objet non posé : ' + (e.name === 'AbortError' ? 'délai dépassé' : e.code || 'erreur réseau')); return { ok: false, statut: 0 }; }
      finally { clearTimeout(tm); }
    },
    /* Écrit l'objet dans un fichier et rend son poids ET son empreinte, calculée AU PASSAGE :
       c'est ce qui permet de comparer à ce qui a été envoyé sans jamais tout tenir en mémoire. */
    async lireCleVers(cle, sortie, tempsMax) {
      const { pipeline } = require('stream/promises');
      const { Readable, Transform } = require('stream');
      const s = signer(Object.assign({}, commun, { methode: 'GET', url: urlCle(cle) }));
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), tempsMax || 3600000);
      try {
        const r = await fetch(s.url, { method: 'GET', headers: s.headers, signal: ctrl.signal });
        if (r.status === 404) return { ok: false, absente: true };
        if (!r.ok) { console.error('objet non lu : HTTP ' + r.status); return { ok: false, statut: r.status }; }
        const h = crypto.createHash('sha256'); let n = 0;
        const compteur = new Transform({ transform(c, e, cb) { n += c.length; h.update(c); cb(null, c); } });
        await pipeline(Readable.fromWeb(r.body), compteur, fs.createWriteStream(sortie));
        return { ok: true, octets: n, empreinte: h.digest('hex') };
      } catch (e) { console.error('objet non lu : ' + (e.name === 'AbortError' ? 'délai dépassé' : e.code || 'erreur réseau')); return { ok: false, statut: 0 }; }
      finally { clearTimeout(tm); }
    },
    async lister(prefixe) {
      const objets = []; let suite = '';
      for (let page = 0; page < 200; page++) {
        const u = base + '/' + uriEncode(conf.bucket, false) + '?list-type=2&prefix=' + uriEncode(String(prefixe || ''), false)
          + (suite ? '&continuation-token=' + uriEncode(suite, false) : '');
        const r = await envoyer({ methode: 'GET', url: u });
        if (!r.ok) { console.error('objets non listés : HTTP ' + r.status); return { ok: false, statut: r.status }; }
        const xml = await r.text();
        for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          const cle = (m[1].match(/<Key>([\s\S]*?)<\/Key>/) || [])[1];
          if (cle == null) continue;
          objets.push({ cle: dexml(cle), modifie: (m[1].match(/<LastModified>([^<]*)<\/LastModified>/) || [])[1] || '',
            octets: parseInt((m[1].match(/<Size>(\d+)<\/Size>/) || [])[1] || '0', 10) });
        }
        if (!/<IsTruncated>\s*true\s*<\/IsTruncated>/.test(xml)) break;
        suite = dexml((xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/) || [])[1] || '');
        if (!suite) break;
      }
      return { ok: true, objets };
    },
    _url: url, _urlCle: urlCle,
  };
}

module.exports = { signer, client, uriEncode, sha256hex };

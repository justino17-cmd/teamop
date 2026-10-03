/* ══ LE COFFRE VU PAR LA SAUVEGARDE — le client S3 d'OP GESTION, plus un transport EN FLUX qui ne tient jamais l'archive en mémoire ═════════
 *
 * `lib/s3.js` est la copie EXACTE du client d'OP GESTION (octet pour octet : `tests/test-950.js` l'exige — une seule définition de la signature,
 * deux services qui se séparent). Il envoie une archive par `fetch` avec un corps en flux. ⛔ MESURÉ LE 3 OCTOBRE 2026 (gardien, puis refait ici
 * variante par variante, processus client à part, serveur qui ne garde rien) : sous Node 22, `fetch` AVALE LE CORPS ENTIER AVANT DE L'ENVOYER.
 * Une base de 300 Mo fait monter le service de 8 à 328 Mo de mémoire anonyme ; 700 Mo, à 827 — pour un `MemoryMax=1G` de l'unité. Ni
 * `Readable.toWeb` (essayé avec une stratégie d'un seul morceau), ni un générateur asynchrone, ni un `ReadableStream` tiré à la main n'y
 * changent rien : c'est `fetch`, pas notre code. `node:http` avec un flux relié par `pipeline` garde la contre-pression : le même envoi de
 * 300 Mo ne dépasse pas 30 Mo. La LECTURE, elle, était déjà bornée (24 à 47 Mo mesurés pour 300 Mo : le pic de « 353 Mo » du premier relevé
 * était ce que l'envoi précédent n'avait pas encore rendu) — mais elle passe ici aussi, pour la même raison qu'on garde UN transport : ce qui
 * est mesuré est ce qui tourne.
 *
 * ⚠️ POURQUOI PAS CORRIGER `lib/s3.js` : son jumeau `server/s3.js` est dans l'autre service, que cette tâche ne touche pas, et la règle des deux
 * copies identiques est ce qui permet de savoir qu'une signature fausse est fausse des deux côtés. Le défaut vit donc ICI, dans un fichier à
 * soi, qui réutilise `signer` et `uriEncode` du client (jamais une seconde signature) et laisse les petits verbes — lister, effacer, poser un
 * petit objet — au client d'origine. À reporter dans `server/s3.js` le jour où OP GESTION sauvegarde des archives qui pèsent plus que sa mémoire.
 *
 * Ce qu'il ajoute, en plus de la mémoire bornée : un coffre qui n'avance plus (ni octet lu, ni octet accepté) depuis `MUET_MS` est en panne, pas
 * lent — le client d'origine attendait jusqu'à une heure avant de le dire, avec la sauvegarde en cours.
 */
'use strict';
const fs = require('fs'), http = require('http'), https = require('https'), crypto = require('crypto');
const { pipeline } = require('stream');
const { Transform } = require('stream');
const s3mod = require('./lib/s3');

const MUET_MS = 180000;

/* L'adresse d'un objet, construite comme le client d'origine le fait (`urlCle`) : le bucket encodé en entier, la clé avec ses barres. */
function urlDe(conf, cle) {
  return String(conf.endpoint).replace(/\/+$/, '') + '/' + s3mod.uriEncode(conf.bucket, false) + '/' + s3mod.uriEncode(String(cle).replace(/^\/+/, ''), true);
}
function optionsDe(s, methode) {
  const u = new URL(s.url);
  return { transport: u.protocol === 'https:' ? https : http, opts: { method: methode, hostname: u.hostname.replace(/^\[|\]$/g, ''), port: u.port || undefined, path: u.pathname + u.search, headers: s.headers } };
}

/* Dépose `chemin` (un fichier de `octets` octets, dont le SHA-256 `empreinteHex` est connu : S3 l'exige AVANT le corps) sous `cle`. Même retour que le
   client d'origine : { ok:true, octets } ou { ok:false, statut } (0 = coupure, délai, coffre muet). */
function poserFichier(conf, cle, chemin, octets, empreinteHex, tempsMax, muetMs = MUET_MS) {
  const s = s3mod.signer({
    region: conf.region || 'eu-central-4', accessKey: conf.accessKey, secretKey: conf.secretKey, methode: 'PUT', url: urlDe(conf, cle), empreinteCorps: empreinteHex,
    enTetes: { 'content-type': 'application/octet-stream', 'content-length': String(octets) },
  });
  const { transport, opts } = optionsDe(s, 'PUT');
  return new Promise((resolve) => {
    let fini = false, req = null, lecture = null;
    const echec = (statut, dit) => { if (fini) return; fini = true; clearTimeout(delai); console.error('objet non posé : ' + dit); try { if (lecture) lecture.destroy(); } catch (e) { /* déjà détruit */ } try { if (req) req.destroy(); } catch (e) { /* déjà détruite */ } resolve({ ok: false, statut }); };
    const reussi = () => { if (fini) return; fini = true; clearTimeout(delai); resolve({ ok: true, octets }); };
    const delai = setTimeout(() => echec(0, 'délai dépassé'), tempsMax || Math.min(3600000, 60000 + Math.ceil(octets / 20)));
    try {
      req = transport.request(opts, (rep) => {
        rep.resume();
        rep.on('error', () => echec(0, 'erreur réseau'));
        rep.on('end', () => { if (rep.statusCode >= 200 && rep.statusCode < 300) reussi(); else echec(rep.statusCode, 'HTTP ' + rep.statusCode); });
      });
      req.setTimeout(muetMs, () => echec(0, 'le coffre ne répond plus'));
      req.on('error', (e) => echec(0, e && e.code ? e.code : 'erreur réseau'));
      lecture = fs.createReadStream(chemin);
      pipeline(lecture, req, (e) => { if (e) echec(0, e.code === 'ENOENT' ? 'fichier absent' : (e.code || 'erreur')); });
    } catch (e) { echec(0, e && e.code ? e.code : 'erreur'); }
  });
}

/* Lit `cle` dans le fichier `sortie` et rend son poids ET son empreinte, calculée AU PASSAGE (comme le client d'origine : on compare à ce qui a été
   envoyé sans rien tenir en mémoire). { ok:true, octets, empreinte } · { ok:false, absente:true } (404) · { ok:false, statut } (0 = coupure, délai, muet). */
function lireVersFichier(conf, cle, sortie, tempsMax, muetMs = MUET_MS) {
  const s = s3mod.signer({ region: conf.region || 'eu-central-4', accessKey: conf.accessKey, secretKey: conf.secretKey, methode: 'GET', url: urlDe(conf, cle) });
  const { transport, opts } = optionsDe(s, 'GET');
  return new Promise((resolve) => {
    let fini = false, req = null, fichier = null;
    const nettoyer = () => { try { if (fichier) fichier.destroy(); } catch (e) { /* déjà détruit */ } try { fs.rmSync(sortie, { force: true }); } catch (e) { /* rien à retirer */ } };
    const echec = (r, dit) => { if (fini) return; fini = true; clearTimeout(delai); if (dit) console.error('objet non lu : ' + dit); try { if (req) req.destroy(); } catch (e) { /* déjà détruite */ } nettoyer(); resolve(r); };
    const delai = setTimeout(() => echec({ ok: false, statut: 0 }, 'délai dépassé'), tempsMax || 3600000);
    try {
      req = transport.request(opts, (rep) => {
        if (rep.statusCode === 404) { rep.resume(); return echec({ ok: false, absente: true }); }
        if (rep.statusCode < 200 || rep.statusCode >= 300) { rep.resume(); return echec({ ok: false, statut: rep.statusCode }, 'HTTP ' + rep.statusCode); }
        const h = crypto.createHash('sha256'); let n = 0;
        const compteur = new Transform({ transform(c, e, cb) { n += c.length; h.update(c); cb(null, c); } });
        fichier = fs.createWriteStream(sortie);
        pipeline(rep, compteur, fichier, (e) => {
          if (e) return echec({ ok: false, statut: 0 }, e.code || 'coupure en cours de lecture');
          if (fini) return;
          fini = true; clearTimeout(delai);
          resolve({ ok: true, octets: n, empreinte: h.digest('hex') });
        });
      });
      req.setTimeout(muetMs, () => echec({ ok: false, statut: 0 }, 'le coffre ne répond plus'));
      req.on('error', (e) => echec({ ok: false, statut: 0 }, e && e.code ? e.code : 'erreur réseau'));
      req.end();
    } catch (e) { echec({ ok: false, statut: 0 }, e && e.code ? e.code : 'erreur'); }
  });
}

/* Le client du coffre : celui d'OP GESTION (lister, effacer, petits objets), dont l'envoi et la lecture d'un FICHIER sont remplacés par les
   versions à mémoire bornée. `null` quand la configuration est incomplète, comme l'original. */
function client(conf, { muetMs = MUET_MS } = {}) {
  const base = s3mod.client(conf);
  if (!base) return null;
  return Object.assign({}, base, {
    poserCleFlux: (cle, chemin, octets, empreinteHex, tempsMax) => poserFichier(conf, cle, chemin, octets, empreinteHex, tempsMax, muetMs),
    lireCleVers: (cle, sortie, tempsMax) => lireVersFichier(conf, cle, sortie, tempsMax, muetMs),
  });
}

module.exports = { client, poserFichier, lireVersFichier, MUET_MS };

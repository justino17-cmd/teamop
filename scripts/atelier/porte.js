#!/usr/bin/env node
// LA PORTE DE L'ATELIER (17 novembre 2026) — par où une session Claude lance des commandes sur le serveur d'ATELIER.
//
// Pourquoi : Justin veut que la conversation qui porte le chantier travaille ELLE-MÊME sur ses serveurs (« le but, c'est que je
// fasse pas une autre conversation pour travailler »). Une session du cloud ne sort que par HTTPS, vers des hôtes autorisés :
// pas de SSH. Cette porte est donc un service HTTP minuscule, derrière Caddy (HTTPS), qui exécute UNE commande et rend sa sortie.
//
// ⛔ CE QUE C'EST, DIT SANS DÉTOUR : une exécution de commandes à distance. Elle ne vit QUE sur l'atelier (essais et code, aucune
// donnée de client) — jamais sur le serveur des clients. Ses gardes :
//   · elle n'écoute que 127.0.0.1 : on n'y arrive que par Caddy, donc en HTTPS ;
//   · une clé de 256 bits, dont le serveur ne garde que l'EMPREINTE (un fichier lu au démarrage) ; comparaison en temps constant ;
//     la clé elle-même vit dans les secrets de l'environnement de la session (le proxy l'ajoute, la conversation ne la voit pas) ;
//   · elle tourne sous un compte SANS droits d'administrateur (unité systemd : User=atelier, NoNewPrivileges) ;
//   · les refus sont comptés par adresse (20 en dix minutes → 429 pendant dix minutes) : une clé de 256 bits ne se devine pas,
//     c'est de l'hygiène, et un compteur PAR adresse ne laisse pas un inconnu fermer la porte à son propriétaire ;
//   · chaque commande est écrite au journal du service (heure, adresse, durée, code, début de la commande) : Justin relit ce qui
//     a été fait par `journalctl -u atelier-porte`. ⚠️ Donc on n'y passe JAMAIS un secret en clair dans une commande.
// Sans dépendance : ce fichier est tout le service. Banc : tests/test-3298.js (le vrai fichier, lancé sur 127.0.0.1).
'use strict';
const http = require('http'), fs = require('fs'), crypto = require('crypto'), { spawn } = require('child_process');

const PORT = Number(process.env.PORTE_PORT || 7070);
const FICHIER_EMPREINTE = process.env.PORTE_EMPREINTE || '/etc/atelier-porte/empreinte';
const DOSSIER = process.env.PORTE_DOSSIER || process.env.HOME || '/';
const CORPS_MAX = 256 * 1024, SORTIE_MAX = 400 * 1024, DELAI_DEFAUT = 120, DELAI_MAX = 900, SIMULTANES_MAX = 8;
const REFUS_MAX = 20, REFUS_FENETRE_MS = 10 * 60 * 1000, REFUS_ADRESSES_MAX = 5000;

// L'empreinte attendue : 64 caractères hexadécimaux (SHA-256 de la clé). Absente ou mal formée, on ne démarre pas —
// une porte sans serrure ne s'ouvre pas « en attendant ».
let EMPREINTE;
try { EMPREINTE = fs.readFileSync(FICHIER_EMPREINTE, 'utf8').trim(); } catch (e) { EMPREINTE = ''; }
if (!/^[0-9a-f]{64}$/.test(EMPREINTE)) { console.error('porte : empreinte de clé absente ou illisible (' + FICHIER_EMPREINTE + ') — arrêt'); process.exit(2); }
const ATTENDU = Buffer.from(EMPREINTE, 'hex');

const refus = new Map();   // adresse → [instants des refus récents]
let enCours = 0;

function adresse(req) {
  // Derrière Caddy, l'adresse du client est la DERNIÈRE valeur de X-Forwarded-For (celle que Caddy ajoute) ; ce qu'un client
  // écrit lui-même dans cet en-tête arrive avant, et ne compte pas.
  const x = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return x.length ? x[x.length - 1] : (req.socket.remoteAddress || '?');
}
function tropDeRefus(ip, maintenant) {
  const l = (refus.get(ip) || []).filter(t => maintenant - t < REFUS_FENETRE_MS);
  if (l.length) refus.set(ip, l); else refus.delete(ip);
  return l.length >= REFUS_MAX;
}
function noterRefus(ip, maintenant) {
  const l = refus.get(ip) || []; l.push(maintenant); refus.delete(ip); refus.set(ip, l.slice(-REFUS_MAX));
  // Bornée : une adresse différente par demande (un bloc IPv6 entier) ferait grossir la table sans fin. La plus ancienne sort.
  while (refus.size > REFUS_ADRESSES_MAX) refus.delete(refus.keys().next().value);
}
setInterval(() => { const m = Date.now(); for (const [ip, l] of refus) if (!l.some(t => m - t < REFUS_FENETRE_MS)) refus.delete(ip); }, 60 * 1000).unref();
function cleJuste(req) {
  const m = /^Bearer ([0-9A-Za-z_\-.=+/]{20,200})$/.exec(String(req.headers.authorization || ''));
  if (!m) return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(m[1]).digest(), ATTENDU);
}
function rendre(res, code, objet) {
  const corps = JSON.stringify(objet);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(corps), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(corps);
}
function journal(ip, quoi) { console.log(new Date().toISOString() + ' ' + ip + ' ' + quoi); }

function executer(cmd, delai, dossier) {
  return new Promise(fini => {
    const debut = Date.now(); let sortie = Buffer.alloc(0), coupe = false, expire = false, rendu = false;
    // Un groupe de processus à part : au délai, on tue le groupe entier (la commande ET ce qu'elle a lancé au premier plan).
    const p = spawn('/bin/bash', ['-lc', cmd], { cwd: dossier, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: process.env.HOME || dossier, LANG: 'C.UTF-8', TERM: 'dumb', USER: process.env.USER || '' } });
    const prendre = d => { sortie = Buffer.concat([sortie, d]); if (sortie.length > SORTIE_MAX) { sortie = sortie.subarray(sortie.length - SORTIE_MAX); coupe = true; } };
    p.stdout.on('data', prendre); p.stderr.on('data', prendre);
    const minuterie = setTimeout(() => { expire = true; try { process.kill(-p.pid, 'SIGKILL'); } catch (e) {} }, delai * 1000);
    const finir = (code, signal, erreur) => { if (rendu) return; rendu = true; clearTimeout(minuterie);
      try { p.stdout.destroy(); p.stderr.destroy(); } catch (e) {}   /* un travail de fond garde les tuyaux : on cesse de les lire */
      fini({ code: erreur ? -1 : code, signal: signal || null, expire, coupe, ms: Date.now() - debut, sortie: (erreur ? 'porte : ' + erreur.message + '\n' : '') + sortie.toString('utf8') }); };
    p.on('error', e => finir(null, null, e));
    // « exit » et non « close » : une commande qui laisse un travail de fond (nohup … &) garde les tuyaux ouverts ; on rend
    // dès que la commande elle-même a fini, avec ce qu'elle a écrit jusque-là (plus un court répit pour les dernières lignes).
    p.on('exit', (code, signal) => setTimeout(() => finir(code, signal), 150));
  });
}

const serveur = http.createServer((req, res) => {
  const ip = adresse(req), maintenant = Date.now(), chemin = req.url.split('?')[0];
  if (req.method === 'GET' && chemin === '/porte/sante') return rendre(res, 200, { ok: true });   // dit seulement que la porte existe
  if (req.method !== 'POST' || chemin !== '/porte/exec') return rendre(res, 404, { erreur: 'inconnu' });
  // LA CLÉ D'ABORD (relecture de `gardien`, 17 novembre) : une clé juste passe TOUJOURS. Le compteur ne ferme que les clés
  // fausses — sinon vingt essais d'un inconnu sortant par la même adresse (un proxy partagé) fermaient la porte à son
  // propriétaire, et la clé factice d'appel.sh, envoyée sans secret posé, l'enfermait lui-même dix minutes.
  if (!cleJuste(req)) {
    if (tropDeRefus(ip, maintenant)) return rendre(res, 429, { erreur: 'trop de refus, réessayer plus tard' });
    noterRefus(ip, maintenant); journal(ip, 'REFUS clé'); return rendre(res, 401, { erreur: 'clé refusée' });
  }
  let taille = 0; const morceaux = []; let trop = false;
  req.on('data', d => { taille += d.length; if (taille > CORPS_MAX) trop = true; else morceaux.push(d); });
  req.on('end', async () => {
    if (trop) return rendre(res, 413, { erreur: 'corps trop gros' });
    let b; try { b = JSON.parse(Buffer.concat(morceaux).toString('utf8')); } catch (e) { return rendre(res, 400, { erreur: 'corps illisible' }); }
    const cmd = b && typeof b.cmd === 'string' ? b.cmd : '';
    if (!cmd.trim()) return rendre(res, 400, { erreur: 'commande vide' });
    const delai = Math.min(DELAI_MAX, Math.max(1, Number(b.delai) || DELAI_DEFAUT));
    const dossier = typeof b.dossier === 'string' && b.dossier.startsWith('/') ? b.dossier : DOSSIER;
    if (!fs.existsSync(dossier)) return rendre(res, 400, { erreur: 'dossier absent' });
    if (cmd.includes('\0')) return rendre(res, 400, { erreur: 'commande illisible' });
    if (enCours >= SIMULTANES_MAX) return rendre(res, 429, { erreur: 'trop de commandes en cours' });
    enCours++;
    // Le journal s'écrit AVANT l'exécution, avec la longueur et l'empreinte de la commande ENTIÈRE : une commande qui tue la
    // porte laisse quand même sa trace, et 300 caractères de remplissage ne cachent pas la suite (on sait qu'il y en a une).
    const marque = crypto.createHash('sha256').update(cmd).digest('hex').slice(0, 16);
    journal(ip, `DÉBUT ${marque} ${cmd.length} car. :: ${cmd.replace(/\s+/g, ' ').slice(0, 300)}`);
    try {
      const r = await executer(cmd, delai, dossier);
      journal(ip, `exec ${marque} code=${r.code}${r.expire ? ' EXPIRÉ' : ''} ${r.ms}ms`);
      rendre(res, 200, r);
    } catch (e) { journal(ip, `exec ${marque} ÉCHEC ${e.message}`); rendre(res, 500, { erreur: 'la commande n\'a pas pu être lancée' }); }
    finally { enCours--; }
  });
  req.on('error', () => {});
});
serveur.requestTimeout = 0; serveur.headersTimeout = 20000;
serveur.listen(PORT, '127.0.0.1', () => console.log('porte : à l\'écoute sur 127.0.0.1:' + PORT + ' (dossier ' + DOSSIER + ')'));

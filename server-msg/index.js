#!/usr/bin/env node
/* ══ OP MESSAGES — LE SERVICE (étape 1 : socle, porte bêta, messagerie texte en direct) ═══════
 *
 * Un service À PART, sur le même VPS qu'OP GESTION mais sans rien partager avec lui à
 * l'exécution : son dossier, sa base, sa clé, son utilisateur, son domaine (SERVEUR.md § 3.1).
 * Décision de Justin, 1er octobre 2026 : « OP MESSAGES je veux pas qu'il soit sur Firebase ».
 *
 * ⛔ `server-msg/` N'IMPORTE JAMAIS `server/` — ni son code, ni ses chemins. Le seul pont est la
 * porte bêta, qui APPELLE OP GESTION par HTTP en boucle locale (voir `porte-beta.js`).
 *
 * Démarrage : `OPMSG_CONFIG=… OPMSG_DATA=… OPMSG_INSTANCE=beta|prod [PORT=8091] node index.js`,
 * la clé maître arrive par le credential systemd `kek`. Le service n'écoute QUE sur 127.0.0.1 :
 * c'est le proxy qui parle à Internet.
 *
 * ⛔ AUCUNE EXCEPTION NE LAISSE LE PROCESSUS MOURIR EN SILENCE : un rejet ou une exception non
 * rattrapés sont journalisés par leur NOM seulement (jamais leur message : il peut citer une
 * donnée) puis le processus sort, et `Restart=always` le relance. Un service qui reste
 * à moitié vivant après une erreur est pire qu'un redémarrage.
 * ⛔ LES JOURNAUX N'ONT JAMAIS : d'adresse IP, de nom, de texte de message, de jeton, de mot de
 * passe. `journaliser` n'accepte que des champs nommés d'une liste blanche, de valeurs courtes.
 */
const fs = require('fs'), path = require('path');
const { monitorEventLoopDelay } = require('perf_hooks');
const { charger } = require('./config');
const { creerScelleur } = require('./scelle');
const stockageMod = require('./stockage');
const { creerQuotas } = require('./quotas');
const { creerFlux } = require('./flux');
const { creerPorteBeta } = require('./porte-beta');
const { construireApp } = require('./app');

const VERSION = '1.0.0-etape1';
const CHAMPS_JOURNAL = new Set(['quota', 'nom', 'code', 'instance', 'port', 'sha', 'etat', 'n', 'motif', 'route']);

function journaliser(evt, champs) {
  const o = { t: new Date().toISOString(), evt: String(evt).slice(0, 40) };
  for (const [k, v] of Object.entries(champs || {})) {
    if (!CHAMPS_JOURNAL.has(k)) continue;
    o[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).replace(/[\r\n]/g, ' ').slice(0, 60);
  }
  process.stdout.write(JSON.stringify(o) + '\n');
}

function demarrer(env = process.env) {
  const config = charger(env);   // ⛔ la garde de séparation passe là, avant tout dossier créé
  fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  const scelleur = creerScelleur(config.kek);
  const stockage = stockageMod.ouvrir({ chemin: path.join(config.dataDir, 'msg.db'), scelleur, horloge: Date.now });
  const quotas = creerQuotas(Date.now);
  const hub = creerFlux({ stockage, config, horloge: Date.now });
  const porte = config.instance === 'beta' ? creerPorteBeta({ config, quotas, stockage, horloge: Date.now }) : null;
  const demarreA = Date.now();
  const boucle = monitorEventLoopDelay({ resolution: 20 }); boucle.enable();

  /* Le plancher d'espace libre : sous le seuil, les écritures refusent (503) — ce service ne doit
     JAMAIS priver OP GESTION de disque. Relu toutes les 30 s ; une lecture impossible compte
     comme « pas bas » (on ne coupe pas sur une panne de mesure). */
  let disqueBas = false;
  const mesurerDisque = () => {
    try { const s = fs.statfsSync(config.dataDir); disqueBas = (Number(s.bavail) * Number(s.bsize)) / 1048576 < config.disqueMinMo; } catch (e) { disqueBas = false; }
  };
  mesurerDisque();
  const minuteurDisque = setInterval(mesurerDisque, 30000); minuteurDisque.unref();

  const ctx = {
    config, stockage, quotas, hub, porte, journaliser, horloge: Date.now, version: VERSION,
    maxMembres: stockageMod.MAX_MEMBRES, delaiModifMs: stockageMod.DELAI_MODIF_MS,
    disque: { bas: () => disqueBas },
    /* ⛔ /health est PUBLIQUE et AGRÉGÉE : des nombres et des états, jamais un identifiant, un
       nom ou un compte de messages (un volume est un journal d'activité). */
    sante: () => ({
      ok: true, instance: config.instance, sha: config.sha, version: VERSION,
      uptimeS: Math.round((Date.now() - demarreA) / 1000),
      base: { ok: true, schema: stockage.schema(), illisibles: stockage.illisibles() },   // des lignes chiffrées qui ne s'ouvrent pas : un nombre, jamais lesquelles
      flux: hub.stats(),
      porte: porte ? porte.etat() : null,
      boucle: { p99Ms: Math.round(boucle.percentile(99) / 1e6 * 10) / 10 },
      disque: { bas: disqueBas },
      quotasRefus: quotas.refus(),
    }),
  };

  const app = construireApp(ctx);
  const server = app.listen(config.port, '127.0.0.1');
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;

  /* ── Les tâches de fond : balayeur d'éphémères, élagage, relecture des accès bêta ───────── */
  const minuteurs = [];
  let tours = 0;
  minuteurs.push(setInterval(() => {
    try {
      const r = stockage.purgerExpires(500);
      for (const c of r.convs) hub.reveiller({ conv: c });
      if (++tours % 10 === 0) stockage.journalElaguer();
    } catch (e) { journaliser('balayage_echec', { nom: e && (e.code || e.name) }); }
  }, config.balayageMs));
  if (porte) {
    let enCours = false;
    minuteurs.push(setInterval(async () => {
      if (enCours) return; enCours = true;
      try { for (const id of await porte.relire()) hub.fermerPersonne(id); }
      catch (e) { journaliser('relecture_echec', { nom: e && (e.code || e.name) }); }
      finally { enCours = false; }
    }, config.beta.relectureMs));
  }
  for (const m of minuteurs) m.unref();

  async function arreter() {
    for (const m of minuteurs) clearInterval(m);
    clearInterval(minuteurDisque);
    boucle.disable();
    hub.arreter();
    await new Promise(r => server.close(() => r()));
    try { server.closeAllConnections(); } catch (e) {}
    stockage.fermer();
  }
  journaliser('demarre', { instance: config.instance, port: config.port, sha: config.sha });
  return { app, server, ctx, arreter, config };
}

module.exports = { demarrer, journaliser, VERSION };

if (require.main === module) {
  let svc;
  try { svc = demarrer(process.env); }
  catch (e) { journaliser('demarrage_refuse', { code: e && e.code ? e.code : 'ERREUR' }); process.stderr.write('OP MESSAGES : ' + (e && e.message ? e.message : 'démarrage impossible') + '\n'); process.exit(1); }
  const fin = (s) => { svc.arreter().finally(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); void s; };
  process.on('SIGTERM', () => fin('SIGTERM'));
  process.on('SIGINT', () => fin('SIGINT'));
  process.on('unhandledRejection', (e) => { journaliser('rejet', { nom: e && (e.code || e.name) }); process.exit(1); });
  process.on('uncaughtException', (e) => { journaliser('exception', { nom: e && (e.code || e.name) }); process.exit(1); });
}

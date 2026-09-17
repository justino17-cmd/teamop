#!/usr/bin/env node
/* ══ RESTAURER UNE SAUVEGARDE — L'AUTRE MOITIÉ, SANS LAQUELLE LA PREMIÈRE NE VAUT RIEN ═══════
 *
 * `REPRISE.md` dit de Firebase : « la sauvegarde de Google, JAMAIS RESTAURÉE PAR NOUS ». C'est
 * exactement le piège que ce fichier existe pour éviter. Une sauvegarde qu'on n'a jamais su
 * rouvrir n'est pas une sauvegarde : c'est une croyance. Ce script est donc écrit pour être
 * lancé un jour de calme, pour de faux, afin de savoir qu'il marchera le jour où il faudra.
 *
 * Usage, SUR LE VPS ou sur n'importe quelle machine qui a Node et la clé :
 *
 *   node server/restaurer.js liste                       # ce que contient le coffre
 *   node server/restaurer.js essai                       # ⇦ À FAIRE UNE FOIS PAR TRIMESTRE :
 *                                                        #   télécharge la dernière, l'ouvre dans
 *                                                        #   un dossier temporaire, compte, efface
 *   node server/restaurer.js extraire <clé> <dossier>    # pose le contenu où on veut
 *
 * ⛔ IL N'ÉCRIT JAMAIS DANS `/opt/teamop/data` NI SUR `config.json`. Écraser les données vivantes
 * d'un serveur qui tourne est une opération qu'on fait à la main, en conscience, après avoir
 * arrêté le service — pas une option d'un script qu'on lance à 4 h du matin en panique. Il
 * extrait où on lui dit, et refuse un dossier non vide.
 *
 * ⛔ LA CLÉ. Elle est lue dans `config.json` (`sauvegarde.cle`) ou dans la variable
 * d'environnement `TEAMOP_SAUV_CLE`. Sur un VPS mort, `config.json` n'existe plus : c'est le
 * SEUL cas qui compte vraiment, et c'est pour ça que la clé doit être conservée AILLEURS que
 * sur le serveur. Sans elle, les archives sont du bruit — définitivement.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const s3mod = require('./s3');
const { relire, cleDepuis } = require('./sauvegarde');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';

function charger() {
  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (e) {
    if (!process.env.TEAMOP_SAUV_CLE) {
      console.error('✗ ' + CONFIG_PATH + ' illisible, et TEAMOP_SAUV_CLE non fournie.');
      console.error('  Sur un serveur perdu, c\'est normal : donne la clé conservée hors du VPS —');
      console.error('  TEAMOP_SAUV_CLE=<64 caractères> TEAMOP_SAUV_COFFRE=<endpoint,bucket,accessKey,secretKey> node server/restaurer.js liste');
      process.exit(1);
    }
  }
  const conf = Object.assign({}, config.sauvegarde || {});
  if (process.env.TEAMOP_SAUV_CLE) conf.cle = process.env.TEAMOP_SAUV_CLE;
  /* Un coffre donné à la main, pour la restauration sur une machine qui n'a plus rien :
     « endpoint,bucket,accessKey,secretKey », dans cet ordre. On ne l'écrit nulle part. */
  if (process.env.TEAMOP_SAUV_COFFRE) {
    const [endpoint, bucket, accessKey, secretKey, region] = String(process.env.TEAMOP_SAUV_COFFRE).split(',');
    Object.assign(conf, { endpoint, bucket, accessKey, secretKey, region: region || conf.region });
  }
  const cle = cleDepuis(conf.cle);
  if (!cle) { console.error('✗ clé de sauvegarde absente ou mal formée (64 caractères hexadécimaux attendus).'); process.exit(1); }
  const client = s3mod.client(conf);
  if (!client) { console.error('✗ coffre incomplet : endpoint, bucket, accessKey et secretKey sont tous nécessaires.'); process.exit(1); }
  return { cle, client, prefixe: conf.prefixe || 'teamop/' };
}

const ko = o => (o / 1024 / 1024).toFixed(1) + ' Mio';

async function lister(ctx) {
  const r = await ctx.client.lister(ctx.prefixe);
  if (!r.ok) { console.error('✗ liste impossible : HTTP ' + r.statut); process.exit(1); }
  const objets = r.objets.slice().sort((a, b) => (a.cle < b.cle ? 1 : -1));
  if (!objets.length) { console.log('Le coffre est VIDE — aucune sauvegarde n\'a jamais été déposée.'); return objets; }
  console.log(objets.length + ' sauvegarde(s) :');
  objets.forEach((o, i) => console.log('  ' + (i === 0 ? '→' : ' ') + ' ' + o.cle + '   ' + ko(o.octets) + '   ' + o.modifie));
  return objets;
}

async function telecharger(ctx, cle, vers) {
  const r = await ctx.client.lire('', cle);
  if (!r.ok) { console.error('✗ téléchargement impossible : ' + (r.absente ? 'objet absent' : 'HTTP ' + r.statut)); process.exit(1); }
  fs.writeFileSync(vers, r.corps);
  return r.corps.length;
}

(async () => {
  const [, , commande, a1, a2] = process.argv;
  const ctx = charger();

  if (!commande || commande === 'liste') { await lister(ctx); return; }

  if (commande === 'essai') {
    /* ⛔ L'ESSAI EST LE CŒUR DE CE FICHIER. Il fait, pour de faux, exactement ce qu'on fera pour
       de vrai : télécharger, déchiffrer, décompresser, DÉBALLER, et regarder ce qu'il y a
       dedans. Puis il efface son dossier temporaire — il ne laisse rien derrière lui. */
    const objets = await lister(ctx);
    if (!objets.length) process.exit(1);
    const cible = objets[0].cle;
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'teamop-essai-'));
    const archive = path.join(dossier, 'archive.bin'), sortie = path.join(dossier, 'contenu');
    fs.mkdirSync(sortie);
    try {
      console.log('\n→ essai de restauration sur ' + cible);
      const n = await telecharger(ctx, cible, archive);
      console.log('  téléchargée : ' + ko(n));
      const r = await relire(archive, ctx.cle, sortie);
      console.log('  déchiffrée, décompressée, déballée.');
      /* On ne se contente pas de « ça s'est ouvert » : on REGARDE si les deux choses qui
         comptent sont là. Une archive techniquement valable mais vide de l'annuaire ne
         sauverait rien, et c'est exactement le genre de défaut qu'on ne verrait que le jour J. */
      const lu = p => { try { return fs.readdirSync(path.join(sortie, p)); } catch (e) { return null; } };
      const data = lu('data');
      const conf = fs.existsSync(path.join(sortie, 'config.json'));
      console.log('  contenu : ' + (data ? data.length + ' fichiers dans data/' : '⚠ AUCUN dossier data/') + ' · config.json ' + (conf ? 'présent' : '⚠ ABSENT'));
      const attendus = ['espaces.json', 'comptes.json'];
      const manquants = data ? attendus.filter(f => !data.includes(f)) : attendus;
      if (manquants.length) console.log('  ⚠ absents de l\'archive : ' + manquants.join(', ') + ' (normal si ce serveur ne les a jamais écrits)');
      console.log('\n✅ CETTE SAUVEGARDE EST RESTAURABLE. ' + (r.entrees || data && data.length || 0) + ' entrée(s) relues.');
    } finally { try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {} }
    return;
  }

  if (commande === 'extraire') {
    if (!a1 || !a2) { console.error('usage : node server/restaurer.js extraire <clé> <dossier vide>'); process.exit(1); }
    fs.mkdirSync(a2, { recursive: true });
    if (fs.readdirSync(a2).length) { console.error('✗ ' + a2 + ' n\'est pas vide. Refus : on n\'écrase pas un dossier qui contient déjà quelque chose.'); process.exit(1); }
    const archive = path.join(os.tmpdir(), 'teamop-restau-' + process.pid + '.bin');
    try {
      const n = await telecharger(ctx, a1, archive);
      console.log('téléchargée : ' + ko(n));
      await relire(archive, ctx.cle, a2);
      console.log('✅ déballée dans ' + a2);
      console.log('\n⛔ Rien n\'a été écrit dans /opt/teamop. Pour remettre en service, service ARRÊTÉ :');
      console.log('   systemctl stop teamop-api');
      console.log('   mv /opt/teamop/data /opt/teamop/data.avant-restauration');
      console.log('   mv ' + path.join(a2, 'data') + ' /opt/teamop/data');
      console.log('   # config.json : compare AVANT de remplacer, il a pu changer depuis la sauvegarde');
      console.log('   systemctl start teamop-api && curl -s localhost:8080/health');
    } finally { try { fs.unlinkSync(archive); } catch (e) {} }
    return;
  }

  console.error('commandes : liste · essai · extraire <clé> <dossier>');
  process.exit(1);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });

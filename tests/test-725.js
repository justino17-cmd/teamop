/* ⛔ CE QUE CE FICHIER GARDE — LA CHAÎNE DE SAUVEGARDE DU SOCLE, DE BOUT EN BOUT.

   Il existe parce qu'il manquait, et que son absence a coûté cher deux fois de suite.

   Le 18 septembre 2026, une vérification a trouvé que l'archive nocturne emportait les bases
   SQLite VIVANTES : restaurées, elles rendaient « database disk image is malformed » — mesuré,
   5 sur 6. Le correctif a pris un instantané cohérent (`VACUUM INTO`) et exclu les fichiers
   vivants de l'archive. ⛔ **Ce correctif était PIRE que le défaut.** Les motifs `--exclude` de
   GNU tar ne sont pas ancrés : `--exclude=socle-annuaire.db`, écrit pour retirer le fichier
   VIVANT, retirait aussi l'INSTANTANÉ du même nom. L'archive contenait donc les données
   chiffrées de toutes les entreprises et **AUCUNE de leurs clés** — parfaitement intactes,
   définitivement illisibles. Et le contrôle ajouté en même temps, « on ouvre vraiment les
   bases au lieu de compter des noms », déclarait cette archive **✅ RESTAURABLE**, parce qu'il
   vérifiait les fichiers PRÉSENTS sans jamais vérifier que ceux qui comptent sont là.

   ⛔ LA CAUSE RACINE DES DEUX, C'EST CE FICHIER QUI N'EXISTAIT PAS. Les bancs s'arrêtaient à
   « l'instantané s'écrit sur le disque ». Aucun ne fabriquait une VRAIE archive et ne regardait
   DEDANS. Une sauvegarde ne se relit pas en lisant le code qui l'écrit.

   Donc ici, et seulement ici : on lance le VRAI module avec un coffre en mémoire, on prend une
   VRAIE archive chiffrée, on la déballe, et on exige que tout ce qui est nécessaire à une
   restauration y soit — et que ce qui manque soit VU.

   ⚠️ Un banc de sauvegarde qui passe sans avoir rien ouvert est exactement le mensonge qu'on
   combat : chaque contrôle d'ici doit échouer si on casse ce qu'il prétend garder. */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-725-'));
const DATA = path.join(DIR, 'data');
const KEK = crypto.randomBytes(32).toString('hex');
fs.mkdirSync(DATA, { recursive: true });
process.env.TEAMOP_DATA = DATA;
process.env.TEAMOP_KEK = KEK;

const socle = require(path.join(RACINE, 'server', 'socle.js'));
const S = require(path.join(RACINE, 'server', 'sauvegarde.js'));
const CLE_SAUV = crypto.randomBytes(32).toString('hex');

/* Le coffre en mémoire : le même contrat que `s3.js`, exposé en FLUX comme `lancer()` l'emploie. */
function coffreNeuf() {
  const objets = new Map();
  return {
    _objets: objets,
    async poserCleFlux(k, chemin, octets) { objets.set(k, fs.readFileSync(chemin)); return { ok: true, octets }; },
    async lireCleVers(k, sortie) {
      if (!objets.has(k)) return { ok: false, absente: true };
      const b = objets.get(k); fs.writeFileSync(sortie, b);
      return { ok: true, octets: b.length, empreinte: crypto.createHash('sha256').update(b).digest('hex') };
    },
    async effacerCle(k) { objets.delete(k); return { ok: true }; },
    async lister() { return { ok: true, objets: [...objets.keys()].map(k => ({ cle: k, octets: objets.get(k).length, modifie: '' })) }; },
  };
}
const fauxApp = { get() {}, post() {} };
const monter = (coffre) => S.monterSauvegarde(fauxApp, {
  config: { sauvegarde: { cle: CLE_SAUV, prefixe: 'teamop/', garder: 30 } },
  DATA_DIR: DATA, CONFIG_PATH: path.join(DIR, 'config.json'),
  garde: (q, r, n) => n(), client: coffre, socle,
});

/* Une base réaliste : deux entreprises, des versions, un journal. */
const M = 1700000000000;
for (const t of ['elan-34oc', 'entreprise-b']) {
  for (let p = 0; p < 3; p++) {
    const lot = [];
    for (let i = 0; i < 200; i++) lot.push({ c: 'produits', id: 'p' + p + '-' + i, m: M + p * 200 + i, e: 'h' + i, r: { nom: 'Produit ' + i, notes: 'terrain '.repeat(20) } });
    socle.pousser(t, lot);
  }
}
fs.writeFileSync(path.join(DIR, 'config.json'), JSON.stringify({ sauvegarde: { cle: CLE_SAUV } }));
fs.writeFileSync(path.join(DATA, 'espaces.json'), JSON.stringify({ 'entreprise-a': { t: 'elan-34oc' } }));

/* Déballe une archive du coffre et rend la liste de ses entrées. */
async function contenu(coffre, cle) {
  const brut = path.join(DIR, 'relu.bin');
  await coffre.lireCleVers(cle, brut);
  const sortie = path.join(DIR, 'deballe');
  try { fs.rmSync(sortie, { recursive: true, force: true }); } catch (e) {}
  fs.mkdirSync(sortie, { recursive: true });
  await S.relire(brut, Buffer.from(CLE_SAUV, 'hex'), sortie);
  const liste = [];
  (function marcher(d, prefixe) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) marcher(p, prefixe + f + '/');
      else liste.push(prefixe + f);
    }
  })(sortie, '');
  return { liste, sortie };
}

(async () => {
  try {
    /* ══ 1. L'ARCHIVE CONTIENT-ELLE DE QUOI RESTAURER ? ══════════════════════════════════ */
    console.log('⛔ Une archive doit contenir de quoi restaurer — pas « presque »');
    const coffre = coffreNeuf();
    const mod = monter(coffre);
    const r = await mod.lancer('banc');
    v('la sauvegarde se déclare réussie', r.ok, true);
    /* ⛔ ON NOMME LE DOSSIER, ON NE COMPTE PAS LE COFFRE — et c'est la copie MENSUELLE, ajoutée
       le 20 septembre 2026, qui l'a exigé. Elle est déposée sous `teamop/mensuel/` dans la
       foulée de la première nuit réussie : un compteur global passe au rouge alors que rien
       n'est cassé, et un `keys()[0]` va chercher l'archive « la première arrivée », ce qui est
       un ordre d'insertion, pas une règle. Les deux se corrigent en disant ce qu'on veut. */
    const cleDuJour = [...coffre._objets.keys()].filter(k => k.indexOf('mensuel/') < 0);
    const cleDuMois = [...coffre._objets.keys()].filter(k => k.indexOf('mensuel/') >= 0);
    v('le coffre en porte une pour le jour', cleDuJour.length, 1);
    v('⛔ et une copie mensuelle, rangée à part', cleDuMois.length, 1);

    const { liste, sortie } = await contenu(coffre, cleDuJour[0]);
    const socleDedans = liste.filter(f => /socle-instantane\//.test(f));
    console.log('      contenu du socle dans l\'archive : ' + JSON.stringify(socleDedans));

    /* ⛔ LE CONTRÔLE QUI MANQUAIT, ET QUI A COÛTÉ DEUX CORRECTIFS. L'annuaire porte les CLÉS de
       toutes les entreprises (leurs DEK, scellées sous la clé maître). Sans lui, l'archive
       contient des données parfaitement intactes et définitivement illisibles. */
    vrai('⛔ L\'ANNUAIRE EST DANS L\'ARCHIVE (il porte les clés de tous les clients)',
      socleDedans.some(f => /socle-instantane\/socle-annuaire\.db$/.test(f)));
    vrai('⛔ et la base de chaque entreprise aussi', socleDedans.some(f => /elan-34oc\.db$/.test(f))
      && socleDedans.some(f => /entreprise-b\.db$/.test(f)));
    /* ⛔ Et les fichiers VIVANTS, eux, n'y sont pas : c'est eux qui se restaurent corrompus. */
    v('⛔ aucun fichier vivant du socle dans l\'archive',
      liste.filter(f => /^data\/socle/.test(f)), []);
    v('   ni aucun -wal ni -shm', liste.filter(f => /-wal$|-shm$/.test(f)), []);
    v('   le reste de data/ est bien là', liste.some(f => f === 'data/espaces.json'), true);

    /* ══ 2. CHAQUE BASE DE L'ARCHIVE S'OUVRE VRAIMENT ═══════════════════════════════════ */
    console.log('\n⛔ Chaque base de l\'archive s\'ouvre et se parcourt');
    for (const f of socleDedans) {
      const c = socle.controlerFichier(path.join(sortie, f));
      v('   ' + path.basename(f) + ' s\'ouvre', c.ok, true);
    }
    /* ⛔ ET ON SAIT LIRE CE QU'ELLE CONTIENT. Une base intacte dont on n'a plus la clé est
       exactement le piège du 18 septembre : le fichier va bien, la donnée est perdue. */
    const remis = path.join(DIR, 'remis');
    fs.mkdirSync(path.join(remis, 'socle'), { recursive: true });
    const n = socle.restaurerDepuis(path.join(sortie, 'socle-instantane'), remis);
    vrai('⛔ la restauration remet l\'annuaire ET les bases', n >= 3);
    vrai('   l\'annuaire est bien posé', fs.existsSync(path.join(remis, 'socle-annuaire.db')));
    vrai('   et la base d\'une entreprise aussi', fs.existsSync(path.join(remis, 'socle', 'elan-34oc', 'base.db')));

    /* La preuve ultime : on relit les DONNÉES d'un client depuis la restauration. */
    const { execFileSync } = require('child_process');
    const lecteur = path.join(DIR, 'lire.js');
    fs.writeFileSync(lecteur, "const S=require(" + JSON.stringify(path.join(RACINE, 'server', 'socle.js')) + ");"
      + "try{const d=S.depuis('elan-34oc',0,5);process.stdout.write(JSON.stringify({n:d.enr.length,nom:d.enr[0]&&d.enr[0].r&&d.enr[0].r.nom,ill:d.illisibles.length}));}"
      + "catch(e){process.stdout.write(JSON.stringify({err:e.message.split('\\n')[0]}));}");
    const vu = JSON.parse(execFileSync('node', [lecteur], { env: { ...process.env, TEAMOP_DATA: remis, TEAMOP_KEK: KEK }, encoding: 'utf8' }));
    v('⛔ ET LES DONNÉES DU CLIENT SE RELISENT depuis la restauration', [vu.n, vu.nom, vu.ill], [5, 'Produit 0', 0]);

    /* ══ 3. UNE ARCHIVE AMPUTÉE DOIT ÊTRE REFUSÉE, PAS DÉCLARÉE BONNE ═══════════════════ */
    console.log('\n⛔ Une archive à laquelle il manque quelque chose est REFUSÉE');
    {
      /* On rejoue la relecture du module sur une archive dont on a retiré l'annuaire —
         exactement ce que produisait le correctif du 18 au soir. */
      const faux = path.join(DIR, 'ampute');
      try { fs.rmSync(faux, { recursive: true, force: true }); } catch (e) {}
      fs.mkdirSync(path.join(faux, 'socle-instantane'), { recursive: true });
      fs.copyFileSync(path.join(sortie, 'socle-instantane', 'elan-34oc.db'), path.join(faux, 'socle-instantane', 'elan-34oc.db'));
      const verdict = S.verifierInstantane(path.join(faux, 'socle-instantane'), socle);
      v('⛔ sans l\'annuaire → REFUSÉE', verdict.ok, false);
      vrai('   et le motif le dit', /annuaire/i.test(verdict.motif || ''));

      /* ⛔ CE QUI MANQUE INVALIDE, CE QUI EST DÉGRADÉ ALARME — et la nuance vaut la sauvegarde
         de toute la plateforme. La première version de ce banc gravait l'inverse : elle
         exigeait `ok:false` sur une simple copie brute, donc elle GRAVAIT le défaut qui faisait
         effacer du coffre l'archive de toutes les entreprises saines dès qu'UNE seule avait un
         témoin de clé cassé. Un banc peut figer une panne aussi sûrement qu'il en garde une. */
      fs.copyFileSync(path.join(sortie, 'socle-instantane', 'socle-annuaire.db'), path.join(faux, 'socle-instantane', 'socle-annuaire.db'));
      fs.copyFileSync(path.join(sortie, 'socle-instantane', 'entreprise-b.db'), path.join(faux, 'socle-instantane', 'malade.db.brut'));
      const v2 = S.verifierInstantane(path.join(faux, 'socle-instantane'), socle);
      v('⛔ une base en copie BRUTE est VUE', v2.brutes, 1);
      v('⛔ et l\'archive est CONSERVÉE (les entreprises saines ne paient pas pour elle)', v2.ok, true);
      v('   mais elle est marquée DÉGRADÉE', v2.degrade, true);
      /* ⛔ En revanche, une copie brute ILLISIBLE, ça, c'est une archive qu'on refuse. */
      fs.writeFileSync(path.join(faux, 'socle-instantane', 'malade.db.brut'), Buffer.alloc(9000, 3));
      v('⛔ une copie brute ILLISIBLE, elle, invalide l\'archive', S.verifierInstantane(path.join(faux, 'socle-instantane'), socle).ok, false);
      fs.unlinkSync(path.join(faux, 'socle-instantane', 'malade.db.brut'));

      /* ⛔ Une base de 0 octet — ce que laisse un disque plein pendant VACUUM INTO. */
      fs.writeFileSync(path.join(faux, 'socle-instantane', 'vide.db'), Buffer.alloc(0));
      const v3 = S.verifierInstantane(path.join(faux, 'socle-instantane'), socle);
      v('⛔ une base VIDE n\'est pas « saine »', v3.ok, false);
      v('   controlerFichier la refuse aussi', socle.controlerFichier(path.join(faux, 'socle-instantane', 'vide.db')).ok, false);
    }

    /* ══ 4. L'INSTANTANÉ NE TRAÎNE PAS SUR LE DISQUE ═══════════════════════════════════
       ⛔ C'est une copie LISIBLE de toutes les bases ET de l'annuaire, donc de toutes les clés.
       La laisser entre deux sauvegardes double la place occupée et met hors du cloisonnement
       une copie de tout ce que le produit protège. */
    console.log('\n⛔ L\'instantané ne reste pas sur le disque après la sauvegarde');
    {
      const tmp = path.join(path.dirname(DATA), '.teamop-sauvegarde-tmp');
      let reste = [];
      try { reste = fs.readdirSync(path.join(tmp, 'socle-instantane')); } catch (e) {}
      v('⛔ le dossier d\'instantané est vidé après coup', reste, []);
    }

    /* ══ 5. UNE ARCHIVE RECALÉE NE RESTE PAS DANS LE COFFRE ════════════════════════════ */
    console.log('\n⛔ Une archive recalée ne compte pas comme une copie');
    {
      const c2 = coffreNeuf();
      const m2 = monter(c2);
      /* On fait échouer la relecture : l'objet a été déposé, puis jugé mauvais. */
      const vraiLire = c2.lireCleVers;
      c2.lireCleVers = async (k, s2) => { const r2 = await vraiLire.call(c2, k, s2); if (r2.ok) { const b = fs.readFileSync(s2); b[20] ^= 0xFF; fs.writeFileSync(s2, b); r2.empreinte = crypto.createHash('sha256').update(b).digest('hex'); } return r2; };
      const r2 = await m2.lancer('banc-abime');
      v('la sauvegarde est marquée en ÉCHEC', r2.ok, false);
      /* ⛔ Sans ça, une archive qu'on sait mauvaise occupe une place de « copie valable » dans
         la rétention à 30 : trente nuits de suite et il ne reste plus une seule copie saine. */
      v('⛔ et l\'objet recalé ne reste PAS dans le coffre', c2._objets.size, 0);
    }

    /* ══ UNE RÉTENTION QUI NE PEUT PAS TOURNER DOIT LE DIRE ═══════════════════════════════
       ⛔ `lister()` est le SEUL organe de la rétention. S'il échoue, l'élagage est sauté — et
       la sauvegarde se notait quand même `ok:true`, sans un mot. Le cas n'est pas théorique,
       c'est même le plus courant : une clé d'accès qui a `PutObject` et `GetObject` mais pas
       `ListBucket`, c'est-à-dire le réglage qu'on obtient en resserrant les droits « pour
       faire propre ». Le coffre grossit alors d'une archive par nuit, pour toujours. */
    console.log('\n⛔ Le coffre ne doit pas grossir sans fin en silence');
    {
      const c3 = coffreNeuf();
      c3.lister = async () => ({ ok: false, statut: 403 });   // exactement le cas IAM
      const m3 = monter(c3);
      const r3 = await m3.lancer('banc');
      /* ⚠️ LA SAUVEGARDE RÉUSSIT QUAND MÊME, ET C'EST VOULU : l'archive de cette nuit est
         bonne et déposée. La jeter parce qu'on n'a pas pu élaguer serait pire que le défaut. */
      v('la sauvegarde RÉUSSIT quand même', r3.ok, true);
      v('   et l\'archive est bien au coffre', c3._objets.size, 1);
      /* ⛔ MAIS LE DÉFAUT REMONTE, aux deux endroits qui comptent. */
      v('⛔ la ligne servie à la Tour nomme le refus', r3.elagage, 'liste-403');
      v('⛔ et /health compte les nuits sans rétention', m3.sante().elagageEchecs, 1);

      /* ⚠️ LA CONTRE-ÉPREUVE : un coffre qui liste normalement doit remettre le compteur à
         zéro, sinon l'alarme resterait allumée pour toujours après un seul mauvais jour. */
      const c4 = coffreNeuf();
      const m4 = monter(c4);
      const r4 = await m4.lancer('banc');
      v('⛔ quand la rétention tourne, elle le dit aussi', [r4.ok, r4.elagage], [true, 'ok']);
      v('   et le compteur est à zéro', m4.sante().elagageEchecs, 0);
    }
  } catch (e) {
    ko++; console.log('  ✗ le banc n\'a pas pu tourner : ' + e.message + '\n' + String(e.stack).split('\n').slice(1, 5).join('\n'));
  }

  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(path.join(path.dirname(DATA), '.teamop-sauvegarde-tmp'), { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();

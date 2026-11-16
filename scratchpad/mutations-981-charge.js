/* ══ LES MUTATIONS DU CHANTIER « test-981 SOUS CHARGE » (16 novembre 2026) — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » ══════════════
 *
 * `tests/test-981.js` tombait sous charge par trois courses de ses OUTILS (l'horloge, la fermeture d'un flux, le port) ; il a été rendu stable sans toucher au service. Rendre un banc stable est aussi
 * la façon la plus simple de le rendre AVEUGLE : ce fichier remet, un par un, sur une COPIE de l'arbre (jamais l'arbre : `git checkout` y effacerait un correctif non commité) :
 *
 *   S. des défauts dans le SERVICE — chacun doit faire tomber, dans `test-981`, LE contrôle qui tombait sous charge (ou celui dont la lecture a été gardée) : on vérifie le NOM du contrôle tombé,
 *      pas seulement qu'« un » contrôle tombe ;
 *   O. les défauts d'origine dans les OUTILS — chacun doit faire tomber sa section de `test-993` ;
 *   C. la CONTRE-ÉPREUVE de la course de fermeture, AU GESTE : un service qui apprend la fermeture d'un flux 400 ms plus tard (ce que fait une machine chargée, sans la charger). L'ANCIEN banc
 *      (`git show <commit>:tests/test-981.js`) doit tomber sur « signaux retenus » ; le NOUVEAU doit rester vert.
 *
 * ⛔ Chaque motif doit se trouver EXACTEMENT UNE fois, le fichier muté doit se lire (`node --check`), et les témoins (aucune mutation) doivent être verts : sinon rien de ce qui suit ne prouve quoi que ce soit.
 *
 *   node scratchpad/mutations-981-charge.js            (tout ; ~3 minutes, un banc à la fois)
 *   node scratchpad/mutations-981-charge.js S03 O01    (seulement celles-là)
 *   ANCIEN=a415080 node scratchpad/mutations-981-charge.js C01    (le commit d'AVANT le correctif, pour la contre-épreuve)
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const ANCIEN = process.env.ANCIEN || 'a415080';
const COPIES = ['server-msg', 'tests/outils-msg.js', 'tests/lib-horloge-msg.js', 'tests/test-981.js', 'tests/test-993.js'];

/* [id, ce que le défaut fait, [[fichier, motif, remplacement]…], banc, le contrôle qui DOIT tomber (un bout de son libellé)] */
const MUTATIONS = [
  ['S01', 'un signal envoyé sans flux ouvert n\'est plus RETENU', [['server-msg/flux.js', 'e.l.push({ t, event, data, n }); e.octets += n; retenusOctets += n;', 'void n;']], '981', 'les deux signaux retenus'],
  ['S02', 'un signal retenu depuis plus de 30 s est livré quand même', [['server-msg/flux.js', 'if (t - x.t <= RETENU_MS) {', 'if (t - x.t <= RETENU_MS * 100) {'], ['server-msg/flux.js', 'while (e.l.length && t - e.l[0].t > RETENU_MS) retirer(e, e.l.shift());', 'while (e.l.length && t - e.l[0].t > RETENU_MS * 100) retirer(e, e.l.shift());']], '981', 'un signal de plus de 30 s'],
  ['S03', 'le débit des signaux n\'est plus plafonné', [['server-msg/routes-appels.js', "    if (!plafond(res, 'signal:' + acces.id + ':' + moi.id, salle ? cfg.groupeSignalMax : cfg.signalMax, cfg.signalFenetreMs)) return;\n", '']], '981', 'le DÉBIT est plafonné'],
  ['S04', 'la fenêtre du débit des signaux dure cent minutes au lieu d\'une', [['server-msg/routes-appels.js', 'salle ? cfg.groupeSignalMax : cfg.signalMax, cfg.signalFenetreMs)) return;', 'salle ? cfg.groupeSignalMax : cfg.signalMax, cfg.signalFenetreMs * 100)) return;']], '981', 'une minute plus tard, le plafond est levé'],
  ['S05', 'n\'importe quel appareil de la personne signale dans l\'appel', [['server-msg/appels.js', "if (!a.session || a.session !== sessionH) throw erreur('appareil_non_lie');", "if (!a.session) throw erreur('appareil_non_lie');"]], '981', 'un étranger ne signale rien'],
  ['S06', 'la vue d\'un appel ne dit plus que l\'appareil est lié', [['server-msg/stockage.js', "motif: a.motif || null, lie: !!me.session,\n      rev: a.etat === 'sonne'", "motif: a.motif || null, lie: false,\n      rev: a.etat === 'sonne'"]], '981', 'Ben répond depuis son premier appareil'],
  ['S07', 'raccrocher répond toujours « déjà fait »', [['server-msg/routes-appels.js', 'res.json({ ok: true, appel: r.vue, deja: !!r.deja });', 'res.json({ ok: true, appel: r.vue, deja: true });']], '981', 'Ana raccroche depuis l\'appareil lié'],
  ['S08', 'la fin d\'un appel n\'est plus annoncée aux sessions de celle qui raccroche', [['server-msg/appels.js', "      reveiller(Object.keys(r.gids));\n      if (r.notif) pousserManque(r.notif, { id, type: r.vue ? r.vue.type : 'audio', appelant: moi });", "      reveiller(Object.keys(r.gids).filter(u => u !== moi.id));\n      if (r.notif) pousserManque(r.notif, { id, type: r.vue ? r.vue.type : 'audio', appelant: moi });"]], '981', 'la fin de l\'appel arrive à TOUTES les sessions'],
  ['S09', 'une sonnerie échue se prend encore', [['server-msg/appels.js', "    echoir();                                                 // une sonnerie échue ne se prend plus", "    void 0;                                                   // une sonnerie échue ne se prend plus"], ['server-msg/stockage.js', "if (a.etat !== 'sonne' || num(a.sonne_jusqua) <= horloge()) throw erreur('appel_fini');", "if (a.etat !== 'sonne') throw erreur('appel_fini');"]], '981', 'répondre à une sonnerie ÉCHUE'],
  ['S10', 'l\'échéance des identifiants du relais est fausse de DEUX secondes (l\'ancienne tolérance de ± 3 s la laissait passer)', [['server-msg/appels.js', 'const expire = Math.floor(maintenantMs / 1000) + relais.ttlS;', 'const expire = Math.floor(maintenantMs / 1000) + relais.ttlS + 2;']], '981', 'le nom d\'utilisateur est'],
  ['S11', 'Ben n\'apprend plus l\'appel sur ses appareils (l\'événement `appel` n\'est écrit que pour l\'appelante)', [['server-msg/stockage.js', "    for (const p of lignes) gids[p.uid] = journalAjouter('appel', null, p.uid, id);\n    for (const u of extra || []) if (gids[u] === undefined && appelPart(id, u))", "    for (const p of lignes.filter(x => x.role === 'appelant')) gids[p.uid] = journalAjouter('appel', null, p.uid, id);\n    for (const u of extra || []) if (gids[u] === undefined && appelPart(id, u))"]], '981', null],
  ['O01', '`avancer()` écrit de nouveau SUR le fichier lu (troncature puis écriture)', [['tests/outils-msg.js', "const poserDecalage = () => { const tmp = fichierDecalage + '.tmp'; fs.writeFileSync(tmp, String(decalage)); fs.renameSync(tmp, fichierDecalage); };", 'const poserDecalage = () => { fs.writeFileSync(fichierDecalage, String(decalage)); };']], '993', 'chaque `avancer` REMPLACE le fichier'],
  ['O02', 'une lecture illisible du décalage vaut de nouveau zéro', [['tests/lib-horloge-msg.js', "try { const n = parseInt(fs.readFileSync(f, 'utf8'), 10); if (Number.isFinite(n)) dernier = n; } catch (e) { /* illisible : le dernier décalage connu reste */ }", "try { dernier = parseInt(fs.readFileSync(f, 'utf8'), 10) || 0; } catch (e) { dernier = 0; }"]], '993', 'fichier VIDE'],
  ['O03', 'un port tiré n\'est plus réservé', [['tests/outils-msg.js', '    if (reserverPort(p)) return p;', '    return p;']], '993', 'la réservation est un fichier'],
  ['O04', 'une réservation ne voit plus celle d\'un autre processus (le fichier est écrasé)', [['tests/outils-msg.js', "fs.writeFileSync(f, String(process.pid), { flag: 'wx' });", 'fs.writeFileSync(f, String(process.pid));']], '993', 'un AUTRE processus ne peut pas réserver'],
  ['O05', 'une réservation orpheline s\'efface sans attendre dix minutes', [['tests/outils-msg.js', 'if (!vivant && Date.now() - fs.statSync(f).mtimeMs > 600000) fs.unlinkSync(f);', 'if (!vivant) fs.unlinkSync(f);']], '993', 'orpheline RÉCENTE'],
  ['O06', 'une réservation ancienne s\'efface même si son processus vit', [['tests/outils-msg.js', 'if (!vivant && Date.now() - fs.statSync(f).mtimeMs > 600000) fs.unlinkSync(f);', 'if (Date.now() - fs.statSync(f).mtimeMs > 600000) fs.unlinkSync(f);']], '993', 'dont le processus VIT'],
  ['O07', '`lancerService` ne regarde plus si quelqu\'un écoute déjà sur le port avant de lancer', [['tests/outils-msg.js', '  for (let i = 0; await portTenu(port); i++) {', '  for (let i = 0; false && await portTenu(port); i++) {']], '993', 'ne rend PAS le service d\'un autre'],
  ['O08', '`portTenu` répond toujours « personne »', [['tests/outils-msg.js', "s.once('connect', () => { s.destroy(); res(true); });", "s.once('connect', () => { s.destroy(); res(false); });"]], '993', 'quelqu\'un écoute sur ce port'],
];
/* la contre-épreuve de la course de fermeture : le service apprend la fermeture d'un flux 400 ms plus tard */
const LENT = [['server-msg/flux.js', "    res.on('close', () => fermer(f, null));", "    res.on('close', () => setTimeout(() => fermer(f, null), 400));"]];

function copier() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-981-'));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const c of COPIES) {
    const src = path.join(RACINE, c), dst = path.join(dir, c);
    if (fs.statSync(src).isDirectory()) { fs.cpSync(src, dst, { recursive: true, filter: (s) => path.basename(s) !== 'node_modules' }); fs.symlinkSync(path.join(src, 'node_modules'), path.join(dst, 'node_modules')); }
    else fs.copyFileSync(src, dst);
  }
  return dir;
}
function muter(dir, remplacements) {
  const avant = new Map();
  for (const [f, motif, autre] of remplacements) {
    const p = path.join(dir, f); const s = fs.readFileSync(p, 'utf8');
    if (!avant.has(p)) avant.set(p, s);
    const n = s.split(motif).length - 1;
    if (n !== 1) { for (const [q, t] of avant) fs.writeFileSync(q, t); return { erreur: 'le motif se trouve ' + n + ' fois dans ' + f + ' (il en faut une) : ' + motif.slice(0, 70) }; }
    fs.writeFileSync(p, s.replace(motif, () => autre));
    const c = spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
    if (c.status !== 0) { for (const [q, t] of avant) fs.writeFileSync(q, t); return { erreur: 'le fichier muté ne se lit plus (' + f + ')' }; }
  }
  return { rendre: () => { for (const [q, t] of avant) fs.writeFileSync(q, t); } };
}
function jouer(dir, banc) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tests', banc)], { encoding: 'utf8', timeout: 240000, env: Object.assign({}, process.env, { TMPDIR: os.tmpdir() }) });
  const sortie = (r.stdout || '') + (r.stderr || '');
  const bandeau = (sortie.match(/\d+ ✓ +\d+ ✗/g) || []).pop() || 'aucun bandeau';
  return { code: r.status, bandeau, tombes: sortie.split('\n').filter(l => /^\s*✗/.test(l)).map(l => l.trim().slice(2, 150)), avis: sortie.split('\n').filter(l => /^\s*⚠/.test(l)).map(l => l.trim().slice(0, 230)) };
}

(async () => {
  const choix = process.argv.slice(2);
  const dir = copier();
  let ko = 0;
  const dire = (ok, texte) => { if (!ok) ko++; console.log((ok ? '  ✓ ' : '  ✗ ') + texte); };
  try {
    if (!choix.length) {
      console.log('Témoins : sans mutation, les deux bancs sont verts');
      for (const b of ['test-981.js', 'test-993.js']) { const r = jouer(dir, b); dire(r.code === 0 && r.tombes.length === 0, b + ' : ' + r.bandeau + ' (code ' + r.code + ')'); }
    }
    console.log('\nMutations : chaque défaut remis fait tomber LE contrôle attendu');
    for (const [id, quoi, remplacements, banc, attendu] of MUTATIONS) {
      if (choix.length && !choix.includes(id)) continue;
      const m = muter(dir, remplacements);
      if (m.erreur) { dire(false, id + ' MAL VISÉE — ' + m.erreur); continue; }
      const r = jouer(dir, 'test-' + banc + '.js'); m.rendre();
      const tombe = r.code !== 0 && r.tombes.length > 0, bon = attendu === null ? tombe : r.tombes.some(l => l.includes(attendu));
      dire(tombe && bon, id + ' ' + quoi + ' → test-' + banc + ' : ' + r.bandeau + (tombe ? (bon ? '' : ' — MAIS PAS le contrôle attendu (« ' + attendu + ' »)') : ' — SURVIT'));
      for (const l of r.tombes.slice(0, 4)) console.log('        ✗ ' + l);
      for (const l of r.avis.slice(0, 2)) console.log('        ' + l);
    }
    if (!choix.length || choix.includes('C01')) {
      console.log('\nContre-épreuve de la course de fermeture : un service qui apprend la fermeture d\'un flux 400 ms plus tard (une machine chargée, au geste)');
      const ancien = spawnSync('git', ['-C', RACINE, 'show', ANCIEN + ':tests/test-981.js'], { encoding: 'utf8', maxBuffer: 1 << 26 });
      if (ancien.status !== 0) dire(false, 'C01 : le banc d\'avant (' + ANCIEN + ') ne se lit pas dans git');
      else {
        fs.writeFileSync(path.join(dir, 'tests', 'test-981-ancien.js'), ancien.stdout);
        const temoin = jouer(dir, 'test-981-ancien.js');
        dire(temoin.code === 0, 'population : l\'ANCIEN banc (' + ANCIEN + '), sur les outils d\'aujourd\'hui et le service intact, est vert à vide : ' + temoin.bandeau);
        const m = muter(dir, LENT);
        if (m.erreur) dire(false, 'C01 MAL VISÉE — ' + m.erreur);
        else {
          const vieux = jouer(dir, 'test-981-ancien.js'), neuf = jouer(dir, 'test-981.js'); m.rendre();
          dire(vieux.code !== 0 && vieux.tombes.some(l => l.includes('les deux signaux retenus')), 'C01 l\'ANCIEN banc tombe sur « les deux signaux retenus » : ' + vieux.bandeau);
          for (const l of vieux.tombes.slice(0, 3)) console.log('        ✗ ' + l);
          dire(neuf.code === 0 && neuf.tombes.length === 0, 'C01 le NOUVEAU banc reste vert (il attend que le service ait VU la fermeture) : ' + neuf.bandeau);
          for (const l of neuf.tombes.slice(0, 3)) console.log('        ✗ ' + l);
        }
      }
    }
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } }
  console.log('\n' + (ko ? ko + ' ligne(s) en défaut' : 'tout est conforme'));
  process.exit(ko ? 1 : 0);
})();

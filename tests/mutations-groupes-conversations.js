/* ══ MUTATIONS — LES DÉCISIONS DU 26 OCTOBRE 2026 (contacts / groupes / conversations / pro / temps réel) ═════════════════════════════════════════════════════════════════
   Chaque mutation REMET le défaut que le banc garde, dans le VRAI fichier, puis relance les suites qui doivent le voir : elle DOIT les faire tomber. Le fichier est restauré par `git checkout HEAD -- <fichier>`
   après chaque essai — ⛔ ce qui suppose que le correctif soit COMMITÉ (CLAUDE.md : « correctif → banc → git commit → mutation → git checkout »), sinon la restauration emporte aussi le correctif.
   Chaque `de` doit se trouver EXACTEMENT UNE FOIS dans le fichier (une mutation qui frappe la mauvaise occurrence ne prouve rien : « une mutation qui ne mord pas peut être mal visée »).
   Lancer :   node tests/mutations-groupes-conversations.js [filtre]      Code 1 si une mutation SURVIT (aucune suite ne tombe), 2 si une ancre est introuvable ou ambiguë. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const T = (n) => 'tests/test-' + n + '.js';
const M = [
  /* ── le service : bloquer en silence (contacts#1) ── */
  ['S1', 'le message du bloqué n\'est plus masqué pour qui l\'a bloqué', 'server-msg/stockage.js', "if (silence) Q('INSERT OR IGNORE INTO msg_masque", "if (false) Q('INSERT OR IGNORE INTO msg_masque", [T(3040)]],
  ['S2', 'la conversation remonte chez qui a bloqué (dernier_ts bouge)', 'server-msg/stockage.js', 'silence ? c.dernier_ts : ts, conv', 'ts, conv', [T(3040)]],
  ['S3', 'le silence vaut aussi pour qui a bloqué à son tour (deux blocages croisés)', 'server-msg/stockage.js', 'return !!autre && aBloque(autre, uid) && !aBloque(uid, autre);', 'return !!autre && aBloque(autre, uid);', [T(3040)]],
  ['S4', '`bloque` dit chez le BLOQUÉ au lieu du bloqueur (détail)', 'server-msg/stockage.js', 'if (a && aBloque(uid, a)) rang.bloque = true;', 'if (a && aBloque(a, uid)) rang.bloque = true;', [T(3040), T(3043)]],
  ['S5', 'un message du bloqué ressort la conversation des Archivées de qui a bloqué', 'server-msg/stockage.js', 'ts, silence ? 1 : 0);', 'ts, 0);', [T(3040)]],
  ['S6', '`bloque` n\'est plus dit dans la liste', 'server-msg/stockage.js', 'if (mesBloques.has(a.id)) o.bloque = true;', 'if (false) o.bloque = true;', [T(3040), T(3043)]],
  ['S7', 'le bloqué reçoit 404 à l\'envoi (l\'ancienne règle)', 'server-msg/routes.js', "&& !stockage.ecritureSilencieuse(conv.id, uid)) return [404, 'introuvable'];", ") return [404, 'introuvable'];", [T(3040)]],
  ['S8', 'la frappe du bloqué est refusée (404 : il apprendrait le blocage)', 'server-msg/routes.js', 'if (stockage.ecritureSilencieuse(req.conv.conv.id, req.moi.id)) return res.json({ ok: true });', 'if (false) return res.json({ ok: true });', [T(3040)]],
  ['S9', 'le bloqué ne rouvre plus sa conversation (404)', 'server-msg/routes.js', 'const ex = stockage.aBloque(u, req.moi.id) && !stockage.aBloque(req.moi.id, u) ? stockage.convDirecteExistante(req.moi.id, u) : null;', 'const ex = null;', [T(3040)]],
  ['S10', 'le bloqué ne peut plus déposer de photo (404)', 'server-msg/routes-pieces.js', ' && !stockage.ecritureSilencieuse(conv, uid)) return refus(res, 404', ') return refus(res, 404', [T(3040)]],
  /* ── le service : la phrase système et le canal supprimé (groupes#2, groupes#3) ── */
  ['S11', 'un canal supprimé ne prévient plus ses membres (suppressionDire retiré)', 'server-msg/routes-espaces.js', 'stockage.suppressionDire(k.cid, membres);', 'void membres;', [T(3041), T(3043)]],
  ['S12', 'l\'événement `retire` perd son marqueur `supprime`', 'server-msg/stockage.js', "data: j.ref === 'supprime' ? { conv: j.conv, supprime: true } : { conv: j.conv } }", 'data: { conv: j.conv } }', [T(3041), T(3043)]],
  ['S13', 'le journal n\'écrit plus « supprime » (même événement qu\'un retrait)', 'server-msg/stockage.js', "journalAjouter('retire', conv, u, 'supprime')", "journalAjouter('retire', conv, u, '')", [T(3041)]],
  ['S14', 'l\'aperçu d\'une ligne système ne porte plus sa méta', 'server-msg/stockage.js', 'o.apercu.meta = meta;', 'void meta;', [T(3041), T(3043)]],
  ['S15', 'l\'aperçu ne nomme plus la personne visée', 'server-msg/stockage.js', 'if (v) o.apercu.pour = { id: v.id, prenom: v.prenom, nom: v.nom };', 'if (false) o.apercu.pour = null;', [T(3041), T(3043)]],
  ['S16', 'la méta d\'une ligne système part AUSSI pour une réunion (les invités se nomment entre eux)', 'server-msg/stockage.js', "p.meta_ch && (l.type === 'groupe' || l.type === 'canal')) {", 'p.meta_ch) {', [T(976)]],
  /* ── la page : les décisions de l'écran ── */
  ['P1', 'la création coupe de nouveau à 40 signes (deux limites)', 'apercu/opmessages/index.html', 'const NOM_GROUPE_MAX = 80;', 'const NOM_GROUPE_MAX = 40;', [T(3042), T(2652)]],
  ['P2', 'le nom par défaut se trompe d\'un cran (« et 3 autres » pour quatre)', 'apercu/opmessages/index.html', "' et ' + (l.length - 2) + ' autres'", "' et ' + (l.length - 1) + ' autres'", [T(3042)]],
  ['P3', '`creerGroupe` envoie le champ vide au lieu du nom par défaut', 'apercu/opmessages/index.html', 'try { c = await source.creerGroupe({ nom, membres', 'try { c = await source.creerGroupe({ nom: G.nom, membres', [T(3042)]],
  ['P4', 'l\'épinglée reste AUSSI dans la liste', 'apercu/opmessages/index.html', 'const vues = base.filter(c => !enHaut(c) && (', 'const vues = base.filter(c => (', [T(3042)]],
  ['P5', 'une recherche garde la rangée du haut : l\'épinglée paraît deux fois', 'apercu/opmessages/index.html', 'const epingleHaut = !etat.listeInvit && !etat.listeArchives && !etat.selection && !q;', 'const epingleHaut = !etat.listeInvit && !etat.listeArchives && !etat.selection;', [T(3042)]],
  ['P6', 'tout épinglé : la liste dit « Aucune conversation »', 'apercu/opmessages/index.html', 'const toutesEnHaut = !vues.length', 'const toutesEnHaut = false && !vues.length', [T(3042)]],
  ['P7', 'l\'appui long n\'avale plus le clic du relâcher (la conversation s\'ouvre)', 'apercu/opmessages/index.html', 'if (o && epingleClicAvale(e)) return;', '', [T(3042)]],
  ['P8', 'un canal supprimé se dit « retiré »', 'apercu/opmessages/index.html', 'const base = supprime && nom && c.type === \'canal\'', 'const base = false && nom && c.type === \'canal\'', [T(3042)]],
  ['P9', 'à deux, « écrit… » dit aussi un prénom', 'apercu/opmessages/index.html', "if (!c || !c.saisie || !multi(c)) return '';", "if (!c || !c.saisie) return '';", [T(3042)]],
  ['P10', 'deux qui écrivent : « écrit… » au singulier', 'apercu/opmessages/index.html', "noms[0] + ' et ' + noms[1] + ' écrivent…'", "noms[0] + ' et ' + noms[1] + ' écrit…'", [T(3042)]],
  ['P11', '« Confirmer l\'envoi » se masque côté Pro au lieu de Perso', 'apercu/opmessages/index.html', "const confirmerMasque = () => modesActifs() && etat.mode !== 'pro';", "const confirmerMasque = () => modesActifs() && etat.mode === 'pro';", [T(3042)]],
  ['P12', 'le passage Perso ↔ Pro ne repeint plus « Confirmer l\'envoi »', 'apercu/opmessages/index.html', "if (typeof peindreConfirmer === 'function') peindreConfirmer();", '', [T(3042)]],
  ['P13', 'la conversation d\'un contact bloqué garde son champ d\'écriture', 'apercu/opmessages/index.html', "$('compo').hidden = ferme || recue || bloque ||", "$('compo').hidden = ferme || recue ||", [T(3042)]],
  ['P14', 'l\'appel vidéo reste proposé vers un contact bloqué', 'apercu/opmessages/index.html', "$('conv-cam').hidden = bloque;", '', [T(3042)]],
  ['P15', 'les Infos ne proposent plus « Débloquer »', 'apercu/opmessages/index.html', 'if (autre && i.bloque) h +=', 'if (false) h +=', [T(3042)]],
  /* ── le module de données (l'appareil ↔ le service) ── */
  ['V1', 'la liste ne dit plus `bloque`', 'server-msg/public/source-serveur.js', 'bloque: direct && c.bloque === true,', 'bloque: false,', [T(3043)]],
  ['V2', 'les Infos ne disent plus `bloque`', 'server-msg/public/source-serveur.js', 'bloque: !!autre && ((convsApi.find', 'bloque: false && !!autre && ((convsApi.find', [T(3043)]],
  ['V3', 'la frappe ne porte que le premier qui écrit', 'server-msg/public/source-serveur.js', 'saisie: qui ? { contact: qui, contacts: quiTous } : null', 'saisie: qui ? { contact: qui, contacts: [qui] } : null', [T(3043)]],
  ['V4', 'l\'événement `retire` de la source perd `supprime`', 'server-msg/public/source-serveur.js', "emettre(d.supprime === true ? { type: 'retire', id: d.conv, supprime: true } : { type: 'retire', id: d.conv });", "emettre({ type: 'retire', id: d.conv });", [T(3043)]],
  ['V5', 'la liste redit « Activité du groupe » (la méta n\'est plus lue)', 'server-msg/public/source-serveur.js', "a.meta && typeof a.meta.k === 'string' ? texteSysteme", "false ? texteSysteme", [T(3043)]],
  ['V6', 'la personne visée n\'est plus retenue (« Quelqu\'un »)', 'server-msg/public/source-serveur.js', 'if (c.apercu && c.apercu.pour) noter(c.apercu.pour);', '', [T(3043)]],
  ['V7', 'bloquer ne redit plus la conversation à la page', 'server-msg/public/source-serveur.js', "if (x.autre && x.autre.id === uid) emettre({ type: 'conversation', id: x.id });", '', [T(3043)]],
];

const filtre = process.argv[2] || '';
let survivantes = 0, ancres = 0, essais = 0;
for (const [id, label, fichier, de, vers, suites] of M) {
  if (filtre && !id.startsWith(filtre)) continue;
  const chemin = path.join(RACINE, fichier), src = fs.readFileSync(chemin, 'utf8');
  const n = src.split(de).length - 1;
  if (n !== 1) { console.log('✗ ' + id + ' : l\'ancre se trouve ' + n + ' fois dans ' + fichier + ' (il en faut UNE)'); ancres++; continue; }
  fs.writeFileSync(chemin, src.replace(de, () => vers));
  const diff = spawnSync('git', ['diff', '--stat', '--', fichier], { cwd: RACINE, encoding: 'utf8' }).stdout;
  const tombees = [];
  try {
    for (const s of suites) {
      const r = spawnSync(process.execPath, [s], { cwd: RACINE, encoding: 'utf8', timeout: 280000 });
      const m = /(\d+) ✓ +(\d+) ✗/.exec((r.stdout || '').split('\n').filter(l => /\d+ ✓ +\d+ ✗/.test(l)).pop() || '');
      if (r.status !== 0 || (m && +m[2] > 0) || !m) tombees.push(path.basename(s) + (m ? '(' + m[2] + '✗)' : '(sans total)'));
    }
  } finally { spawnSync('git', ['checkout', 'HEAD', '--', fichier], { cwd: RACINE, encoding: 'utf8' }); }
  essais++;
  if (!/\| *\d+/.test(diff)) console.log('⚠ ' + id + ' : le fichier n\'a pas changé (la mutation n\'a rien frappé)');
  if (tombees.length) console.log('✓ ' + id + ' ' + label + ' — tombe : ' + tombees.join(', '));
  else { console.log('✗ ' + id + ' ' + label + ' — SURVIT (aucune suite ne tombe)'); survivantes++; }
}
console.log('\n' + essais + ' mutations jouées, ' + survivantes + ' survivante(s), ' + ancres + ' ancre(s) fautive(s)');
process.exit(ancres ? 2 : survivantes ? 1 : 0);

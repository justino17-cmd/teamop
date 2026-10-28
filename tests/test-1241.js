/* ══ LES LIGNES DE BONS DE COMMANDE NE S'ÉCRASENT PLUS AU TÉLÉPHONE — g03, achats#2 et achats#9 ═══════════
   Mesuré au navigateur (scratchpad/gestion/correctifs/g03/sonde-bons.js, sonde-commandes.js) :
   · Bons de commande, onglets Liste et Par box : la colonne de texte d'un bon mesurait 0 px sur Android (360) et
     iPhone (390), 14 px sur iPad (820) — « BC- / 2026- / 001 / 2 / article(s) » mot par mot — et les boutons Envoyer,
     corbeille et le chevron dépassaient de 87 à 183 px de la ligne ;
   · Commandes en cours : 35 px pour une commande partielle (« reste dû : … »), à côté du statut et de la corbeille.
   Après : 244 px sur Android, 274 sur iPhone, 416 sur iPad ; Mac inchangé (± 1 px).
   Ce que le banc fait : il EXÉCUTE la vraie `renderBonsList` et la vraie `views.commandes` (extraites d'app.html, dans
   un bac à sable) et lit le balisage qu'elles écrivent — la ligne porte `lgb`, le statut ET les boutons sont dans UN
   groupe `lgb-a` (deux marges automatiques s'en seraient partagé la place) —, puis il lit ce que la FEUILLE fait de ces
   classes : la ligne est son propre conteneur nommé (`ligne-bon`), le texte prend sa ligne sous 700 px. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* le texte d'une construction jusqu'à SON accolade fermante — pile de modes : code, chaîne, gabarit (avec ses ${…}) */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  const pile = ['code', '{'];
  for (let k = SRC.indexOf('{', i) + 1; k < SRC.length; k++) {
    const mode = pile[pile.length - 1], c = SRC[k];
    if (mode === "'" || mode === '"') { if (c === '\\') k++; else if (c === mode) pile.pop(); continue; }
    if (mode === '`') { if (c === '\\') k++; else if (c === '`') pile.pop(); else if (c === '$' && SRC[k + 1] === '{') { pile.push('{'); k++; } continue; }
    if (c === "'" || c === '"' || c === '`') pile.push(c);
    else if (c === '{') pile.push('{');
    else if (c === '}') { pile.pop(); if (pile.length === 1) return SRC.slice(i, k + 1); }
  }
  return '';
}
const enveloppes = (i) => { const out = []; let prof = 0;
  for (let j = i; j > 0; j--) { const c = SRC[j]; if (c === '}') prof++; else if (c === '{') { if (prof === 0) { const d = SRC.lastIndexOf('\n', j); const t = SRC.slice(d + 1, j).trim(); if (/^@(media|container)/.test(t)) out.push(t); } else prof--; } }
  return out; };
function regles(sel) { const res = []; let i = -1;
  while ((i = SRC.indexOf(sel + '{', i + 1)) >= 0) { if (SRC.slice(SRC.lastIndexOf('\n', i) + 1, i).trim() !== '') continue;
    res.push({ corps: SRC.slice(i + sel.length + 1, SRC.indexOf('}', i)), env: enveloppes(i) }); }
  return res; }

/* ── le bac à sable : les fonctions voisines sont fournies, les deux fonctions testées sont les VRAIES ── */
const STATBC = { brouillon: { l: 'En préparation', c: 'st-org' }, prete: { l: 'Prêt à envoyer', c: 'st-blue' }, envoyee: { l: 'Envoyée', c: 'st-blue' }, partielle: { l: 'Partiellement livrée', c: 'st-org' } };
const els = {};
function monde(role) {
  const ctx = {
    db: { fournisseurs: [{ id: 'f1', nom: 'SODIF', email: 'commandes@sodif-longue-adresse.example' }], bons: [
      { id: 'b1', numero: 'BC-2026-001', date: '2026-10-01', fournisseurId: 'f1', statut: 'prete', lignes: [{ designation: 'A', quantite: 2 }] },
      { id: 'b2', numero: 'BC-2026-002', date: '2026-10-02', fournisseurId: 'f1', statut: 'partielle', lignes: [{ designation: 'B', quantite: 3 }] },
      { id: 'b3', numero: 'BC-2026-003', date: '2026-10-03', fournisseurId: 'f1', statut: 'envoyee', dateEnvoi: '2026-10-03', lignes: [{ designation: 'C', quantite: 1 }] }] },
    $: (id) => els[id] || (els[id] = { innerHTML: '' }),
    bonsFilter: 'prets', bonsSearch: '', bonsTab: 'liste', STATBC,
    visibleBons: (l) => l || [], norm: (s) => String(s || '').toLowerCase(), esc: (s) => String(s ?? ''),
    fourColor: () => 'red', fournName: (id) => 'SODIF', bonNum: (b) => b.numero, bonQteTotTxt: () => '2 u', fmtShort: (d) => d,
    bonEmailDest: (b, f) => (f && f.email) || '', badge: (m, k) => '<span class="st ' + m[k].c + '">' + m[k].l + '</span>',
    emptyState: () => '', renderBonsReponses: () => {}, bonsParBoxHtml: () => '', bonResteTxt: () => 'ADVION GEL x3',
    setHeader: () => {}, currentUser: { role }, views: {}, Date, libBox: (a) => a,
  };
  vm.createContext(ctx);
  vm.runInContext(bloc('function renderBonsList('), ctx);
  vm.runInContext(bloc('views.commandes=function('), ctx);
  return ctx;
}

console.log('── 1241 · 1. la vraie renderBonsList : classes de la ligne et groupe de gestes ──');
const m = monde('admin');
vrai('renderBonsList est extraite', typeof m.renderBonsList === 'function');
m.renderBonsList();
const liste = els['bons-list'].innerHTML;
vrai('la liste a rendu une ligne de bon', /class="pl-row[^"]*"/.test(liste), liste.slice(0, 120));
vrai('la ligne de bon porte `lgb` (conteneur de ligne)', /class="pl-row lgb"/.test(liste));
vrai('le statut ET les boutons sont dans UN groupe `lgb-a`', /<span class="lgb-a"><span class="st st-blue">Prêt à envoyer<\/span>\s*<span onclick="event\.stopPropagation\(\)"/.test(liste));
vrai('les trois gestes sont toujours là (PDF, Envoyer, corbeille)', /bonPdfOpen\('b1'\)/.test(liste) && /envoiBonApercu\('b1'\)/.test(liste) && /delItem\('bons','b1'\)/.test(liste));

console.log('── 1241 · 2. la vraie views.commandes ──');
vrai('views.commandes est extraite', typeof m.views.commandes === 'function');
m.views.commandes();
const cmd = els['content'].innerHTML;
const lignes = cmd.split('class="pl-row').length - 1;
vrai('deux commandes en cours rendues (partielle, envoyée)', lignes === 2, lignes);
vrai('chaque ligne de commande porte `lgb`', (cmd.match(/class="pl-row lgb"/g) || []).length === 2);
vrai('le statut ET la corbeille de l\'administrateur sont dans UN groupe `lgb-a`', (cmd.match(/<span class="lgb-a"><span class="st [^"]*">[^<]*<\/span><button type="button" class="dos-x"/g) || []).length === 2, cmd.slice(0, 200));
const m2 = monde('commercial'); m2.views.commandes();
vrai('sans la corbeille (non-administrateur), le groupe ne garde que le statut', /<span class="lgb-a"><span class="st [^"]*">[^<]*<\/span><\/span>/.test(els['content'].innerHTML) && !/dos-x/.test(els['content'].innerHTML));

console.log('── 1241 · 3. la feuille : la ligne est son propre conteneur, le texte prend sa ligne ──');
const cont = regles('html[data-refonte] .pl-row.lgb');
vrai('`.pl-row.lgb` est un conteneur nommé (inline-size), permanent, avec flex-wrap', cont.length === 1 && cont[0].env.length === 0 && /container:\s*ligne-bon\s*\/\s*inline-size/.test(cont[0].corps) && /flex-wrap:\s*wrap/.test(cont[0].corps), cont.map(r => r.corps));
const info = regles('html[data-refonte] .lgb > .pl-info').filter(r => r.env.some(e => /^@container\s+ligne-bon\s*\(max-width:\s*\d+px\)/.test(e)));
vrai('sous le seuil, la base du texte prend la ligne (calc(100% - …))', info.length === 1 && /flex:\s*1\s+1\s+calc\(100%\s*-\s*\d+px\)/.test(info[0].corps), info.map(r => r.corps));
const grp = regles('html[data-refonte] .lgb > .lgb-a').filter(r => r.env.length);
vrai('sous le seuil, le groupe de gestes passe dessous, à droite, en rangées', grp.length === 1 && /order:\s*2/.test(grp[0].corps) && /flex-wrap:\s*wrap/.test(grp[0].corps) && /margin-left:\s*auto/.test(grp[0].corps), grp.map(r => r.corps));
vrai('au-dessus du seuil, le groupe reste une rangée (statut puis boutons)', regles('html[data-refonte] .lgb > .lgb-a').some(r => r.env.length === 0 && /display:\s*flex/.test(r.corps)));
const seuil = +((/@container\s+ligne-bon\s*\(max-width:\s*(\d+)px\)/.exec(SRC) || [])[1]);
vrai('le seuil couvre une ligne d\'iPad (500 px) et laisse l\'ordinateur (1 046 px) en une ligne', seuil >= 500 && seuil < 1000, seuil);
vrai('jamais de container-type sur #content', !/#content\s*\{[^}]*container(-type)?\s*:/.test(SRC));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

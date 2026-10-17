/* ══ OP GESTION — LES LISTES DE DOCUMENTS MONTRENT L'ANNÉE D'UNE DATE QUI N'EST PAS DE CETTE ANNÉE (campagne 2, 17 octobre 2026) ═══════════
   La liste Factures écrivait « 01 janv. » : une facture de l'an dernier se confondait avec celle de cette année (les exports portent la date
   complète). Devis, Contrats et Bons de commande lisaient le même `fmtShort`. `fmtShortAn` = `fmtShort` + l'année quand elle n'est pas l'année
   courante ; `fmtShort` ne change pas (il écrit aussi des phrases d'historique). Archives n'est pas touchée : sa liste est celle d'UN mois, dont le
   titre porte l'année. Les Avoirs n'ont pas de liste à eux dans l'application.
   Ce banc EXÉCUTE les vraies `fmtShort`, `fmtShortAn` et `todayISO` (horloge posée au 17 octobre 2026), puis lit chaque LIGNE DE CODE des cinq endroits
   (commentaires retirés : un motif vise du code, jamais une phrase). La largeur au téléphone se mesure au navigateur (sonde du scratchpad du lot). ═══ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const entre = (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i + 1); return i < 0 || j < 0 ? '' : SRC.slice(i, j); };
/* la ligne ENTIÈRE qui contient l'ancre */
const lignePorteuse = ancre => { const i = SRC.indexOf(ancre); return i < 0 ? '' : SRC.slice(SRC.lastIndexOf('\n', i) + 1, SRC.indexOf('\n', i)); };

console.log('\n── 1675 · 1. la population ──');
const FORMATEURS = entre('const _FMT={};', 'const _fd=') + ligne('const _fd=') + '\n' + ligne('const isoDe =') + '\n' + ligne('const todayISO =') + '\n' + ligne('function fmtShort(iso)') + '\n' + ligne('function fmtShortAn(iso)');
vrai('fmtShort, fmtShortAn, todayISO et leurs formateurs sont trouvés', /function fmtShortAn\(/.test(FORMATEURS) && /function fmtShort\(/.test(FORMATEURS) && /const todayISO/.test(FORMATEURS) && /const _fd=/.test(FORMATEURS) && /const _O_JM=/.test(FORMATEURS), FORMATEURS.length);
vrai('⛔ une seule définition de fmtShortAn (une seconde gagnerait partout, en silence)', SRC.split('function fmtShortAn(').length === 2);
function monde() {
  const FIXE = new Date(2026, 9, 17, 10, 0, 0).getTime(), Vrai = Date;
  class D extends Vrai { constructor(...a) { if (a.length) super(...a); else super(FIXE); } static now() { return FIXE; } }
  const ctx = { Date: D, Intl, String, Number, Math, JSON };
  vm.createContext(ctx);
  vm.runInContext(FORMATEURS + '\nthis.F={fmtShort,fmtShortAn};', ctx);
  return ctx.F;
}

console.log('\n── 1675 · 2. fmtShortAn EXÉCUTÉE (aujourd\'hui = 17 octobre 2026) ──');
{ const F = monde();
  vrai('⛔ une date de l\'an dernier se lit « 01 janv. 2025 »', /^01 janv\.? 2025$/.test(F.fmtShortAn('2025-01-01')), F.fmtShortAn('2025-01-01'));
  vrai('⛔ une date de cette année reste courte (« 01 janv. »), la largeur des colonnes ne bouge pas', /^01 janv\.?$/.test(F.fmtShortAn('2026-01-01')), F.fmtShortAn('2026-01-01'));
  vrai('une date de l\'an prochain porte aussi la sienne', /2027$/.test(F.fmtShortAn('2027-03-05')), F.fmtShortAn('2027-03-05'));
  v('vide : le tiret, comme fmtShort', [F.fmtShortAn(''), F.fmtShortAn(undefined), F.fmtShortAn(null)], ['—', '—', '—']);
  vrai('fmtShort lui-même n\'a PAS changé : il n\'écrit jamais l\'année (il sert aux phrases d\'historique)', !/2025/.test(F.fmtShort('2025-01-01')), F.fmtShort('2025-01-01')); }

console.log('\n── 1675 · 3. chaque liste lit la date par fmtShortAn, dans le CODE ──');
const SITES = [
  ['Devis et Factures (tableau docListView)', '<td>${esc(clientName(d.clientId))}</td><td>${fmtShort', 'd.date'],
  ['Factures (ligne) et Comptabilité (impayés)', 'pl-meta">${esc(clientName(f.clientId))} · ${fmtShort', 'f.date'],
  ['Factures (« payée le »)', "' · payée le '+fmtShort", 'f.datePaiement'],
  ['Factures (interventions à facturer)', "· intervention terminée${(i.rapportModele", 'i.date'],
  ['Fiche client (tableau des factures)', '<td>${f.date?fmtShort', 'f.date'],
  ['Fiche intervention (documents liés)', '<div class="pl-meta">${fmtShort', 'f.date'],
  ['Contrats (début)', '<td>${fmtShort', 'ct.dateDebut'],
  ['Contrats (fin)', ' → ${fmtShort', 'ct.dateFin'],
  ['Contrats (échéance sous le titre)', 'ctrEcheanceTexte(j)} (${fmtShort', 'ct.dateFin'],
  ['Bons de commande', '<div class="pl-meta">${(b.lignes||[]).length} article(s)', 'b.date']];
const LIGNES = SRC.split('\n');
for (const [nom, ancre, champ] of SITES) {
  /* les lignes du code qui portent à la fois l'ancre du site (coupée avant « ${fmtShort ») et le champ lu */
  const pre = ancre.indexOf('${fmtShort') >= 0 ? ancre.slice(0, ancre.indexOf('${fmtShort')) : ancre;
  const txt = LIGNES.filter(l => l.includes(champ) && l.includes('fmtShort') && l.includes(pre)).join('\n');
  vrai(nom + ' : la ligne est trouvée', txt.length > 0, ancre);
  vrai('   ' + champ + ' passe par fmtShortAn(', txt.includes('fmtShortAn(' + champ + ')'), txt.slice(0, 160));
  vrai('   ' + champ + ' ne passe plus par fmtShort( seul', !txt.includes('fmtShort(' + champ + ')'), txt.slice(0, 160)); }


console.log('\n── 1675 · 4. Archives : l\'année est déjà dans le titre du mois (non touchée) ──');
vrai('la liste d\'Archives garde fmtShortEcran (langue de l\'écran) et son titre porte l\'année (moisEcran)', /moisEcran\(y,mo-1\)/.test(SRC) && /fmtShortEcran\(i\.date\)} · \$\{esc\(clientName\(i\.clientId\)\)} · \$\{techPuces/.test(SRC));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

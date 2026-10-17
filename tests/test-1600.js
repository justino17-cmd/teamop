/* ══ j01 · r4#7 — BOÎTE MAIL : LE MESSAGE OUVERT SUIT LE CHANGEMENT DE MODE ═══════════════════════════════════
   Mesuré au navigateur (retest2/h03/verif-4.js) : un Mac à 1100 px ouvre un message (lecture plein écran #mail-read,
   `position:fixed`, z-index 400, posée sur <body>). On élargit la fenêtre à 1300 px (ou on tourne un iPad de 820 à
   1180) : l'écouteur `resize` reconstruit la grille dessous (`display:grid`), mais l'overlay reste PAR-DESSUS jusqu'à
   « Retour ». Dans l'autre sens (1300 → 1000, un message sélectionné) la sélection du volet de droite est perdue.

   Ce banc EXÉCUTE le vrai écouteur `resize` du fichier, la vraie `mailBasculerMode` et la vraie `mailOpen`, avec une
   `views.boiteMail` qui fait ce que la vraie fait du mode (elle note `_mailModeRendu` et vide la vue), dans un faux
   <body> qui connaît les éléments par leur identifiant. La grille réelle et l'overlay réel : sonde navigateur
   scratchpad/gestion/correctifs/j01/sonde-courrier.js. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1600 · 0. la population ──');
const OPEN = bloc('function mailOpen(type,idx){'), BASC = bloc('function mailBasculerMode(){'), DESK = ligne('const _mailDesktop='),
  SEUIL = ligne('const MAIL_TROIS_VOLETS='), ECOUT = ligne("try{ window.addEventListener('resize',()=>{ if(current==='boiteMail'");
v('les morceaux sont trouvés', [OPEN.length > 200, BASC.length > 200, !!DESK, !!SEUIL, !!ECOUT], [true, true, true, true, true]);
v('⛔ une seule définition de mailOpen et de mailBasculerMode', ['function mailOpen(', 'function mailBasculerMode('].map(n => SRC.split(n).length - 1), [1, 1]);
vrai("l'écouteur resize passe par mailBasculerMode, plus par views.boiteMail() en direct", /mailBasculerMode\(\)/.test(ECOUT) && !/views\.boiteMail\(\)/.test(ECOUT), ECOUT);

/* ── le monde : un faux <body>, des éléments connus par leur id, les vraies fonctions ── */
function monde(largeur, base) {
  const registre = {}, journal = [];
  const mkEl = () => { const e = { style: {}, dataset: {}, innerHTML: '', id: '', remove() { if (this.id && registre[this.id] === this) delete registre[this.id]; journal.push('remove:' + this.id); } }; return e; };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, parseInt, parseFloat, window: { innerWidth: largeur }, current: 'boiteMail',
    _mailReplies: base.recus, db: { mailSent: base.envoyes }, mailSel: null, _mailModeRendu: null, __journal: journal, __ecouteurs: {} };
  ctx.window.addEventListener = (ev, f) => { ctx.__ecouteurs[ev] = f; };
  ctx.document = { createElement: () => mkEl(), getElementById: id => registre[id] || null,
    body: { appendChild(e) { if (e.id) registre[e.id] = e; journal.push('append:' + e.id); } } };
  ctx.$ = id => registre[id] || null;
  vm.createContext(ctx);
  vm.runInContext(`
    function _mailMarquerLu(){} function mailKey(r){ return String(r.ts); } function mailReadHtml(r,t){ return '['+t+':'+r.sujet+']'; }
    var views={ boiteMail(){ _mailModeRendu=_mailDesktop(); __journal.push('boiteMail:'+(_mailDesktop()?'grille':'pile'));
      __poser('mail-app'); if(_mailDesktop()) __poser('mail-pane'); else __ote('mail-pane'); } };
    function __poser(id){ var e=document.createElement('div'); e.id=id; document.body.appendChild(e); }
    function __ote(id){ var e=$(id); if(e) e.remove(); }
    var __pane=null; function renderMailList(){ __journal.push('liste'); }
    function renderMailPane(){ var p=$('mail-pane'); if(!p) return; if(!mailSel){ p.innerHTML='(rien)'; return; }
      var r=mailSel.type==='envoye'?(db.mailSent||[]).slice().reverse()[mailSel.idx]:(_mailReplies||[])[mailSel.idx];
      p.innerHTML=mailReadHtml(r,mailSel.type); }
    ${SEUIL}\n${DESK}\n${OPEN}\n${BASC}
    ${ECOUT}`, ctx);
  return ctx;
}
const base = { recus: [{ ts: 1, sujet: 'R0' }, { ts: 2, sujet: 'R1' }], envoyes: [{ ts: 10, sujet: 'E0' }, { ts: 11, sujet: 'E1' }, { ts: 12, sujet: 'E2' }] };
const redim = (ctx, l) => { ctx.window.innerWidth = l; ctx.__ecouteurs.resize(); };

console.log('\n── 1600 · 1. mailOpen marque son overlay du message qu\'il montre ──');
{
  const c = monde(1100, base); c.views.boiteMail(); vm.runInContext("mailOpen('envoye',1)", c);
  const ov = c.$('mail-read');
  vrai('l\'overlay est posé', !!ov);
  v('il porte le type et l\'indice du message', [ov && ov.dataset.type, ov && ov.dataset.idx], ['envoye', '1']);
}

console.log('\n── 1600 · 2. 1100 → 1300 : la lecture plein écran se RETIRE et le message passe dans le volet ──');
{
  const c = monde(1100, base); c.views.boiteMail(); vm.runInContext("mailOpen('envoye',1)", c);
  vrai('départ : en pile, overlay ouvert', c.$('mail-read') && c.$('mail-pane') === null);
  redim(c, 1300);
  vrai('⛔ l\'overlay #mail-read n\'est plus là (il couvrait la grille)', c.$('mail-read') === null, c.__journal.slice(-6));
  vrai('la grille est reconstruite (volet de lecture présent)', !!c.$('mail-pane'));
  v('le message ouvert est SÉLECTIONNÉ dans le volet', c.mailSel && [c.mailSel.type, c.mailSel.idx], ['envoye', 1]);
  vrai('le volet montre CE message (E1, pas un autre)', c.$('mail-pane') && c.$('mail-pane').innerHTML === '[envoye:E1]', c.$('mail-pane') && c.$('mail-pane').innerHTML);
}

console.log('\n── 1600 · 3. 1300 → 1000 : la sélection du volet n\'est plus perdue, le message reste ouvert en plein écran ──');
{
  const c = monde(1300, base); c.views.boiteMail(); vm.runInContext("mailSel={type:'recu',idx:1}; renderMailList(); renderMailPane();", c);
  redim(c, 1000);
  const ov = c.$('mail-read');
  vrai('⛔ le message sélectionné s\'ouvre en plein écran (la sélection n\'est pas perdue)', !!ov, c.__journal.slice(-6));
  v('et c\'est le bon (recu 1)', ov && [ov.dataset.type, ov.dataset.idx], ['recu', '1']);
  vrai('la vue est en pile', c.$('mail-pane') === null);
  v('mailSel est remis à null en pile', c.mailSel, null);
}

console.log('\n── 1600 · 4. aller-retour : un seul overlay, le même message, jamais deux ──');
{
  const c = monde(1100, base); c.views.boiteMail(); vm.runInContext("mailOpen('recu',0)", c);
  for (const l of [1300, 1100, 1300, 1000]) redim(c, l);
  const ouverts = c.__journal.filter(x => x === 'append:mail-read').length;
  vrai('le message 0 est encore ouvert, en plein écran', c.$('mail-read') && c.$('mail-read').dataset.idx === '0' && c.$('mail-read').dataset.type === 'recu');
  vrai('aucun overlay orphelin : autant de retraits que de poses moins un', c.__journal.filter(x => x === 'remove:mail-read').length === ouverts - 1, c.__journal.filter(x => /mail-read/.test(x)));
}

console.log('\n── 1600 · 5. contre-épreuves : ce qui ne doit PAS bouger ──');
{
  const c = monde(1100, base); c.views.boiteMail(); const avant = c.__journal.length;
  redim(c, 1150);   // même mode (pile → pile)
  v('même mode : la vue n\'est pas reconstruite', c.__journal.length, avant);
  const d = monde(1300, base); d.views.boiteMail(); redim(d, 1000);
  vrai('aucun message ouvert : on reconstruit, rien ne s\'ouvre', d.$('mail-read') === null && d.mailSel === null);
  const e = monde(1100, base); e.views.boiteMail(); vm.runInContext("mailOpen('recu',9)", e);   // indice qui n'existe pas
  vrai('un message introuvable ne pose rien (et ne jette pas)', e.$('mail-read') === null);
  let jette = false; try { redim(e, 1300); } catch (x) { jette = true; }
  vrai('le changement de mode sans message ne jette pas', !jette);
  const f = monde(1300, base); f.views.boiteMail(); f.current = 'planning'; const av = f.__journal.length; redim(f, 1000);
  v('hors de la boîte mail, le redimensionnement ne touche à rien', f.__journal.length, av);
}

console.log(`\n════ test-1600 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);

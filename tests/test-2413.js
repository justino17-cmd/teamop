/* ══ OP MESSAGES — DÉJÀ DANS UN APPEL, LANCER OU REJOINDRE LE DIT (lot m03, 17 octobre 2026 — appels#1, salle#0) ════════════════════════════════════════════════════════
   Pendant un appel (réduit : la barre verte « Revenir »), toucher la caméra d'une conversation, « Rappeler » ou « Rejoindre » sortait en silence — ni message ni écran. `lancerAppel` et
   `avantEntrer` le DISENT désormais, et ramènent à l'appel réduit quand c'est la même salle (la route de la barre « Revenir »). Le banc fait tourner les fonctions RÉELLES de la page
   (extraites de `apercu/opmessages/index.html`, bac à sable `vm`). Deux touchers dans le même instant (`appelDemarre`) restent silencieux : le premier va répondre. La preuve au navigateur
   (appel réduit, caméra d'une autre conversation ; « Rejoindre » dans la salle réduite) est dans les sondes du lot, citées dans le rapport.
   ⛔ `OPMSG_RACINE=<dossier>` pointe une autre copie de la page. Un motif vise du CODE, jamais une phrase. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = script.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');       // ⛔ seuls les blocs qui COMMENCENT une ligne (CLAUDE.md)

/* le corps d'une déclaration, de son début à SA dernière accolade (les chaînes sont sautées) */
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const entre = (a, b) => { const i = JS.indexOf(a), j = JS.indexOf(b, i + 1); return i < 0 || j < 0 ? '' : JS.slice(i, j); };

const P = {
  dejaEnAppel: decl('function dejaEnAppel('), lancerAppel: decl('async function lancerAppel('), avantEntrer: decl('function avantEntrer('),
};
v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(P).filter(k => !P[k] && k !== 'dejaEnAppel'), [])      // (dejaEnAppel est la pièce NEUVE : son absence se voit aux gestes qui restent muets);

/* ── une page simulée : des éléments par identifiant, un temps qui ne passe que quand on le lui dit ── */
function bac(o) {
  const S = Object.assign({ convVisible: false, etat: {}, route: { vue: 'accueil', conv: null, feuille: false, photo: null, appel: null } }, o || {});
  const N = { mots: [], pousses: [], remplaces: [], minuteurs: [], rafraichis: 0, feuilles: [], demarres: 0 };
  const els = {};
  const el = (id, extra) => els[id] = Object.assign({ id, hidden: true, textContent: '', dataset: {}, classList: { on: false, add() { this.on = true; }, remove() { this.on = false; } } }, extra || {});
  /* #avis : de la taille d'un élément affiché SEULEMENT si l'écran Conversation (son parent) l'est — sinon 0, comme dans le navigateur */
  el('avis', { get offsetWidth() { return !this.hidden && S.convVisible ? 320 : 0; } });
  el('mot');
  el('reg-erreur'); el('reg-lieux'); el('reg-v-lieux'); el('compo-invit'); el('conv-retour', { clic: 0, click() { this.clic++; } });
  const ctx = {
    console, JSON, Date, Math, Object, Array, String, Number, Promise,
    etat: Object.assign({ appelId: null, appelDemarre: false, appelReduit: false, appelUI: null, conv: null, convDonnees: null, route: S.route, groupe: { ouvert: false } }, S.etat),
    CAP: { appelsMedias: true, trajet: true }, mediasDispo: () => true,
    setTimeout: (f, ms) => { N.minuteurs.push(ms); return N.minuteurs.length; }, clearTimeout: () => {},
    $: id => els[id] || (els[id] = { id, hidden: false, textContent: '', dataset: {}, value: '' }),
    esc: t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), CHEVRON: '', refusBloc: t => '<p>' + t + '</p>',
    pousser: r => N.pousses.push(r), remplacer: r => N.remplaces.push(r), rafraichirListe: () => { N.rafraichis++; },
    ouvrirFeuille: (nom, x) => N.feuilles.push([nom, x]), avantArreter: () => {}, avant: {}, TJ: { lieux: null },
    document: { querySelector: () => null, querySelectorAll: () => [] },
    origineAppelPoser: () => {},          // (26 octobre 2026) `lancerAppel` note l'écran de départ : test-3033 le joue ; ici seul le refus d'un second appel compte
    source: {},
  };
  vm.createContext(ctx);
  return { ctx, N, S, els };
}
const lire = (b, code) => vm.runInContext(code, b.ctx, { timeout: 3000 });
const erreurApi = (code, texte) => { const e = new Error(texte || code); e.dit = true; e.code = code; e.phrase = () => texte || code; return e; };
const mots = b => b.els.mot.classList.on ? b.els.mot.textContent : null;                  // ce que le petit mot MONTRE
const avisVu = b => (b.els.avis.offsetWidth > 0 ? b.els.avis.textContent : null);          // ce que #avis MONTRE (zéro de large = rien)

(async () => {
  /* 5. appels#1 — lancer un appel quand on est déjà dans un appel ──────────────────────────────────────────────────────────────────────── */
  console.log('\n5. lancerAppel : déjà dans un appel, le geste le DIT et ramène à l\'appel (appels#1)');
  {
    const mk = etat => {
      const b = bac({ etat, route: { vue: 'messages', conv: 'c2', feuille: false, photo: null, appel: null } });
      b.ctx.mot = (t, ms) => b.N.mots.push([t, ms || 2400]);
      b.ctx.source.demarrerAppel = async () => { b.N.demarres++; return { id: 'nouveau' }; };
      b.ctx.phrase = (e, d) => d; b.ctx.montrerRefusFeuille = () => {}; b.ctx.erreurInfo = () => {};
      lire(b, [P.dejaEnAppel, P.lancerAppel, 'this.F = { lancerAppel };'].join('\n'));
      return b;
    };
    { const b = mk({ appelId: 'a1', appelReduit: true });
      const r = await b.ctx.F.lancerAppel({ membres: ['u3'], video: true, conv: 'c2' }, { id: 'conv-cam' }, false);
      v('⛔ appel réduit (barre verte) + toucher la caméra : l\'appel n\'est PAS lancé, le geste le DIT', [r, b.N.demarres, b.N.mots.map(m => m[0])], [false, 0, ['Tu es déjà dans un appel.']]);
      v('   …et ramène à l\'appel en cours (la route de la barre « Revenir »)', b.N.pousses, [{ vue: 'messages', conv: 'c2', feuille: false, photo: null, appel: 'a1' }]); }
    { const b = mk({ appelId: 'a1', appelReduit: false });
      await b.ctx.F.lancerAppel({ membres: ['u3'], video: true }, null, false);
      v('appel à l\'écran (pas réduit) : le geste le dit aussi, sans pousser de route (on y est déjà)', [b.N.demarres, b.N.mots.length, b.N.pousses.length], [0, 1, 0]); }
    { const b = mk({ appelDemarre: true });
      const r = await b.ctx.F.lancerAppel({ membres: ['u3'], video: true }, null, false);
      v('(témoin) deux touchers dans le même instant : le second reste silencieux (le premier va répondre) et ne lance rien', [r, b.N.demarres, b.N.mots.length], [false, 0, 0]); }
    { const b = mk({});
      const r = await b.ctx.F.lancerAppel({ membres: ['u3'], video: true }, { id: 'conv-cam' }, false);
      v('(témoin) sans appel en cours : l\'appel se lance et l\'écran suit', [r, b.N.demarres, b.N.pousses.length], [true, 1, 1]); }
  }

  /* 6. salle#0 — « Rejoindre » quand la salle est réduite ─────────────────────────────────────────────────────────────────────────────────── */
  console.log('\n6. avantEntrer : « Rejoindre » dans la salle qu\'on a réduite, ou dans un autre appel, le DIT (salle#0)');
  {
    const mk = (etat) => {
      const b = bac({ etat: Object.assign({ groupe: { ouvert: false } }, etat), route: { vue: 'reunions', conv: null, feuille: 'reunion:r1', photo: null, appel: null } });
      b.ctx.mot = (t, ms) => b.N.mots.push(t);
      b.ctx.ouvrirFeuille = (n, x) => b.N.feuilles.push([n, x]);
      b.ctx.lancerAppel = () => { b.N.demarres++; return true; };
      lire(b, [P.dejaEnAppel, P.avantEntrer, 'this.F = { avantEntrer };'].join('\n'));
      return b;
    };
    const ENTREE = { titre: 'Point', type: 'video', entrer: () => {}, el: null };
    { const b = mk({ appelId: 'a1', appelReduit: true, appelUI: { snap: { reunion: 'r1' } } });
      const r = b.ctx.F.avantEntrer(Object.assign({ reunion: 'r1' }, ENTREE));
      v('⛔ la salle de CETTE réunion est réduite : « Rejoindre » le dit et y ramène (pas de feuille « Avant d\'entrer »)', [r, b.N.mots, b.N.feuilles.length, b.N.pousses.map(p => p.appel)], [false, ['Tu es déjà dans cette réunion.'], 0, ['a1']]); }
    { const b = mk({ appelId: 'a1', appelReduit: true, appelUI: { snap: {} } });
      const r = b.ctx.F.avantEntrer(Object.assign({ id: 'a1' }, ENTREE));
      v('⛔ la bannière d\'une conversation vers la salle où l\'on est (même identifiant d\'appel) : idem', [r, b.N.mots, b.N.pousses.length], [false, ['Tu es déjà dans cet appel.'], 1]); }
    { const b = mk({ appelId: 'a1', appelReduit: true, appelUI: { snap: { reunion: 'r1' } } });
      const r = b.ctx.F.avantEntrer(Object.assign({ reunion: 'r2' }, ENTREE));
      v('⛔ une AUTRE réunion pendant un appel : le geste dit pourquoi, et ne quitte pas l\'appel en cours', [r, b.N.mots, b.N.feuilles.length, b.N.pousses.length], [false, ['Tu es déjà dans un appel : raccroche-le avant d\'en rejoindre un autre.'], 0, 0]); }
    { const b = mk({ appelDemarre: true });
      const r = b.ctx.F.avantEntrer(Object.assign({ reunion: 'r1' }, ENTREE));
      v('(témoin) un appel qui démarre à l\'instant : le second toucher reste silencieux', [r, b.N.mots.length, b.N.feuilles.length], [false, 0, 0]); }
    { const b = mk({});
      const r = b.ctx.F.avantEntrer(Object.assign({ reunion: 'r1' }, ENTREE));
      v('(témoin) sans appel : la feuille « Avant d\'entrer » s\'ouvre', [r, b.N.feuilles, b.N.mots.length], [true, [['avant', false]], 0]); }
  }

  /* 7. les APPELANTS disent QUELLE salle ils visent — sans quoi avantEntrer ne peut pas reconnaître celle où l'on est déjà (le code, commentaires retirés) */
  console.log('\n7. Les chemins qui entrent dans une salle existante passent son identifiant');
  {
    const appels = [...JS.matchAll(/avantEntrer\(\{[^\n]*\}\)/g)].map(m => m[0]);
    vrai('(population) quatre appelants de avantEntrer dans la page', appels.length === 4);
    vrai('la caméra d\'une conversation (salle déjà ouverte) passe l\'identifiant de l\'appel', appels.some(a => /el: \$\('conv-cam'\), id: ouverte\.id \}\)/.test(a)));
    vrai('la bannière « Rejoindre » d\'une conversation passe l\'identifiant de l\'appel', appels.some(a => /el: b, id \}\)/.test(a)));
    vrai('une réunion passe son identifiant de réunion', appels.some(a => /depuisFeuille: !!depuisFeuille, reunion: id \}\)/.test(a)));
  }
  fin();
})().catch(e => { console.log('  ✗ le banc a tourné sans exception\n      ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

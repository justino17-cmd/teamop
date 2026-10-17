/* ══ OP MESSAGES — BLOQUER UNE INVITATION FAIT SORTIR DU FIL (lot m03, 17 octobre 2026 — contacts#1) ═══════════════════════════════════════════════════════════════
   Après « Confirmer le blocage », le toast disait « Bloqué » mais le bandeau Accepter / Refuser / Bloquer restait sous les yeux de quelqu'un qu'on venait de bloquer (« Accepter » n'aurait
   rien débloqué). Le blocage depuis « Infos » sort du fil, « Refuser » aussi : celui-ci doit faire pareil. Le banc fait tourner l'écouteur RÉEL de `#compo-invit` (extrait de
   `apercu/opmessages/index.html`, exécuté dans un bac à sable `vm`). La preuve au navigateur est dans la sonde du lot, citée dans le rapport.
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
  avis: decl('function avis('), masquerAvis: ligne('function masquerAvis('), minAvis: ligne('let minAvis = '), mot: decl('function mot('), minMot: /let minNotif = 0, minMot = 0;/.test(JS) ? 'let minMot = 0;' : '',
  phrase: ligne('const phrase = '), cocherRappel: decl('async function cocherRappel('),
  invitation: entre('let invitBloquer = 0;', 'const trouverMessage ='),
};
v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(P).filter(k => !P[k]), []);

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
  /* 3. contacts#1 — bloquer une invitation fait sortir du fil ────────────────────────────────────────────────────────────────────────────── */
  console.log('\n3. Invitation d\'un inconnu : « Confirmer le blocage » sort de la conversation (contacts#1)');
  {
    const mk = bloquer => {
      const b = bac({ convVisible: true, etat: { conv: 'c1', convDonnees: { id: 'c1', autre: 'u2' } } });
      const boutons = ['accepter', 'refuser', 'bloquer'].map(g => ({ dataset: { invit: g }, textContent: g, attrs: {}, getAttribute(k) { return this.attrs[k] || null; }, setAttribute(k, x) { this.attrs[k] = x; }, removeAttribute(k) { delete this.attrs[k]; } }));
      b.ctx.document.querySelectorAll = () => boutons;
      let ecoute = null; b.els['compo-invit'].addEventListener = (t, f) => { ecoute = f; };
      Object.assign(b.ctx, { phrase: (e, d) => e && e.dit ? e.phrase() : d });
      b.ctx.source = { bloquer, lister: () => [], repondreInvitation: async () => 'acceptee' };
      lire(b, [P.minAvis, P.minMot, P.avis, P.masquerAvis, P.mot, P.invitation].join('\n'));
      return { b, boutons, clic: g => ecoute({ target: { closest: () => boutons.find(x => x.dataset.invit === g) } }) };
    };
    { let bloques = []; const { b, boutons, clic } = mk(async uid => { bloques.push(uid); });
      await clic('bloquer');
      v('(témoin) le premier toucher demande confirmation : rien n\'est bloqué, on reste dans le fil', [bloques, b.N.remplaces.length, boutons[2].textContent], [[], 0, 'Confirmer le blocage']);
      await clic('bloquer');
      v('le second toucher bloque la personne', bloques, ['u2']);
      v('⛔ …et la conversation SORT de la vue (retour à la liste des messages, comme le blocage depuis « Infos »)', b.N.remplaces, [{ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }]);
      v('   …la liste est relue (la conversation de la personne bloquée n\'y reste pas)', b.N.rafraichis, 1);
      v('   …le toast le dit', mots(b), 'Bloqué');
      v('   …et les boutons sont rendus (le même bandeau servira à la prochaine invitation)', boutons.map(x => x.attrs['aria-disabled'] || null), [null, null, null]); }
    { const { b, clic } = mk(async () => { throw erreurApi('indisponible', 'Le service ne répond pas correctement. Réessaie dans un instant.'); });
      await clic('bloquer'); await clic('bloquer');
      v('⛔ si le service REFUSE le blocage, on reste dans le fil et le refus se dit (on ne quitte pas sur un échec)', [b.N.remplaces.length, avisVu(b)], [0, 'Le service ne répond pas correctement. Réessaie dans un instant.']); }
    { let rend; const { b, clic } = mk(() => new Promise(r => { rend = r; }));
      await clic('bloquer'); const fini = clic('bloquer'); b.ctx.etat.conv = 'autre'; rend(); await fini;
      v('si l\'on est déjà dans une AUTRE conversation quand la réponse arrive, on n\'en sort pas', b.N.remplaces.length, 0); }
  }

  fin();
})().catch(e => { console.log('  ✗ le banc a tourné sans exception\n      ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

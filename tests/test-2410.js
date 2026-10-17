/* ══ OP MESSAGES — UN REFUS SE VOIT PARTOUT, ET « FAIT » N'EST PAS ANNONCÉ AVANT LA RÉPONSE (lot m03, 17 octobre 2026 — pro#0, reglages@8) ════════════════════════════════
   `avis()` écrit dans `#avis`, qui vit dans `#conv-ecran` : caché hors d'une conversation (offsetWidth = 0). Un rappel qu'on coche au tableau de bord, que le service refuse, revenait
   décoché sans qu'aucune phrase ne se voie ; « Bon retour : la suppression de ton compte est annulée » s'écrivait dans le même élément invisible. Et `cocherRappel` annonçait « fait »
   AVANT la réponse du service. Chaque contrôle fait tourner la VRAIE fonction de la page (extraite de `apercu/opmessages/index.html`, exécutée dans un bac à sable `vm`) ; la
   visibilité est jouée par un faux élément dont la taille est celle d'un élément caché tant que l'écran Conversation ne l'est pas — un élément masqué ne se lit pas au texte mais à
   sa taille. La preuve au navigateur (le vrai `offsetWidth` de `#avis`, l'opacité du petit mot) est dans la sonde du lot, citée dans le rapport.
   ⛔ `OPMSG_RACINE=<dossier>` pointe une autre copie de la page (c'est ainsi que le banc se joue contre le code d'AVANT). Un motif vise du CODE, jamais une phrase. */
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
  /* 1. pro#0 — la phrase d'un refus est VISIBLE partout ───────────────────────────────────────────────────────────────────────────────────── */
  console.log('\n1. avis() : visible dans une conversation ET hors d\'une conversation (pro#0, reglages@8)');
  {
    const mk = visible => { const b = bac({ convVisible: visible }); lire(b, [P.minAvis, P.minMot, P.avis, P.masquerAvis, P.mot, 'this.F = { avis, mot };'].join('\n')); return b; };
    { const b = mk(true); b.ctx.F.avis('Le message n\'a pas pu être envoyé.');
      v('(témoin) dans la conversation : la phrase est dans #avis, visible, et le petit mot ne dit rien', [avisVu(b), mots(b)], ['Le message n\'a pas pu être envoyé.', null]); }
    { const b = mk(false); b.ctx.F.avis('Le service ne répond pas correctement. Réessaie dans un instant.');
      v('⛔ hors conversation (l\'écran Conversation est caché, #avis fait 0 de large) : la phrase est MONTRÉE par le petit mot', mots(b), 'Le service ne répond pas correctement. Réessaie dans un instant.');
      v('   …et #avis ne garde pas la phrase en cachette (rien de caché qui parle)', [b.els.avis.hidden, b.els.avis.textContent], [true, '']);
      v('   …tenue plus longtemps que les 2,4 s d\'un « fait » (un refus se LIT)', b.N.minuteurs.filter(m => m >= 5000).length > 0, true); }
    { const b = mk(false); b.ctx.F.avis('Bon retour : la suppression de ton compte est annulée.');
      v('⛔ reglages@8 : « Bon retour : la suppression de ton compte est annulée » (écrite par demarrer() avant toute conversation) se voit à la reconnexion', mots(b), 'Bon retour : la suppression de ton compte est annulée.'); }
  }

  /* 2. pro#0 — cocher un rappel : « fait » seulement après le succès, le refus se voit ─────────────────────────────────────────────────────── */
  console.log('\n2. cocherRappel : « fait » après la réponse du service, et un refus visible');
  {
    const mk = (faitEvenement, convVisible) => {
      const b = bac({ convVisible: !!convVisible });
      Object.assign(b.ctx, { bord: { evenements: [{ id: 'e1', titre: 'Rappel test', fait: null }] }, reu: { evenements: [] }, rendreAccueil: () => {}, chargerReunions: () => {}, phrase: (e, d) => e && e.dit ? e.phrase() : d });
      b.ctx.source.faitEvenement = faitEvenement;
      lire(b, [P.minAvis, P.minMot, P.avis, P.masquerAvis, P.mot, P.cocherRappel, 'this.F = { cocherRappel };'].join('\n'));
      return b;
    };
    { let rendre; const b = mk(() => new Promise((ok, ko) => { rendre = { ok, ko }; }));
      const fini = b.ctx.F.cocherRappel('e1');
      v('⛔ pendant que le service n\'a pas répondu, rien ne dit « fait »', mots(b), null);
      rendre.ko(erreurApi('indisponible', 'Le service ne répond pas correctement. Réessaie dans un instant.')); await fini;
      v('⛔ le service refuse : la ligne revient décochée, et la phrase d\'erreur est visible — jamais « fait »', [b.ctx.bord.evenements[0].fait, mots(b)], [null, 'Le service ne répond pas correctement. Réessaie dans un instant.']); }
    { const b = mk(async () => { throw new Error('réseau'); });
      await b.ctx.F.cocherRappel('e1');
      v('hors ligne (exception sans phrase du service) : la phrase par défaut se voit, pas « fait »', mots(b), 'Le rappel n\'a pas pu être coché.'); }
    { const b = mk(async () => ({ id: 'e1', titre: 'Rappel test', fait: 123 }));
      await b.ctx.F.cocherRappel('e1');
      v('(témoin) réussi : « fait » est annoncé APRÈS la réponse, la ligne reste cochée', [mots(b), b.ctx.bord.evenements[0].fait], ['« Rappel test » : fait', 123]); }
  }

  fin();
})().catch(e => { console.log('  ✗ le banc a tourné sans exception\n      ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

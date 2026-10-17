/* ══ OP MESSAGES — MES LIEUX : L'ADRESSE TAPÉE SURVIT À UN ÉCHEC, ET LA PHRASE PARLE D'UNE ADRESSE (lot m03, 17 octobre 2026 — reglages#2, reglages#6) ═══════════════
   Enregistrer un domicile quand le calcul de trajet ne répond pas : l'erreur s'affichait, mais le champ revenait vide (ou à l'ancienne adresse) — il fallait tout retaper à chaque essai —,
   et la phrase parlait d'un rendez-vous (« …le rendez-vous, lui, s'enregistre sans »), écrite pour l'agenda. Chaque essai écrit SON verdict, une réussite efface le refus d'avant. Le banc
   fait tourner `peindreLieux` et `lieuEnregistrer` RÉELLES (extraites de `apercu/opmessages/index.html`, bac à sable `vm`) ; le champ est celui que la peinture écrit (on relit sa
   valeur dans le balisage). La preuve au navigateur est dans la sonde du lot, citée dans le rapport.
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
  phrase: ligne('const phrase = '), cocherRappel: decl('async function cocherRappel('),
  lieuxReg: ligne('const lieuxReg = '), peindreLieux: decl('function peindreLieux('), lieuEnregistrer: decl('async function lieuEnregistrer('),
  clicLieux: ligne("if (bouton.dataset.lieuEdit)") + '\n' + ligne("if (bouton.dataset.lieuAnnuler)"),
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
  /* 4. reglages#2 / #6 — Mes lieux ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
  console.log('\n4. Mes lieux : l\'adresse tapée survit à un échec, et la phrase parle d\'une adresse (reglages#2, reglages#6)');
  {
    const mk = poserLieu => {
      const b = bac();
      /* le champ : sa valeur est celle que le dernier peintre y a écrite (on la relit dans le balisage), ou ce que la personne a tapée depuis */
      let html = '', tape = null;
      const champ = { get value() { if (tape !== null) return tape; const m = /id="reg-lieu-domicile"[^>]*value="([^"]*)"/.exec(html); return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : ''; }, set value(x) { tape = x; }, focus() {} };
      b.els['reg-lieux'] = { get innerHTML() { return html; }, set innerHTML(x) { html = x; tape = null; } };
      b.els['reg-lieu-domicile'] = champ;
      b.ctx.$ = id => id === 'reg-lieu-domicile' ? (/id="reg-lieu-domicile"/.test(html) ? champ : null) : b.els[id] || (b.els[id] = { id, hidden: false, textContent: '', dataset: {}, focus() {} });
      b.els['reg-erreur'] = { hidden: true, textContent: '' };
      b.ctx.source.poserLieu = poserLieu; b.ctx.phrase = (e, d) => e && e.dit ? e.phrase() : d;
      b.ctx.TJ = { lieux: null };
      b.ctx.mot = t => b.N.mots.push(t);
      lire(b, [P.lieuxReg, P.peindreLieux, P.lieuEnregistrer, 'lieuxReg.lieux = { domicile: { label: "1 rue Ancienne, La Rochelle" }, travail: null }; lieuxReg.edite = "domicile";',
        P.clicLieux ? '(function () { this.clic = (bouton) => {' + P.clicLieux + '}; }).call(this);' : '', 'this.F = { peindreLieux, lieuEnregistrer, lieuxReg, clic: this.clic };', 'peindreLieux();'].join('\n'));
      return { b, champ, html: () => html };
    };
    const SERVICE_DIT = 'Le calcul du trajet ne répond pas pour le moment. Réessaie plus tard — le rendez-vous, lui, s\'enregistre sans.';
    { let vuPendant = null, essai = 0, X;
      X = mk(async () => { essai++; vuPendant = X.champ.value; if (essai < 3) throw erreurApi('trajet_indisponible', SERVICE_DIT); return { lieux: { domicile: { label: '8 rue Lafayette, 17000 La Rochelle' }, travail: null }, autres: [] }; });
      const { b, champ } = X;
      v('(témoin) le champ s\'ouvre sur l\'adresse enregistrée', champ.value, '1 rue Ancienne, La Rochelle');
      champ.value = '8 rue Lafayette La Rochelle';
      await b.ctx.F.lieuEnregistrer('domicile');
      v('⛔ pendant « Recherche… », le champ repeint garde ce qu\'on a tapé', vuPendant, '8 rue Lafayette La Rochelle');
      v('⛔ reglages#2 : l\'enregistrement échoue → le champ GARDE l\'adresse tapée (il revenait à l\'ancienne / vide)', champ.value, '8 rue Lafayette La Rochelle');
      v('⛔ reglages#6 : la phrase d\'échec parle d\'une ADRESSE, pas d\'un rendez-vous', [b.els['reg-erreur'].textContent, b.els['reg-erreur'].hidden], ['L\'adresse n\'a pas pu être vérifiée pour le moment. Réessaie plus tard.', false]);
      await b.ctx.F.lieuEnregistrer('domicile');
      v('un second essai raté garde encore la saisie, avec SON verdict', [champ.value, b.els['reg-erreur'].textContent], ['8 rue Lafayette La Rochelle', 'L\'adresse n\'a pas pu être vérifiée pour le moment. Réessaie plus tard.']);
      await b.ctx.F.lieuEnregistrer('domicile');
      v('⛔ le troisième réussit : le refus d\'avant est EFFACÉ, le champ se ferme, le lieu est celui du service', [b.els['reg-erreur'].textContent, b.els['reg-erreur'].hidden, b.ctx.F.lieuxReg.edite, b.ctx.F.lieuxReg.lieux.domicile.label, b.ctx.F.lieuxReg.saisie], ['', true, null, '8 rue Lafayette, 17000 La Rochelle', null]);
      v('   …et annoncé', b.N.mots, ['Domicile enregistré']); }
    { const X = mk(async () => { throw erreurApi('adresse_introuvable', 'Ton domicile est introuvable : précise la ville ou le code postal.'); });
      X.champ.value = 'xyz'; await X.b.ctx.F.lieuEnregistrer('domicile');
      v('(témoin) une autre raison de refus garde SA phrase (le service sait mieux)', [X.b.els['reg-erreur'].textContent, X.champ.value], ['Ton domicile est introuvable : précise la ville ou le code postal.', 'xyz']); }
    { const X = mk(async () => ({ lieux: { domicile: null, travail: null }, autres: [] }));
      X.champ.value = 'abc'; X.b.ctx.F.lieuxReg.saisie = 'reste d\'un essai';
      await X.b.ctx.F.lieuEnregistrer('domicile', null);
      v('« Retirer » ne tient pas de saisie périmée', X.b.ctx.F.lieuxReg.saisie, null); }
    { let essai = 0; const X = mk(async () => { essai++; throw erreurApi('trajet_indisponible', SERVICE_DIT); });
      X.champ.value = '8 rue Lafayette La Rochelle'; await X.b.ctx.F.lieuEnregistrer('domicile');
      v('(population) l\'essai a échoué et la saisie est tenue', [essai, X.champ.value], [1, '8 rue Lafayette La Rochelle']);
      X.b.ctx.document.querySelector = () => null;
      X.b.ctx.F.clic({ dataset: { lieuEdit: 'travail' } });
      v('⛔ toucher l\'AUTRE lieu (Travail) sans annuler : l\'adresse ratée du Domicile ne s\'y retrouve pas', [X.b.ctx.F.lieuxReg.edite, X.b.ctx.F.lieuxReg.saisie, /id="reg-lieu-travail"[^>]*value=""/.test(X.html())], ['travail', null, true]);
      X.b.ctx.F.clic({ dataset: { lieuEdit: 'domicile' } });
      X.b.ctx.F.clic({ dataset: { lieuAnnuler: '1' } });
      v('⛔ « Annuler » : le champ ferme, la saisie ratée ne survit pas', [X.b.ctx.F.lieuxReg.edite, X.b.ctx.F.lieuxReg.saisie], [null, null]);
      X.b.ctx.F.clic({ dataset: { lieuEdit: 'domicile' } });
      v('⛔ …et rouvert, le champ repart de l\'adresse ENREGISTRÉE (pas de la saisie d\'un essai raté d\'avant)', X.champ.value, '1 rue Ancienne, La Rochelle'); }
  }

  fin();
})().catch(e => { console.log('  ✗ le banc a tourné sans exception\n      ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

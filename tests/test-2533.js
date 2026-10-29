/* ══ OP MESSAGES — LE MENU D'UN MESSAGE, OUVERT AU DOIGT, NE DONNE PAS D'ANNEAU AU 👍 (testeur « conversations@12 », 17 octobre 2026) ═══════════════════
   À l'ouverture du menu, la page donne le focus au premier bouton (le 👍) pour que le clavier et le lecteur d'écran y entrent. Au doigt, `:focus-visible` posait alors un
   ANNEAU autour du 👍 : il laissait croire qu'une réaction était déjà choisie — aucune ne l'est. La page a déjà la parade (`rendreFocus`, 7 octobre 2026) : après un geste au
   doigt ou à la souris, l'élément a le focus SANS anneau (`data-focus-doux`, que la feuille de style lit) ; Tab, ou une ouverture au clavier, le rend.

   Ce banc EXÉCUTE la vraie `ouvrirMenuMessage` et la vraie `rendreFocus` sur un premier bouton factice, dans les deux modalités (doigt / souris, clavier), et lit ce que le bouton
   a reçu : le focus, et la marque qui retire l'anneau. ⛔ Un anneau se mesure au navigateur (sonde du scratchpad, 17 octobre) ; ici on garde le GESTE qui le retire. */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();

function monter(modalite) {
  const M = T.monter({
    avec: ['rendreFocus', 'ouvrirMenuMessage'],
    pre: T.PAGE.match(/const REACTIONS = \[[^\n]*\n/)[0] + `
      let modalite = '${modalite}';
      const MOI = { id: 'u1' }; const trOuvertes = new Set(); const message = { id: 'm1', auteur: 'u2', texte: 'Bonjour', t: Date.now(), reactions: [] };
      const trouverMessage = id => id === 'm1' ? message : null; const compoFerme = () => false; const estCarte = () => false; const transferable = () => false; const transcriptionPossible = () => false;
      /* « Écouter » (28 octobre 2026) : ce banc ne parle pas de lecture à voix haute — la ligne du menu n'y est pas (ni synthèse, ni message écoutable). */
      const ecoutable = () => false; const synthesePossible = () => false; const ecoute = { mid: null };
      const rappelPossible = () => true; const suiviPossible = () => false; const pieceDe = () => null; const icone = () => ''; const esc = s => String(s);
      etat.convDonnees = { type: 'direct', admins: [] };
      const traces = []; this.traces = traces;
      const premier = { dataset: {}, isConnected: true, focus() { traces.push('focus'); }, addEventListener() {} }; this.premier = premier;
      const menuMsg = { innerHTML: '', classList: { add() {}, remove() {} }, setAttribute() {}, querySelector() { return premier; }, querySelectorAll() { return []; } };
      const menuFond = { hidden: true, classList: { add() {}, remove() {}, toggle() {} } };
      const convMessages = { querySelectorAll() { return []; } };
      const $ = id => id === 'menu-msg' ? menuMsg : id === 'menu-fond' ? menuFond : id === 'conv-messages' ? convMessages : faux(id);
      `,
  });
  M.ctx.faux = T.faux; M.ctx.CAP.actionsMessage = true;
  M.ctx.synchroInert = () => {};
  return M;
}

(async () => {
  {
    const M = monter('pointeur'); M.pousser({ vue: 'messages', conv: 'c_x', feuille: false, photo: null, appel: null }); M.etat.conv = 'c_x';
    M.ctx.ouvrirMenuMessage('m1', null);
    vrai('(population) le menu est ouvert et le premier bouton a reçu le focus', M.etat.menu && M.etat.menu.mid === 'm1' && M.ctx.traces.includes('focus'));
    v('AU DOIGT / À LA SOURIS : le premier bouton (le 👍) a le focus mais PAS d\'anneau — la marque `data-focus-doux` est posée (c\'était : aucune, donc un anneau qui laisse croire qu\'une réaction est choisie)', M.ctx.premier.dataset.focusDoux, '1');
  }
  {
    const M = monter('clavier'); M.pousser({ vue: 'messages', conv: 'c_x', feuille: false, photo: null, appel: null }); M.etat.conv = 'c_x';
    M.ctx.ouvrirMenuMessage('m1', null);
    vrai('(population) ouvert au clavier, le premier bouton a aussi le focus', M.etat.menu && M.ctx.traces.includes('focus'));
    v('AU CLAVIER : l\'anneau reste (`:focus-visible` sans marque) — c\'est ce qui dit où l\'on est', M.ctx.premier.dataset.focusDoux === undefined, true);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });

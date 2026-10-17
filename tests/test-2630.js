/* ══ OP MESSAGES — UN LIEN D'INVITATION COLLÉ DANS UN ONGLET DÉJÀ OUVERT OUVRE SA FEUILLE (testeur « groupes@n#4 », 17 octobre 2026) ═══════════════════════════════
   Régression du repli des fragments inconnus (test-2530) : écrire `location.hash = '#lien=<code>'` lève `popstate` SANS état de la page, PUIS `hashchange`. Le repli
   voyait « lien=… » comme un fragment inconnu et réécrivait l'adresse en `#messages` AVANT que l'écouteur `hashchange` ne la relise : il n'y trouvait plus de code, et la
   feuille Contacts ne s'ouvrait plus (mesuré : 4 combinaisons sur 4, alors que la copie d'avant les lots l'ouvrait). Même défaut pour `#invitation=` (entreprise) et
   `#reunion=` (salle) : trois écouteurs lisent le fragment, un seul repli le réécrivait.

   Ce banc monte la VRAIE navigation de la page (outils-navigation-msg) ET les VRAIS écouteurs `hashchange` des trois liens (texte de la page, sur un historique qui joue
   popstate puis hashchange). ⛔ Il ne défait pas ce que le repli garde : un fragment inconnu (ou un « lien= » trop court pour être un code) est toujours remplacé. */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();
const CODE = 'A'.repeat(8) + 'b'.repeat(8) + '0123456789';
const CONV = 'c_' + 'a'.repeat(32);

function monter() {
  const lien = T.tranche('const lienDansAdresse = ', 'const ouvrirConvId');
  const invitationDef = T.PAGE.match(/  const invitationDansAdresse = [^\n]*\n/)[0];
  const invitation = T.tranche("window.addEventListener('hashchange', () => {\n    const c = CAP.espaces", '/* le retour de Stripe');
  const reunionDef = T.PAGE.match(/  const reunionDansAdresse = [^\n]*\n/)[0];
  const reunion = T.tranche("window.addEventListener('hashchange', () => {\n    const c = CAP.salles", '/* ═══ 11.');
  const M = T.monter({
    pre: `
      CAP.liens = true; CAP.espaces = true; CAP.salles = true;
      let declencheur = 'x'; const ouvertes = []; const hc = [];
      function ouvrirFeuille(nom) { ouvertes.push([nom, etat.codeLien || etat.codeInvitation || etat.codeReunion || null, location.hash]); }
      const lireInvitationSaisie = async () => {}; const erreurInfo = () => {}; const phraseEspace = () => '';
      /* l'historique du banc ne connaît que popstate : on y ajoute hashchange (levé APRÈS popstate, comme un navigateur) et le « once » */
      const ajouter = window.addEventListener.bind(window);
      window.addEventListener = (nom, f, o) => {
        if (nom === 'hashchange') { hc.push(f); return; }
        if (o && o.once) { let fait = false; ajouter(nom, e => { if (fait) return; fait = true; f(e); }); return; }
        ajouter(nom, f);
      };
      const ecrire = window.ecrireAdresse;
      window.ecrireAdresse = h => { ecrire(h); setTimeout(() => hc.slice().forEach(f => f()), 0); };
      this.ouvertes = ouvertes;
    `,
    post: invitationDef + reunionDef + lien + invitation + reunion,
  });
  M.hist.replaceState({ opmsg: 1, n: 0, r: M.routeDepuisHash(), p: null }, '', '#messages');
  return M;
}
const ouvrirConv = M => { M.pousser({ vue: 'messages', conv: CONV, feuille: false, photo: null, appel: null }); };

(async () => {
  for (const [nom, motif, feuille] of [['un lien de contact', 'lien', 'contact'], ['une invitation d\'entreprise', 'invitation', 'entreprise'], ['un lien de réunion', 'reunion', 'invite-reunion']]) {
    const M = monter(); ouvrirConv(M); await T.attendre();
    const avant = M.appliquees.length;
    vrai('(population) la conversation est ouverte avant le geste', M.etat.route && M.etat.route.conv === CONV);
    M.win.ecrireAdresse('#' + motif + '=' + CODE); await T.attendre(60);
    v(nom + ' collé dans l\'onglet ouvert : la feuille s\'ouvre, une fois, avec SON code', M.ctx.ouvertes.map(o => [o[0], o[1]]), [[feuille, CODE]]);
    v('… le code ne reste ni dans la barre d\'adresse ni dans l\'historique restant', [M.loc.hash.includes(CODE), M.pile().slice(0, M.index() + 1).some(p => p.url.includes(CODE))], [false, false]);
    v('… et la conversation reste ouverte derrière la feuille', M.etat.route && M.etat.route.conv, CONV);
    vrai('… (population) la page a bien rejoué des routes pendant le geste', M.appliquees.length > avant);
  }
  /* contre-épreuves : le repli des fragments inconnus continue de jouer */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.win.ecrireAdresse('#lien=court'); await T.attendre(60);
    v('contre-épreuve : « #lien=court » n\'est pas un code — fragment inconnu, replié sur #messages, aucune feuille', [M.loc.hash, M.ctx.ouvertes.length], ['#messages', 0]);
    M.win.ecrireAdresse('#nimporte'); await T.attendre(60);
    v('contre-épreuve : #nimporte est toujours replié sur #messages', [M.loc.hash, M.ctx.ouvertes.length], ['#messages', 0]);
  }
  {
    const M = monter(); M.ctx.CAP.liens = false; ouvrirConv(M); await T.attendre();
    M.win.ecrireAdresse('#lien=' + CODE); await T.attendre(60);
    v('contre-épreuve : sans la capacité « liens », personne ne lira ce code — l\'adresse est repliée, il ne reste pas dans la barre', [M.loc.hash.includes(CODE), M.ctx.ouvertes.length], [false, 0]);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });

/* ══ OP MESSAGES — UN FRAGMENT D'ADRESSE QUE LA PAGE NE CONNAÎT PAS NE RESTE PAS DANS L'ADRESSE (testeur « pro#6 », 17 octobre 2026) ═══════════
   Un compte SANS Pro écrit `#accueil` (ou n'importe quel fragment : `#nimporte`) dans la barre d'adresse : `routeDepuisHash` replie sur Messages et la vue Messages
   s'affiche — mais l'ADRESSE et l'HISTORIQUE gardaient `#accueil`. Seul un rechargement la normalisait en `#messages` (le démarrage écrit déjà `urlDe(r0)` sur son
   entrée). Une adresse qui dit une autre page que celle qu'on voit, c'est ce que le partage et « Retour » rendent à la personne.

   Ce banc monte la VRAIE navigation de la page (section 6) sur un historique de navigateur qui joue ce que joue un navigateur : écrire `location.hash = …` pose une
   entrée SANS état et lève `popstate`. ⛔ Les entrées POSÉES PAR LA PAGE (un état `opmsg`) ne sont jamais réécrites : le repli ne vise que l'adresse écrite à la main.
   ⛔ Un motif de banc vise du CODE : ici on joue la fonction, on ne cherche pas une phrase. */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();

(async () => {
  /* ── un compte sans Pro : « accueil » n'est pas une vue de cette page ── */
  {
    const M = T.monter({ url: '#messages' });
    M.hist.replaceState({ opmsg: 1, n: 0, r: M.routeDepuisHash(), p: null }, '', '#messages');
    M.win.ecrireAdresse('#accueil'); await T.attendre();
    v('(population) la route jouée par popstate est celle de Messages', JSON.parse(M.appliquees[M.appliquees.length - 1]).vue, 'messages');
    v('#accueil sans Pro : l\'adresse devient #messages (comme après un rechargement)', M.loc.hash, '#messages');
    v('… et l\'entrée d\'historique porte l\'état de la page (route Messages, arrivée par un lien : rien à rendre)', (() => { const s = M.hist.state; return s && [s.opmsg, s.n, s.r.vue, s.p]; })(), [1, 0, 'messages', null]);
    v('… sans AJOUTER d\'entrée (l\'adresse écrite est remplacée, pas doublée)', M.pile().map(p => p.url), ['#messages', '#messages']);

    M.win.ecrireAdresse('#nimporte'); await T.attendre();
    v('un fragment inconnu (#nimporte) : même repli, #messages', M.loc.hash, '#messages');
    M.win.ecrireAdresse('#constructor'); await T.attendre();
    v('#constructor (un nom du prototype, pas une vue) : #messages', M.loc.hash, '#messages');
    M.win.ecrireAdresse('#reglages/confidentialite'); await T.attendre();
    v('contre-épreuve : un fragment CONNU (#reglages/confidentialite) reste tel quel — le repli ne touche que l\'inconnu', M.loc.hash, '#reglages/confidentialite');
    M.win.ecrireAdresse('#messages'); await T.attendre();
    v('contre-épreuve : #messages reste #messages', M.loc.hash, '#messages');
  }
  /* ── un compte avec Pro : #accueil EST une vue, il reste ── */
  {
    const M = T.monter({ url: '#messages', vues: ['messages', 'appels', 'contacts', 'reunions', 'accueil', 'reglages'] });
    M.hist.replaceState({ opmsg: 1, n: 0, r: M.routeDepuisHash(), p: null }, '', '#messages');
    M.win.ecrireAdresse('#accueil'); await T.attendre();
    v('avec Pro : #accueil est une vue — l\'adresse reste #accueil', [M.loc.hash, JSON.parse(M.appliquees[M.appliquees.length - 1]).vue], ['#accueil', 'accueil']);
  }
  /* ── un retour sur une entrée de la page n'est pas réécrit ── */
  {
    const M = T.monter({ url: '#messages' });
    M.hist.replaceState({ opmsg: 1, n: 0, r: M.routeDepuisHash(), p: null }, '', '#messages');
    M.pousser({ vue: 'contacts', conv: null, feuille: false, photo: null, appel: null });
    const avant = M.pile().length;
    M.hist.back(); await T.attendre();
    v('un retour système sur une entrée de la page ne pose ni ne remplace rien (même nombre d\'entrées, adresse de l\'entrée)', [M.pile().length, M.loc.hash], [avant, '#messages']);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });

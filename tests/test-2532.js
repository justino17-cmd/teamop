/* ══ OP MESSAGES — LE RETOUR DU NAVIGATEUR, MENU D'UN MESSAGE OUVERT, FERME LE MENU ET PAS LA CONVERSATION (testeur « conversations#3 », 17 octobre 2026) ═════
   Le menu d'un message (⋯, appui long, clic droit) vivait dans `etat.menu`, hors de la route : ni `pousser()` à l'ouverture ni `fermerCouche()` à la fermeture. Le retour système
   (bouton Android, geste d'iOS) jouait donc la route d'AVANT — la liste —, et `fermerConv` (qui appelle `fermerMenu`) fermait la conversation ET perdait le contexte
   « Répondre à ». La feuille Infos, elle, a son entrée et se ferme seule. Le menu en devient une : à l'ouverture il POUSSE une entrée marquée `menu` (sans changer de route),
   `fermerMenu` la RENDS quand elle est au sommet, et `popstate` avec un menu ouvert ne ferme QUE le menu.

   Ce banc monte la VRAIE navigation de la page (tests/outils-navigation-msg.js) avec les VRAIES `ouvrirMenuMessage`, `ouvrirMenuPlus`, `fermerMenu` et leurs pièces,
   sur un historique de navigateur qui joue `back()` en ASYNCHRONE, et un `appliquer` qui ferme la conversation (donc `fermerMenu`) quand la route n'en porte plus — comme la vraie.
   ⛔ Le piège de l'ordre : fermer le menu rend UNE entrée, et un geste qui OUVRE quelque chose juste après (Suivi, Transférer, Contact, Sondage) pousse sa propre entrée PENDANT que
   ce retour est en vol — le retour en retombant fermerait la feuille neuve. Les gestes de navigation demandés dans l'intervalle attendent `popstate` (ou le filet d'1,5 s).
   Restent HORS couche, dits : le menu d'un rendez-vous de l'Agenda et le menu « Y aller » (lot de l'Agenda, ouverts par d'autres fonctions). */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();
const C = 'c_' + 'a'.repeat(32);

function monter(opts) {
  const noms = ['fermerMenu', 'ouvrirMenuMessage', 'ouvrirMenuPlus', 'basculeReprendre'];
  const dispo = n => { try { T.fonction(n); return true; } catch (e) { return false; } };
  const avec = noms.concat(['menuEntreePoser', 'menuEntreeRendre', 'menuRetourFin'].filter(dispo));
  const consts = T.PAGE.match(/const REACTIONS = \[[^\n]*\n/)[0];
  /* lot m14 : `fermerMenu` appelle `basculeReprendre` (une bascule Pro/Perso différée par un menu ouvert sur l'Accueil a lieu dès qu'il se ferme). On monte la VRAIE fonction et sa
     VRAIE condition `basculeAttend` ; l'état qu'elles lisent (`reprisePrefs`, `repriseHoraire`) est déclaré comme la page le déclare, au repos — rien n'attend, donc rien n'est rejoué.
     `surPrefs` et `horaireAppliquer` (ce qu'elle rejoue quand quelque chose attend) ne sont PAS montées : ce banc ne parle pas de bascule — elles lèvent si on les atteint, au lieu de
     laisser croire qu'un rejeu a eu lieu. */
  const basculeAttendTxt = (T.PAGE.match(/\n  const basculeAttend = [^\n]*/) || [''])[0].trim();
  const reprises = (T.PAGE.match(/\n  let minuteurHoraire = 0, repriseHoraire = null, reprisePrefs = false;/) || [''])[0].trim();
  if (!basculeAttendTxt || !reprises) throw new Error('ancres de la bascule différée (basculeAttend, repriseHoraire/reprisePrefs) introuvables dans la page');
  const bascule = reprises + '\n' + basculeAttendTxt + `
      function surPrefs() { throw new Error('surPrefs atteinte : une bascule différée attendait, ce banc ne la joue pas'); }
      function horaireAppliquer() { throw new Error('horaireAppliquer atteinte : une bascule différée attendait, ce banc ne la joue pas'); }
      `;
  const M = T.monter(Object.assign({
    avec,
    pre: consts + bascule + `
      const MOI = { id: 'u1' }; const trOuvertes = new Set(); const message = { id: 'm1', auteur: 'u2', texte: 'Bonjour', t: Date.now(), reactions: [] };
      const trouverMessage = id => id === 'm1' ? message : null; const compoFerme = () => false; const estCarte = () => false; const transferable = () => false; const transcriptionPossible = () => false;
      /* « Écouter » (28 octobre 2026) : ce banc ne parle pas de lecture à voix haute — la ligne du menu n'y est pas (ni synthèse, ni message écoutable). */
      const ecoutable = () => false; const synthesePossible = () => false; const ecoute = { mid: null };
      const rappelPossible = () => true; const suiviPossible = () => false; const pieceDe = () => null; const tuilesPlus = () => [['photo', 'Photos', 'i-photo'], ['contact', 'Contact', 'i-c']];
      const icone = () => ''; const esc = s => String(s); const nomAuteur = () => 'Ben'; this.etat = etat; etat.convDonnees = { type: 'direct', admins: [] };
      const menuMsg = { innerHTML: '', classList: { add() {}, remove() {} }, setAttribute() {}, querySelector() { return premier; }, querySelectorAll() { return []; } };
      const premier = { focus() { traces.push('focus-premier'); }, dataset: {} }; const traces = []; this.traces = traces; this.premier = premier;
      const menuFond = { hidden: true, classList: { add() {}, remove() {}, toggle() {} } };
      const convMessages = { querySelectorAll() { return []; } };
      const $ = id => id === 'menu-msg' ? menuMsg : id === 'menu-fond' ? menuFond : id === 'conv-messages' ? convMessages : faux(id); this.menuFond = menuFond;
      `,
    appliquerDe: `function appliquer(r) { etat.route = r; appliquees.push(JSON.stringify(r));
      const veutConv = r.vue === 'messages' ? (r.conv || null) : null;
      if (veutConv !== etat.conv) { etat.conv = veutConv; if (!veutConv) { etat.contexte = null; fermerMenu(); } else { etat.contexte = null; fermerMenu(); } }
    }`,
  }, opts || {}));
  M.ctx.faux = T.faux; M.ctx.CAP.actionsMessage = true; M.ctx.CAP.transferts = false; M.ctx.CAP.agenda = true;
  return M;
}
const ouvrirConv = (M) => { M.pousser({ vue: 'messages', conv: C, feuille: false, photo: null, appel: null }); };
const etatFin = (M) => ({ menu: !!M.etat.menu, conv: M.etat.conv, hash: M.loc.hash.slice(0, 12), rang: M.index() });
const retours = (M) => M.journal.filter(x => x === 'back').length;

(async () => {
  const M0 = monter();
  vrai('(population) fermerMenu, ouvrirMenuMessage et ouvrirMenuPlus sont trouvées dans la page, avec leur navigation', M0.ctx.fermerMenu && M0.ctx.ouvrirMenuMessage && M0.ctx.ouvrirMenuPlus);

  vrai('(population) la VRAIE basculeReprendre (lot m14) et sa condition basculeAttend sont montées, au repos : rien n\'attend, elles ne rejouent rien', typeof M0.ctx.basculeReprendre === 'function' && M0.ctx.basculeReprendre() === undefined && require('vm').runInContext('basculeAttend(\'perso\')', M0.ctx) === false);

  /* 1. LE BUG : retour avec le menu d'un message ouvert */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.etat.contexte = { type: 'reponse', mid: 'm1' };
    const avant = M.pile().length;
    M.ctx.ouvrirMenuMessage('m1', null);
    v('ouvrir le menu d\'un message POUSSE une entrée d\'historique marquée « menu » (la route ne change pas)', [M.etat.menu && M.etat.menu.mid, M.pile().length, M.pile()[M.index()].menu, M.etat.route.conv], ['m1', avant + 1, true, C]);
    M.hist.back(); await T.attendre();
    v('le retour du navigateur FERME le menu et la conversation reste — c\'était : la conversation fermée avec lui', etatFin(M), { menu: false, conv: C, hash: '#messages/c_', rang: 1 });
    v('… le contexte « Répondre à » est conservé (le retour n\'a pas fermé la conversation)', M.etat.contexte && M.etat.contexte.type, 'reponse');
    M.hist.back(); await T.attendre();
    v('… et le retour suivant quitte la conversation (une couche par retour, aucune entrée de menu orpheline)', etatFin(M), { menu: false, conv: null, hash: '#messages', rang: 0 });
  }
  /* 2. fermer à la main (Échap, fond, « Répondre ») : l'entrée est rendue, UNE fois */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null); M.journal.length = 0;
    M.ctx.fermerMenu(); M.ctx.fermerMenu(); await T.attendre();
    v('fermerMenu (Échap, fond, un choix) : le menu se ferme AU GESTE, UN seul retour d\'historique même appelé deux fois', [etatFin(M), retours(M)], [{ menu: false, conv: C, hash: '#messages/c_', rang: 1 }, 1]);
    M.hist.back(); await T.attendre();
    v('… et le retour suivant quitte la conversation', M.etat.conv, null);
  }
  /* 3. LE PIÈGE DE L'ORDRE : un choix qui ouvre une feuille juste après avoir fermé le menu */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null);
    M.ctx.fermerMenu(); M.pousser(Object.assign({}, M.etat.route, { feuille: 'transferer:12' })); await T.attendre(60);
    v('« Transférer » : la feuille ouverte juste après la fermeture du menu RESTE ouverte (le retour du menu ne la ferme pas)', [M.etat.route.feuille, M.etat.route.conv, M.loc.hash.slice(0, 12)], ['transferer:12', C, '#messages/c_']);
    M.fermerCouche(); await T.attendre(60);
    v('… la fermer rend UNE entrée : la conversation est là', [M.etat.route.feuille, M.etat.route.conv], [false, C]);
    M.hist.back(); await T.attendre();
    v('… et le retour suivant quitte la conversation (aucune entrée de menu laissée dans la pile)', M.etat.route.conv, null);
  }
  /* 3 bis. même piège avec remplacer */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null);
    M.ctx.fermerMenu(); M.remplacer(Object.assign({}, M.etat.route, { feuille: 'suivi:x' })); await T.attendre(60);
    v('une route REMPLACÉE juste après la fermeture du menu attend, elle aussi, le retour du menu', [M.etat.route.feuille, M.etat.route.conv], ['suivi:x', C]);
  }
  /* 3 ter. le navigateur ne rend jamais le retour demandé : le filet laisse passer le geste en attente */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null);
    M.hist.back = () => { M.journal.push('back (perdu)'); };
    M.ctx.fermerMenu(); M.pousser(Object.assign({}, M.etat.route, { feuille: 'carte-contact' }));
    v('retour perdu : le geste en attente n\'est pas encore joué', M.etat.route.feuille, false);
    await T.attendre(1900);
    v('… le filet (1,6 s) le joue : une page qui ne s\'ouvre plus serait pire que la panne', M.etat.route.feuille, 'carte-contact');
  }
  /* 4. une adresse écrite / un autre retour pendant que le menu est ouvert : il se ferme, sans retour de plus */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null); M.journal.length = 0;
    M.win.ecrireAdresse('#reglages'); await T.attendre();
    v('l\'adresse change pendant que le menu est ouvert : le menu se ferme et on ne rend AUCUNE entrée de plus', [M.etat.menu, M.etat.route.vue, retours(M)], [null, 'reglages', 0]);
  }
  /* 5. la conversation est retirée sous le menu (remplacée par la route) : même chose */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null); M.journal.length = 0;
    M.remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }); await T.attendre();
    v('la conversation disparaît sous le menu (route remplacée) : menu fermé, aucun retour d\'historique en trop', [M.etat.menu, M.etat.conv, retours(M)], [null, null, 0]);
    M.hist.back(); await T.attendre();
    v('… et l\'entrée du menu n\'est pas restée comme une entrée orpheline (le retour suivant sort de la page, pas vers un menu)', M.pile().slice(0, M.index() + 1).some(p => p.menu), false);
  }
  /* 6. un appel entrant (une couche) pose sa route PAR-DESSUS le menu : il prend la place de l'entrée du menu */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    M.ctx.ouvrirMenuMessage('m1', null);
    M.pousser(Object.assign({}, M.etat.route, { appel: 'a_1' })); await T.attendre();
    v('une couche poussée PAR-DESSUS un menu ouvert prend la place de son entrée (aucune entrée de menu laissée sous elle)', M.pile().slice(0, M.index() + 1).some(p => p.menu), false);
    M.fermerCouche(); await T.attendre();
    v('… la fermer ramène à la conversation, un seul retour', [M.etat.route.appel || null, M.etat.route.conv], [null, C]);
  }
  /* 7. le menu « + » (Joindre) et « Envoyer plus tard » sont des couches, comme le menu d'un message */
  {
    const M = monter(); ouvrirConv(M); await T.attendre();
    const avant = M.pile().length;
    M.ctx.ouvrirMenuPlus();
    v('le menu « + » pousse son entrée', [M.etat.menu && M.etat.menu.plus, M.pile().length, M.pile()[M.index()].menu], [true, avant + 1, true]);
    M.hist.back(); await T.attendre();
    v('… le retour le ferme seul, la conversation reste', etatFin(M), { menu: false, conv: C, hash: '#messages/c_', rang: 1 });
  }
  /* 8. HORS COUCHE, DITS : les menus de l'Agenda et « Y aller » ne sont pas ouverts par ces fonctions — le retour ne les touche pas */
  {
    const M = monter(); M.pousser({ vue: 'reunions', conv: null, feuille: false, photo: null, appel: null }); await T.attendre();
    M.etat.menu = { agenda: { type: 'e', id: 'e_1' }, declencheur: null, t: 0 };
    M.journal.length = 0;
    M.hist.back(); await T.attendre();
    v('(hors couche, dit) le menu d\'un rendez-vous de l\'Agenda : le retour ne le ferme pas et ne lui rend rien — son lot le traite, ce correctif n\'y touche pas', [!!M.etat.menu, M.pile().some(p => p.menu)], [true, false]);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });

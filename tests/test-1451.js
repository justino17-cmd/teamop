/* ══ test-1451 — LE STATUT SAISI SE MONTRE (17 octobre 2026, lot « m11 » de la revue de A à Z : reglages#0, reglages#1, appareils@7, groupes@7 + reglages@1) ═════════════════════════
   Le champ « Statut » du Profil promet « Ce que tes contacts voient sous ton nom ». Mesuré : tant que la personne était EN LIGNE, ses contacts lisaient « En ligne » à la place de son statut
   (`presenceTexte(p) || p.statut` : la présence passait avant), et elle-même ne le lisait nulle part — la carte du Profil lit `MOI.statut`, que `moi()` du module de données ne rendait pas, et la
   barre latérale disait « Disponible » en dur. Ce fichier garde, avec les VRAIES fonctions de la page (bac à sable) et le VRAI module de données contre le VRAI service :
     1. le module : `contacts()` rend le statut (`statut`) ET le met en tête de la ligne (`role`) — un contact EN LIGNE avec un statut montre le statut ; sans statut, la présence reste dite ;
        `moi()` rend MON statut, au départ comme après un changement ; ⛔ c'est une règle d'AFFICHAGE : ce que le service stocke et qui voit la présence ne bougent pas ;
     2. la page : UNE petite fonction (`statutTexte`) pour les trois lieux qui l'écrivent — la fiche, la liste « Entreprise », les membres d'un espace — le statut d'abord, la présence sinon ;
     3. la barre latérale : MON statut remplace « Disponible » (la présence coupée reste dite en premier) ; ⛔ sa pastille porte la couleur de l'avatar de la personne, comme la grande photo du Profil
        et comme les autres la voient (avant : `av0` en dur, bleu, pendant que le Profil était gris ou vert) ;
     4. la feuille « Modifier le profil » dit que l'identifiant suit le prénom, sous le champ Prénom (l'ancien cesse de fonctionner si on le change).
   ⛔ Un motif de banc vise du CODE. ⛔ Chaque absence est précédée de sa population. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const jusqua = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const M = {
  esc: ligne('const esc = '), presenceTexte: ligne('const presenceTexte = '), statutTexte: ligne('const statutTexte = '), icone: ligne('const icone = '), blob: ligne('const blob = '),
  avIndex: ligne('const avIndex = '), avatar: jusqua('const avatar = ', "</span>'"), pastilleMoi: jusqua('const pastilleMoi = ', "</a>';"),
  peindreMoi: decl('function peindreMoi('), peindreProfil: decl('function peindreProfil('), peindreProfilReglage: decl('function peindreProfilReglage('),
  ficheTete: decl('function ficheTete('), rendreVcCategorie: decl('function rendreVcCategorie('), vcAucun: ligne('const vcAucun = '), vcNorm: ligne('const vcNorm = '),
};
/* le bac à sable : les vraies fonctions, de faux éléments de la page */
function bac(o) {
  o = o || {};
  const E = {};
  for (const id of ['moi-nom', 'moi-statut', 'moi-statut-texte', 'info-corps', 'reg-profil']) E[id] = { id, textContent: '', innerHTML: '', title: '', classes: new Set(), classList: { toggle(c, on) { if (on) E[id].classes.add(c); else E[id].classes.delete(c); } } };
  const avatars = (o.avatars || [{ className: 'avatar av0 moi-av', style: {}, textContent: '' }]);
  const ctx = {
    Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, Map, Set, console,
    $: id => E[id] || null, MOI: o.moi || null, CONTACTS: [], CAP: { identifiants: true, favoris: true, appels: true, reunions: true, espaces: true },
    source: { monIdentifiant: () => (o.ident === undefined ? 'Ana#3357' : o.ident), favori() {}, enCommun() {} }, etat: { mode: 'perso', pro: false, vcEsp: o.vcEsp || null, conversations: [], vcSel: null },
    commun: { cache: new Map(), enCours: new Map() },
    document: { querySelectorAll: s => (s === '.moi-av' ? avatars : []) },
    modesActifs: () => false, duCote: () => true, dansMode: () => true, auBureau: () => false,
    identOK: true,
  };
  vm.createContext(ctx);
  vm.runInContext(Object.values(M).join('\n') + '\nthis.F = { statutTexte, peindreMoi, peindreProfil, peindreProfilReglage, pastilleMoi, ficheTete, rendreVcCategorie, avatar };', ctx);
  return { F: ctx.F, E, avatars, ctx };
}
const monter = (svc) => {
  const nav = T.navigateur(svc.base);
  const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
  return { src, nav, async entrer(login, pass) { await src.connexion(login, pass); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); } };
};
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées dans la page');
  v('(population) chaque morceau est trouvé', Object.keys(M).filter(k => !M[k]), []);
  vrai('(population) le bac à sable les exécute', typeof bac().F.peindreMoi === 'function' && typeof bac().F.statutTexte === 'function');

  /* ═══ 1. LE MODULE DE DONNÉES, CONTRE LE VRAI SERVICE ═══ */
  console.log('\n1. Le module : le statut d\'un contact en ligne, et le mien');
  const og = await T.fauxOpGestion({ ana: { pass: 'pw-ana-12345678', nom: 'Ana Martin', actif: true }, ben: { pass: 'pw-ben-12345678', nom: 'Ben Durand', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 400, presenceGraceMs: 300 } });
  const ouverts = [];
  try {
    const cA = await T.connecter(svc, og, 'ana', 'pw-ana-12345678'), cB = await T.connecter(svc, og, 'ben', 'pw-ben-12345678');
    const k = await cA.post('/api/contacts/lien', { max: 1 }); await cB.post('/api/liens/accepter', { code: k.j.code });
    const A = monter(svc), B = monter(svc); ouverts.push(A, B);
    const ma = await A.entrer('ana', 'pw-ana-12345678'); await B.entrer('ben', 'pw-ben-12345678');
    const ana = () => B.src.contacts().find(c => c.id === ma.id);
    vrai('(population) Ben voit Ana EN LIGNE, sans statut : la présence est dite (« En ligne »)', await att(async () => { await B.src.rafraichirContacts(); const c = ana(); return c && c.enLigne === true && c.role === 'En ligne'; }));
    v('(population) …et son statut est vide', ana().statut, '');
    const STATUT = 'En déplacement jusqu\'à lundi';
    await A.src.majProfil({ statut: STATUT });
    vrai('Ben lit le STATUT d\'Ana pendant qu\'elle est en ligne (reglages#0)', await att(async () => { await B.src.rafraichirContacts(); const c = ana(); return c && c.enLigne === true && c.role === STATUT; }));
    v('…et le champ `statut` le porte aussi (la page l\'écrit par `statutTexte`)', ana().statut, STATUT);
    v('…la présence reste VRAIE (le point vert : enLigne)', ana().enLigne, true);
    await A.src.majProfil({ statut: '' });
    vrai('statut effacé : la présence redevient la ligne (« En ligne »)', await att(async () => { await B.src.rafraichirContacts(); const c = ana(); return c && c.role === 'En ligne' && c.statut === ''; }));
    /* ⛔ une règle d'affichage : ce que le service stocke et qui voit la présence ne changent pas */
    await A.src.majProfil({ statut: STATUT });
    const bruts = (await cB.get('/api/contacts')).j.contacts.find(c => c.id === ma.id);
    v('⛔ le service rend toujours le statut ET la présence, séparés (rien n\'a changé de son côté)', [bruts.statut, bruts.en_ligne], [STATUT, true]);
    await A.src.majConfidentialite({ presence: false });
    vrai('présence coupée : Ben ne lit plus « En ligne », il lit le statut', await att(async () => { await B.src.rafraichirContacts(); const c = ana(); return c && c.enLigne === false && c.role === STATUT; }));
    await A.src.majConfidentialite({ presence: true });

    /* ═══ 2. MON STATUT (reglages#1) ═══ */
    console.log('\n2. Mon statut : `moi()` le rend, au départ comme après un changement');
    v('`moi()` rend le statut qu\'Ana vient d\'enregistrer', A.src.moi().statut, STATUT);
    const A2 = monter(svc); ouverts.push(A2); const moi2 = await A2.entrer('ana', 'pw-ana-12345678');
    v('⛔ …et un autre appareil, au départ, le lit aussi (rien ne dépend d\'un changement fait ici)', moi2.statut, STATUT);
    await A.src.majProfil({ statut: '' });
    v('statut effacé : `moi().statut` est vide', A.src.moi().statut, '');
    await A.src.majProfil({ statut: STATUT });

    /* ═══ 3. LA PAGE ═══ */
    console.log('\n3. La page : le statut d\'abord, la présence sinon — partout où elle l\'écrit');
    {
      const F = bac().F;
      v('`statutTexte` : le statut passe devant « En ligne »', F.statutTexte({ enLigne: true, statut: 'Au bureau' }), 'Au bureau');
      v('…et devant « En réunion »', F.statutTexte({ enReunion: true, enLigne: true, statut: 'Au bureau' }), 'Au bureau');
      v('sans statut : « En ligne » / « En réunion » restent dits', [F.statutTexte({ enLigne: true }), F.statutTexte({ enReunion: true, enLigne: true }), F.statutTexte({})], ['En ligne', 'En réunion', '']);
      const fiche = F.ficheTete({ id: 'p_x', nom: 'Ana Martin', initiales: 'AM', avatar: 1, enLigne: true, statut: 'Au bureau', role: 'Au bureau' });
      vrai('la FICHE d\'un contact en ligne montre son statut sous le nom', /vc-fiche-statut">Au bureau</.test(fiche));
      const sans = F.ficheTete({ id: 'p_x', nom: 'Ana Martin', initiales: 'AM', avatar: 1, enLigne: true, role: 'En ligne' });
      vrai('sans statut, la fiche dit « En ligne »', /vc-fiche-statut">En ligne</.test(sans));
      const esp = { charge: false, espaces: [{ id: 'e1', nom: 'Atelier Nord' }], membres: { e1: [{ id: 'p_c', nom: 'Cléo Petit', initiales: 'CP', avatar: 2, enLigne: true, statut: 'En tournée' }, { id: 'p_d', nom: 'Dan Roux', initiales: 'DR', avatar: 3, enLigne: true }] }, panne: {}, erreur: '' };
      const ent = bac({ vcEsp: esp }).F.rendreVcCategorie('entreprise', '', '');
      const roleDe = (nom) => { const m = new RegExp('contact-nom">' + nom + '</span><span class="contact-role">([^<]*)<').exec(ent); return m ? m[1] : null; };
      v('« Entreprise » : la ligne d\'un collègue en ligne avec un statut montre le statut, sans statut « En ligne »', [roleDe('Cléo Petit'), roleDe('Dan Roux')], ['En tournée', 'En ligne']);
    }

    console.log('\n4. La barre latérale et le Profil : MON statut, ma couleur');
    {
      const x = bac({ moi: { id: 'p_ana', nom: 'Ana Martin', initiales: 'AM', avatar: 4, photo: null, statut: 'Au bureau', presence: true } });
      x.F.peindreMoi();
      v('la barre dit MON statut à la place de « Disponible »', x.E['moi-statut-texte'].textContent, 'Au bureau');
      const y = bac({ moi: { id: 'p_ana', nom: 'Ana Martin', initiales: 'AM', avatar: 4, photo: null, statut: '', presence: true } }); y.F.peindreMoi();
      v('sans statut, la barre dit « Disponible »', y.E['moi-statut-texte'].textContent, 'Disponible');
      const z = bac({ moi: { id: 'p_ana', nom: 'Ana Martin', initiales: 'AM', avatar: 4, photo: null, statut: 'Au bureau', presence: false } }); z.F.peindreMoi();
      v('⛔ présence coupée : « Présence masquée » passe devant le statut (le point n\'est plus vert)', [z.E['moi-statut-texte'].textContent, z.E['moi-statut'].classes.has('masque')], ['Présence masquée', true]);
      vrai('(population) la pastille « AM » existe et reçoit une classe', x.avatars.length === 1 && /moi-av/.test(x.avatars[0].className));
      vrai('⛔ …la pastille de la barre porte la couleur de l\'avatar de la personne (av4), pas `av0` en dur — la même que la grande photo du Profil', /\bav4\b/.test(x.avatars[0].className) && !/\bav0\b/.test(x.avatars[0].className));
      const profil = x.F.peindreProfil({ photo: null, initiales: 'AM', avatar: 4, nom: 'Ana Martin', champs: { prenom: 'Ana', nom: 'Martin', statut: 'Au bureau' } });
      void profil;
      const corps = x.E['info-corps'].innerHTML;
      vrai('(population) la feuille « Modifier le profil » est peinte', /id="pf-prenom"/.test(corps) && /id="pf-statut"/.test(corps));
      vrai('la grande photo du Profil porte la même couleur (av4)', /class="profil-photo"><span class="avatar av4/.test(corps));
      const apres = /id="pf-prenom"[\s\S]{0,400}?<label class="champ-profil"><span>Nom<\/span>/.exec(corps);
      vrai('⛔ une PHRASE sous le champ Prénom dit que l\'identifiant suit le prénom (groupes@7, reglages@1)', !!apres && /suit ton prénom/.test(apres[0]));
      vrai('…elle nomme l\'identifiant actuel, et dit que l\'ancien ne te retrouve plus', !!apres && /Ana#3357/.test(apres[0]) && /ne te retrouve plus/.test(apres[0]));
      vrai('…et le champ la désigne (`aria-describedby`)', /id="pf-prenom"[^>]*aria-describedby="pf-prenom-aide"/.test(corps) && /id="pf-prenom-aide"/.test(corps));
      const sansId = bac({ ident: null, moi: x.ctx.MOI }); sansId.F.peindreProfil({ photo: null, initiales: 'AM', avatar: 4, nom: 'Ana Martin', champs: { prenom: 'Ana', nom: 'Martin', statut: '' } });
      vrai('sans identifiant lu, la phrase reste vraie (sans nom d\'identifiant)', /suit ton prénom/.test(sansId.E['info-corps'].innerHTML) && !/null|undefined/.test(sansId.E['info-corps'].innerHTML));
      const pastille = x.F.pastilleMoi();
      vrai('la pastille de l\'en-tête des vues (téléphone) porte aussi la couleur de l\'avatar', /class="avatar av4 moi-av"/.test(pastille));
      const carte = bac({ moi: { id: 'p_ana', nom: 'Ana Martin', initiales: 'AM', avatar: 4, photo: null, statut: 'Au bureau' } }); carte.F.peindreProfilReglage();
      vrai('(population) la carte Profil lit MON statut (déjà juste côté page : le module ne le rendait pas)', /reg-moi-statut">Au bureau</.test(carte.E['reg-profil'].innerHTML));
    }
  } finally {
    for (const x of ouverts) { try { x.src.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

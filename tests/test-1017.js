/* ⛔ CE QUE CE FICHIER GARDE — LA REVUE DE TOUTES LES CATÉGORIES DE LA TOUR (v2.88, 17 octobre 2026).

   Justin : « revois toutes les catégories de la Tour et corrige les bugs, les erreurs ». Trois relectures ont relevé une
   trentaine de défauts ; ceux qui tiennent dans une fonction se JOUENT ici, extraits de tour.html, dans un bac à sable :
     · `geste` : un refus dit SON motif, une coupure le dit, un double clic ne part pas deux fois ;
     · `msgErreur` : une coupure n'est pas un refus (un 404 se lisait « Serveur injoignable ») ;
     · `paieEchec` : seule une carte REFUSÉE est un échec (une facture ouverte ou annulée s'affichait « Paiement refusé ») ;
     · `chargerAbos` : Stripe en panne (listes vides + `erreur`) n'est jamais « 0 € » ni « pas encore payé » ;
     · `chargerIncidents` : un raté réseau après une lecture réussie GARDE la liste, et ne redessine pas sous une note ;
     · `chargerConnexions`, `chargerDevisIA` : la réponse redessine l'écran qui les montre (des ONGLETS depuis la v2.87) ;
     · `setFiltre` : le filtre d'entreprise de la Surveillance ne passe pas d'une source à l'autre ; `btChoisirApp` : le formulaire bêta non plus
       (v2.119 : plus de console, mais le même risque — un mot de passe tiré pour la bêta d'une application ne sert pas à celle de l'autre). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(__dirname, '..', 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 160) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
/* une fonction de premier niveau, jusqu'à la déclaration suivante de premier niveau (un parcours d'accolades se tromperait
   sur les guillemets des expressions régulières) */
function bloc(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(|\\nvar ' + nom + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.|try\{)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['_gestes', 'geste', 'msgErreur', 'paieOk', 'paieEchec', 'aboFiable', 'chargerAbos', 'incNoteEnCours', 'chargerIncidents', 'chargerConnexions', 'chargerComptesSite', 'chargerDevisIA', 'setFiltre', 'filtreEff', 'btApp', 'btChoisirApp'];
const SRCS = NOMS.map(bloc);
console.log('\n── test-1017 : la revue de toutes les catégories de la Tour ──');
vrai('(population) les fonctions corrigées sont trouvées dans tour.html', SRCS.every(Boolean), NOMS.filter((n, i) => !SRCS[i]).join(', '));

function bac(extra) {
  const journal = { toasts: [], rendus: 0 };
  const ctx = Object.assign({ console, Promise, setTimeout, clearTimeout, JSON, String, Object, Array, Number, Math, Date,
    toast: t => journal.toasts.push(String(t)), render: () => { journal.rendus++; }, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.',
    APPS_TOUR: { gestion: { nom: 'OP GESTION' }, messages: { nom: 'OP MESSAGES' } }, MYAPPS: ['gestion', 'messages'], FILTRE: 'tout', TAB: 'accueil',
    INC: { list: [], cnt: {}, loaded: false, err: '', f: { app: '', ent: '' } }, ABO: { abos: [], paiements: [], loaded: false, err: '' },
    CNX: { loaded: false }, CS: { loaded: false }, DIA: { loaded: false }, ENT: { sel: null }, BT: { login: 'l', nom: 'n', chantier: 'c', pass: 'secret' },
    setBdg() {}, majCompteursApp() {}, majBarreBas() {}, incOuverts: () => [], chargerEspaces() {}, document: { getElementById: () => null, body: { dataset: {} }, querySelectorAll: () => [] },
    localStorage: { setItem() {} }, $: () => null }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(SRCS.join('\n'), ctx);
  return { ctx, journal };
}

/* 1. geste */
(async () => {
  {
    const { ctx, journal } = bac();
    let appels = 0;
    let lacher; const attente = new Promise(r => { lacher = r; });
    const p1 = ctx.geste('k', () => { appels++; return attente; }, () => journal.toasts.push('réussi'));
    const p2 = ctx.geste('k', () => { appels++; return Promise.resolve({ ok: true, d: {} }); });
    await dormir(0);   // `faire` part au tour suivant de la boucle
    v('⛔ un double clic ne part qu’une fois (la même clé attend la première réponse)', [appels, await p2], [1, false]);
    lacher({ ok: true, d: {} }); v('…et la première aboutit', await p1, true);
    v('…puis la clé se libère', await ctx.geste('k', () => { appels++; return Promise.resolve({ ok: true, d: {} }); }), true);
    journal.toasts.length = 0;
    v('un refus dit SON motif (pas « Accès supprimé »)', [await ctx.geste('r', () => Promise.resolve({ ok: false, d: { error: 'accès introuvable' } }), () => journal.toasts.push('Accès supprimé')), journal.toasts], [false, ['⚠️ accès introuvable']]);
    journal.toasts.length = 0;
    v('une coupure se dit (apiPost rejette)', [await ctx.geste('c', () => Promise.reject(new Error('réseau'))), /injoignable/.test(journal.toasts[0] || '')], [false, true]);
    v('…et la clé se libère après une coupure', await ctx.geste('c', () => Promise.resolve({ ok: true, d: {} })), true);
  }
  /* 2. msgErreur */
  {
    const { ctx } = bac();
    vrai('une coupure (aucun statut) : « injoignable »', /injoignable/.test(ctx.msgErreur({})));
    vrai('⛔ un 404 n’est pas une coupure : le statut et le motif du serveur', /refusé \(404\) : espace inconnu/.test(ctx.msgErreur({ status: 404, corps: 'espace inconnu' })) && !/injoignable/.test(ctx.msgErreur({ status: 404 })));
    vrai('un 403 reste « réservé au patron »', /patron/.test(ctx.msgErreur({ status: 403 })));
  }
  /* 3. paieEchec */
  {
    const { ctx } = bac();
    const st = ['paye', 'echec', 'ouvert', 'annule', 'autre'];
    v('⛔ seul un prélèvement REFUSÉ est un échec — ni une facture ouverte, ni une annulée, ni un autre état', st.filter(s => ctx.paieEchec({ statut: s })), ['echec']);
  }
  /* 4. chargerAbos et Stripe en panne */
  {
    const reponses = { abos: null, paie: null };
    const { ctx, journal } = bac({ apiGet: u => Promise.resolve(/abos/.test(u) ? reponses.abos : reponses.paie) });
    reponses.abos = { ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0, erreur: 'Connexion à Stripe impossible' };
    reponses.paie = { ok: true, configured: true, paiements: [], echecs: 0, erreur: 'Connexion à Stripe impossible' };
    ctx.chargerAbos(); await dormir(20);
    v('⛔ Stripe en panne (listes vides + erreur) : le vide vient d’une panne, et on le sait', [ctx.ABO.videFaute, ctx.aboFiable(), /Stripe/.test(ctx.ABO.stripeErr)], [true, false, true]);
    reponses.abos = { ok: true, configured: true, abos: [{ statut: 'actif' }], mrr: 40, actifs: 1, perime: true, majTs: 1000, erreur: 'x' };
    reponses.paie = { ok: true, configured: true, paiements: [], echecs: 0, perime: true, majTs: 1000, erreur: 'x' };
    ctx.chargerAbos(); await dormir(20);
    v('des chiffres PÉRIMÉS se montrent, datés (pas un vide de panne)', [ctx.ABO.videFaute, ctx.ABO.perime, ctx.aboFiable()], [false, 1000, true]);
    reponses.abos = { ok: true, configured: true, abos: [], mrr: 0, actifs: 0 }; reponses.paie = null;
    ctx.chargerAbos(); await dormir(20);
    v('une des deux lectures perdue se dit aussi', [ctx.ABO.videFaute, /paiements/.test(ctx.ABO.stripeErr)], [true, true]);
    reponses.abos = { ok: true, configured: true, abos: [], mrr: 0, actifs: 0 }; reponses.paie = { ok: true, configured: true, paiements: [], echecs: 0 };
    ctx.chargerAbos(); await dormir(20);
    v('(population) Stripe qui répond « rien » : un vrai vide, fiable', [ctx.ABO.videFaute, ctx.aboFiable(), ctx.ABO.stripeErr], [false, true, '']);
    ctx.TAB = 'demandes'; let gardes = 0; ctx.rendreEnGardantLeFocus = () => { gardes++; }; journal.rendus = 0;
    ctx.chargerAbos(); await dormir(20);
    v('l’écran Demandes se redessine quand Stripe répond (« payé ? »), en gardant le champ en cours', [gardes, journal.rendus], [1, 0]);
  }
  /* 5. chargerIncidents */
  {
    let echoue = false;
    const champ = { value: '', trim: '' };
    const { ctx, journal } = bac({ apiGet: () => echoue ? Promise.reject(Object.assign(new Error('x'), {})) : Promise.resolve({ issues: [{ id: 'a' }], compteurs: {} }) });
    ctx.document = { getElementById: id => id === 'inc-note' ? champ : null, activeElement: null };
    ctx.TAB = 'surveillance';
    ctx.chargerIncidents(); await dormir(20);
    v('(population) une première lecture réussie', [ctx.INC.loaded, ctx.INC.list.length, ctx.INC.err], [true, 1, '']);
    echoue = true; ctx.chargerIncidents(); await dormir(20);
    v('⛔ un raté réseau ensuite GARDE la liste, et ne la remplace pas par « ne répond pas »', [ctx.INC.list.length, ctx.INC.err, /impossible/.test(ctx.INC.avert || '')], [1, '', true]);
    echoue = false; champ.value = 'la piste à suivre'; journal.rendus = 0;
    ctx.chargerIncidents(); await dormir(20);
    v('⛔ la relève ne redessine pas sous une note qu’on écrit', journal.rendus, 0);
    champ.value = ''; ctx.chargerIncidents(); await dormir(20);
    v('…et redessine quand rien n’est en cours', journal.rendus, 1);
  }
  /* 6. les onglets redessinent leur vue de tête */
  {
    const { ctx, journal } = bac({ apiGet: () => Promise.resolve({ evenements: [], equipes: {} }) });
    ctx.TAB = 'entreprises'; ctx.chargerConnexions(); await dormir(20);
    vrai('Connexions (onglet d’Entreprises) : la réponse redessine', journal.rendus >= 1, journal.rendus);
    journal.rendus = 0; ctx.TAB = 'abonnements'; ctx.chargerDevisIA(); await dormir(20);
    vrai('Devis IA (onglet d’Abonnements) : la réponse redessine', journal.rendus >= 1, journal.rendus);
  }
  /* 6 bis. « ↻ Actualiser » DIT qu'il a relu — une liste relue à l'identique ne change rien à l'écran ; l'arrière-plan se tait */
  {
    const { ctx, journal } = bac({ apiGet: () => Promise.resolve({ espaces: [], global: {}, comptes: [] }) });
    ctx.TAB = 'entreprises'; ctx.rafraichirSiConcerne = () => {};
    ctx.chargerConnexions(); ctx.chargerComptesSite(); await dormir(20);
    v('(population) les deux relectures d’arrière-plan réussissent, et se taisent', [ctx.CNX.loaded, ctx.CS.loaded, journal.toasts], [true, true, []]);
    ctx.chargerConnexions(true); ctx.chargerComptesSite(true); await dormir(20);
    v('⛔ appelées par le bouton, elles le disent', journal.toasts.slice().sort(), ['↻ Comptes du site à jour', '↻ Connexions à jour']);
    const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'tour.html'), 'utf8');
    v('   et les deux boutons « ↻ Actualiser » passent `true`', [/onclick="chargerConnexions\(true\)">↻ Actualiser/.test(SRC), /onclick="chargerComptesSite\(true\)">↻ Actualiser/.test(SRC)], [true, true]);
  }
  /* 7. changer de console */
  {
    const { ctx } = bac({ renderTabs() {}, renderNav() {}, render() {}, setTab() {}, majHaut() {}, placerIndic() {}, tiroirRafraichir() {}, majCompteursApp() {}, barreRepeindre() {}, renderBarreBas() {}, lireBarre() {}, chargerEtatMessages() {}, chargerEntreprises() {}, chargerPourFiltre() {}, incOuvertsTous: () => [] });
    ctx.INC.f.ent = 't-x'; ctx.INC.sel = 'i9';
    try { ctx.setFiltre('messages', true); } catch (e) {}
    v('⛔ changer de source affichée oublie le filtre d’entreprise et l’incident ouvert', [ctx.INC.f.ent, ctx.INC.sel], ['', null]);
    try { ctx.btChoisirApp('gestion'); } catch (e) {}
    v('⛔ choisir l’autre application pour un accès bêta oublie le mot de passe tiré pour la première', [ctx.BT.pass, ctx.BT.login], ['', '']);
    ctx.BT.pass = 'garde'; try { ctx.btChoisirApp('gestion'); } catch (e) {}
    v('…mais re-choisir la même ne vide rien', ctx.BT.pass, 'garde');
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

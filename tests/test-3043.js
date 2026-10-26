/* ⛔ CE QUE CE FICHIER GARDE — L'APPAREIL ET LE SERVICE SE PARLENT SUR LES DÉCISIONS DU 26 OCTOBRE 2026 (famille 4, modèle `test-911`) : les VRAIES fonctions de `server-msg/public/api.js` et
   de `source-serveur.js` contre le VRAI `server-msg/index.js`, à trois personnes.

   Les trois décisions qui passent par le module de données — et que ni le service seul (`test-3040`, `test-3041`) ni la page seule (`test-3042`) ne voient :
     · groupes#2 — la liste dit « Léa a ajouté Hugo », « Hugo a quitté le groupe » : la méta et le nom de la personne visée, venus du service, deviennent la PHRASE du fil (`texteSysteme`) ;
       sans méta (un service d'avant), le libellé générique d'avant ;
     · contacts#1 — `bloque` : la directe d'un contact que J'AI bloqué le dit (liste, conversation ouverte, Infos), jamais chez l'autre ; bloquer et débloquer redisent la conversation ;
     · temps-reel#3 — la frappe porte TOUS ceux qui écrivent, dans l'ordre (`saisie.contacts`) ; le premier reste `contact` (l'ancien contrat) ;
     · groupes#3 — `retire` du flux porte `supprime` jusqu'à l'événement de la source (`{ type: 'retire', supprime: true }`).
   ⛔ Une absence se prouve sur une population : chaque « pas de … » est précédé du contrôle que le même chemin rend bien la chose. */
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);

function monter(svc) {
  const nav = T.navigateur(svc.base);
  const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 6000, delaiRelireMs: 5 });
  const evs = [];
  src.ecouter(e => evs.push(e));
  return { src, evs, nav, async entrer(login, pass) { await src.connexion(login, pass); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
}

(async () => {
  const og = await T.fauxOpGestion({
    ana: { pass: 'pw-ana-12345', nom: 'Ana Test', actif: true }, ben: { pass: 'pw-ben-12345', nom: 'Ben Test', actif: true }, cleo: { pass: 'pw-cleo-1234', nom: 'Cleo Test', actif: true },
  });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 400, presenceGraceMs: 300 } });
  const A = monter(svc), B = monter(svc), C = monter(svc);
  const lienSrc = async (x, y) => { const l = await x.src.lienContact(); return y.src.accepterLien(l.code); };
  try {
    const ma = await A.entrer('ana', 'pw-ana-12345'), mb = await B.entrer('ben', 'pw-ben-12345'), mc = await C.entrer('cleo', 'pw-cleo-1234');
    await lienSrc(A, B); await lienSrc(A, C);
    await att(() => A.src.contacts().length === 2);

    /* ═══ 1. LA LIGNE SYSTÈME DE LA LISTE EST UNE PHRASE ══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('La liste dit « Ana Test a ajouté Cleo Test », pas « Activité du groupe »');
    const g = await A.src.creerGroupe({ nom: 'Équipe', membres: [mb.id] });
    const G = g.id;
    {
      await B.src.lister();
      const lb = (await B.src.lister()).find(c => c.id === G);
      v('population : Ben voit le groupe, et sa dernière ligne est la création', [!!lb, lb && lb.apercu], [true, 'Ana Test a créé le groupe']);
      const la = (await A.src.lister()).find(c => c.id === G);
      v('… et chez Ana, qui l\'a créé : « Vous avez créé le groupe »', la.apercu, 'Vous avez créé le groupe');
      await A.src.ajouterMembres(G, [mc.id]);
      await att(async () => ((await B.src.lister()).find(c => c.id === G) || {}).apercu === 'Ana Test a ajouté Cleo Test');
      const lb2 = (await B.src.lister()).find(c => c.id === G);
      v('⛔ Ana ajoute Cleo : la liste de Ben dit « Ana Test a ajouté Cleo Test »', lb2.apercu, 'Ana Test a ajouté Cleo Test');
      const lc = (await C.src.lister()).find(c => c.id === G);
      v('… et Cleo, qui est ajoutée, lit « Ana Test vous a ajouté »', lc.apercu, 'Ana Test vous a ajouté');
      await C.src.quitter(G);
      await att(async () => ((await B.src.lister()).find(c => c.id === G) || {}).apercu === 'Cleo Test a quitté le groupe');
      v('⛔ Cleo quitte : « Cleo Test a quitté le groupe » (elle est nommée alors qu\'elle n\'est plus membre)', ((await B.src.lister()).find(c => c.id === G)).apercu, 'Cleo Test a quitté le groupe');
      vrai('… et la liste ne dit PLUS « Activité du groupe » nulle part', !(await B.src.lister()).some(c => /Activité du/.test(c.apercu)));
    }

    /* ═══ 2. BLOQUER ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nBloquer : la directe le dit chez moi seule ; bloquer et débloquer redisent la conversation');
    {
      const conv = await A.src.conversationPour([mb.id]).then(c => c.id);
      await A.src.envoyer(conv, { texte: 'bonjour' });
      await att(async () => (await B.src.lister()).some(c => c.id === conv));
      const avantA = (await A.src.lister()).find(c => c.id === conv), avantB = (await B.src.lister()).find(c => c.id === conv);
      v('population : la directe est dans les deux listes, sans blocage', [!!avantA, !!avantB, avantA.bloque, avantB.bloque], [true, true, false, false]);
      A.evs.length = 0;
      await A.src.bloquer(mb.id);
      v('⛔ chez Ana : `bloque` dans la liste', (await A.src.lister()).find(c => c.id === conv).bloque, true);
      v('⛔ … dans la conversation OUVERTE', (await A.src.ouvrir(conv)).bloque, true);
      v('⛔ … et dans les Infos (« Débloquer ce contact » au lieu de « Bloquer »)', (await A.src.infos(conv)).bloque, true);
      vrai('⛔ la conversation est REDITE à la page (événement `conversation`), sans attendre autre chose', A.evs.some(e => e.type === 'conversation' && e.id === conv));
      await B.src.lister();
      v('⛔ chez Ben : `bloque` reste FAUX partout (liste, conversation, Infos) — il ne sait rien', [(await B.src.lister()).find(c => c.id === conv).bloque, (await B.src.ouvrir(conv)).bloque, (await B.src.infos(conv)).bloque], [false, false, false]);
      await A.src.debloquer(mb.id);
      v('⛔ débloquer : `bloque` retombe (liste, conversation, Infos)', [(await A.src.lister()).find(c => c.id === conv).bloque, (await A.src.ouvrir(conv)).bloque, (await A.src.infos(conv)).bloque], [false, false, false]);
    }

    /* ═══ 3. « … ÉCRIT » : TOUS CEUX QUI ÉCRIVENT ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa frappe porte tous ceux qui écrivent, dans l\'ordre');
    {
      const G2 = (await A.src.creerGroupe({ nom: 'Frappe', membres: [mb.id, mc.id] })).id;
      await A.src.ouvrir(G2);
      const v0 = (await A.src.ouvrir(G2)).saisie;
      v('population : personne n\'écrit encore', v0, null);
      await B.src.saisie(G2, true);
      await att(async () => (await A.src.ouvrir(G2)).saisie !== null);
      const un = (await A.src.ouvrir(G2)).saisie;
      v('Ben écrit : `contact` est Ben, `contacts` aussi', [un.contact === mb.id, un.contacts], [true, [mb.id]]);
      await C.src.saisie(G2, true);
      await att(async () => ((await A.src.ouvrir(G2)).saisie || { contacts: [] }).contacts.length === 2);
      const deux = (await A.src.ouvrir(G2)).saisie;
      v('⛔ Cleo écrit aussi : les DEUX, dans l\'ordre où ils ont commencé ; le premier reste `contact` (l\'ancien contrat)', [deux.contacts, deux.contact === mb.id], [[mb.id, mc.id], true]);
      v('Ben ne se voit jamais écrire lui-même', ((await B.src.ouvrir(G2)).saisie || { contacts: [] }).contacts.includes(mb.id), false);
    }

    /* ═══ 4. UN CANAL SUPPRIMÉ ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn canal supprimé : l\'événement de la source porte `supprime`');
    {
      const ah = await T.connecter(svc, og, 'ana', 'pw-ana-12345'), bh = await T.connecter(svc, og, 'ben', 'pw-ben-12345');
      const E = (await ah.post('/api/espaces', { nom: 'Boîte' })).j.espace.id;
      await bh.post('/api/invitations/accepter', { code: (await ah.post('/api/espaces/' + E + '/invitations', {})).j.code });
      const pub = (await ah.post('/api/espaces/' + E + '/canaux', { nom: 'general' })).j.canal;
      await B.src.lister();
      B.evs.length = 0;
      await att(async () => (await B.src.lister()).some(c => c.id === pub.id));
      vrai('population : Ben a le canal dans sa liste', (await B.src.lister()).some(c => c.id === pub.id));
      await B.src.ouvrir(pub.id);
      v('Ana supprime le canal', (await ah.post('/api/espaces/' + E + '/canaux/' + pub.id + '/supprimer', { confirmation: 'SUPPRIMER' })).code, 200);
      const ev = await att(() => B.evs.find(e => e.type === 'retire' && e.id === pub.id));
      vrai('⛔ la source dit `retire` pour ce canal…', !!ev);
      v('⛔ … avec `supprime: true`', ev && ev.supprime, true);
    }
  } catch (e) {
    vrai('le banc a tourné sans exception', false);
    console.log(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    for (const x of [A, B, C]) { try { x.src.arreter && x.src.arreter(); } catch (e) { /* déjà arrêtée */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();

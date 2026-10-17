/* ⛔ CE QUE CE FICHIER GARDE — UNE PERSONNE A UNE COULEUR, ET DES INITIALES QUI SONT DES LETTRES (lot m10 de la revue d'OP MESSAGES, 17 octobre 2026).

   La VRAIE `server-msg/public/source-serveur.js` (le module que la page appelle) contre le VRAI service, lancé isolé, à plusieurs personnes.

   · COULEUR : la liste des messages colorait une conversation DIRECTE d'après l'identifiant de la CONVERSATION (`indexAvatar(c.id)`), alors que Contacts, Appels, la fiche, la feuille
     Infos et l'écran d'appel colorent d'après l'identifiant de la PERSONNE. Mesuré par le testeur : la même personne en violet dans Messages, en vert dans Appels (5 passes sur 6).
     Une personne = une couleur dans toute l'application. Les groupes, les canaux, les réunions gardent la couleur de leur conversation (ils n'ont pas de personne).
     Les DEUX chemins qui bâtissent le résumé le disent : `resume()` (la liste, et l'en-tête quand la liste connaît la conversation) et le repli d'`ouvrir()` (une conversation que la liste
     n'a pas encore : un lien, une notification) — la base y est construite avec la couleur de la conversation, puis complétée pour `autre` sans recalculer.
   · INITIALES : `initialesDe` prenait le premier CARACTÈRE du premier et du dernier mot, sans regarder ce que c'était : « Ana (Pro) » devenait « A( », un nom collé avec une balise « A< »,
     « 👷 Léo Roux » « 👷R ». Des lettres seulement (`\p{L}`), un mot sans lettre ne compte pas, un nom sans lettre du tout se replie sur « ? ».
   Toute attente est au GESTE, jamais au chronomètre. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur, initialesDe } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
/* La formule de couleur, recopiée UNIQUEMENT pour la population (prouver que l'identifiant de la conversation et celui de la personne donnent des couleurs différentes) : les contrôles
   eux-mêmes comparent ce que le MODULE rend à ce que le MODULE rend ailleurs. */
const indice = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 6007; return h % 6; };

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

(async () => {
  console.log('Les initiales : des lettres, jamais une parenthèse, un chevron ou un émoji coupé');
  {
    const CAS = [
      ['Ana Martin', 'AM'], ['Ana', 'AN'], ['  jean   de la  Fontaine ', 'JF'], ['Éloïse Çelik', 'ÉÇ'], ['Ana (Pro)', 'AP'], ['(Pro)', 'PR'], ['👷 Léo Roux', 'LR'], ['👷R', 'R'],
      ['Ana <b>x</b>', 'AB'], ['Ana Martin <b>x</b>', 'AB'], ['"Ben" Durand', 'BD'], ['---', '?'], ['👷', '?'], ['', '?'], [null, '?'], ['Анна Петрова', 'АП'], ['李 小龍', '李小'],
    ];
    for (const [nom, att_] of CAS) v('initialesDe(' + JSON.stringify(nom) + ')', initialesDe(nom), att_);
    vrai('population : aucune initiale du tableau n\'est une ponctuation, un chevron ni un émoji', CAS.every(([n]) => /^[\p{L}?]+$/u.test(initialesDe(n))));
  }

  const NOMS = { alice: 'Alice Banc', bruno: 'Bruno Banc', chloe: 'Chloé Banc', dora: 'Dora Banc', eve: 'Eve Banc', fred: 'Fred Banc', gina: 'Gina Banc' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345678']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
  function monter(listeVide) {
    const nav = T.navigateur(svc.base);
    /* `listeVide` : la LISTE des conversations revient vide (l'appareil ne la connaît pas encore) — c'est le chemin de repli d'`ouvrir()`, celui d'une conversation ouverte par son adresse
       (un lien, une notification) avant que la liste l'ait vue */
    const f = async (url, init) => (listeVide && /\/api\/conversations$/.test(String(url).split('?')[0]) && !(init && init.method && init.method !== 'GET'))
      ? new Response(JSON.stringify({ conversations: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) : nav.fetch(url, init);
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    src.ecouter(() => {}); sources.push(src);
    return { src, async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
  }

  try {
    const A = monter(), autres = {};
    const alice = await A.entrer('alice');
    for (const k of ['bruno', 'chloe', 'dora', 'eve', 'fred', 'gina']) {
      autres[k] = monter();
      const m = await autres[k].entrer(k);
      const l = await A.src.lienContact();
      const r = await autres[k].src.accepterLien(l.code);
      autres[k].id = m.id; autres[k].conv = r.conv;
      await A.src.envoyer(r.conv, { texte: 'Bonjour ' + k });   // une conversation sans message n'est pas dans la liste
    }
    await att(() => A.src.contacts().length === 6);

    console.log('\nLa couleur : une personne, une couleur — la liste, les contacts, les Infos et l\'en-tête s\'accordent');
    const liste = await A.src.lister(true);
    vrai('population : six conversations directes dans la liste d\'Alice', liste.filter(c => c.type === 'direct').length === 6);
    const pers = Object.values(autres);
    vrai('population : pour au moins une personne, la couleur de la CONVERSATION n\'est pas celle de la PERSONNE (sinon le contrôle ne prouverait rien)', pers.some(p => indice(p.conv) !== indice(p.id)));
    vrai('⛔ population : chaque ligne de la liste porte TOUS ses champs (une ligne coupée par un commentaire au milieu de l\'objet les perdait en silence : epingle, archive, supprime…)',
      liste.every(c => ['photo', 'epingle', 'archive', 'supprime', 'theme', 'membres', 'admins', 'nonLu', 'cote', 'espace', 'reunion'].every(k => k in c)));
    const contacts = A.src.contacts();
    for (const k of Object.keys(autres)) {
      const p = autres[k], r = liste.find(c => c.id === p.conv), ct = contacts.find(c => c.id === p.id), inf = await A.src.infos(p.conv), ou = await A.src.ouvrir(p.conv);
      v(k + ' : la ligne de la liste, la fiche Contacts, la feuille Infos et l\'en-tête portent la MÊME couleur', [r.avatar, ou.avatar, inf.avatar], [ct.avatar, ct.avatar, ct.avatar]);
    }

    console.log('\nLe repli d\'ouvrir() : une conversation que la liste n\'a pas encore porte aussi la couleur de la personne');
    {
      const B = monter(true); await B.entrer('alice');
      const p = autres.bruno, ct = contacts.find(c => c.id === p.id);
      vrai('population : la liste de cet appareil est vide (le repli sera bien celui qui répond)', (await B.src.lister(true)).length === 0);
      const ou = await B.src.ouvrir(p.conv);    // la liste ne connaît pas la conversation : le repli
      v('Alice sur un appareil neuf ouvre sa conversation avec Bruno par son adresse : couleur de Bruno, pas de la conversation', [ou.autre === p.id, ou.avatar], [true, ct.avatar]);
      for (const k of ['chloe', 'dora', 'eve']) { const o = await B.src.ouvrir(autres[k].conv); v(k + ' (repli) : la même couleur que sa fiche Contacts', o.avatar, contacts.find(c => c.id === autres[k].id).avatar); }
    }

    console.log('\nUn groupe garde la couleur de sa conversation (il n\'a pas de personne)');
    {
      const g = await A.src.creerGroupe({ nom: 'Équipe banc', membres: [autres.bruno.id, autres.chloe.id] });
      const l2 = (await A.src.lister(true)).find(c => c.id === g.id), inf = await A.src.infos(g.id);
      v('la liste et les Infos d\'un groupe : la couleur de l\'identifiant de la conversation', [l2.avatar, inf.avatar], [indice(g.id), indice(g.id)]);
    }

    console.log('\nLes initiales de bout en bout : un nom à parenthèse ne signe pas « A( »');
    {
      await autres.bruno.src.majProfil({ prenom: 'Ana', nom: '(Pro)' });
      await autres.chloe.src.majProfil({ prenom: '👷 Léo', nom: 'Roux' });
      const F = monter(); await F.entrer('alice');
      const l = await att(async () => { const x = await F.src.lister(true); const b = x.find(c => c.id === autres.bruno.conv), c = x.find(c => c.id === autres.chloe.conv); return b && c && b.nom === 'Ana (Pro)' && c.nom === '👷 Léo Roux' ? x : null; });
      vrai('population : Alice voit les deux noms réglés', !!l);
      if (l) {
        v('la liste : « Ana (Pro) » → « AP », « 👷 Léo Roux » → « LR »', [l.find(c => c.id === autres.bruno.conv).initiales, l.find(c => c.id === autres.chloe.conv).initiales], ['AP', 'LR']);
        v('les Contacts : les mêmes', [F.src.contacts().find(c => c.id === autres.bruno.id).initiales, F.src.contacts().find(c => c.id === autres.chloe.id).initiales], ['AP', 'LR']);
        v('l\'en-tête (ouvrir) et la feuille Infos : les mêmes', [(await F.src.ouvrir(autres.bruno.conv)).initiales, (await F.src.infos(autres.chloe.conv)).initiales], ['AP', 'LR']);
      }
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    try { await svc.arreter(); } catch (e) { /* idem */ }
    try { await og.arreter(); } catch (e) { /* idem */ }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

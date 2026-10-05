/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT, POUR LE « + » (« NOUVELLE DISCUSSION ») (famille 4 ; modèles `test-990`, `test-994`).

   `tests/test-857.js` § 4 bis exécute la VRAIE fonction `ndModele` de la page sur des contacts ÉCRITS PAR LE BANC. Ils ont la forme que la page croit : c'est exactement le piège de ce dépôt (CLAUDE.md, « la couture la plus
   dangereuse ») — la page lit `c.autre` pour trouver l'interlocuteur d'une conversation à deux, `c.role` pour le statut, `type === 'direct'`, et ne montre un contact que si le service le lui a rendu. Ici c'est le VRAI
   `server-msg/public/source-serveur.js` (le module que la page appelle) qui parle au VRAI service, et la VRAIE `ndModele` — extraite du script SERVI (`server-msg/public/opmsg-ui.js`, pas de l'aperçu) — se nourrit
   de ce qu'il rend :
     · LE CONTRAT : `contacts()`, `lister()`, `conversationPour()` et les capacités que la page lit existent, et les quatre actions de la carte se déduisent des VRAIES capacités du service ;
     · LE STATUT : ce que la page écrit sous le nom d'un contact (`role`) est son statut — ou « En ligne » —, jamais un champ que le service n'envoie pas ;
     · « CONTACTS FRÉQUENTS » : la conversation à deux porte `autre` (l'identifiant du contact), les plus récents d'abord, quatre au plus, jamais un groupe ; un contact BLOQUÉ n'est ni listé ni fréquent ; débloqué, il revient ;
     · A–Z : « Émile » avec les E, un nom en balisage reste du TEXTE (l'échappement est le travail de l'écran, gardé par test-857) ;
     · TOUCHER UN CONTACT : `conversationPour([id])` ouvre (ou crée) LA conversation à deux — la même que celle de la liste, jamais un doublon —, un inconnu est refusé avec sa phrase, deux personnes disent « bientôt » ;
       la conversation neuve devient aussitôt le premier des « fréquents » ;
     · LE SERVICE EST CELUI DE LA PAGE SERVIE : la fonction extraite de l'aperçu et celle du fichier servi sont la même (le générateur n'a rien changé).
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque zéro est précédé de ce qu'il aurait pu compter (contacts listés, conversations à deux). Toute attente est au GESTE. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

/* ── la fonction RÉELLE de la page : extraite du script SERVI, et de l'aperçu (la même) ── */
const sansCommentairesJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function extraire(src) {
  const i = src.indexOf('const ND_ACTIONS = ['), f = src.indexOf('function rendreNouvelle()');
  const caps = /const CAP = Object\.assign\((\{[^\n]*\}), source\.capacites \|\| \{\}\);/.exec(src);
  const norme = (src.match(/const norme = [^\n]+/) || [''])[0];
  return { corps: i > 0 && f > i ? src.slice(i, f) : '', caps: caps ? caps[1] : null, norme };
}
const SERVI = sansCommentairesJs(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
const APERCU = (() => { const h = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8'); return sansCommentairesJs((/<script>([\s\S]*?)<\/script>/.exec(h) || [, ''])[1]); })();
const X = extraire(SERVI), XA = extraire(APERCU);
function faireND(capacitesService) {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext('const source = { capacites: ' + JSON.stringify(capacitesService || {}) + ' };\nconst CAP = Object.assign(' + X.caps + ', source.capacites || {});\n' + X.norme + '\n' + X.corps + '\nthis.ndModele = ndModele; this.CAP = CAP;', ctx, { timeout: 3000 });
  return ctx;
}

(async () => {
  const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', emile: 'Émile Garnier', karim: 'Karim Benali', zoe: 'Zoé Vidal', eve: '<img src=x onerror=alert(1)>Eve' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  let A = null;
  try {
    console.log('\nLa fonction de la page : celle du fichier SERVI est celle de l\'aperçu');
    vrai('(population) ' + X.corps.length + ' caractères de la fonction trouvés dans le script servi, ' + XA.corps.length + ' dans l\'aperçu, les capacités par défaut lues', X.corps.length > 1500 && XA.corps.length > 1500 && !!X.caps && !!X.norme);
    vrai('⛔ le générateur n\'a RIEN changé à la feuille « Nouvelle discussion » : le texte de la fonction, de la table des actions et des capacités par défaut est identique', X.corps === XA.corps && X.caps === XA.caps && X.norme === XA.norme);

    /* ── le monde : Alice, six contacts (dont un nom en balisage), des statuts, des conversations ── */
    const P = {}; for (const l of Object.keys(NOMS)) if (l !== 'alice') P[l] = await T.connecter(svc, og, l, MDP[l]);
    await P.bruno.post('/api/moi/maj', { statut: 'Sur un chantier à Lyon' });
    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion('alice', MDP.alice); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    A = src;
    const ids = {}; for (const l of Object.keys(P)) ids[l] = P[l].moi.id;
    const convs = {};
    for (const l of ['bruno', 'chloe', 'emile', 'karim', 'zoe', 'eve']) {
      const lien = await P[l].post('/api/contacts/lien', {});
      if (lien.code !== 201) throw new Error('lien de contact refusé (' + lien.code + ') pour ' + l);
      const r = await A.accepterLien(lien.j.code);
      convs[l] = r.conv;
    }

    console.log('\nLe contrat : ce que la page appelle existe, et les capacités disent les quatre actions');
    v('les méthodes que la feuille « Nouvelle discussion » appelle (contacts, lister, conversationPour, ouvrirDirecte) existent dans le module de données', ['contacts', 'lister', 'conversationPour', 'ouvrirDirecte', 'bloquer', 'debloquer'].map(m => typeof A[m]), Array(6).fill('function'));
    const caps = A.capacites || {};
    const ctx = faireND(caps);
    const actions = (cap) => faireND(cap).ndModele([], [], '').actions.map(a => a[1]);
    v('avec les VRAIES capacités du service, la carte porte les quatre actions, dans l\'ordre (liens, appels, réunions : le service les tient toutes)', [caps.liens, caps.reunions, ctx.CAP.appels, actions(caps)], [true, true, true, ['Nouveau groupe', 'Nouveau contact', 'Nouvel appel', 'Programmer une réunion']]);
    v('un service qui n\'annonce AUCUNE capacité (l\'aperçu) ne montre que ce que la page tient seule : Nouveau groupe et Nouvel appel', actions({}), ['Nouveau groupe', 'Nouvel appel']);

    console.log('\nLes contacts : ce que le service rend, tel que la page le lit');
    const contacts = A.contacts();
    vrai('(population) ' + contacts.length + ' contacts rendus par le service', contacts.length === 6);
    const bruno = contacts.find(c => c.id === ids.bruno);
    v('un contact porte `id`, `nom` et `role` : le STATUT quand il en a un (le champ que la page écrit sous le nom), jamais un champ inventé', [bruno && bruno.nom, bruno && bruno.role, contacts.every(c => typeof c.id === 'string' && typeof c.nom === 'string' && typeof c.role === 'string')], ['Bruno Petit', 'Sur un chantier à Lyon', true]);
    const M0 = ctx.ndModele(contacts, [], '');
    v('A–Z sur les VRAIS contacts : « Émile » avec les E, « Zoé » en dernier, le nom en balisage rangé à part (« # »)', M0.groupes.map(g => g.lettre + ':' + g.contacts.map(c => c.nom).join('+')), ['B:Bruno Petit', 'C:Chloé Durand', 'E:Émile Garnier', 'K:Karim Benali', 'Z:Zoé Vidal', '#:<img src=x onerror=alert(1)>Eve']);
    v('l\'index ne porte que les lettres qui existent', M0.lettres, ['B', 'C', 'E', 'K', 'Z', '#']);

    console.log('\n« Contacts fréquents » : la conversation à deux du service porte `autre`');
    for (const l of ['emile', 'karim', 'zoe', 'bruno']) { const m = await A.envoyer(convs[l], { texte: 'Bonjour ' + NOMS[l] }); if (!m) throw new Error('envoi refusé'); await T.dort(1100); }
    const liste = await A.lister(true);
    const directes = liste.filter(c => c.type === 'direct');
    vrai('(population) ' + directes.length + ' conversations à deux dans la liste du service, chacune avec `autre` = l\'identifiant d\'un contact', directes.length === 6 && directes.every(c => contacts.some(k => k.id === c.autre)));
    v('⛔ la page lit `autre` : quatre fréquents au plus, les plus récents d\'abord (Bruno écrit en dernier, Chloé et Eve — sans message — n\'y sont pas)', ctx.ndModele(contacts, liste, '').frequents.map(c => c.nom), ['Bruno Petit', 'Zoé Vidal', 'Karim Benali', 'Émile Garnier']);
    const g = await A.creerGroupe({ nom: 'Chantier Lyon', membres: [ids.chloe, ids.eve] });
    const liste2 = await A.lister(true);
    vrai('un GROUPE (et son premier membre) n\'est jamais un « fréquent » — population : la liste contient bien le groupe', liste2.some(c => c.id === g.id && c.type === 'groupe') && ctx.ndModele(contacts, liste2, '').frequents.every(c => c.id !== ids.chloe && c.id !== ids.eve));
    await A.bloquer(ids.karim);
    const apresBlocage = A.contacts();
    vrai('un contact BLOQUÉ n\'est plus rendu par le service : ni dans A–Z ni dans les fréquents de la page (population : sa conversation à deux est toujours dans la liste)',
      !apresBlocage.some(c => c.id === ids.karim) && (await A.lister(true)).some(c => c.type === 'direct' && c.autre === ids.karim)
      && !ctx.ndModele(apresBlocage, await A.lister(true), '').groupes.some(x => x.contacts.some(c => c.id === ids.karim)) && !ctx.ndModele(apresBlocage, await A.lister(true), '').frequents.some(c => c.id === ids.karim));
    await A.debloquer(ids.karim);
    vrai('débloqué, il revient (A–Z et fréquents)', A.contacts().some(c => c.id === ids.karim) && ctx.ndModele(A.contacts(), await A.lister(true), '').frequents.some(c => c.id === ids.karim));
    v('la recherche de la page sur les vrais contacts : « EMILE » trouve « Émile Garnier » (accent, casse), « ch » trouve Chloé', [ctx.ndModele(A.contacts(), liste2, 'EMILE').groupes.flatMap(x => x.contacts.map(c => c.nom)), ctx.ndModele(A.contacts(), liste2, 'ch').groupes.flatMap(x => x.contacts.map(c => c.nom))], [['Émile Garnier'], ['Chloé Durand']]);

    console.log('\nToucher un contact : `conversationPour([id])` ouvre (ou crée) la conversation à deux');
    const avant = (await A.lister(true)).filter(c => c.type === 'direct').length;
    const r = await A.conversationPour([ids.chloe]);
    v('« Chloé » : la conversation qui existe déjà (celle de l\'acceptation du lien), pas un doublon — population : ' + avant + ' conversations à deux avant', [r.id, r.type, r.autre, (await A.lister(true)).filter(c => c.type === 'direct').length], [convs.chloe, 'direct', ids.chloe, avant]);
    const r2 = await A.conversationPour([ids.chloe]);
    vrai('le même toucher deux fois rend la MÊME conversation', r2.id === r.id);
    const eInconnu = await attrape(A.conversationPour(['p_' + '0'.repeat(32)]));
    vrai('une personne qui n\'est pas un contact est refusée AVEC sa phrase française (la page la dit : « La conversation n\'a pas pu être ouverte. » n\'est que le repli)', !!eInconnu && eInconnu.dit === true && typeof eInconnu.phrase === 'function' && eInconnu.phrase().length > 5, eInconnu && eInconnu.message);
    const eDeux = await attrape(A.conversationPour([ids.chloe, ids.zoe]));
    vrai('deux personnes : le service dit « bientôt » (les groupes se créent par « Nouveau groupe »), la page ne plante pas', !!eDeux && eDeux.code === 'bientot');
    await T.dort(1100);
    await A.envoyer(r.id, { texte: 'Salut Chloé' });
    v('après un message à Chloé, elle devient le PREMIER des « fréquents » (la liste se rafraîchit)', ctx.ndModele(A.contacts(), await A.lister(true), '').frequents.map(c => c.nom)[0], 'Chloé Durand');
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    try { if (A && A.arreter) A.arreter(); } catch (e) { /* déjà arrêté */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();

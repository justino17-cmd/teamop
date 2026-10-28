/* ⛔ CE QUE CE FICHIER GARDE — LA RACINE D'UN MESSAGE DE JUSTIN (28 octobre 2026, Justin : « La limite de messages par heure, c'est pas normal. Je t'ai dit que je veux des agents qui soient autonomes de A à Z »).
   Les VRAIS `agents.js` et `conversations.js` (et le reste de l'établi `banc-autonomie.js`) ; seul l'appel à Anthropic est un faux. Ici on joue le MODULE des conversations : ce que `parler` accepte, ce que
   `peutParler` annonce AVANT de payer, et ce qu'une racine donne ou ne donne pas. Les chaînes complètes (réveils, @tous, ping-pong) sont jouées par test-3114 à test-3122, le vrai serveur par test-3123.
     · une racine NAÎT d'un message de Justin et d'aucun autre chemin : son identifiant, jamais une valeur du corps de la requête ; celle d'un agent, d'un message périmé (2 h) ou inventée n'est pas reconnue ;
     · avec une racine valide, une réponse à Justin n'est JAMAIS refusée après 12 messages d'agent dans l'heure ni après 20 dans le fil ; sans racine valide, les plafonds d'avant tiennent (population prouvée) ;
     · le budget de la racine : 20 messages d'agents (40 si Justin cite six agents ou @tous), 6 par agent (8 pour Victor), 4 dollars ; au-delà, `racine_close` / `racine_agent` ;
     · `peutParler` rend les MÊMES refus que `parler` et n'écrit RIEN ;
     · soixante racines par heure : le jeton du pont volé n'en fabrique pas plus ;
     · les dollars d'une racine se retrouvent au registre après un redémarrage.
   Modules joués : server/conversations.js. */
'use strict';
const fs = require('fs'), path = require('path');
const { monter, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();

console.log('\n── 3113 · la racine d\'un message de Justin ──');
(async () => {
  const CV = require(S('conversations.js'));
  /* `sansReveil` : le module se joue seul, sans cerveau ni cascade (les réveils sont ceux de test-3114 et suivants). Noah est à l'arrêt, pour la ligne « à l'arrêt ». */
  const neuf = () => monter({ mode: 'brouillon', modes: { noah: 'arret' }, sansReveil: true });
  const J = (H, texte) => H.conv.justinEcrit('noah', texte || 'Un message de Justin').message.id;
  const sans = (H, de, n, o) => { const r = []; for (let i = 1; i <= n; i++) r.push(H.conv.parler(de, 'equipe', 'Message ' + de + ' numéro ' + i + (o && o.marque ? ' ' + o.marque : ''), o && o.racine ? { racine: o.racine } : {}).ok); return r; };

  console.log('\n1. Une racine naît d\'un message de Justin, et d\'aucun autre chemin');
  {
    const H = neuf();
    const id1 = J(H);
    const reg = H.registre();
    v('le message de Justin porte pour racine SON PROPRE identifiant', reg.find(m => m.id === id1).racine, id1);
    const r = H.conv.racine(id1);
    vrai('la racine est reconnue (population : 0 message d\'agent encore, âge < 1 s)', r && r.id === id1 && r.messages === 0 && r.age < 1000 && r.usd === 0, JSON.stringify(r));
    v('⛔ un identifiant inventé n\'est pas une racine', [H.conv.racine('deadbeef0000'), H.conv.racine(''), H.conv.racine(null), H.conv.racine({}), H.conv.racine('../etc/passwd')], [null, null, null, null, null]);
    const agent = H.conv.parler('lea', 'equipe', 'Je suis un message d\'agent').id;
    v('⛔ le message d\'un AGENT n\'est jamais une racine (même s\'il porte la sienne)', H.conv.racine(agent), null);
    /* la route : la racine n'est lue QUE dans le message lui-même — un champ `racine` du corps est ignoré */
    await H.post('/api/monitor/conversations/envoyer', { fil: 'noah', texte: 'Je triche', racine: id1, vaste: true });
    const dernier = H.registre().filter(m => m.de === 'justin').pop();
    v('⛔ un champ « racine » dans le corps de la requête est IGNORÉ : le message est sa propre racine, et rien d\'autre', [dernier.racine === dernier.id, dernier.racine === id1, dernier.vaste === true], [true, false, false]);
    const sys = H.conv.systeme('equipe', 'Une ligne du système', {}).id;
    v('⛔ une ligne du système n\'est pas une racine non plus', H.conv.racine(sys), null);
    H.avance(2 * 3600 * 1000 - 1000);
    vrai('à 1 h 59 min 59 s, la racine vit encore', H.conv.racine(id1) !== null);
    H.avance(2000);
    v('⛔ passé deux heures, plus de racine : le message retombe dans le régime d\'avant', H.conv.racine(id1), null);
    H.nettoyer();
  }

  console.log('\n2. Avec une racine valide, une réponse à Justin n\'est jamais refusée par les plafonds horaires');
  {
    const H = neuf();
    const id = J(H, 'Point de la journée ?');
    const douze = sans(H, 'lea', 12);
    v('(population) Léa a déjà écrit douze messages SANS racine dans l\'heure', douze.filter(Boolean).length, 12);
    v('sans racine, le treizième est refusé (le plafond d\'avant tient)', H.conv.parler('lea', 'equipe', 'Treizième sans racine').raison, 'trop_de_messages');
    const avec = H.conv.parler('lea', 'equipe', 'Treizième AVEC la racine', { racine: id });
    vrai('⛔ avec la racine de Justin, le même agent parle (douze messages dans l\'heure ne le bloquent plus)', avec.ok && avec.racine === id, JSON.stringify(avec));
    vrai('…et le message porte la racine au registre', H.registre().find(m => m.id === avec.id).racine === id);
    /* le plafond du FIL : vingt messages d'agents dans l'heure, tous sans racine */
    const H2 = neuf();
    const id2 = J(H2, 'Un point ?');
    let n = 0;
    for (const a of ['max', 'jules', 'theo', 'nina', 'ines']) for (let i = 1; i <= 4; i++) if (H2.conv.parler(a, 'equipe', a + ' dit ' + i).ok) n++;
    v('(population) vingt messages d\'agents dans le fil « Équipe »', n, 20);
    v('sans racine : le vingt-et-unième est refusé (plafond du fil)', H2.conv.parler('camille', 'equipe', 'Vingt-et-unième').raison, 'trop_de_messages_fil');
    vrai('⛔ avec la racine de Justin : il passe', H2.conv.parler('camille', 'equipe', 'Vingt-et-unième avec racine', { racine: id2 }).ok);
    /* …et dans l'autre sens : ce qu'un agent dit SOUS une racine ne lui est pas compté quand il parle de lui-même (le point du matin de Victor, l'alerte de Max) */
    const H3 = neuf();
    const rA = J(H3, 'Première question'), rB = J(H3, 'Seconde question');
    for (let i = 1; i <= 6; i++) { H3.conv.parler('lea', 'equipe', 'Léa sous A ' + i, { racine: rA }); H3.conv.parler('lea', 'equipe', 'Léa sous B ' + i, { racine: rB }); }
    v('(population) douze messages de Léa sous deux racines', H3.registre().filter(m => m.de === 'lea' && m.racine).length, 12);
    v('⛔ ce que Léa dit sous une racine ne remplit pas SON plafond horaire : un message spontané passe', H3.conv.parler('lea', 'equipe', 'Un message spontané de Léa').ok, true);
    for (const a of ['max', 'jules', 'theo']) for (let i = 1; i <= 6; i++) H3.conv.parler(a, 'equipe', a + ' sous A ' + i, { racine: rA });
    v('…ni celui du FIL : dix-huit messages d\'autres agents sous racine, et un agent sans racine parle encore', H3.conv.parler('nina', 'equipe', 'Nina, spontanément').ok, true);
    H.nettoyer(); H2.nettoyer(); H3.nettoyer();
  }

  console.log('\n3. Une racine forgée, périmée ou d\'agent ne donne rien');
  {
    const H = neuf();
    const id = J(H);
    const agent = H.conv.parler('max', 'equipe', 'Un message de Max').id;
    const sysId = H.conv.systeme('equipe', 'Ligne', {}).id;
    sans(H, 'lea', 12);
    const essais = { inventee: 'deadbeef0000', 'd\'agent': agent, 'du système': sysId, 'mal formée': '$(rm -rf)', 'numérique': 12345 };
    const r = Object.entries(essais).map(([k, rac]) => [k, H.conv.parler('lea', 'equipe', 'Essai ' + k, { racine: rac }).raison]);
    v('⛔ aucune de ces racines n\'ouvre les plafonds horaires de Léa (douze messages déjà dits)', r, Object.keys(essais).map(k => [k, 'trop_de_messages']));
    H.avance(2 * 3600 * 1000 + 1000);
    /* l'heure a passé aussi : les plafonds horaires sont libres ; on reprend un compte */
    sans(H, 'lea', 12, { marque: 'plus tard' });
    v('⛔ une racine PÉRIMÉE (plus de deux heures) ne donne rien non plus', H.conv.parler('lea', 'equipe', 'Avec une vieille racine', { racine: id }).raison, 'trop_de_messages');
    H.nettoyer();
  }

  console.log('\n4. `peutParler` annonce les mêmes refus que `parler`, et n\'écrit RIEN');
  {
    const H = neuf();
    const id = J(H);
    const avant = H.registre().length;
    v('un agent libre : ok', H.conv.peutParler('lea', 'equipe', {}), { ok: true });
    sans(H, 'lea', 12);
    const n0 = H.registre().length;
    v('douze messages sans racine : « trop_de_messages », comme `parler`', [H.conv.peutParler('lea', 'equipe', {}).raison, H.conv.parler('lea', 'equipe', 'Un autre').raison], ['trop_de_messages', 'trop_de_messages']);
    v('avec la racine : ok', H.conv.peutParler('lea', 'equipe', { racine: id }), { ok: true });
    v('un fil qui n\'est pas à lui : « fil » (le fil privé d\'un collègue)', H.conv.peutParler('lea', 'camille', {}).raison, 'fil');
    v('un agent à l\'arrêt : « arret »', H.conv.peutParler('noah', 'equipe', {}).raison, 'arret');
    v('un inconnu : « inconnu »', H.conv.peutParler('pierre', 'equipe', {}).raison, 'inconnu');
    sans(H, 'max', 1, { racine: id });
    H.conv.parler('max', 'equipe', 'Un deuxième de Max, avec racine', { racine: id });
    v('le doublon se voit si on donne le texte', H.conv.peutParler('max', 'equipe', { texte: 'Un deuxième de Max, avec racine' }).raison, 'doublon');
    v('…et ne se voit pas sans lui (on ne l\'a pas encore)', H.conv.peutParler('max', 'equipe', {}).ok, true);
    vrai('⛔ `peutParler` n\'a écrit AUCUN message (même registre qu\'avant la série d\'appels)', H.registre().length === n0 + 2 && n0 >= avant, [n0, H.registre().length].join('/'));
    const n1 = H.registre().length; for (let i = 0; i < 20; i++) H.conv.peutParler('lea', 'equipe', { racine: id, texte: 'Texte ' + i });
    v('vingt appels de plus : le registre ne bouge pas', H.registre().length, n1);
    H.nettoyer();
  }

  console.log('\n5. Le budget de la racine : 20 messages (40 si @tous), 6 par agent (8 pour Victor), 4 dollars');
  {
    const H = neuf();
    const id = J(H, 'Un échange normal');
    const R = () => H.conv.racine(id);
    const ecrits = [];
    for (const a of ['lea', 'max', 'jules']) for (let i = 1; i <= 6; i++) ecrits.push(H.conv.parler(a, 'equipe', a + ' ' + i, { racine: id }).ok);
    for (let i = 1; i <= 2; i++) ecrits.push(H.conv.parler('theo', 'equipe', 'theo ' + i, { racine: id }).ok);
    v('(population) vingt messages d\'agents sous la racine', [ecrits.filter(Boolean).length, R().messages], [20, 20]);
    v('⛔ le vingt-et-unième (un autre agent, qui n\'a rien dit) : « racine_close »', H.conv.parler('nina', 'equipe', 'Le vingt-et-unième', { racine: id }).raison, 'racine_close');
    v('…et `peutParler` le dit avant de payer, avec le nombre de messages', (() => { const p = H.conv.peutParler('nina', 'equipe', { racine: id }); return [p.raison, p.racine && p.racine.messages]; })(), ['racine_close', 20]);
    v('un message d\'agent SANS racine reste soumis à ses plafonds, pas à ceux de la racine', H.conv.parler('nina', 'equipe', 'Sans racine').ok, true);
    v('(population) une annonce de fin de travail ne compte pas dans la racine', (() => { H.conv.annoncerFait('nina', '✅ Je viens de finir.', { cle: 'fait:test:1' }); return R().messages; })(), 20);

    /* par agent : six, puis « racine_agent » */
    const H2 = neuf();
    const id2 = J(H2);
    const six = []; for (let i = 1; i <= 6; i++) six.push(H2.conv.parler('lea', 'equipe', 'Léa dit ' + i, { racine: id2 }).ok);
    v('six messages d\'un agent sous la racine, le septième : « racine_agent »', [six.filter(Boolean).length, H2.conv.parler('lea', 'equipe', 'Léa dit 7', { racine: id2 }).raison], [6, 'racine_agent']);
    v('…un autre agent parle encore', H2.conv.parler('max', 'equipe', 'Max dit 1', { racine: id2 }).ok, true);

    /* Victor, le chef : huit */
    const H3 = neuf();
    const id3 = J(H3);
    const huit = []; for (let i = 1; i <= 8; i++) huit.push(H3.conv.parler('victor', 'equipe', 'Victor dit ' + i, { racine: id3 }).ok);
    v('Victor : huit messages sous la racine, le neuvième : « racine_agent »', [huit.filter(Boolean).length, H3.conv.parler('victor', 'equipe', 'Victor dit 9', { racine: id3 }).raison], [8, 'racine_agent']);

    /* @tous : quarante */
    const H4 = neuf();
    const ida = H4.conv.justinEcrit('equipe', 'Normal sans citer').message.id;
    v('(population) un message qui ne cite personne n\'est pas « vaste »', H4.conv.racine(ida).vaste, false);
    const idb = H4.conv.justinEcrit('equipe', '@tous un point de la journée').message.id;
    const idc = H4.conv.justinEcrit('equipe', '@lea @max @jules @theo @nina @ines vous avez cinq minutes ?').message.id;
    const idd = H4.conv.justinEcrit('equipe', '@lea @max @jules @theo @nina qui peut regarder ça ?').message.id;
    v('« @tous » et six agents cités : racine vaste ; cinq cités : non', [H4.conv.racine(idb).vaste, H4.conv.racine(idc).vaste, H4.conv.racine(idd).vaste], [true, true, false]);
    const quarante = [];
    for (const a of ['lea', 'max', 'jules', 'theo', 'nina', 'ines', 'chloe']) for (let i = 1; i <= 6; i++) quarante.push(H4.conv.parler(a, 'equipe', a + ' répond ' + i, { racine: idb }).ok);
    v('sous une racine vaste : quarante messages passent, le quarante-et-unième est refusé', [quarante.filter(Boolean).length, H4.conv.racine(idb).messages, quarante[40]], [40, 40, false]);
    v('…et la racine d\'à côté (20) n\'est pas entamée', H4.conv.racine(idd).messages, 0);

    /* les dollars */
    const H5 = neuf();
    const id5 = J(H5);
    v('une racine inconnue ne compte aucune dépense', [H5.conv.racineDepense('deadbeef0000', 1), H5.conv.racineDepense(id5, -1), H5.conv.racineDepense(id5, NaN), H5.conv.racineDepense(id5, 0)], [false, false, false, false]);
    v('3,90 $ dépensés : on parle encore', [H5.conv.racineDepense(id5, 3.9), H5.conv.racine(id5).usd, H5.conv.parler('lea', 'equipe', 'Encore un', { racine: id5, cout: 0.01 }).ok], [true, 3.9, true]);
    v('⛔ 4 $ atteints : « racine_close » AVANT l\'appel (peutParler) et à l\'écriture (parler)', (() => { H5.conv.racineDepense(id5, 0.2); return [H5.conv.peutParler('max', 'equipe', { racine: id5 }).raison, H5.conv.parler('max', 'equipe', 'Trop cher', { racine: id5 }).raison]; })(), ['racine_close', 'racine_close']);
    v('…et un message de Justin à côté ouvre un NOUVEAU budget', (() => { const n = J(H5, 'Une autre question'); return [H5.conv.racine(n).usd, H5.conv.parler('max', 'equipe', 'Nouveau budget', { racine: n }).ok]; })(), [0, true]);
    /* après un redémarrage : les dollars se retrouvent par ce que les messages ont coûté */
    const H6 = neuf();
    const id6 = J(H6);
    H6.conv.parler('lea', 'equipe', 'Réponse un', { racine: id6, cout: 1.5 }); H6.conv.parler('max', 'equipe', 'Réponse deux', { racine: id6, cout: 2.75 });
    const app2 = { get() {}, post() {}, use() {} };
    const conv2 = CV(app2, { DATA_DIR: H6.D, monAdmin() {}, monPatronStrict() {}, agents: H6.agents, maintenant: () => H6.horloge.t });
    v('après un redémarrage (une seconde instance sur le même registre), les dollars de la racine sont ceux des messages', [conv2.racine(id6).usd, conv2.racine(id6).messages], [4.25, 2]);
    v('…et la racine est déjà close (4,25 $ ≥ 4 $)', conv2.peutParler('theo', 'equipe', { racine: id6 }).raison, 'racine_close');
    [H, H2, H3, H4, H5, H6].forEach(h => h.nettoyer());
  }

  console.log('\n6. Soixante racines par heure : un jeton du pont volé n\'en fabrique pas plus');
  {
    const H = neuf();
    const ids = []; for (let i = 1; i <= 61; i++) ids.push(H.conv.justinEcrit('noah', 'Message ' + i).message.id);
    const reg = H.registre().filter(m => m.de === 'justin');
    v('(population) soixante-et-un messages de Justin écrits', reg.length, 61);
    v('les soixante premiers sont des racines, le soixante-et-unième est écrit mais n\'en est pas une', [reg.slice(0, 60).every(m => m.racine === m.id), reg[60].racine, H.conv.racine(ids[60])], [true, undefined, null]);
    v('⛔ ses réponses retombent donc dans le régime d\'avant : douze messages, pas un de plus', (() => { sans(H, 'lea', 12); return H.conv.parler('lea', 'equipe', 'Un de trop', { racine: ids[60] }).raison; })(), 'trop_de_messages');
    H.avance(3600 * 1000 + 1000);
    v('une heure plus tard, la naissance est de nouveau permise', (() => { const n = H.conv.justinEcrit('noah', 'Une heure après').message.id; return H.conv.racine(n) !== null; })(), true);
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });

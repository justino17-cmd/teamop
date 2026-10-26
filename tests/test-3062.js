/* 3062 — L'EXAMEN DU 26 OCTOBRE 2026 (17 h 36), SCÉNARIO 9 « TON » : « le juge n'a pas rendu de verdict lisible (illisible) » sur trois critères, conversation vide (0 appel, 1 s).
   Ce que la lecture a établi (examen.js) :
     · « 0 appel, conversation vide » est NORMAL pour ce scénario : il ne fait parler aucun agent, il fait juger par Inès (l'équipe du juge, à part) ce que les huit autres ont écrit ;
     · le juge a bien été appelé et a bien répondu (`illisible` n'est dit que d'une réponse reçue) — vite, d'où la seconde ;
     · la CAUSE la plus probable est une numérotation à trous : le 25 octobre au soir (`2e8e2ea1`), le critère c3 (« les agents tutoient Justin ») a quitté le juge pour le code, et le
       scénario a demandé « c1, c2 et c4 ». Un modèle qui lit « c1, c2, c4 » CORRIGE la suite en c1, c2, c3 — et un verdict sans `c4` est illisible par construction. C'est le premier
       examen DEPUIS ce retrait qui a vu l'échec. (Non prouvé : la réponse brute n'était pas gardée — elle l'est désormais.)
   Corrigé à la racine, pour qu'aucun scénario n'ait à y penser : `juger` numérote TOUJOURS c1…cN sans trou et rend les clés de l'appelant ; une réponse illisible est redemandée UNE
   fois ; un verdict qui reste illisible DIT le début de la réponse du juge (adresses retirées) ; un objet qui ne nomme aucun critère (« {formules} » dans une phrase d'avant) n'est
   plus pris pour un verdict incomplet. Ce banc joue le VRAI `juger`, le VRAI `lireVerdict` et le VRAI `sc9`. */
'use strict';
const path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 60000).unref();

(async () => {
  const EX = require(path.join(RACINE, 'server', 'examen.js'));
  const sc9 = EX.SCENARIOS.find(s => s.cle === 'ton');

  /* un juge scripté : chaque appel note le message reçu, la réponse est choisie par `suite(n, message)` (une chaîne, ou { ok:false, raison }) */
  const juge = suite => { const recus = []; return { recus, penser: async (id, system, msgs) => { const m = msgs[msgs.length - 1].content; recus.push(m); const r = suite(recus.length, m); return typeof r === 'string' ? { ok: true, texte: r } : r; } }; };
  const critere = (cle, texte) => ({ cle, libelle: cle, texte });
  const trou = [critere('c1', 'un'), critere('c2', 'deux'), critere('c4', 'quatre')];   // la numérotation d'avant le 26 octobre : c3 avait quitté le scénario

  console.log('\n1. Le juge voit TOUJOURS c1…cN sans trou — la cause probable de l’examen du 26 octobre');
  {
    /* le pire modèle : il ne lit pas les clés, il répond c1, c2, c3 (ce que fait un modèle qui « corrige » une suite à trou) */
    const J = juge(() => '{"c1":true,"c2":false,"c3":true,"raison":"c2 : formules répétées ; c3 : un courriel est sec"}');
    const j = await EX.juger(J, trou, 'donnée');
    vrai('(population) le juge est appelé UNE fois et répond', J.recus.length === 1);
    v('⛔ des critères c1, c2, c4 (à trou) : le juge lit « c1, c2, c3 », répond en c1, c2, c3 — et c’est LU, aux clés de l’appelant', [j.ok, j.valeurs], [true, { c1: true, c2: false, c4: true }]);
    v('⛔ …la raison est remise aux clés de l’appelant (« c3 » du juge = « c4 » de l’appelant), pour que `raisonDe` retrouve la sienne', j.raison, 'c2 : formules répétées ; c4 : un courriel est sec');
    vrai('⛔ le message du juge ne porte JAMAIS de trou : c1, c2, c3 — pas de c4', /^c1 : un$/m.test(J.recus[0]) && /^c2 : deux$/m.test(J.recus[0]) && /^c3 : quatre$/m.test(J.recus[0]) && !/^c4 :/m.test(J.recus[0]), J.recus[0]);
    v('   les clés ordinaires (c1, c2) : rien ne change', (await EX.juger(juge(() => '{"c1":true,"c2":false,"raison":"c2 : non"}'), [critere('c1', 'a'), critere('c2', 'b')], 'x')).valeurs, { c1: true, c2: false });
    const sans = await EX.juger(juge(() => '{"c1":true,"c2":true,"c3":true,"raison":"ok"}'), [critere('c7', 'a'), critere('c9', 'b'), critere('c4', 'c')], 'x');
    v('   n’importe quelles clés d’appelant : le juge répond dans l’ordre, les clés reviennent à l’appelant', sans.valeurs, { c7: true, c9: true, c4: true });
  }

  console.log('\n2. Une réponse illisible est redemandée UNE fois — et dit ce qu’elle était');
  {
    const BONNE = '{"c1":true,"c2":true,"c3":true,"raison":"rien"}';
    let J = juge(n => n === 1 ? 'Je ne peux pas évaluer ces textes sans plus de contexte.' : BONNE);
    let j = await EX.juger(J, trou, 'donnée');
    v('⛔ première réponse hors forme, seconde lisible : lu, en DEUX appels', [j.ok, J.recus.length], [true, 2]);
    vrai('⛔ …la redemande est à NEUF (le même message, plus le rappel de la forme) : la première réponse n’y est pas rejouée', J.recus[1].startsWith(J.recus[0]) && /EXACTEMENT les clés demandées/.test(J.recus[1]) && !/Je ne peux pas évaluer/.test(J.recus[1]), J.recus[1].slice(-300));
    J = juge(() => 'Voici mon avis, écrit à marie.durand@client.test : les messages sont naturels, mais le troisième critère est difficile à juger car ' + 'x'.repeat(400));
    j = await EX.juger(J, trou, 'donnée');
    vrai('⛔ deux réponses illisibles : ok:false, DEUX appels et pas trois', j.ok === false && J.recus.length === 2, JSON.stringify(j).slice(0, 200));
    vrai('⛔ …et la cause DIT le début de la réponse du juge (de quoi savoir s’il refuse, bavarde ou numérote autrement)', /^illisible : « Voici mon avis/.test(j.cause), j.cause);
    vrai('…adresse retirée, extrait borné', !/marie\.durand|client\.test/.test(j.cause) && j.cause.length < 220, j.cause);
    J = juge(n => n === 1 ? { ok: false, raison: 'vide' } : BONNE);
    j = await EX.juger(J, trou, 'donnée');
    v('⛔ une réponse VIDE (panne passagère de Claude) est aussi redemandée une fois', [j.ok, J.recus.length], [true, 2]);
    J = juge(() => ({ ok: false, raison: 'plafond_total' }));
    j = await EX.juger(J, trou, 'donnée');
    v('⛔ le plafond de l’examen n’est PAS redemandé (rien ne passera) : un appel, la cause dite', [j.ok, j.cause, J.recus.length], [false, 'plafond_total', 1]);
    J = juge(() => ({ ok: false, raison: 'erreur_api' }));
    j = await EX.juger(J, trou, 'donnée');
    v('   une erreur d’API deux fois de suite : ok:false, cause « erreur_api », deux appels', [j.ok, j.cause, J.recus.length], [false, 'erreur_api', 2]);
    v('   pas de juge du tout : « pas de juge »', await EX.juger(null, trou, 'x'), { ok: false, cause: 'pas de juge' });
  }

  console.log('\n3. Un objet qui ne nomme aucun critère n’est pas un verdict incomplet');
  {
    const L = EX.lireVerdict, c = ['c1', 'c2', 'c3'], bon = '{"c1":true,"c2":false,"c3":true,"raison":"c2 : sec"}';
    v('⛔ une phrase d’avant avec des accolades (« les {formules} se répètent ») puis la ligne JSON : lu', L('Les {formules} se répètent. ' + bon, c).valeurs, { c1: true, c2: false, c3: true });
    v('   …un objet quelconque après : lu aussi', L(bon + ' {"note":"fin"}', c).valeurs, { c1: true, c2: false, c3: true });
    v('⛔ un objet qui nomme AU MOINS un critère doit les porter tous : incomplet, avec un bon à côté → illisible (rien ne se devine)', [L(bon + ' {"c1":false,"raison":"x"}', c), L('{"c1":true} {"c2":false}', c)], [null, null]);
    v('   rien que des objets sans critère : illisible', [L('Les {formules} se répètent.', c), L('{"raison":"ok"}', c), L('{"verdict":"tout valider"}', c)], [null, null, null]);
    v('   un critère manquant dans l’unique objet : illisible (inchangé)', L('{"c1":true,"c2":true,"raison":"x"}', c), null);
    v('   une valeur qui n’est pas un booléen : illisible (inchangé)', L('{"c1":"true","c2":true,"c3":true}', c), null);
  }

  console.log('\n4. Le VRAI scénario 9, avec un juge qui répond en suite c1…cN');
  {
    const LIBELLES = ['ton humain : des collègues qui parlent, pas un robot', 'sans formule toute faite', 'les courriels aux clients vouvoient et sonnent professionnels'];
    const jouer = async suite => {
      const E = { capa: () => true, techniques: () => 0 };
      const mails = [{ de: 'lea', texte: 'Bonjour,\n\nNous vous remercions pour votre inscription. Votre entreprise nous intéresse.' }, { de: 'camille', texte: 'Bonjour,\n\nVous pouvez nous écrire.' }, { de: 'camille', texte: 'Bonjour,\n\nVotre demande est prise.' }];
      const messages = Array.from({ length: 9 }, (_, k) => ({ de: 'lea', a: 'clients', texte: 'Côté prospects, la question ' + k + ' marche mieux posée simplement.' })).concat([{ de: 'margaux', a: 'margaux', texte: 'Pour DOS-900001, le paiement est bien marqué payé. Si tu as besoin du détail, je te le sors.' }]);
      const J = juge(suite);
      const r = await sc9.jouer(E, { partage: { messages, mails }, juge: J });
      return { r, J };
    };
    const { r, J } = await jouer(() => '{"c1":true,"c2":true,"c3":true,"raison":"conforme"}');
    const jug = r.filter(x => LIBELLES.includes(x.libelle));
    v('(population) trois critères du juge dans le scénario', jug.length, 3);
    v('⛔ les trois critères du juge sont ✓ (avant : « le juge n’a pas rendu de verdict lisible »)', jug.map(x => x.etat), ['ok', 'ok', 'ok']);
    vrai('le juge a reçu c1, c2, c3 sans trou', /^c1 : /m.test(J.recus[0]) && /^c2 : /m.test(J.recus[0]) && /^c3 : /m.test(J.recus[0]) && !/^c4 : /m.test(J.recus[0]));
    const mauvais = await jouer(() => 'Je ne peux pas répondre.');
    const m = mauvais.r.filter(x => LIBELLES.includes(x.libelle));
    v('⛔ un juge qui n’a jamais de verdict lisible : « inconnu » (jamais ✗, l’équipe n’y est pour rien), et le détail dit CE QU’IL A RÉPONDU', m.map(x => x.etat), ['inconnu', 'inconnu', 'inconnu']);
    vrai('…le détail donne le début de la réponse', m.every(x => /illisible : « Je ne peux pas répondre\. »/.test(x.detail)), m[0] && m[0].detail);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

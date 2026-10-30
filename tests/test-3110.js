/* test-3110 — Chauffage : l'ATTESTATION DE RAMONAGE (24 octobre 2026 ; ex-« certificat », renommée le 28 octobre : le texte, art. R. 1331-23, dit « attestation »).
   Depuis le décret n° 2023-641 du 20 juillet 2023, le professionnel remet dans les quinze jours ouvrés une attestation qui atteste la VACUITÉ du conduit sur toute sa
   longueur. Le VRAI bloc CVC (monté par cvc-monter.js) : un appareil à combustion cité sur une intervention TERMINÉE reçoit un certificat
   (`i.ramonages[appareil]`) — conduit et vacuité exigés —, son PDF (la mise en page de l'attestation, genre « ramonage ») porte le titre, le conduit, la méthode,
   le constat de vacuité et la mention du décret, et l'envoi n'écrit sa trace qu'une fois le courriel parti. */
const vm = require('vm');
const { monter, formulaire, cdc, lirePdf } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t); } };
const BASE = { clients: [{ id: 'c1', nom: 'Maison Durand', email: 'durand@exemple.test' }, { id: 'c2', nom: 'Sans Courriel' }],
  appareils: [{ id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval' }, { id: 'a2', clientId: 'c1', type: 'clim_split', marque: 'Daikin', fluide: 'R32' },
    { id: 'a3', clientId: 'c2', type: 'chaudiere_gaz', marque: 'Chaffoteaux' }],
  interventions: [{ id: 'i1', clientId: 'c1', statut: 'terminee', date: '2026-10-22', appareilIds: ['a1', 'a2'] },
    { id: 'i2', clientId: 'c1', statut: 'planifiee', date: '2026-10-30', appareilIds: ['a1'] },
    { id: 'i3', clientId: 'c2', statut: 'terminee', date: '2026-10-21', appareilIds: ['a3'] }], contrats: [] };
const FORM = o => formulaire(Object.assign({ conduits: 'Conduit de la chaudière, tubage inox Ø 130', methode: 'Mécanique par le haut', vacuite: 'oui', etat: 'Bon état', anomalies: '' }, o || {}));
const mk = (f, o) => { const W = monter(Object.assign({ db: cdc(BASE) }, o || {})); W.__form = f || FORM();
  vm.runInContext("document.getElementById=function(id){ return id==='cvc-ram'?__form:null; }", W); return W; };
const ram = (W, iid, aid) => ((W.db.interventions.find(i => i.id === iid) || {}).ramonages || {})[aid];
(async () => {
  { const W = mk();
    vrai('enregistrer écrit le certificat (genre, conduit, vacuité, date, auteur), une ligne d’historique, un save',
      W.cvcRamonageSauver('i1', 'a1') === true && ram(W, 'i1', 'a1').genre === 'ramonage' && ram(W, 'i1', 'a1').vacuite === 'oui' && /tubage inox/.test(ram(W, 'i1', 'a1').conduits)
      && ram(W, 'i1', 'a1').etabliLe === '2026-10-23' && ram(W, 'i1', 'a1').etabliPar === 'Test Admin' && W.__saves === 1 && /Attestation de ramonage établie/.test(W.db.interventions[0].histo.join('|')));
  }
  { const W = mk(FORM({ vacuite: '' }));
    vrai('⛔ sans constat de vacuité : rien n’est enregistré, et l’écran le dit', W.cvcRamonageSauver('i1', 'a1') === false && !ram(W, 'i1', 'a1') && W.__saves === 0 && W.__toasts.some(t => /vacuité/.test(t))); }
  { const W = mk(FORM({ vacuite: 'peut-être' }));
    vrai('   une valeur hors liste ne vaut pas un constat', W.cvcRamonageSauver('i1', 'a1') === false && !ram(W, 'i1', 'a1')); }
  { const W = mk(FORM({ conduits: '  ' }));
    vrai('⛔ sans conduit : rien n’est enregistré, et l’écran le dit', W.cvcRamonageSauver('i1', 'a1') === false && !ram(W, 'i1', 'a1') && W.__toasts.some(t => /conduits ramonés/.test(t))); }
  { const W = mk();
    vrai('⛔ une climatisation n’a pas de certificat de ramonage', W.cvcRamonageSauver('i1', 'a2') === false && !ram(W, 'i1', 'a2'));
    vrai('⛔ une intervention qui n’est pas terminée non plus', W.cvcRamonageSauver('i2', 'a1') === false && !ram(W, 'i2', 'a1'));
    vrai('⛔ un appareil d’un autre client, pas cité, non plus', W.cvcRamonageSauver('i1', 'a3') === false); }
  { const D = mk(null, { droits: { 'int.modifier': false } });
    vrai('⛔ la fonction qui écrit lit elle-même la case « modifier une intervention »', D.cvcRamonageSauver('i1', 'a1') === false && !ram(D, 'i1', 'a1')); }
  { const W = mk(); W.cvcRamonageSauver('i1', 'a1');
    const d = await W.cvcRamonageDocument('i1', 'a1'); const P = lirePdf(d.pdf || ''); const tout = (P.textes || []).map(t => t.u).join(' | ');
    vrai('le PDF est bien formé (structure, une page)', !d.err && P.pb.length === 0 && P.pages >= 1);
    vrai('   son titre : ATTESTATION DE RAMONAGE (le texte légal dit « attestation » ; pas « attestation d’entretien », pas « certificat »)', /ATTESTATION DE RAMONAGE/.test(tout) && !/CERTIFICAT/.test(tout) && !/ATTESTATION D’ENTRETIEN/.test(tout));
    vrai('   le conduit, la méthode et l’état constatés', /tubage inox/.test(tout) && /Mécanique par le haut/.test(tout) && /Bon état/.test(tout));
    vrai('   le constat de vacuité, en toutes lettres', /vide sur toute sa longueur/.test(tout));
    vrai('   la mention du décret n° 2023-641', /2023-641/.test(tout));
    vrai('   l’en-tête de l’entreprise et l’appareil', /Alpha Chauffage/.test(tout) && /Saunier Duval/.test(tout));
    vrai('   le nom du fichier dit ce que c’est', /^Attestation-ramonage-Maison-Durand-2026-10-22\.pdf$/.test(d.nom)); }
  { const W = mk(FORM({ vacuite: 'non', anomalies: 'Bouchon de suie à 4 m' })); W.cvcRamonageSauver('i1', 'a1');
    const tout = lirePdf((await W.cvcRamonageDocument('i1', 'a1')).pdf).textes.map(t => t.u).join(' | ');
    vrai('un conduit NON vide le dit, sans dire le contraire', !/vide sur toute sa longueur\./.test(tout) && /n’est pas vide|n'est pas vide|pas vide/.test(tout) && /Bouchon de suie/.test(tout)); }
  { const W = mk(); await W.cvcRamonageEnvoyer('i1', 'a1'); const m = W.__mails[0] || {};
    vrai('envoyer : un courriel au client, le PDF joint, le sujet dit « Attestation de ramonage »',
      W.__mails.length === 1 && m.to === 'durand@exemple.test' && /^Attestation de ramonage — /.test(m.sub) && m.opts && m.opts.atts && /^Attestation-ramonage-/.test(m.opts.atts[0].filename));
    vrai('   la trace s’écrit une fois parti (date, adresse, historique)', !!ram(W, 'i1', 'a1').envoyeLe && ram(W, 'i1', 'a1').envoyeA === 'durand@exemple.test' && /Attestation de ramonage envoyée/.test(W.db.interventions[0].histo.join('|'))); }
  { const W = mk(); W.__mailOk = false; await W.cvcRamonageEnvoyer('i1', 'a1');
    vrai('⛔ un courriel qui ne part pas n’écrit AUCUNE trace d’envoi', !!ram(W, 'i1', 'a1') && !ram(W, 'i1', 'a1').envoyeLe); }
  { const W = mk(FORM({ vacuite: '' })); await W.cvcRamonageEnvoyer('i1', 'a1');
    vrai('⛔ rien ne part sans constat de vacuité', W.__mails.length === 0); }
  { const W = mk(); await Promise.all([W.cvcRamonageEnvoyer('i1', 'a1'), W.cvcRamonageEnvoyer('i1', 'a1')]);
    vrai('   deux touches rapides : un seul courriel', W.__mails.length === 1); }
  { const W = mk(); await W.cvcRamonageEnvoyer('i3', 'a3');
    vrai('   un client sans adresse : rien ne part, et l’écran le dit', W.__mails.length === 0 && W.__toasts.some(t => /e-mail du client/.test(t))); }
  { const W = mk(); const h = W.cvcIntActions(W.db.interventions[0], [W.db.appareils[0], W.db.appareils[1]]);
    vrai('le bouton « Attestation de ramonage » paraît pour la chaudière, une fois', (h.match(/cvcRamonageForm\('i1','a1'\)/g) || []).length === 1);
    vrai('   et pas pour la climatisation', !/cvcRamonageForm\('i1','a2'\)/.test(h));
    const h2 = W.cvcIntActions(W.db.interventions[1], [W.db.appareils[0]]);
    vrai('   avant la fin de l’intervention, il est grisé', /disabled[^>]*>🧹 Attestation de ramonage/.test(h2) && !/cvcRamonageForm/.test(h2)); }
  console.log(`\ntest-3110 : ${ok} ✓ ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

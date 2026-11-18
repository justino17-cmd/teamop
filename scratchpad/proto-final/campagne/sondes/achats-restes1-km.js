// RECONTRÔLE ADVERSE restes-achats tour 1 (18 novembre 2026) : le tarif au kilomètre refuse « 1.500 » (juste) mais ne doit pas refuser
// ce qu'une entreprise française écrit VRAIMENT : le barème kilométrique fiscal a TROIS décimales (0,603 €/km, 0,631…). On joue une série de saisies réalistes,
// et on regarde ce que devient le tarif, le message, et la ligne de la note de frais kilométrique calculée ensuite.
// Usage : node achats-restes1-km.js [profil=mac]
const { L, ouvrirAchats, toast } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await ouvrirAchats({ profil, qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a), tel = c.largeur < 760;
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 500);
  if (tel) { await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 400); await L.toucher(c, '#calque [data-axa="kmtarif"]'); } else await L.toucher(c, '[data-axa="kmtarif"]');
  await L.calme(p, 400);
  v('K0 population : le champ du tarif existe', await E(() => !!document.getElementById('ax-km')));
  const essai = async (s) => { if (!await E(() => !!document.getElementById('ax-km'))) { await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); if (tel) { await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 300); await L.toucher(c, '#calque [data-axa="kmtarif"]'); } else await L.toucher(c, '[data-axa="kmtarif"]'); await L.calme(p, 300); }
    await p.fill('#ax-km', ''); await p.click('#ax-km'); await p.keyboard.type(s, { delay: 8 }); const av = await E(() => AX.kmTarif);
    await L.toucher(c, '[data-axa="kmok"]'); await L.calme(p, 300); return { s, av, ap: await E(() => AX.kmTarif), t: await toast(p), ouvert: await E(() => !!document.getElementById('ax-km')) }; };
  const R = {};
  for (const s of ['0,603', '0.603', '0,60', '0,5', '1,50', '1.50', '1.5', '0,631', '0,6 €', '0,60 €', '60 c', '12', '101', '0,006']) { R[s] = await essai(s); console.log('  ', JSON.stringify(R[s])); }
  v('K1 « 0,60 » est accepté (le cas ordinaire)', R['0,60'].ap === 0.6, R['0,60']);
  v('K2 « 1.50 » et « 1.5 » : lus 1,50 (un point suivi de 1-2 chiffres est un décimal)', R['1.50'].ap === 1.5 && R['1.5'].ap === 1.5, [R['1.50'], R['1.5']]);
  v('K3 « 0,6 € » : le signe € ne bloque pas', R['0,6 €'].ap === 0.6, R['0,6 €']);
  v('K4 le barème fiscal à trois décimales (« 0,603 ») n’est pas refusé sans solution : accepté, ou un refus qui dit quoi écrire', R['0,603'].ap === 0.603 || /0,60/.test(R['0,603'].t), R['0,603']);
  v('K4b le toast et l’écran disent 0,603 € (pas « 0,60 € » arrondi) ; 0,60 reste « 0,60 € »', /0,603 €/.test(R['0,603'].t) && /0,60 €/.test(R['0,60'].t) && !/0,603/.test(R['0,60'].t), [R['0,603'].t, R['0,60'].t]);
  v('K4c « 0,60 € » et « 0,6 € » (unité écrite) sont lus 0,60', R['0,60 €'].ap === 0.6 && R['0,6 €'].ap === 0.6, [R['0,60 €'], R['0,6 €']]);
  v('K4d « 0,631 » accepté ; « 0,006 » et « 12 » refusés (un tarif au kilomètre entre 0,05 et 10 €), le tarif ne bouge pas', R['0,631'].ap === 0.631 && R['0,006'].ap === R['0,006'].av && R['12'].ap === R['12'].av, [R['0,631'], R['0,006'], R['12']]);
  v('K4e « 1.500 » refusé (ambigu : 1 500 ou 1,5), le tarif ne bouge pas', await (async () => { const r = await essai('1.500'); return r.ap === r.av && r.ouvert; })());
  await essai('0,603'); await L.aller(p, 'achats'); await L.calme(p, 400);
  const lig = await E(() => document.body.innerText);
  v('K4f la ligne de la règle des notes lit « 0,603 € » (Kilomètres… le km)', /Kilomètres\s*:\s*0,603\s€\sle km/.test(lig) || /Kilomètre à\s0,603\s€/.test(lig), lig.match(/Kilom[^\n]{0,80}/g));
  v('K5 « 101 » : refusé, le tarif ne bouge pas', R['101'].ap === R['101'].av, R['101']);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

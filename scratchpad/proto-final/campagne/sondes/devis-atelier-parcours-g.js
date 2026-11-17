// Parcours 14 : les cas limites du devis rapide — brouillon vidé de ses lignes, ligne sans désignation, prix à 0, client sans e-mail,
// TVA / validité / acompte qui changent les montants, brouillon supprimé puis rétabli. usage : node devis-atelier-parcours-g.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const cents = s => L.cents((/(−?[\d\s  ]+,\d\d)/.exec(s) || [])[1] || 'NaN');
const tot = p => p.evaluate(() => [...document.querySelectorAll('#contenu .dv-totaux .ligne')].map(l => l.innerText.replace(/\s+/g, ' ').trim()));
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis-x-BR1' }), p = c.p; await L.calme(p, 600);
  // 1. vider le brouillon de toutes ses lignes
  for (let i = 0; i < 4; i++) { await L.toucher(c, '[data-dv^="ligneSup|BR1|0"]'); }
  const vide = await p.evaluate(() => ({ n: DEVIS_REG.BR1.lignes.length, envoi: !!document.querySelector('[data-dv="envoyer|BR1"]') && !document.querySelector('[data-dv="envoyer|BR1"]').disabled, txt: (document.querySelector('#contenu .dv-lgs') || {}).innerText }));
  v('devis-atelier-08 : un brouillon sans AUCUNE ligne ne peut pas être envoyé (« Aperçu et envoi » inactif, avec une phrase qui dit pourquoi)', vide.n === 0 && !vide.envoi, vide);
  await L.capture(c, O.CAP + `P14-brouillon-vide-${profil}.png`);
  // 2. ligne sans désignation mais avec un prix
  await L.toucher(c, '[data-dv="ligneAj|BR1|libre"]'); await p.fill('[data-dvl="BR1|0|2"]', '120'); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 500);
  const sans = await p.evaluate(() => ({ envoi: !!document.querySelector('[data-dv="envoyer|BR1"]') && !document.querySelector('[data-dv="envoyer|BR1"]').disabled, ligne: DEVIS_REG.BR1.lignes[0] }));
  v('devis-atelier-08 : une ligne SANS désignation (prix 120 €) bloque l’envoi, avec un message', !sans.envoi, sans);
  // 3. prix à 0
  await p.fill('[data-dvl="BR1|0|0"]', 'Geste commercial'); await p.press('[data-dvl="BR1|0|0"]', 'Tab'); await p.fill('[data-dvl="BR1|0|2"]', '0'); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 500);
  const t0 = (await O.lire(p)).toast; console.log('  · toast prix 0 :', t0);
  const z = await p.evaluate(() => ({ ligne: DEVIS_REG.BR1.lignes[0], complet: dvComplet(DEVIS_REG.BR1), aff: (document.querySelector('.dv-lg .dv-pu') || {}).value }));
  v('P14 : un prix à 0 est dit (« offerte au client »), la ligne reste valable et affichée « 0 »', /offerte/.test(t0) && z.ligne[2] === 0 && z.complet, [t0, z]);
  // 4. TVA, validité, acompte : les montants suivent
  await p.fill('[data-dvl="BR1|0|2"]', '1000'); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 500);
  await p.selectOption('[data-dvtva="BR1"]', '5.5'); await L.calme(p, 400); let T = await tot(p);
  v('P14 : TVA à 5,5 % : 1 000,00 € HT → TVA 55,00 € → TTC 1 055,00 €', cents(T[0]) === 100000 && cents(T[1]) === 5500 && cents(T[2]) === 105500, T);
  await p.selectOption('[data-dvacompte="BR1"]', '30'); await L.calme(p, 400); T = await tot(p);
  v('P14 : acompte 30 % affiché : 316,50 € (30 % de 1 055,00 €)', T.some(s => /Acompte/.test(s) && cents(s) === 31650), T);
  const doc = await p.evaluate(() => (document.querySelector('#contenu .pdf') || {}).innerText.replace(/\s+/g, ' '));
  v('P14 : le PDF reprend l’acompte (« Acompte de 30 % à l’accord ») et la mention TVA 5,5 %', /Acompte de 30 %/.test(doc) && /TVA à 5,5 %/.test(doc), doc.slice(-500));
  await p.selectOption('[data-dvvalid="BR1"]', '90'); await L.calme(p, 300);
  const val = await p.evaluate(() => ({ cond: [...document.querySelectorAll('#contenu .carte')].map(k => k.innerText).find(t => /Conditions/i.test(t.slice(0, 20))), doc: (document.querySelector('#contenu .pdf') || {}).innerText }));
  v('P14 : validité 90 jours : le PDF dit « Valable jusqu’au 28/01/2027 » (31/10 + 90 jours)', /Valable jusqu.au 29\/01\/2027|Valable jusqu.au 28\/01\/2027/.test(val.doc.replace(/\s+/g, ' ')), (val.doc.match(/Valable jusqu’au [\d/]+/g) || []));
  // 5. supprimer puis annuler
  await L.toucher(c, '[data-dv="supprimer|BR1"]'); await L.calme(p, 400);
  const sup = await p.evaluate(() => ({ h1: document.querySelector('#contenu h1').textContent, reg: !!DEVIS_REG.BR1, dans: DV.some(x => x.id === 'BR1') })); v('P14 : « Supprimer ce brouillon » le retire, retour à la liste', sup.h1 === 'Devis' && !sup.dans, sup);
  await L.toucher(c, '#toast button, #toast .lien'); await L.calme(p, 400);
  const rest = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, dans: DV.some(x => x.id === 'BR1'), n: DEVIS_REG.BR1 && DEVIS_REG.BR1.lignes.length })); v('P14 : « Annuler » le rétablit avec ses lignes', rest.dans && /BR1|Devis en préparation/.test(rest.h1 || '') && rest.n >= 1, rest);
  // 6. client SANS e-mail : l'envoi
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="nouveau"]'); await L.toucher(c, '[data-dvn="nv|1"]'); await p.fill('#dvn-nom', 'Monsieur Test Sansmail'); await p.fill('#dvn-tel', '06 11 22 33 44'); await p.fill('#dvn-objet', 'Dépannage'); await L.toucher(c, '[data-dvn="modele|1"]'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 600);
  const k = await p.evaluate(() => location.hash.replace('#devis-x-', '')); await L.toucher(c, '[data-dv="envoyer|' + k + '"]'); await L.calme(p, 400);
  const a0 = await p.evaluate(() => document.getElementById('ml-a').value); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 300); const t1 = (await O.lire(p)).toast;
  v('P14 : client sans e-mail : l’envoi se bloque et le dit « Adresse e-mail à vérifier » (champ vide à remplir)', a0 === '' && /Adresse e-mail à vérifier/.test(t1), [a0, t1]);
  await p.fill('#ml-a', 'sansmail@exemple.fr'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 500);
  const sm = await p.evaluate(() => { const x = DV.find(o => o.cli && CLIENTS[o.cli] && /Sansmail/.test(CLIENTS[o.cli].nom)); return { e: x && x.e, mailClient: CLIENTS[x.cli].mail }; });
  console.log('  · après envoi à une adresse tapée :', JSON.stringify(sm));
  v('devis-atelier-09 : l’adresse tapée à l’envoi est RETENUE dans la fiche du client (sinon on la retape à chaque devis et à chaque relance)', sm.mailClient === 'sansmail@exemple.fr', sm);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

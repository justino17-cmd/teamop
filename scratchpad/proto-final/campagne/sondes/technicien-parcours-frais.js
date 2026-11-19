// Parcours « Mes frais » du technicien (campagne du 17 novembre 2026) : note sans ticket, avec ticket, valeur longue, erreurs, double envoi,
// retrouver sa note, puis le gérant la voit-il dans Achats et frais. Usage : node technicien-parcours-frais.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
// Copie du parcours (restes du technicien, tour 1, recontrôle) : « C'est quoi ? » n'est plus pré-rempli, donc le geste qui ENVOIE choisit d'abord une nature (comme le ferait la personne) — sinon
// l'ancien parcours bute sur « Choisis d'abord ce que c'est » et ne joue plus rien de ce qu'il voulait garder (montants refusés, confirmation au-delà de 2 000 €, note sans ticket, double envoi).
const T0 = L.toucher; L.toucher = async (c, sel, o) => { if (/ndfok/.test(sel)) await c.p.evaluate(() => { const e = document.getElementById('rn-o'); if (e && e.value === '') e.selectedIndex = 1; }); return T0(c, sel, o); };
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };   // changer de personne comme le fait l'application : se déconnecter, puis ouvrir la session de l'autre (les données restent en mémoire)
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p;
  const nb = () => p.evaluate(() => NDF.filter(n => n.qui === rlQui()).length);
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  await L.aller(p, 'techfrais');
  v('F0 l’écran « Mes frais » est là et nomme son geste', /Mes frais/.test(await txt(p, '#contenu h1')) && /Nouvelle note de frais/.test(await txt(p)), await txt(p, '#contenu h1'));
  const n0 = await nb(); const liste0 = await txt(p);
  // F1 : ouvrir le formulaire, envoyer vide → le message dit quoi faire, rien n'est créé
  await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300);
  v('F1a le formulaire s’ouvre (titre « Ce que tu as payé de ta poche »)', /Ce que tu as payé/.test(await txt(p, '#calque .panneau h2')), await txt(p, '#calque .panneau h2'));
  const lis = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau label, #calque .panneau .champ')].map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)));
  console.log('   champs du formulaire :', JSON.stringify(lis));
  await L.toucher(c, '[data-rl="ndfok"]'); 
  v('F1b envoi à vide : « Indique le montant » et aucune note créée', /montant/i.test(await toast()) && (await nb()) === n0, await toast());
  await L.capture(c, CAP + `frais-formulaire-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  // F2 : montant absurde / texte
  for (const [val, att] of [['abc', 'refus'], ['-5', 'refus'], ['0', 'refus'], ['2500', 'confirmation'], ['12 345,67', 'confirmation']]) {
    await p.fill('#rn-m', val); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 200);
    const dbl = await p.evaluate(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.textContent.replace(/\s+/g, ' ').trim() : ''; }), t = await toast(), n = await nb();
    if (att === 'refus') v(`F2 montant « ${val} » refusé, rien créé`, n === n0 && /montant/i.test(t), { t, n, n0 });
    else { v(`F2 montant « ${val} » : demande de confirmation avant d’envoyer (au-delà de 2 000 €)`, n === n0 && /c’est bien ça/.test(dbl), { dbl, n }); }
    if (att === 'confirmation') { await p.evaluate(() => { const z = document.getElementById('rn-dbl'); const b = z && z.querySelector('[data-axa="grosnon"]'); if (b) b.click(); }); }
  }
  // F3 : une note SANS ticket, objet précisé très long
  const LONG = 'Péage et parking du centre-ville de La Rochelle devant le Restaurant Le Vieux Port, avant le dépannage de la salle';
  await p.fill('#rn-pr', LONG); await p.fill('#rn-m', '6,50'); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 400);
  v('F3a note sans ticket créée (+1)', (await nb()) === n0 + 1, { n: await nb(), t: await toast() });
  v('F3b le message dit que le bureau demandera le ticket', /sans ticket/i.test(await toast()), await toast());
  v('F3c le formulaire est fermé', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  let page = await txt(p);
  v('F3d elle se retrouve dans « Mes frais » : objet, montant 6,50 €, état « En attente », « sans ticket »', /Péage|Carburant|Repas/.test(page) && /6,50/.test(page) && /En attente/.test(page) && /sans ticket/.test(page), page.slice(0, 400));
  await L.capture(c, CAP + `frais-liste-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  v('F3e aucun glissement latéral de la liste', (await L.deborde(c)).bouge === 0);
  // F4 : double toucher sur « Envoyer »
  await L.toucher(c, '[data-rl="ndf"]'); await p.fill('#rn-m', '18,90');
  const avant = await nb();
  await p.evaluate(() => { const b = document.querySelector('[data-rl="ndfok"]'); const e = document.getElementById('rn-o'); if (e && e.value === '') e.selectedIndex = 1; b.click(); b.click(); }); await L.calme(p, 400);
  v('F4 double toucher sur « Envoyer au bureau » : une seule note (ou la seconde est signalée)', (await nb()) - avant <= 1, { delta: (await nb()) - avant });
  // F5 : avec ticket (photo), carburant, rattachée à une intervention, montant long
  await L.toucher(c, '[data-rl="ndf"]');
  await p.selectOption('#rn-o', { index: 0 }); await p.fill('#rn-m', '12 345,67');
  await p.setInputFiles('#rn-p', { name: 'ticket-station-total-avec-un-nom-de-fichier-vraiment-tres-long-pour-voir.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200);
  const nomPhoto = await txt(p, '#rn-pn');
  v('F5a le nom du ticket choisi est montré dans le formulaire', /ticket/i.test(nomPhoto), nomPhoto);
  await L.capture(c, CAP + `frais-ticket-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  const dep = await L.deborde(c); v('F5b nom de fichier très long : pas de glissement latéral', dep.bouge === 0, dep);
  await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 200);
  await p.evaluate(() => { const b = document.querySelector('#rn-dbl [data-axa="dblautre"]'); if (b) b.click(); }); await L.calme(p, 400);
  page = await txt(p);
  v('F5c la note avec ticket est dans la liste, « voir le ticket » présent', /12 345,67|12345,67/.test(page.replace(/ | /g, ' ')) && /voir le ticket/.test(page), page.slice(0, 500));
  // F6 : « voir le ticket » ouvre bien quelque chose
  const btn = await p.$('[data-cx^="justif|ndf"]');
  if (btn) { await L.toucher(c, '[data-cx^="justif|ndf"]'); await L.calme(p, 400);
    v('F6a « voir le ticket » ouvre le ticket en grand (#cx-vis)', await p.evaluate(() => !!document.getElementById('cx-vis')), await txt(p, 'body').then(t => t.slice(0, 80)));
    await L.capture(c, CAP + `frais-ticket-grand-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
    await p.keyboard.press('Escape'); await L.calme(p, 300);
    v('F6b Échap referme le ticket', !(await p.evaluate(() => !!document.getElementById('cx-vis')))); }
  else v('F6 « voir le ticket » trouvé', false);
  // F7 : modifier une note en attente, puis Annuler / Supprimer avec « Annuler »
  const mod = await p.$('[data-rl^="ndfmod|"]'); 
  if (mod) { await L.toucher(c, '[data-rl^="ndfmod|"]'); await L.calme(p, 300); v('F7a Modifier/Ajouter le ticket ouvre la note', /Modifier ma note|Corriger ma note|ticket/i.test(await txt(p, '#calque .panneau h2')), await txt(p, '#calque .panneau h2'));
    await p.fill('#rm-o', ''); await L.toucher(c, '[data-rl^="ndfmodok"]'); v('F7b objet vide refusé', /Dis ce que c’est/.test(await toast()), await toast());
    await p.fill('#rm-o', 'Carburant corrigé'); await p.fill('#rm-m', 'x'); await L.toucher(c, '[data-rl^="ndfmodok"]'); v('F7c montant illisible refusé', /montant/i.test(await toast()), await toast());
    await L.ranger(p); v('F7d Échap ferme la fenêtre', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  } else v('F7 il y a une note modifiable', false);
  // F8 : le gérant voit-il ces notes dans « Achats et frais » ?
  const total = await nb();
  await devenir(p, 'marc', 'achats');
  await p.evaluate(() => { const b = document.querySelector('[data-ac="onglet|notes"]'); b && b.click(); }); await L.calme(p, 500);   // les notes de frais sont dans le second onglet « Frais » d'Achats et frais
  const achats = await txt(p);
  v('F8a le gérant arrive sur Achats et frais', /Achats et frais|Achats/.test(await txt(p, '#contenu h1')), await txt(p, '#contenu h1'));
  v('F8b la note de 6,50 € de Sophie y est (nom, objet, montant)', /Sophie/.test(achats) && /6,50/.test(achats), achats.slice(0, 300));
  v('F8c la note de 12 345,67 € de Sophie y est, montant entier et lisible', /12[\s  ]?345,67/.test(achats), achats.slice(0, 300));
  await L.capture(c, CAP + `frais-gerant-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

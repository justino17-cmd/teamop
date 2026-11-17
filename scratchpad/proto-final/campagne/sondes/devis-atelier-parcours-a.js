// Parcours 1 à 4 du devis « rapide » : (1) préparer un devis pour un client existant, le chiffrer au centime, l'envoyer ;
// (2) client NEUF (champs vides, doublon, valeurs longues) ; (3) dicter ; (4) accord du client (signature) et ce qui suit.
// usage : node devis-atelier-parcours-a.js [profil]   — « N ✓ · M ✗ », code 1 si un contrôle tombe ; le numéro du défaut est dans le nom du contrôle.
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
// le calcul de la sonde, AU CENTIME : chaque ligne s'arrondit au centime, le HT est leur somme, la TVA s'arrondit sur le HT, le TTC est HT + TVA
const calc = (lignes, tva) => { let ht = 0; lignes.forEach(([q, pu]) => { ht += Math.round(q * pu * 100 + 1e-7); }); const t = Math.round(ht * tva / 100 + 1e-7); return { ht, tva: t, ttc: ht + t }; };
const fiche = p => p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, lignes: [...document.querySelectorAll('#contenu .dv-lgs .dv-lg:not(.dv-lg-t)')].map(l => [...l.querySelectorAll('input')].map(i => i.value).concat(l.querySelector('.dv-tot') ? [l.querySelector('.dv-tot').textContent] : [l.innerText.replace(/\s+/g, ' ')])),
  totaux: [...document.querySelectorAll('#contenu .dv-totaux .ligne')].map(l => l.innerText.replace(/\s+/g, ' ').trim()), etat: ((document.querySelector('#contenu .tete .st') || {}).textContent || '').trim(), alerte: ((document.querySelector('#contenu .bandeau-info') || {}).textContent || '').trim() }));
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const d0 = await O.donnees(p), k0 = await O.kpis(p);
  v('population : 8 devis dans le prototype, 4 chiffres en haut', d0.length === 8 && k0.length === 4, [d0.length, k0.length]);

  // ── P1 : devis rapide, client existant ─────────────────────────────────────────────────────────────────────────
  await L.toucher(c, '[data-dv="nouveau"]'); await L.calme(p, 300);
  let e = await O.lire(p); v('P1 : « Devis rapide » ouvre la fenêtre « Nouveau devis »', /Nouveau devis/.test(e.panneau), e.panneau);
  // champs vides : « Préparer le devis » sans rien
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300);
  let err = await p.evaluate(() => ((document.querySelector('#calque .alerte') || {}).textContent || '').trim()); v('P1 : sans client, le message dit quoi faire (« Choisis le client. »)', /Choisis le client/.test(err), err);
  await p.selectOption('#dvn-cli', 'mr'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300);
  err = await p.evaluate(() => ((document.querySelector('#calque .alerte') || {}).textContent || '').trim()); v('P1 : sans objet, le message dit quoi faire (« Indique l’objet du devis. »)', /Indique l.objet/.test(err), err);
  const sel = await p.evaluate(() => document.getElementById('dvn-cli').value); v('P1 : le client choisi est gardé après le message d’erreur', sel === 'mr', sel);
  await p.fill('#dvn-objet', 'Dépannage de la VMC'); await L.toucher(c, '[data-dvn="modele|1"]');
  const n0 = await p.evaluate(() => DV.length); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 600);
  let f = await fiche(p); const cle = await p.evaluate(() => location.hash.replace('#devis-x-', ''));
  v('P1 : on arrive sur la fiche du brouillon (« Devis en préparation »)', /Devis en préparation/.test(f.h1), f.h1);
  v('P1 : le brouillon est ajouté une seule fois', (await p.evaluate(() => DV.length)) === n0 + 1);
  const mr = await p.evaluate(() => ({ tva: tvaDefautDe('mr'), dep: TARIFS.zone[1] }));
  const att = calc([[1, 65], [1, mr.dep]], mr.tva);
  const txt = f.totaux.join(' | '); const cents = s => L.cents((/(−?[\d\s\u00a0\u202f]+,\d\d)/.exec(s) || [])[1] || 'NaN');
  v('P1 : modèle « Dépannage » : 2 lignes (diagnostic et déplacement)', f.lignes.length === 2, f.lignes);
  v('P1 : total HT, TVA et TTC de la fiche = le calcul de la sonde au centime', cents(f.totaux[0]) === att.ht && cents(f.totaux[1]) === att.tva && cents(f.totaux[2]) === att.ttc, [f.totaux, att]);
  await L.capture(c, O.CAP + `P1-fiche-brouillon-${profil}.png`);
  // saisies : virgule, espace insécable, valeurs longues
  const champ = (n, col) => `[data-dvl="${cle}|${n}|${col}"]`;
  await p.fill(champ(0, 2), '12 345,67'); await p.press(champ(0, 2), 'Tab'); await L.calme(p, 500);
  await p.fill(champ(0, 1), '3,5'); await p.press(champ(0, 1), 'Tab'); await L.calme(p, 500);
  f = await fiche(p); let att2 = calc([[3.5, 12345.67], [1, mr.dep]], mr.tva);
  v('P1 : « 12 345,67 » × « 3,5 » : le total de la ligne et le TTC sont justes au centime', cents(f.totaux[0]) === att2.ht && cents(f.totaux[2]) === att2.ttc, [f.totaux, att2]);
  const lig0 = f.lignes[0]; v('P1 : le champ garde ce qui a été tapé (virgule), la ligne affiche son total', /3,5/.test(lig0[1]) && /12345,67|12 345,67/.test(lig0[2].replace(/ | /g, ' ')) && cents(lig0[3]) === Math.round(3.5 * 12345.67 * 100 + 1e-7), lig0);
  await p.fill(champ(0, 2), 'abc'); await p.press(champ(0, 2), 'Tab'); await L.calme(p, 400);
  let t = (await O.lire(p)).toast; v('P1 : un prix « abc » est refusé AVEC une explication, l’ancien prix reste', /compris|nombre/.test(t) && /12345,67|12 345,67/.test((await fiche(p)).lignes[0][2].replace(/ | /g, ' ')), t);
  await p.fill(champ(0, 1), '0'); await p.press(champ(0, 1), 'Tab'); await L.calme(p, 400); t = (await O.lire(p)).toast; v('P1 : quantité 0 refusée avec explication', /quantité|0/.test(t), t);
  // un prix qui donne des demi-centimes : 3 lignes à 0,5 × 29,17 = 14,585 → arrondi par ligne ?
  await p.fill(champ(0, 2), '29,17'); await p.press(champ(0, 2), 'Tab'); await L.calme(p, 300); await p.fill(champ(0, 1), '0,5'); await p.press(champ(0, 1), 'Tab'); await L.calme(p, 300);
  await p.fill(champ(1, 1), '1,5'); await p.press(champ(1, 1), 'Tab'); await L.calme(p, 300); await p.fill(champ(1, 2), '29,17'); await p.press(champ(1, 2), 'Tab'); await L.calme(p, 300);
  f = await fiche(p); const lignes3 = [[0.5, 29.17], [1.5, 29.17]]; const att3 = calc(lignes3, mr.tva);
  const somLig = f.lignes.reduce((s, l) => s + cents(l[3]), 0);
  v('P1-défaut-01 (centime) : le HT affiché = la somme des totaux de lignes AFFICHÉS (un client qui additionne le devis retombe sur le même HT)', cents(f.totaux[0]) === somLig, [f.totaux[0], f.lignes.map(l => l[3]), somLig, att3]);
  v('P1 (centime) : le TTC affiché = HT affiché + TVA affichée', cents(f.totaux[2]) === cents(f.totaux[0]) + cents(f.totaux[1]), f.totaux);
  const doc = await p.evaluate(() => { const d = document.querySelector('#contenu .pdf'); return d ? [...d.querySelectorAll('tfoot td')].map(x => x.innerText.replace(/\s+/g, ' ')) : null; });
  v('P1 (centime) : le PDF (« Le devis tel que le client le reçoit ») donne les mêmes HT, TVA, TTC que la fiche', doc && cents(doc[1]) === cents(f.totaux[0]) && cents(doc[3]) === cents(f.totaux[1]) && cents(doc[5]) === cents(f.totaux[2]), [doc, f.totaux]);
  const lst = await p.evaluate(() => { const x = DEVIS_REG[location.hash.replace('#devis-x-', '')]; return { ttc: dvTTC(x), ht: dvHT(x) }; });
  v('P1 (centime) : le TTC de la LISTE (dvTTC) = le TTC de la fiche', Math.round(lst.ttc * 100) === cents(f.totaux[2]), [lst, f.totaux]);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

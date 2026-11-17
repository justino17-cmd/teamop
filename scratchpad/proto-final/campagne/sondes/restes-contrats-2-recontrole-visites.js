// RECONTRÔLE tour 2 : la carte « Les visites » d'un contrat EN COURS (pas seulement terminé) avec un nom de lieu très long, sur les profils étroits :
// la règle .ctr-vl s'applique à toutes les lignes (Faite / À planifier / Planifiée). usage : node … <profil> [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-rec2/';
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 12, prix: 12345.67, fact: 'visite', lieu: 'les locaux techniques du sous-sol et la cuisine centrale de l’établissement' });
  v('contrat de 12 visites créé et signé', !!k, k);
  // une visite faite, une planifiée avec technicien, le reste à planifier
  await p.evaluate(id => { const l = INTS.filter(i => i.ctr === id); l[0].st = 'fait'; l[1].st = 'planifiee'; l[1].tech = 'sm'; }, k.id);
  await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 400);
  await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Les visites/.test(x.textContent)); h && h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await L.calme(p, 400);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('.ctr-vl')].map(l => { const a = l.children[0].getBoundingClientRect(), b = l.children[1].getBoundingClientRect(); return { txt: l.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), larg: Math.round(a.width), h: Math.round(a.height), dessous: b.top >= a.bottom - 2 }; }));
  v('population : ' + lignes.length + ' lignes de visite', lignes.length === 12, lignes.length);
  v('chaque ligne garde ≥ 120 px au nom, ou l’étiquette passe dessous', lignes.every(x => x.larg >= 120 || x.dessous), lignes.filter(x => !(x.larg >= 120 || x.dessous)).slice(0, 3));
  v('une visite faite et une planifiée existent dans la carte', lignes.some(x => /Faite/.test(x.txt)) && lignes.some(x => /Planifi/.test(x.txt)), lignes.slice(0, 3));
  const d = await L.deborde(c); v('rien ne déborde du profil (' + c.largeur + ' px)', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
  const dg = await L.doigts(p); v('pas de texte écrasé ni de champ < 16 px', !dg.champs.length && !dg.ecrases.length, { c: dg.champs.slice(0, 2), e: dg.ecrases.slice(0, 2) });
  await L.capture(c, CAP + 'visites-encours-' + tag + '.png');
  v('aucune erreur de la page', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

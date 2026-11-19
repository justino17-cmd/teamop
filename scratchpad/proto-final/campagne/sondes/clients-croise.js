// Campagne « clients » (17 novembre 2026) — LA COHÉRENCE D'UN ÉCRAN À L'AUTRE : les chiffres de la liste contre la Comptabilité, les e-mails de la fiche contre la Boîte mail,
// les devis de la fiche contre la liste des Devis, le prochain passage contre le Planning, une intervention créée contre les Interventions. Usage : PROFIL=… NUIT=1
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', nuit: NUIT }), p = c.p;
  await L.aller(p, 'clients');
  const cartes = await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte')].map(e => ({ k: e.dataset.go.replace('client-x-', ''), nom: e.querySelector('b').textContent, t: [...e.querySelectorAll('.client-chiffres b')].map(b => b.textContent) })));
  const somme = (cartes.reduce((s, x) => s + L.cents(x.t[1]), 0)) / 100;
  // la Comptabilité dit « Reste à encaisser » : la somme des « à recevoir » de la liste doit être la même
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '[data-cmptv]'); await L.calme(p, 1400);
  let cf = null; for (const f of p.frames()) { if (f === p.mainFrame()) continue; const ok = await f.evaluate(() => /Reste à encaisser/.test(document.body.innerText)).catch(() => false); if (ok) cf = f; }
  const reste = cf ? await cf.evaluate(() => { const m = document.body.innerText.replace(/\s+/g, ' ').match(/Reste à encaisser ([\d  ,.]+ ?€)/); return m ? m[1] : null; }) : null;
  console.log('  · Comptabilité : ' + reste + ' · somme des « à recevoir » de la liste : ' + somme);
  v('la somme des « à recevoir » des clients (' + somme + ' €) égale « Reste à encaisser » de la Comptabilité (' + reste + ')', !!reste && L.cents(reste) === Math.round(somme * 100), { somme, reste });
  await L.ranger(p); await p.evaluate(() => { try { aller('accueil'); } catch (e) {} });
  // e-mails de la fiche contre la Boîte mail
  const mails = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').map(k => { const m = (CLIENTS[k].mail || '').toLowerCase(); const brut = MAILS.filter(x => ((x.de && x.de.mail) || '').toLowerCase() === m || (x.a || '').toLowerCase() === m).length; return { k, nom: CLIENTS[k].nom, brut, fiche: MAILS.filter(x => mbxCliDe(x) === k).length }; }));
  console.log('  · e-mails par client (adresse du client en expéditeur ou destinataire / compté par la fiche) : ' + JSON.stringify(mails.map(m => [m.k, m.brut, m.fiche])));
  const ecartM = mails.filter(m => m.brut !== m.fiche); v('« E-mails · N » de chaque fiche compte les e-mails échangés avec l’adresse du client (boîte mail) — écarts : ' + JSON.stringify(ecartM.map(m => [m.k, m.brut, m.fiche])), ecartM.length === 0, ecartM);
  // devis de la fiche contre la liste Devis
  const dv = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').map(k => ({ k, n: (dvSync(), DV).filter(d => d.cli === k).length })));
  let ecartD = []; for (const x of dv) { await L.aller(p, 'client-x-' + x.k); const n = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu .carte')].find(e => /^Devis/.test((e.querySelector('h3') || {}).textContent || '')); return h ? h.querySelectorAll('.lg-pli').length : -1; }); if (n < x.n) ecartD.push({ x, n }); }
  v('la carte « Devis » de chaque fiche montre au moins tous les devis du client (liste Devis)', ecartD.length === 0, ecartD);
  // prochain passage contre le Planning : chaque intervention à venir d'un client est au planning (jour)
  const prochains = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').map(k => { const i = INTS.filter(o => o.cli === k && o.d >= AUJ && !['fait', 'annulee', 'aplanifier'].includes(o.st)).sort((a, b) => a.d.localeCompare(b.d))[0]; return i ? { k, id: i.id, d: i.d, h: i.h, tech: i.tech } : null; }).filter(Boolean));
  v('population : chaque client planifié a un prochain passage (' + prochains.length + ')', prochains.length >= 6, prochains.length);
  const un = prochains[0]; await p.evaluate(x => { plVue = 'jour'; plRef = x.d; aller('planning'); }, un); await L.calme(p, 700);
  const sur = await p.evaluate(x => document.getElementById('contenu').innerText.includes(CLIENTS[x.k].nom), un); v('le prochain passage annoncé par la fiche (' + un.d + ') se retrouve au Planning ce jour-là, au nom du client', sur, un);
  // intervention créée depuis la fiche : elle est aux Interventions et au Planning (« à planifier »)
  await L.aller(p, 'client-x-cp'); await L.toucher(c, '[data-creer="1"]'); await p.evaluate(() => { CREA.titre = 'Contrôle du compresseur'; CREA.titreTouche = true; rendreCreation(); }); await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 600);
  await L.aller(p, 'interventions'); await p.evaluate(() => { try { filtreInt = 'tout'; rendre(); } catch (e) {} }); await L.calme(p, 400); const dansListe = await p.evaluate(() => /Contrôle du compresseur/.test(document.getElementById('contenu').innerText)); v('l’intervention créée depuis la fiche du Camping Les Pins est dans « Interventions »', dansListe);
  await p.evaluate(() => { plVue = 'jour'; plRef = AUJ; aller('planning'); }); await L.calme(p, 500); const dansPlan = await p.evaluate(() => /Contrôle du compresseur/.test(document.getElementById('contenu').innerText)); console.log('  · au Planning (jour courant) : ' + dansPlan);
  // un client créé avec un devis est dans la liste Devis
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvDevis"]'); await p.fill('#dvn-nom', 'Boulangerie du Port'); await L.toucher(c, '[data-dvn="type|pro"]'); await p.fill('#dvn-nom', 'Boulangerie du Port'); await p.fill('#dvn-prenom', 'Anne Ledoux'); await p.fill('#dvn-tel', '05 46 11 22 33'); await p.fill('#dvn-adr', '4 rue du Port, 17000 La Rochelle'); await p.fill('#dvn-objet', 'Installation d’une cassette'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 700);
  await L.aller(p, 'devis'); const dansDevis = await p.evaluate(() => /Boulangerie du Port/.test(document.getElementById('contenu').innerText)); v('un client créé avec un devis voit son devis dans la liste « Devis »', dansDevis);
  await L.aller(p, 'clients'); await p.evaluate(() => { chercheClient = ''; rendre(); }); const dansL = await p.evaluate(() => /Boulangerie du Port/.test(document.getElementById('contenu').innerText)); v('… et le client dans la liste « Clients »', dansL);
  await L.aller(p, 'client-x-' + await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').pop())); const carteD = await p.evaluate(() => document.getElementById('contenu').innerText); v('… et sa fiche porte son devis (« Installation d’une cassette »)', /Installation d’une cassette/.test(carteD));
  // recharger la page : les données reviennent à l'état d'origine (ce n'est pas un défaut : prototype sans serveur) — mais l'écran ne casse pas
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(900); const ok = await p.evaluate(() => !!document.querySelector('#contenu h1')); v('un rechargement ne casse rien (retour sur la page ouverte)', ok);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });

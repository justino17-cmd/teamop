// Recontrôle adverse metier-3d : deux parcours de bout en bout sur TÉLÉPHONE (le rapport ne jouait le relevé de bout en bout que sur Mac).
//   P1  Sophie (iPhone) relève 27,5 m² et l'envoie ; Marc (iPhone, session neuve avec le relevé et sa tâche) le voit « à chiffrer », le chiffre,
//       crée le devis : le total annoncé à la création = le total du devis ouvert ; le devis est dans la liste des Devis ; le relevé n'est plus à chiffrer
//   P2  Marc (iPhone) saisit un passage AVEC produit ; le registre du site, la page « Produits biocides posés » et le document PDF (aperçu) le retrouvent
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const dit = t => console.log('  · ' + t);
const txt = p => p.evaluate(() => (document.getElementById('contenu').innerText || '').replace(/\s+/g, ' ').trim());
const pan = p => p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; });
const ouvrir = async o => { const c = await O.ouvrir(Object.assign({ packs: O.METIERS.d3 }, o)); c.p.on('dialog', d => d.dismiss().catch(() => {})); return c; };
(async () => {
  console.log('— P1');
  const c = await ouvrir({ profil: 'iphone', qui: 'sm' }), p = c.p; await L.aller(p, 'majournee'); await L.calme(p, 600);
  await L.toucher(c, p.locator('#contenu [data-dxb="relever|"]').first()); await L.calme(p, 700);
  const opt = await p.evaluate(() => [...document.querySelector('[data-dxr="cli"]').options].filter(o => o.value)[0].value); await p.selectOption('[data-dxr="cli"]', opt); await L.calme(p, 300);
  await L.toucher(c, p.locator('[data-dxrb^="zadd|"]').first()); await L.calme(p, 300); const zm = p.locator('[data-dxr^="zm|"]').first(); await zm.fill('27,5'); await zm.blur(); await L.calme(p, 400);
  const ins = p.locator('[data-dxrb^="insecte|"]'); dit('insectes proposés au relevé : ' + (await ins.evaluateAll(a => a.map(e => e.textContent.trim()).join(' / '))));
  await L.toucher(c, p.locator('#dx-barre [data-dxrb="envoyer"], #contenu .dx-creer-carte[data-dxrb="envoyer"]').locator('visible=true').first()); await L.calme(p, 900);
  v('P1 Sophie : « Relevé envoyé » à l\'écran', /Relevé envoyé/.test(await txt(p)), (await txt(p)).slice(0, 120));
  const snap = await p.evaluate(() => JSON.stringify({ rel: DX_REL, taches: TACHES.filter(t => /^xyrel-/.test(t.cle || '')), seq: DX_SEQ })); v('P1 : une tâche « Chiffrer le relevé » est partie avec le relevé', JSON.parse(snap).taches.length === 1, snap.slice(0, 200));
  v('P1 Sophie : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c);
  const c2 = await ouvrir({ profil: 'iphone', qui: 'marc' }), p2 = c2.p; await p2.evaluate(s => { const o = JSON.parse(s); DX_REL.length = 0; o.rel.forEach(r => DX_REL.push(r)); o.taches.forEach(t => TACHES.push(t)); DX_SEQ = o.seq; }, snap);
  await L.aller(p2, 'devisXylo'); await L.calme(p2, 800); const t3 = await txt(p2); v('P1 Marc : « 1 relevé à chiffrer »', /1 relevé à chiffrer/i.test(t3), t3.slice(0, 200));
  await L.capture(c2, O.CAP + 'rc-P1-marc-iphone-a-chiffrer.png');
  await L.toucher(c2, p2.locator('#contenu [data-dxb^="rel|"]').first()); await L.calme(p2, 900);
  const zms = await p2.evaluate(() => [...document.querySelectorAll('[data-dx^="zm|"]')].map(e => e.value)); v('P1 Marc : le devis reprend UNE zone de 27,5 m² (et pas la zone d\'exemple en plus)', zms.length === 1 && /27,5/.test(zms[0]), JSON.stringify(zms));
  const ttcCreation = await p2.evaluate(() => { const e = [...document.querySelectorAll('#dx-res > .ligne')].find(x => /Total TTC/.test(x.textContent)); const b = document.querySelector('#dx-barre'); return { res: e ? e.querySelector('b').textContent.trim() : '', barre: b ? b.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : '' }; }); dit('total à la création : ' + JSON.stringify(ttcCreation));
  const nbDevis0 = await p2.evaluate(() => (typeof DEVIS_REG !== 'undefined' ? DEVIS_REG.length : -1));
  const cr = await L.toucher(c2, p2.locator('#dx-res .dx-creer-carte, #dx-barre [data-dxb="creer"]').locator('visible=true').first()); await L.calme(p2, 1000); const h = await p2.evaluate(() => location.hash), t4 = await txt(p2);
  v('P1 Marc : le devis est créé et s\'ouvre', cr && /devis/i.test(h) && !/devisXylo/.test(h), h + ' ¦ ' + t4.slice(0, 120)); dit('devis ouvert : ' + t4.slice(0, 400));
  const montants = t4.match(/\d[\d\s  ]*,\d{2}\s*€/g) || []; dit('montants lus dans le devis ouvert : ' + montants.join(' | '));
  v('P1 Marc : le total annoncé à la création se retrouve dans le devis ouvert', !!ttcCreation.res && t4.replace(/[\s  ]/g, '').includes(ttcCreation.res.replace(/[\s  ]/g, '')), ttcCreation.res + ' dans ' + montants.join(' | '));
  await L.capture(c2, O.CAP + 'rc-P1-marc-iphone-devis-cree.png');
  await p2.evaluate(() => aller('devis')); await L.calme(p2, 700); const tl = await txt(p2); v('P1 Marc : le devis figure dans la liste « Devis » (bois / xylophage / traitement)', /xylophage|bois|capricorne|Traitement/i.test(tl), tl.slice(0, 260));
  await p2.evaluate(() => aller('devisXylo')); await L.calme(p2, 700); v('P1 Marc : plus aucun relevé « à chiffrer »', !/relevés? à chiffrer/.test(await txt(p2)));
  v('P1 Marc : aucune erreur de page', c2.err.length === 0, c2.err.join(' // ')); await L.fin(c2);

  console.log('— P2');
  const c3 = await ouvrir({ profil: 'iphone', qui: 'marc' }), p3 = c3.p; await L.aller(p3, 'registre'); await L.toucher(c3, p3.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p3, 600);
  const avant = await txt(p3); const nbAvant = (avant.match(/Produits biocides posés/g) || []).length;
  await L.toucher(c3, p3.locator('#contenu [data-rg="passage"]').locator('visible=true').first()); await L.calme(p3, 700);
  await p3.selectOption('#rg-appl', 'kb'); await L.calme(p3, 300); await L.toucher(c3, p3.locator('#calque [data-rg="toutok"]').first()); await L.calme(p3, 300);
  const pid = await p3.evaluate(() => [...document.querySelector('#calque [data-rgf="pid"]').options].filter(o => o.value && !o.disabled).map(o => o.value)[0]); await p3.selectOption('#calque [data-rgf="pid"]', pid); await L.calme(p3, 300);
  const nomProd = await p3.evaluate(id => D3_PROD[id].nom, pid); await p3.locator('#calque [data-rgf="q"]').first().fill('150'); await p3.locator('#calque #rg-obs').fill('Rongeurs vus près des poubelles, appâts renouvelés.');
  await L.capture(c3, O.CAP + 'rc-P2-iphone-saisie.png');
  await L.toucher(c3, p3.locator('#calque [data-rg="ok"]').first()); await L.calme(p3, 900);
  const apres = await txt(p3); dit('registre du site après le passage : ' + apres.slice(0, 300));
  v('P2 : la page du site est revenue (« Produits biocides posés » ou l\'historique des passages)', /passage/i.test(apres), apres.slice(0, 120));
  await p3.evaluate(() => { const s = document.getElementById('contenu'); s.scrollTop = 0; });
  // le produit posé figure sur la page du site (tableau « Produits biocides posés ») : on relit le TEXTE de la page, pas une structure (tableau ou cartes selon la largeur)
  await L.toucher(c3, p3.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p3, 700); const page = await txt(p3), i0 = page.indexOf('Produits biocides posés');
  v('P2 : la page du site garde sa rubrique « Produits biocides posés » (population)', i0 > -1);
  v('P2 : le produit posé (« ' + nomProd + ' », 150 g) est le premier de « Produits biocides posés »', page.slice(i0, i0 + 220).includes(nomProd) && /150 g/.test(page.slice(i0, i0 + 220)), page.slice(i0, i0 + 220));
  const pdf = p3.locator('#contenu button, #contenu a').filter({ hasText: /PDF|document|Aperçu|Exporter/i }).locator('visible=true').first();
  if (await pdf.count()) { await L.toucher(c3, pdf); await L.calme(p3, 900); const doc = await p3.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ')); const ap = await pan(p3);
    v('P2 : le document (aperçu) cite le produit et la quantité du passage', doc.includes(nomProd) && /150/.test(doc), 'document : ' + doc.slice(0, 160)); dit('aperçu : ' + ap.slice(0, 200)); await L.capture(c3, O.CAP + 'rc-P2-iphone-document.png'); }
  else dit('P2 : aucun bouton de document sur la page du site après le passage');
  v('P2 : aucune erreur de page', c3.err.length === 0, c3.err.join(' // ')); await L.fin(c3);
  await L.fermer(); process.exit(O.bilan('metier-3d-recontrole-d', ok, ko, []));
})().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });

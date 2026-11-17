// Angle « dépendances » · sonde 1 : TOUT CE QUI SORT de 127.0.0.1. On parcourt chaque écran du gérant, la carte (vue et satellite), l'atelier
// de documents, la Comptabilité et le paiement, et on note chaque requête vers un autre hôte : lequel, de quel type, avec quel « Referer »,
// et si le script ou la feuille porte une empreinte d'intégrité. Rien ne sort vraiment : ctx.route répond à toute requête externe (les
// bibliothèques sont servies par des copies locales de leurs octets publiés — le script de l'ordinateur de travail les a téléchargées avant,
// jamais le navigateur ; les tuiles de carte sont refusées).
// ⛔ 127.0.0.1 seulement, entreprise fictive. Population comptée avant de conclure.
const L = require('../lib.js'), A = require('../sondes/atelier-outils.js'), fs = require('fs'), path = require('path');
const DEP = process.env.DEP_LOCAL || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dep/';
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/dependances/';
const LOCALES = { 'leaflet.min.js': 'application/javascript', 'leaflet.min.css': 'text/css', 'maplibre-gl.min.js': 'application/javascript', 'maplibre-gl.min.css': 'text/css', 'leaflet-maplibre-gl.js': 'application/javascript', 'html2canvas.min.js': 'application/javascript' };
// la bibliothèque de cartes lit le plan : on lui répond un TileJSON minimal pour qu'elle demande ensuite des tuiles (donc un nom de domaine, un Referer)
const TILEJSON = JSON.stringify({ tilejson: '3.0.0', tiles: ['https://tiles.openfreemap.org/planet/x/{z}/{x}/{y}.pbf'], vector_layers: [], minzoom: 0, maxzoom: 14 });
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: null, app: true, attente: 600 });
  // on rouvre avec la routeur AVANT le premier chargement : un nouveau contexte avec la même page ne rejoue pas le chargement, on pose donc le routeur puis on recharge
  const vues = [], ext = [];
  let phase = 'chargement';
  await c.ctx.route(u => !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(u.toString()) && /^https?:/.test(u.toString()), async r => {
    const q = r.request(), url = q.url(), h = q.headers();
    ext.push({ phase, url, type: q.resourceType(), referer: h['referer'] || '', origin: h['origin'] || '', cadre: (q.frame() && q.frame().url().replace(/^http:\/\/127\.0\.0\.1:\d+/, '').split('?')[0]) || '' });
    const nom = url.split('/').pop().split('?')[0];
    if (LOCALES[nom] && fs.existsSync(DEP + nom)) return r.fulfill({ status: 200, contentType: LOCALES[nom], headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(DEP + nom) });
    if (/openfreemap\.org\/planet$/.test(url)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: TILEJSON });
    return r.abort('blockedbyclient');
  });
  await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(1200);
  const surLeBandeau = await c.p.evaluate(() => document.body.innerText.slice(0, 80));
  L.v('population : l\'écran de connexion s\'affiche (le chargement a eu lieu)', surLeBandeau.length > 10, surLeBandeau);
  const auDemarrage = ext.filter(x => x.phase === 'chargement');
  L.v('1. au chargement de l\'application (écran de connexion) : AUCUNE requête vers un autre hôte', auDemarrage.length === 0, auDemarrage.map(x => x.url));
  // connexion du gérant
  await c.p.evaluate(() => { try { sessionOuvrir && 0; } catch (e) {} });
  await c.p.goto(`http://127.0.0.1:${c.port}/apercu/prototype-op-gestion.html?app=1&auto=marc`, { waitUntil: 'load' }); await c.p.waitForTimeout(1500);
  await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  phase = 'connecte';
  const routes = await c.p.evaluate(() => Object.keys(vues()));
  L.v('population : les écrans de l\'application sont comptés (≥ 30)', routes.length >= 30, routes.length);
  for (const r of routes) { phase = 'écran ' + r; await c.p.evaluate(h => { location.hash = '#' + h; }, r); await c.p.waitForTimeout(240); }
  const apresEcrans = ext.filter(x => x.phase.startsWith('écran'));
  console.log('requêtes externes pendant le parcours des ' + routes.length + ' écrans :', apresEcrans.length, [...new Set(apresEcrans.map(x => x.phase + ' → ' + new URL(x.url).host))]);
  // les écrans qui ouvrent un cadre voisin (comptabilité, paiement, documents) chargent d'autres pages : on regarde ce que CELLES-CI demandent
  const parCadre = {}; apresEcrans.forEach(x => { parCadre[x.cadre] = (parCadre[x.cadre] || 0) + 1; });
  console.log('par cadre :', JSON.stringify(parCadre));
  // la carte : vue puis satellite
  phase = 'carte';
  await c.p.evaluate(() => { location.hash = '#planning'; }); await c.p.waitForTimeout(500);
  await c.p.evaluate(() => { try { plVue = 'carte'; rendre(); } catch (e) {} }); await c.p.waitForTimeout(3500);
  const dansCarte = ext.filter(x => x.phase === 'carte');
  console.log('carte : ' + dansCarte.length + ' requêtes externes');
  dansCarte.forEach(x => console.log('   ', x.type.padEnd(11), x.url.slice(0, 120)));
  const hotes = [...new Set(dansCarte.map(x => new URL(x.url).host))].sort();
  L.v('population : la carte a bien demandé ses bibliothèques (cdnjs, unpkg) — sinon rien ne se prouve', hotes.includes('cdnjs.cloudflare.com') && hotes.includes('unpkg.com'), hotes);
  // empreintes d'intégrité sur les balises créées
  const balises = await c.p.evaluate(() => [...document.querySelectorAll('script[src^="http"], link[rel=stylesheet][href^="http"]')].map(e => ({ t: e.tagName, u: e.src || e.href, integrity: e.integrity || '', cors: e.crossOrigin || '' })));
  console.log('balises tierces dans la page :', JSON.stringify(balises));
  L.v('population : 5 balises tierces (2 feuilles, 3 scripts) sont dans le document', balises.length === 5, balises.length);
  const sansEmpreinte = balises.filter(b => !b.integrity);
  L.v('2. chaque script et feuille tierce porte une empreinte d\'intégrité (SRI) — sans : ' + sansEmpreinte.length + ' sur ' + balises.length, sansEmpreinte.length === 0, sansEmpreinte.map(b => new URL(b.u).host + '/' + b.u.split('/').pop()));
  // Referer : la politique par défaut du navigateur ne laisse sortir que l'ORIGINE (pas le chemin, pas la requête ?auto=, pas le fragment)
  const avecRef = ext.filter(x => x.referer);
  const fuiteChemin = avecRef.filter(x => /\/apercu\/|[?#]/.test(x.referer));
  console.log('Referer : ' + avecRef.length + ' requêtes en portent un ; exemple : ' + JSON.stringify(avecRef[0] && avecRef[0].referer));
  L.v('population : des requêtes externes portent un Referer', avecRef.length >= 3, avecRef.length);
  L.v('3. aucun Referer ne laisse sortir le chemin, la requête (?auto=) ou le fragment (#route-x-id) de la page', fuiteChemin.length === 0, fuiteChemin.map(x => x.referer).slice(0, 3));
  // satellite
  phase = 'satellite';
  await c.p.evaluate(() => { try { const b = document.querySelector('[data-crfond="sat"]'); if (b) b.click(); } catch (e) {} }); await c.p.waitForTimeout(1500);
  const sat = ext.filter(x => x.phase === 'satellite');
  console.log('satellite : ' + sat.length + ' requêtes', [...new Set(sat.map(x => new URL(x.url).host))]);
  // l'atelier de documents (police Google) et son export PDF
  phase = 'atelier';
  const f = await A.ouvrirAtelier(c, 'devis', 'devis');
  L.v('population : l\'atelier s\'ouvre', !!f);
  const atelier = ext.filter(x => x.phase === 'atelier');
  console.log('atelier : ' + atelier.length + ' requêtes externes');
  atelier.forEach(x => console.log('   ', x.type.padEnd(11), x.url.slice(0, 150), '| cadre', x.cadre, '| referer', x.referer));
  const polices = atelier.filter(x => /fonts\.(googleapis|gstatic)\.com/.test(x.url));
  L.v('4. l\'atelier de documents ne contacte pas Google (police) à l\'ouverture — requêtes vers fonts.* : ' + polices.length, polices.length === 0, polices.map(x => x.url.slice(0, 90)));
  const famillesDemandees = polices.length ? (new URL(polices[0].url).searchParams.getAll('family').length) : 0;
  console.log('familles de polices demandées à Google :', famillesDemandees);
  // le PDF : html2canvas se charge à la demande
  phase = 'pdf';
  const pdfOk = await f.evaluate(() => { try { return typeof pdfCharger === 'function'; } catch (e) { return false; } });
  if (pdfOk) { await f.evaluate(() => pdfCharger().catch(() => {})).catch(() => {}); await c.p.waitForTimeout(800); }
  const pdf = ext.filter(x => x.phase === 'pdf');
  console.log('chargement du PDF :', pdf.map(x => x.url));
  const hf = await f.evaluate(() => [...document.querySelectorAll('script[src^="http"], link[rel=stylesheet][href^="http"]')].map(e => ({ u: e.src || e.href, integrity: e.integrity || '' })));
  L.v('population : le cadre de l\'atelier porte ses balises tierces (police + html2canvas)', hf.length >= 2, hf);
  const hfSans = hf.filter(b => !b.integrity);
  L.v('5. dans l\'atelier aussi, chaque balise tierce porte une empreinte (feuille de polices comprise : impossible pour Google Fonts, dont le contenu change selon le navigateur — d\'où : les polices se servent depuis le site) — sans : ' + hfSans.length + ' sur ' + hf.length, hfSans.length === 0, hfSans.map(b => b.u.slice(0, 80)));
  // synthèse
  const hotesTous = [...new Set(ext.map(x => new URL(x.url).host))].sort();
  console.log('\nHôtes contactés (tous écrans) :', hotesTous.join(', '));
  fs.writeFileSync(SORTIE + 'reseau.json', JSON.stringify({ hotes: hotesTous, requetes: ext.map(x => ({ ...x, url: x.url.slice(0, 200) })) }, null, 1));
  // sans donnée de l'entreprise dans une adresse externe : aucun nom de client, de personne ou montant dans les URL demandées
  const noms = await c.p.evaluate(() => [...new Set([...Object.values(CLIENTS).map(x => x.nom), ...(typeof EQUIPE !== 'undefined' ? EQUIPE.map(p => p.nom || p.prenom) : [])].filter(Boolean))].slice(0, 60));
  const fuiteNoms = ext.filter(x => noms.some(n => n.length > 4 && decodeURIComponent(x.url).toLowerCase().includes(n.toLowerCase())));
  L.v('population : ' + noms.length + ' noms de clients/personnes cherchés dans ' + ext.length + ' adresses externes', noms.length > 10 && ext.length > 5, { noms: noms.length, ext: ext.length });
  L.v('6. aucune adresse externe ne porte un nom de client ou de personne de l\'entreprise', fuiteNoms.length === 0, fuiteNoms.map(x => x.url.slice(0, 100)));
  await c.p.screenshot({ path: SORTIE + 'carte-et-atelier.png' });
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });

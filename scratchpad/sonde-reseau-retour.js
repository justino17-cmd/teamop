/* ══ SONDE — UN APPAREIL SANS RÉSEAU N'EST PAS UN SERVEUR INJOIGNABLE (dossiers du 22 octobre 2026, /api/mailboxes et /api/replies) ══
   La vraie bêta, en 127.0.0.1. Ici, api.teamop.fr est injoignable depuis le navigateur piloté (le proxy coupe) : chaque appel échoue
   en « Failed to fetch », exactement comme sur un PC sans réseau. On joue :
     1. l'appareil HORS LIGNE (le réseau coupé par le navigateur, navigator.onLine faux) : deux échecs — rien ne part ;
     2. le réseau qui REVIENT (« online ») : deux échecs dans la minute — rien ne part ;
     3. passé la minute, deux échecs — « injoignable » part (une vraie panne se dit toujours).
   Les envois de la sentinelle sont relevés à la source (sendBeacon remplacé, et la file du rangement). SOURCE=fichier : la contre-
   épreuve. ⛔ Bêta uniquement, copie locale ; rien ne part chez api.teamop.fr. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__envois=[]; navigator.sendBeacon=function(u,b){ window.__envois.push(b); return true; }; return 1;`);
  await dormir(5000);   // les appels de démarrage passent (et la règle des 3 minutes repart de zéro pour la route qu'on vise)
  const route = '/api/espaces/sonde-reseau';
  const lire = () => S.ev(`const t=[]; for(const b of window.__envois){ try{ t.push(...JSON.parse(await b.text()).reports.map(r=>r.message)); }catch(e){} }
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!/monitor_q/.test(k)) continue; try{ t.push(...JSON.parse(localStorage.getItem(k)||'[]').map(r=>r.message)); }catch(e){} }
    return t.filter(m=>m.indexOf('${route}')>=0);`);
  const appel = () => S.ev(`try{ await fetch('https://api.teamop.fr${route}'); return 'répondu'; }catch(e){ return String(e.message||e); }`);
  const vider = () => S.ev(`window.__envois=[]; for(let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if(/monitor_q/.test(k)) localStorage.removeItem(k); } return 1;`);
  await vider();

  console.log('\n1. Hors ligne');
  await S.c.envoyer('Network.enable', {});
  await S.c.envoyer('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await dormir(300);
  const hl = await S.ev(`return navigator.onLine;`);
  const e1 = await appel(); await dormir(400); const e2 = await appel(); await dormir(1200);
  c('(population) l’appareil se sait hors ligne, et les deux appels échouent (« ' + e1 + ' »)', hl === false && e1 !== 'répondu' && e2 !== 'répondu', { hl, e1, e2 });
  const r1 = await lire();
  c('⛔ hors ligne : deux échecs, rien n’est parti', r1.length === 0, r1);

  console.log('\n2. Le réseau revient');
  await S.c.envoyer('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await dormir(300);
  const e3 = await appel(); await dormir(400); const e4 = await appel(); await dormir(1200);
  const enLigne = await S.ev(`return navigator.onLine;`);
  c('(population) l’appareil se dit en ligne, et api.teamop.fr ne répond toujours pas (« ' + e3 + ' »)', enLigne === true && e3 !== 'répondu' && e4 !== 'répondu', { enLigne, e3, e4 });
  const r2 = await lire();
  c('⛔ dans la minute du retour : deux échecs, rien n’est parti', r2.length === 0, r2);

  console.log('\n3. Passé la minute, la panne dure');
  await dormir(61000);
  await appel(); await dormir(400); await appel(); await dormir(1500);
  const r3 = await lire();
  c('une vraie panne se dit toujours : « ' + r3.join(' | ') + ' »', r3.length >= 1 && /injoignable sur \/api\/espaces\/sonde-reseau/.test(r3[0]), r3);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

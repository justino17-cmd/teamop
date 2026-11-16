// Les adresses du menu (16 novembre 2026, relectures « ordinateur-code-3 » et « ordinateur-code-4 ») :
//  - une adresse qui porte un nom de l'objet de base (#constructor, #toString, #valueOf, #__proto__) ne contourne pas le garde « Cette page
//    n'existe pas. » : en navigation comme à l'ouverture, on retombe sur l'ouverture du rôle, avec le message, sans erreur JavaScript ;
//  - aucune seconde table de menu (l'ancien `const MENU`, avec les noms supprimés) ne traîne dans le fichier.
// ⛔ 127.0.0.1 seulement. Chaque cas compte d'abord sa population (le contenu existe, l'adresse d'ouverture est connue).
const fs = require('fs'), path = require('path');
const { L } = require('./menu-commun.js'), v = L.v;
const NOMS = ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'];
(async () => {
  // 1. à l'ouverture : l'adresse demandée n'est pas retenue, le message paraît, l'écran est celui de l'ouverture du rôle
  for (const qui of ['marc', 'julie', 'sm']) for (const nom of NOMS) {
    const c = await L.ouvrir({ profil:'mac', qui, hash:nom }), tag = `${qui} ouverture #${nom}`;
    const e = await c.p.evaluate(() => ({ route, h1:(document.querySelector('#contenu h1') || {}).textContent || '', texte:document.getElementById('contenu').innerText.slice(0, 60), ouv:rlOuverture(), toast:(document.getElementById('toast') || {}).innerText || '', on:!!document.querySelector('#menu a.on') }));
    v(`${tag} : population (un écran de rôle, avec un titre)`, e.h1.length > 1 && e.on, e);
    v(`${tag} : on retombe sur l'ouverture du rôle (${e.ouv}), pas sur « [object Object] »`, e.route === e.ouv && !/\[object/.test(e.texte), e);
    v(`${tag} : le message « Cette page n'existe pas. » paraît`, /Cette page n’existe pas/.test(e.toast), e.toast);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  // 2. en navigation (le gérant, ordinateur) : l'écran ne casse pas
  for (const profil of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil, qui:'marc' });
    for (const nom of NOMS) {
      await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.remove(); });
      await c.p.evaluate(n => { location.hash = n; }, nom); await L.calme(c.p, 500);
      const e = await c.p.evaluate(() => ({ route, hash:location.hash, h1:(document.querySelector('#contenu h1') || {}).textContent || '', texte:document.getElementById('contenu').innerText.slice(0, 60), on:!!document.querySelector('#menu a.on, #barre-bas .opg-tab.on'), toast:(document.getElementById('toast') || {}).innerText || '' }));
      v(`${profil} navigation #${nom} : population (le contenu est un vrai écran)`, e.h1.length > 1, e);
      v(`${profil} navigation #${nom} : la route retombe sur l'ouverture, l'adresse suit, pas de « [object Object] »`, e.route === 'accueil' && e.hash === '#accueil' && !/\[object/.test(e.texte), e);
      v(`${profil} navigation #${nom} : le message paraît`, /Cette page n’existe pas/.test(e.toast), e.toast);
    }
    v(`${profil} navigation : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    // contre-épreuve : une vraie adresse et une adresse bidon gardent leur comportement
    await c.p.evaluate(() => { location.hash = 'bidon'; }); await L.calme(c.p, 400);
    v(`${profil} #bidon : toujours le message`, await c.p.evaluate(() => /n’existe pas/.test((document.getElementById('toast') || {}).innerText || '')));
    await c.p.evaluate(() => { location.hash = 'clients'; }); await L.calme(c.p, 400);
    v(`${profil} #clients : l'écran Clients s'ouvre`, await c.p.evaluate(() => route === 'clients' && /Clients/.test((document.querySelector('#contenu h1') || {}).textContent || '')));
    await L.fin(c);
  }
  // 3. la technicienne : le refus de son espace tient toujours
  { const c = await L.ouvrir({ profil:'iphone', qui:'sm' }); await c.p.evaluate(() => { location.hash = 'constructor'; }); await L.calme(c.p, 500);
    const e = await c.p.evaluate(() => ({ route, texte:document.getElementById('contenu').innerText.slice(0, 50) })); v('sm navigation #constructor : jamais « [object Object] »', !/\[object/.test(e.texte) && c.err.length === 0, { e, err:c.err.slice(0, 2) }); await L.fin(c); }
  // 4. le fichier : aucune seconde table de menu avec les anciens noms
  const src = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  v('le fichier est lu (population)', src.length > 1000000, src.length);
  v('aucun « const MENU » (l\'ancien menu, ses anciens noms)', !/\bconst MENU\b/.test(src));
  v('aucune ligne de table qui rejoue les anciens groupes (« [\'Planification\', », « [\'CRM\', »)', !/\['(Planification|CRM|Ventes)',\s*'[a-zA-Z]+'/.test(src));
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();

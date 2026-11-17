// Sonde « secu-auto » (double authentification, étape 2, § 8.3) : `?auto=` ne marche QU'EN LOCAL, et alors il ouvre une session SANS téléphone.
// Population : 14 adresses jugées par la VRAIE fonction secuAutoPermis (extraite du fichier), puis le comportement au navigateur :
// en local (session ouverte, pas de #opsec, pas d'inactivité, ?tel=1 le monte), hors local (une page servie « comme teamop.fr » ignore le paramètre), inconnu.
// ⛔ Rien ne sort : la page « teamop.fr » est servie par une interception locale du navigateur (route), jamais par le réseau.
const fs = require('fs'), vm = require('vm'), path = require('path');
const L = require('../lib.js');
const src = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8'), v = L.v;
const i0 = src.indexOf('const secuAutoPermis'); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(i0, src.indexOf('\n', i0)) + ';this.f=secuAutoPermis', ctx);
const adr = u => { try { const x = new URL(u); return { protocol:x.protocol, hostname:x.hostname }; } catch (e) { const m = /^(\w+:)\/\/([^\/:]+)/.exec(u); return { protocol:m[1], hostname:m[2] }; } };   /* « evil-127.0.0.1 » n'est pas une adresse que new URL accepte : on la passe telle quelle à la fonction */
(async () => {
  console.log('\n── 1. quatorze adresses jugées par la vraie fonction ──');
  const oui = ['http://127.0.0.1:8123/apercu/p.html', 'http://localhost:3000/', 'http://[::1]:8080/', 'file:///home/justin/apercu/prototype-op-gestion.html'],
    non = ['https://teamop.fr/apercu/p.html', 'https://www.teamop.fr/', 'https://api.teamop.fr/', 'https://claude.ai/artifacts/xyz', 'http://127.0.0.1.teamop.fr/', 'http://evil-127.0.0.1/', 'http://localhost.evil.com/', 'http://192.168.0.5/', 'about:blank', 'data:text/html,<p>x'];
  v('population : 4 adresses locales et 10 qui ne le sont pas', oui.length === 4 && non.length === 10);
  oui.forEach(u => v('ouvre : ' + u, ctx.f(adr(u)) === true, adr(u)));
  non.forEach(u => v('refuse : ' + u, ctx.f(adr(u)) === false, adr(u)));
  v('refuse une adresse absente', ctx.f() === false && ctx.f({}) === false && ctx.f(null) === false);
  console.log('\n── 2. en local : ?auto=marc ouvre une session sans téléphone ──');
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' });
    const e = await c.p.evaluate(() => ({ s:SESSION, cnx:!!document.getElementById('cnx'), ops:!!document.getElementById('opsec'), auto:SECU.sessions.marc && SECU.sessions.marc.auto, test:typeof window.SECU_TEST, ls:Object.keys(localStorage) }));
    v('la session de Marc est ouverte, sans écran de connexion', e.s === 'marc' && !e.cnx, e);
    v('le téléphone (#opsec) n’est PAS monté', !e.ops, e); v('la session porte le drapeau « auto »', e.auto === true, e);
    v('l’état est lisible depuis la console (page locale seulement)', e.test === 'object', e);
    v('aucune clé de session ni de mot de passe n’est rangée', !e.ls.some(k => /session|mdp/.test(k)), e.ls);
    await c.p.evaluate(() => { SECU.decalage += 20 * 60000; }); await c.p.waitForTimeout(2600);
    v('20 minutes sans rien toucher : une session « auto » n’a pas de minuterie d’inactivité', await c.p.evaluate(() => SESSION === 'marc'));
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', requete:'?app=1&auto=marc&tel=1', qui:'marc' });
    v('?tel=1 monte le téléphone sur une session « auto »', await c.p.evaluate(() => !!document.getElementById('opsec') && !!SESSION), await c.p.evaluate(() => ({ ops:!!document.getElementById('opsec'), s:SESSION })));
    await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', requete:'?app=1&auto=inconnu', qui:null, init:"try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}", attente:5800 });
    const e = await c.p.evaluate(() => ({ s:SESSION, cnx:!!document.getElementById('cn-id') }));
    v('?auto= d’une personne inconnue : l’écran de connexion', e.s === null && e.cnx, e); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', requete:'?app=1', qui:null, init:"try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}", attente:5800 });
    v('sans ?auto= : l’écran de connexion, le téléphone monté', await c.p.evaluate(() => !!document.getElementById('cn-id') && !!document.getElementById('opsec') && SESSION === null)); await L.fin(c); }
  console.log('\n── 3. hors local : la même page servie « comme teamop.fr » ignore le paramètre ──');
  { const c = await L.ouvrir({ profil:'mac', requete:'?app=1', qui:null, init:"try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}", attente:800 });
    const html = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8'); let servies = 0;
    await c.p.route('https://teamop.fr/**', r => { if (/prototype-op-gestion\.html/.test(r.request().url())) { servies++; r.fulfill({ status:200, contentType:'text/html;charset=utf-8', body:html }); } else r.abort(); });
    await c.p.goto('https://teamop.fr/apercu/prototype-op-gestion.html?app=1&auto=marc', { waitUntil:'load', timeout:60000 });
    await L.attendre(c.p, () => !!document.getElementById('cn-id'), 20000); await c.p.waitForTimeout(500);
    const e = await c.p.evaluate(() => ({ host:location.hostname, s:SESSION, cn:!!document.getElementById('cn-id'), test:typeof window.SECU_TEST, auto:/auto=marc/.test(location.search) }));
    v('la page est bien servie sous teamop.fr (interception locale)', servies === 1 && e.host === 'teamop.fr', e);
    v('?auto=marc est dans l’adresse et IGNORÉ : aucune session, l’écran de connexion', e.auto && e.s === null && e.cn, e);
    v('l’état de sécurité n’est PAS lisible depuis la console hors local', e.test === 'undefined', e);
    v('le téléphone simulé est là (c’est l’écran de connexion normal)', await c.p.evaluate(() => !!document.getElementById('opsec'))); await L.fin(c); }
  console.log('\n── 4. le fichier : la condition de l’adresse est écrite à la porte de ?auto= ──');
  const nette = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  v('le démarrage ne lit ?auto= que si secuAutoPermis(location)', /const auto = secuAutoPermis\(location\) \?/.test(nette));
  v('une personne désactivée ne s’ouvre pas par ?auto=', /auto && eqDe\(auto\) && eqDe\(auto\)\.actif/.test(nette));
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

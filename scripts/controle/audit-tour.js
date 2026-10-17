/* L'AUDIT DE LA TOUR — chaque vue de chaque console, ouverte comme Justin l'ouvre, sur ordinateur et sur téléphone.

   Justin, 17 octobre 2026 : « tu testes toute la tour, tu regardes tous les bugs qu'il peut avoir dans la tour, les
   catégories qui servent à quelque chose, les autres qui servent à rien ».

   Le jumeau est d'abord PEUPLÉ par le vrai parcours d'une cliente (scripts/controle/parcours-client.js) : une
   entreprise qui a commandé, payé, été acceptée et s'est connectée — c'est ce qui donne à la Tour des données réelles
   à montrer. Puis, pour chaque console (OP GESTION, OP MESSAGES) et chaque format (bureau, téléphone), chaque vue
   du menu est ouverte par `setApp`/`setTab` (ce que fait un clic sur le menu), et on relève :
     · les erreurs JavaScript et les réponses de l'API en échec PENDANT cette vue ;
     · un écran vide, un « undefined », un « NaN », un débordement de côté ;
     · ce que la vue affiche (titre, nombre d'éléments, état vide) — de quoi juger si elle sert à quelque chose.
   Rapport : <sortie>/audit-tour.md + audit-tour.json + une capture par vue.
   Usage : node scripts/controle/audit-tour.js <sortie>   ⛔ 127.0.0.1 seulement (voir jumeau.js). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { demarrer } = require('./jumeau');
const { carnet } = require('./rapport');
const parcours = require('./parcours-client');
const dormir = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const sortie = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'audit-tour-')));
  fs.mkdirSync(sortie, { recursive: true });
  const K = carnet(sortie, { date: new Date().toISOString().slice(0, 16), source: 'audit de la Tour', profil: 'bureau + téléphone', limites: [] });
  const J = await demarrer({ sortie });
  /* 1. peupler : le vrai parcours d'une cliente */
  const r = await parcours.jouer(J, K, { profil: 'telephone' });
  const peuple = K.etapes.filter(e => e.statut === 'réussie').length;
  console.log('peuplement : ' + peuple + '/' + K.etapes.length + ' étapes du parcours client');
  const fiches = [];
  for (const profil of ['bureau', 'telephone']) {
    const t = await J.onglet({ profil, nom: 'Tour-' + profil, ip: '203.0.113.30' });
    await t.aller('https://teamop.fr/tour.html');
    await t.taper('#lg-id', 'audit'); await t.taper('#lg-pass', J.MDP_TOUR);
    await t.toucher({ texte: 'Se connecter', exact: true });
    await t.attendre(async () => !(await t.ev(`!!(document.querySelector('#lg-id')&&document.querySelector('#lg-id').getClientRects().length)`)), 10000);
    for (const app of ['gestion', 'messages']) {
      await t.ev(`(()=>{ try{ setApp(${JSON.stringify(app)}, true); }catch(e){} return 1; })()`); await dormir(800);
      const vues = await t.ev(`(()=>{ try{ return vues(); }catch(e){ return []; } })()`);
      for (const v of vues) {
        const nErr = t.erreurs.length, nApi = J.traces.api.length;
        t.etape = app + '/' + v;
        await t.ev(`(()=>{ try{ setTab(${JSON.stringify(v)}, true); }catch(e){ return String(e); } return 1; })()`);
        await dormir(2200);   // les vues chargent leurs données à l'ouverture
        const a = await t.auditEcran();
        const vue = await t.ev(`(()=>{ const el=document.getElementById('vue')||document.body; const txt=(el.innerText||'').replace(/\\s+/g,' ').trim();
          const h=(el.querySelector('h1,h2,.page-t,.titre')||{}).innerText||'';
          const vides=[...el.querySelectorAll('.vide,.vide-tour,.etat-vide,[class*="vide"]')].filter(x=>x.getClientRects().length).map(x=>(x.innerText||'').replace(/\\s+/g,' ').trim().slice(0,120));
          const boutons=[...el.querySelectorAll('button,[onclick],a[href]')].filter(x=>x.getClientRects().length).length;
          const lignes=el.querySelectorAll('.reg-l,.ligne,tr,.carte,.kpi').length;
          return { titre:h.trim().slice(0,80), longueur:txt.length, debut:txt.slice(0,220), vides:[...new Set(vides)].slice(0,4), boutons, lignes }; })()`).catch(x => ({ erreur: String(x.message) }));
        const erreurs = t.erreurs.slice(nErr).map(x => x.texte.slice(0, 200));
        const api = J.traces.api.slice(nApi).filter(x => x.statut >= 400 || x.statut === 0).map(x => x.methode + ' ' + x.chemin + ' → ' + x.statut);
        const cap = await t.capture('tour-' + profil + '-' + app + '-' + v);
        fiches.push({ profil, app, vue: v, ...vue, defileDeCote: a.defileDeCote, motsSuspects: a.motsSuspects, petites: a.ciblesPetites, erreurs, api, capture: cap && path.basename(cap) });
        const marque = erreurs.length || api.length || (a.motsSuspects || []).length || a.defileDeCote ? '✗' : '·';
        console.log(marque + ' ' + profil + ' ' + app + '/' + v + ' — ' + (vue.titre || '') + ' · ' + vue.lignes + ' él. · ' + (erreurs.length ? erreurs.length + ' err ' : '') + (api.length ? api.join(', ') : '') + (a.defileDeCote ? ' ↔' + a.defileDeCote : ''));
      }
    }
    await t.fermer();
  }
  fs.writeFileSync(path.join(sortie, 'audit-tour.json'), JSON.stringify({ peuplement: K.etapes.map(e => ({ nom: e.nom, statut: e.statut })), fiches }, null, 2));
  const md = ['# Audit de la Tour', '', 'Peuplement : ' + peuple + '/' + K.etapes.length + ' étapes du parcours client.', '',
    '| format | console | vue | titre | éléments | erreurs | API en échec | remarques |', '|---|---|---|---|---|---|---|---|',
    ...fiches.map(f => '| ' + [f.profil, f.app, f.vue, f.titre, f.lignes, f.erreurs.length, f.api.join('<br>'), [(f.vides || []).join(' / '), f.defileDeCote ? 'déborde ' + f.defileDeCote + ' px' : '', (f.motsSuspects || []).join(',')].filter(Boolean).join(' · ')].map(x => String(x === undefined ? '' : x).replace(/\|/g, '/')).join(' | ') + ' |'),
    '', '## Erreurs relevées', '', ...fiches.filter(f => f.erreurs.length).map(f => '- **' + f.profil + ' ' + f.app + '/' + f.vue + '** : ' + f.erreurs.join(' · '))];
  fs.writeFileSync(path.join(sortie, 'audit-tour.md'), md.join('\n'));
  await J.arreter();
  console.log('Rapport : ' + sortie);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(3); });

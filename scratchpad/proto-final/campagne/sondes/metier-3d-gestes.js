// Campagne « métiers » : chaque élément qui répond sur les trois écrans du métier 3D (Registre sanitaire, Carte des box, Devis xylophage)
// est TOUCHÉ, un par un, sur un profil d'ordinateur et un de téléphone ; on vérifie qu'il fait quelque chose (l'état observable change :
// écran, fenêtre, message, contenu, case) et on relève ce qui ne répond pas, qui n'a pas de nom, ou qui mène hors de l'écran sans le dire.
// Usage : node metier-3d-gestes.js <profil> <qui> [routes]. Rend « N ✓ · M ✗ » ; les gestes qui ne font rien sont des ✗ nommés.
const fs = require('fs'), O = require('./metier-3d-outils.js'), L = O.L;
const CONFS = (process.argv[2] || 'mac:marc').split(',').map(x => { const [profil, qui, r] = x.split(':'); return { profil, qui, routes: (r ? r.split('+') : (qui === 'sm' ? ['registre'] : ['registre', 'carteBox', 'devisXylo'])) }; });
let ok = 0, ko = 0;
const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => { for (const { profil, qui, routes } of CONFS) {
  const defauts = [], sansEffet = [], hors = [], couverts = [];
  const c = await O.ouvrir({ profil, qui, packs: O.METIERS.d3 }), p = c.p; let recenses = 0, touches = 0;
  const zones = ['#contenu', '#calque'];
  for (const r of routes) {
    await p.evaluate(x => aller(x), r); await L.calme(p, 700);
    const h1 = (await O.lire(p)).h1; v(`${r} : l'écran s'ouvre et porte un titre`, !!h1, 'h1=' + h1);
    const liste = await L.gestes(p, '#contenu'); recenses += liste.length; v(`${r} : population recensée (> 3)`, liste.length > 3, liste.length);
    liste.filter(g => g.sansNom).forEach(g => { defauts.push({ r, type: 'sans nom', g }); });
    for (const g of liste) {
      await p.evaluate(x => aller(x), r); await L.calme(p, 450);
      const avant = await L.etat(p), n0 = await p.evaluate(() => document.querySelectorAll('input:checked').length);
      const res = await p.evaluate(({ lib, data, balise }) => { const R = document.getElementById('contenu'); const cand = [...R.querySelectorAll(balise)].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
        const e = cand.find(x => { const l = (x.getAttribute('aria-label') || x.textContent || x.title || '').replace(/\s+/g, ' ').trim().slice(0, 60); const d = [...x.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 40)).join(' '); return l === lib && d === data; });
        if (!e) return { trouve: false }; e.scrollIntoView({ block: 'center' }); const rc = e.getBoundingClientRect(); return { trouve: true, x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, l: Math.round(rc.width), h: Math.round(rc.height) }; }, { lib: g.lib, data: g.data, balise: g.balise });
      if (!res.trouve) continue;
      // un élément dans un menu FERMÉ (« Plus d'actions ») est dans le DOM mais ne reçoit rien : il se teste par son menu (metier-3d-carte-boutons.js), pas ici
      const recu = await p.evaluate(({ x, y, lib }) => { const e = document.elementFromPoint(x, y); return !!e && (e.closest('button,a,summary,label,[data-go],[role=button]') || e).textContent.replace(/\s+/g, ' ').trim().slice(0, 60) === lib; }, { x: res.x, y: res.y, lib: g.lib });
      if (!recu) { couverts.push({ r, lib: g.lib }); continue; }
      // un vrai toucher / clic à la position de l'élément (comme un doigt), et la cible doit être L'ÉLÉMENT (ou son contenu)
      const cible = await p.evaluate(({ x, y, lib }) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('button,a,summary,label,[data-go],[role=button]') ? (e.closest('button,a,summary,label,[data-go],[role=button]').textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) : (e.textContent || '').trim().slice(0, 40)) : ''; }, { x: res.x, y: res.y, lib: g.lib });
      try { if (c.doigt) await p.touchscreen.tap(res.x, res.y); else await p.mouse.click(res.x, res.y); } catch (e) { continue; }
      await L.calme(p, 500); touches++;
      const apres = await L.etat(p), n1 = await p.evaluate(() => document.querySelectorAll('input:checked').length), ch = L.change(avant, apres);
      const aChange = ch.length > 0 || n0 !== n1;
      if (!aChange) sansEffet.push({ r, lib: g.lib, data: g.data, cible, l: res.l, h: res.h });
      if (apres.hash && !apres.hash.includes(r) && !ch.includes('panneau')) hors.push({ r, lib: g.lib, vers: apres.hash });
      await O.nettoyer(p);
      if (c.doigt && (res.h < 36)) defauts.push({ r, type: 'cible < 36 px', g: { lib: g.lib, h: res.h, l: res.l } });
    }
  }
  console.log(JSON.stringify({ profil, qui, recenses, touches, sansEffet: sansEffet.length, hors: hors.length, couverts: couverts.length, sansNom: defauts.filter(d => d.type === 'sans nom').length, petitesCibles: defauts.filter(d => d.type.startsWith('cible')).length }));
  couverts.forEach(s => console.log('  NON TOUCHABLE (menu fermé ou recouvert) ' + s.r + ' : « ' + s.lib + ' »'));
  sansEffet.forEach(s => console.log('  SANS EFFET ' + s.r + ' : « ' + s.lib + ' » ' + s.data + ' (cible touchée : « ' + s.cible + ' », ' + s.l + '×' + s.h + ')'));
  hors.forEach(s => console.log('  VERS AILLEURS ' + s.r + ' : « ' + s.lib + ' » → ' + s.vers));
  defauts.forEach(d => console.log('  ' + d.type.toUpperCase() + ' ' + d.r + ' : ' + JSON.stringify(d.g)));
  v('aucun geste sans effet', sansEffet.length === 0); v('aucun élément sans nom', defauts.filter(d => d.type === 'sans nom').length === 0);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3).join(' // '));
  fs.writeFileSync(O.CAP + `gestes-${profil}-${qui}.json`, JSON.stringify({ recenses, touches, sansEffet, hors, defauts }, null, 1));
  await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-gestes', ok, ko, []));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });

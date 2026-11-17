// Détails d'« Achats et frais » (campagne du 17 novembre 2026) : (1) le ticket « en grand » s'ouvre, se lit et se ferme (Échap ET croix) ;
// (2) le titre « Ça se règle dans la Comptabilité » ne ressemble pas à un lien ; (3) le message qui suit « Transférer… » ne recouvre pas
// le bouton principal de la fenêtre de commande qui s'ouvre sous lui ; (4) retour du navigateur depuis une fenêtre et depuis un onglet.
// Usage : node achats-details.js [profil=mac] [nuit=0|1]
const { L, CAP, txt, panneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === '1', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a), clic = s => L.toucher(c, s);
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  // (1) le ticket en grand
  const av = await E(() => document.querySelectorAll('img, [data-viseuse], .viseuse, .lightbox').length);
  const okT = await clic('[data-cx="justif|ndf|n1"]'); await L.calme(p, 600);
  const vis = await E(() => { const z = [...document.querySelectorAll('#calque, .viseuse, .lightbox, [role=dialog]')].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); return z.map(e => (e.id || e.className).toString().slice(0, 30) + ':' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)); });
  console.log('   ticket en grand :', JSON.stringify(vis)); await L.capture(c, CAP + `det-ticket-grand-${tag}.png`);
  v('D1 « Voir le ticket en grand » ouvre quelque chose de lisible (ticket, montant)', okT && vis.some(x => /Restaurant|16,50|Ticket|TOTAL/i.test(x)), vis);
  const croix = await E(() => { const b = [...document.querySelectorAll('#calque [data-ferme], #calque .croix, #calque button')].find(x => /✕|Fermer|×/.test(x.textContent + (x.getAttribute('aria-label') || ''))); return !!b; });
  v('D1b ce ticket a une croix ou un bouton « Fermer » visible', croix);
  await p.keyboard.press('Escape'); await L.calme(p, 400); v('D1c Échap le ferme', !(await E(() => !!document.querySelector('#calque .panneau, #calque .visio'))) , await panneau(p));
  // (2) le titre de groupe
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const st = await E(() => { const g = document.querySelector('.ach-compta') && document.querySelector('.ach-compta').previousElementSibling, l = document.querySelector('.ach-aide'); const f = e => e ? { couleur: getComputedStyle(e).color, poids: getComputedStyle(e).fontWeight, taille: getComputedStyle(e).fontSize, txt: e.textContent.trim().slice(0, 40), curseur: getComputedStyle(e).cursor } : null; return { groupe: f(g), lien: f(l) }; });
  console.log('   groupe / lien :', JSON.stringify(st));
  v('D2 (achats-07) le titre « Ça se règle dans la Comptabilité » n’a pas la couleur d’un lien', st.groupe && st.lien && st.groupe.couleur !== st.lien.couleur, st);
  // (3) le message de « Transférer » et le bouton principal de la fenêtre qui s'ouvre
  await clic('[data-ac^="transfert|"]'); await L.calme(p, 700);
  const rec = await E(() => { const t = document.getElementById('toast'), vis = e => e && e.offsetParent !== null; const bs = [...document.querySelectorAll('#calque .panneau .actions button, #calque .panneau button')].filter(b => b.offsetParent && b.getBoundingClientRect().height > 10); const rt = t && vis(t) ? t.getBoundingClientRect() : null;
    const touche = rt ? bs.filter(b => { const r = b.getBoundingClientRect(); return !(r.right < rt.left || r.left > rt.right || r.bottom < rt.top || r.top > rt.bottom); }).map(b => b.textContent.trim().slice(0, 30)) : []; return { toast: !!rt, haut: rt ? Math.round(rt.top) : null, couverts: touche }; });
  console.log('   toast / boutons de la fenêtre :', JSON.stringify(rec)); await L.capture(c, CAP + `det-toast-fenetre-${tag}.png`);
  v('D3 (achats-08) le message qui suit « Transférer » ne recouvre aucun bouton de la fenêtre de commande', rec.couverts.length === 0, rec);
  await L.ranger(p);
  // (4) le retour du navigateur ferme la fenêtre ouverte, sans quitter l'écran
  await L.aller(p, 'achats'); await clic('[data-axa="dem"]'); await L.calme(p, 400); const h0 = await E(() => location.hash);
  await p.goBack().catch(() => {}); await L.calme(p, 600); const f = await L.etat(p);
  console.log('   retour depuis la fenêtre « nouvelle demande » :', JSON.stringify({ avant: h0, apres: f.hash, h1: f.h1, panneau: f.panneau.slice(0, 40) }));
  v('D4 le retour du navigateur depuis une fenêtre ouverte ne fait pas quitter Achats et frais sans fermer la fenêtre d’abord (ou la ferme)', !!f.panneau === false || /achats/.test(f.hash), f);
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

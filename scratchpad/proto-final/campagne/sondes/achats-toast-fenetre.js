// achats-06 : « Transférer 6 kg et commander 4 kg » ouvre la fenêtre « Commande … · brouillon » ET pose un message : le message ne doit pas
// recouvrir les boutons de la fenêtre (« Envoyer à … »). On mesure le rectangle du message contre celui de chaque bouton, au téléphone et au bureau.
// Usage : node achats-toast-fenetre.js [profil=iphone] [nuit]
const { L, ouvrirAchats, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p;
  const E = f => p.evaluate(f);
  const ids = await E(() => DEM_ACHAT.filter(d => d.etat === 'attente').map(d => { const s = acSource(d); return [d.id, !!(s.x && s.at > 0 && s.reste && s.f), !!(s.camion && bxGarage(s.camion.id))]; }));
  console.log('  demandes en attente (id, transfert+commande, camion au garage) :', JSON.stringify(ids));
  const cible = ids.find(x => x[1]); v('06-0 il existe une demande « transférer et commander »', !!cible, ids);
  if (!cible) { console.log(L.bilan()); await L.fin(c); await L.fermer(); process.exit(1); }
  await E(() => { const b = document.querySelector('[data-ac^="transfert|' + 'X' + '"]'); });
  await p.evaluate(id => document.querySelector('[data-ac="transfert|' + id + '"]').scrollIntoView({ block: 'center' }), cible[0]); await L.calme(p, 300);
  await L.toucher(c, '[data-ac="transfert|' + cible[0] + '"]'); await L.calme(p, 500);
  const ph = await p.evaluate(() => { const i = document.querySelector('#calque .panneau .info'); return i ? i.textContent.replace(/\s+/g, ' ').trim() : ''; });
  if (cible[2]) v('13 (achats-13) la question du camion au garage nomme le camion et la quantité : « ' + ph + ' »', /^Le camion de .+ est au garage\. Mettre quand même [\d\u00a0\u202f ,]+ \S+ dedans \?$/.test(ph), ph);
  if (/au garage/.test(await p.evaluate(() => (document.querySelector('#calque .panneau') || {}).textContent || ''))) { await L.toucher(c, '[data-ac^="transfertok"]'); await L.calme(p, 700); }
  const m = await E(() => { const t = document.getElementById('toast'), pan = document.querySelector('#calque .panneau'), r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const bts = pan ? [...pan.querySelectorAll('button')].filter(b => b.offsetParent).map(b => [b.textContent.trim().slice(0, 30), r(b)]) : [];
    return { toast: t && t.classList.contains('on') ? [t.textContent.replace(/\s+/g, ' ').trim().slice(0, 90), r(t), getComputedStyle(t).zIndex] : null, boutons: bts, titre: pan ? (pan.querySelector('h2') || {}).textContent : null, haut: innerHeight }; });
  console.log('  ', JSON.stringify(m));
  v('06-1 une fenêtre est ouverte (« Commande … · brouillon »)', /commande/i.test(m.titre || ''), m.titre);
  const inter = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
  if (m.toast) { const rec = m.boutons.filter(([n, r]) => inter(m.toast[1], r)); v('06-2 le message ne recouvre aucun bouton de la fenêtre', rec.length === 0, rec); }
  else console.log('  (aucun message flottant : rien ne recouvre)');
  const enc = await E(() => { const e = document.querySelector('#calque .panneau .ax-trf'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
  v('06-3 la confirmation du transfert est lue DANS la fenêtre, avec « Annuler le transfert »', !!enc && /Annuler le transfert/.test(enc) && /transférés/.test(enc), enc);
  await L.capture(c, CAP + 'achats-06-' + profil + (nuit ? '-nuit' : '') + '.png');
  if (enc) {
    const av = await E(() => [MVTS.length, DEM_ACHAT.find(d => d.id === 'da1').etat, COMMANDES.length]);
    await L.toucher(c, '#calque .panneau [data-axa="trfannul"]'); await L.calme(p, 600);
    const ap = await E(() => [MVTS.length, DEM_ACHAT.find(d => d.id === 'da1').etat, COMMANDES.length, !!document.querySelector('#calque .panneau'), (document.getElementById('toast') || {}).textContent]);
    v('06-4 « Annuler le transfert » défait : la demande redevient à décider, le mouvement part', ap[1] === 'attente' && ap[0] < av[0], { av, ap });
    v('06-5 après l’annulation la fenêtre est fermée et un message le dit', !ap[3] && /Annulé/.test(ap[4] || ''), ap);
  }
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

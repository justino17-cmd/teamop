// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : le MÊME nombre d'achats sans justificatif partout où on le lit (Achats, Comptabilité, Accueil) — achats-10 a unifié le MOT, pas forcément le COMPTE.
const { L, ouvrirAchats, txt } = require('./achats-outils.js'), v = L.v;
(async () => {
  const c = await ouvrirAchats({ profil: 'mac', qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const lien = await E(() => { const b = [...document.querySelectorAll('#contenu [data-cx]')].find(e => /justificatif/.test(e.textContent)); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
  console.log('  Achats :', lien);
  const nA = parseInt((lien || '').match(/(\d+) achat/)[1], 10);
  await L.toucher(c, '#contenu [data-cx$="sanspiece"]'); await L.calme(p, 700);
  const compta = await E(() => { const t = document.querySelector('#contenu').textContent.replace(/\s+/g, ' '); return { h1: (document.querySelector('#contenu h1') || {}).textContent, lignes: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, sans: document.querySelectorAll('#cx-liste .cx-sans').length, puces: [...document.querySelectorAll('#contenu .puce, #contenu .puce-c, #contenu [role=tab]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(x => /justif|facture/i.test(x)).slice(0, 8), tout: (t.match(/[^.]{0,60}(sans justificatif|sans facture|sans pièce)[^.]{0,60}/gi) || []).slice(0, 8) }; });
  console.log('  Compta (filtre) :', JSON.stringify(compta));
  v('C1 la liste où mène le lien d’Achats a exactement le nombre d’achats annoncé (' + nA + ')', compta.lignes === nA, { annonce: nA, lignes: compta.lignes });
  v('C2 chaque ligne de cette liste porte « sans justificatif »', compta.sans === compta.lignes, compta);
  await L.aller(p, 'comptabilite'); await L.calme(p, 600);
  const t2 = await txt(p); console.log('  Comptabilité (accueil) :', JSON.stringify((t2.match(/[^.]{0,70}(sans justificatif|sans facture|sans pièce|justificatif)[^.]{0,70}/gi) || []).slice(0, 8)));
  await L.aller(p, 'accueil'); await L.calme(p, 600);
  const t3 = await txt(p); console.log('  Accueil :', JSON.stringify((t3.match(/[^.]{0,70}(sans justificatif|sans facture|sans pièce)[^.]{0,70}/gi) || []).slice(0, 8)));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

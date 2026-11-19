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
  const croix = await E(() => { const z = document.getElementById('cx-vis'); return !!z && /✕|Fermer|×/.test(z.textContent + [...z.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || '').join(' ')); });
  v('D1b ce ticket a une croix ou un bouton « Fermer » visible', croix);
  await p.keyboard.press('Escape'); await L.calme(p, 400); v('D1c Échap le ferme', !(await E(() => { const z = document.getElementById('cx-vis'); return !!z && z.offsetParent !== null || (!!z && getComputedStyle(z).position === 'fixed' && getComputedStyle(z).display !== 'none'); })), await E(() => { const z = document.getElementById('cx-vis'); return z ? z.className + '|' + getComputedStyle(z).display : 'absent'; }));
  // (2) le titre de groupe
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const st = await E(() => { const g = document.querySelector('.ach-compta') && document.querySelector('.ach-compta').previousElementSibling, l = document.querySelector('.ach-aide'); const f = e => e ? { couleur: getComputedStyle(e).color, poids: getComputedStyle(e).fontWeight, taille: getComputedStyle(e).fontSize, txt: e.textContent.trim().slice(0, 40), curseur: getComputedStyle(e).cursor } : null; return { groupe: f(g), lien: f(l) }; });
  console.log('   groupe / lien :', JSON.stringify(st));
  v('D2 (achats-07) le titre « Ça se règle dans la Comptabilité » n’a pas la couleur d’un lien', st.groupe && st.lien && st.groupe.couleur !== st.lien.couleur, st);
  // (3) le message de « Transférer » et le bouton principal de la fenêtre qui s'ouvre
  await clic('[data-ac^="transfert|"]'); await L.calme(p, 700);
  if (/au garage/.test(await panneau(p))) { await clic('[data-ac^="transfertok"]'); await L.calme(p, 700); }
  const rec = await E(() => { const t = document.getElementById('toast'), vis = e => e && e.classList.contains('on'); const bs = [...document.querySelectorAll('#calque .panneau .actions button, #calque .panneau button')].filter(b => b.offsetParent && b.getBoundingClientRect().height > 10); const rt = t && vis(t) ? t.getBoundingClientRect() : null;
    const touche = rt ? bs.filter(b => { const r = b.getBoundingClientRect(); return !(r.right < rt.left || r.left > rt.right || r.bottom < rt.top || r.top > rt.bottom); }).map(b => b.textContent.trim().slice(0, 30)) : []; return { toast: !!rt, haut: rt ? Math.round(rt.top) : null, couverts: touche, annulerDansFenetre: !!document.querySelector('#calque .panneau [data-axa="trfannul"]'), boutonsToast: t ? [...t.querySelectorAll('button')].map(b => b.textContent.trim()) : [], texte: t ? t.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '' }; });
  console.log('   toast / boutons de la fenêtre :', JSON.stringify(rec)); await L.capture(c, CAP + `det-toast-fenetre-${tag}.png`);
  v('D3 (achats-06) le message qui suit « Transférer » ne recouvre aucun bouton de la fenêtre de commande', rec.couverts.length === 0, rec);
  v('D3b le message d’un transfert garde son bouton « Annuler » (un geste de stock se défait, huit secondes)', (rec.boutonsToast.includes('Annuler') || rec.annulerDansFenetre), rec);
  await L.ranger(p);
  // (4) le retour du navigateur ferme la fenêtre ouverte, sans quitter l'écran
  await L.aller(p, 'achats'); await clic('[data-axa="dem"]'); await L.calme(p, 400); const h0 = await E(() => location.hash);
  await p.goBack().catch(() => {}); await L.calme(p, 600); const f = await L.etat(p);
  console.log('   retour depuis la fenêtre « nouvelle demande » :', JSON.stringify({ avant: h0, apres: f.hash, h1: f.h1, panneau: f.panneau.slice(0, 40) }));
  v('D4 le retour du navigateur depuis une fenêtre ouverte ne fait pas quitter Achats et frais sans fermer la fenêtre d’abord (ou la ferme)', !!f.panneau === false || /achats/.test(f.hash), f);
  // (6) les mots : un bouton qui DIT sa décision, une fenêtre qui porte le nom du bouton, un réglage sans « démonstration »
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const bt = await E(() => [...document.querySelectorAll('.ax-d[data-axid="da3"] .actions button')].map(b => b.textContent.trim()));
  v('D7 (achats-04) une carte de demande a un bouton qui dit « Accepter » (aujourd’hui : ' + bt.join(' | ') + ')', bt.some(b => /Accepter/.test(b)), bt);
  const bout = await E(() => (document.querySelector('[data-axa="dem"]') || {}).textContent.trim());
  await clic('[data-axa="dem"]'); await L.calme(p, 400); const tf = await E(() => (document.querySelector('#calque .panneau h2') || {}).textContent); await L.ranger(p);
  v('D8 (achats-09) la fenêtre ouverte par « ' + bout + ' » porte le même nom (« ' + tf + ' »)', /demande d.achat/i.test(tf || ''), { bout, tf });
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); const tn = await txt(p);
  v('D9 (achats-08) aucun « démonstration » dans les réglages des notes de frais', !/démonstration/i.test(tn), tn.slice(tn.indexOf('Kilomètres'), tn.indexOf('Kilomètres') + 120));
  // (7) « N achats sans facture » : la liste où mène ce lien ne contient que des achats, et dit le même mot que le lien
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const lienTxt = await E(() => (document.querySelector('[data-cx="sec|factures|achats|sanspiece"]') || {}).textContent.replace(/\s+/g, ' ').trim());
  await clic('[data-cx="sec|factures|achats|sanspiece"]'); await L.calme(p, 600);
  const liste = await E(() => { const z = document.getElementById('cx-liste'); return z ? z.textContent.replace(/\s+/g, ' ').trim() : ''; }), chip = await E(() => { const b = document.querySelector('#contenu [aria-pressed="true"], #contenu .on'); return b ? b.textContent.trim() : ''; });
  console.log('   lien « ' + lienTxt + ' » → liste :', liste.slice(0, 200));
  v('D10 (achats-10) « ' + lienTxt + ' » : la liste ne contient que des achats et dit le même mot que le lien (sans facture / sans justificatif)', !/Note de frais/.test(liste) && !(/sans justificatif/.test(liste) && /sans facture/.test(lienTxt)), { lienTxt, liste: liste.slice(0, 160) });
  // (8) la confirmation « camion au garage » dit de QUOI il s'agit (la quantité) dans sa phrase, pas seulement dans le bouton
  await L.aller(p, 'achats'); await clic('[data-ac^="transfert|"]'); await L.calme(p, 500);
  const ph = await E(() => { const i = document.querySelector('#calque .panneau .info'); return i ? i.textContent.replace(/\s+/g, ' ').trim() : ''; });
  if (ph) v('D11 (achats-13) la question « ' + ph + ' » nomme ce qu’on met dans le camion (quantité)', /\d/.test(ph), ph); else console.log('   (pas de confirmation « garage » dans cet état)');
  await L.ranger(p);
  // (5) double toucher sur « Valider » et sur « Refuser et prévenir » : un seul effet (une seule écriture, un seul message)
  await E(() => { acOnglet = 'notes'; AX.fn = 'tous'; }); await L.aller(p, 'achats');
  const a0 = await E(() => [ACHATS.length, NOTIFS.length, JOURNAL.length]);
  await E(() => { const b = document.querySelector('[data-ac="ndfok|n1"]'); b.click(); b.click(); }); await L.calme(p, 500);
  const a1 = await E(() => [ACHATS.length, NOTIFS.length, JOURNAL.length, ACHATS.filter(a => a.id === 'an1').length]);
  v('D5 double toucher sur « Valider » : UNE écriture, UN message, UNE ligne d’Historique', a1[0] === a0[0] + 1 && a1[1] === a0[1] + 1 && a1[2] === a0[2] + 1 && a1[3] === 1, { a0, a1 });
  await E(() => { const b = document.querySelector('[data-ac="ndfnon|n2"]'); b.click(); }); await L.calme(p, 300);
  await E(() => { document.getElementById('ac-motif').value = 'Pas une dépense de l’entreprise.'; const b = document.querySelector('[data-axa^="nonok"]'); b.click(); b.click(); }); await L.calme(p, 500);
  const a2 = await E(() => [NOTIFS.filter(n => /n’est pas remboursée/.test(JSON.stringify(n))).length, JOURNAL.filter(j => /a refusé la note de frais/.test(JSON.stringify(j))).length]);
  v('D6 double toucher sur « Refuser et prévenir » : UN message, UNE ligne d’Historique', a2[0] === 1 && a2[1] === 1, a2);
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

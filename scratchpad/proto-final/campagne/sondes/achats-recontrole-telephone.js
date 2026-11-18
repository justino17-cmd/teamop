// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : le téléphone après achats-05 (plus de tuiles, la liste d'abord, les deux réglages
// derrière « Réglages › »). On joue ce que la correction a déplacé : la fenêtre « Réglages » et le tarif au kilomètre (au clavier, vraie
// frappe), les compteurs qui ont disparu (un chemin vers la Comptabilité reste-t-il ?), le premier écran, les filtres par personne,
// l'ordinateur qui ne doit pas bouger. Usage : node achats-recontrole-telephone.js [profil=iphone] [nuit]
const { L, ouvrirAchats, toast, panneau, txt, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', tel = ['iphone', 'android', 'petit'].includes(profil), tag = profil + (nuit ? '-nuit' : '');
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const lire = s => E(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, '#contenu');
  // ── premier écran : demandes
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const m = await E(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const b = e.getBoundingClientRect(); return { haut: Math.round(b.top), bas: Math.round(b.bottom) }; };
    return { tuiles: r('#contenu .kpis'), carte: r('#contenu .ach-d'), compta: r('#contenu .ach-cpt'), onglets: r('#contenu .pr-vues'), h: innerHeight, nbDem: DEM_ACHAT.filter(d => d.etat === 'attente').length }; });
  console.log('  ', JSON.stringify(m));
  v('T0 population : il y a des demandes en attente à regarder', m.nbDem >= 2, m);
  if (tel) {
    v('T1 téléphone : plus de tuiles de chiffres (elles répétaient les onglets)', m.tuiles === null, m.tuiles);
    v('T2 la première demande se voit dans le premier écran (haut < hauteur − 120)', m.carte && m.carte.haut < m.h - 120, m);
    v('T3 les onglets Demandes / Frais portent encore leur compteur (le chiffre ne disparaît pas avec les tuiles)', await E(() => [...document.querySelectorAll('#contenu .pr-vues .pr-nb')].length === 2 && [...document.querySelectorAll('#contenu .pr-vues .pr-nb')].every(e => /^\d+$/.test(e.textContent.trim()))));
    v('T4 « Ça se règle dans la Comptabilité » est après la liste, pas avant', m.compta && m.carte && m.compta.haut > m.carte.haut, m);
  } else v('T1 ordinateur : les tuiles sont toujours là', !!m.tuiles, m);
  await L.capture(c, CAP + 'rc-tel-demandes-' + tag + '.png');
  // le chemin vers la Comptabilité depuis Achats existe encore : au moins un bouton « sans justificatif » ET un « à payer » cliquables
  const chem = await E(() => [...document.querySelectorAll('#contenu [data-cx]')].filter(e => e.offsetParent).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 70)));
  console.log('  chemins vers la Comptabilité :', JSON.stringify(chem));
  v('T5 depuis Achats on peut toujours aller aux factures à payer et aux achats sans justificatif (téléphone compris)', chem.some(t => /payer/i.test(t)) && chem.some(t => /justificatif/i.test(t)), chem);
  // compter les « sans justificatif » aux quatre endroits : Achats, Comptabilité (puce), Comptabilité (liste), Accueil
  const sj = await E(() => ({ axSans: typeof axSansJustif === 'function' ? axSansJustif().length : null, acSans: acSansPiece().length }));
  console.log('  sans justificatif :', JSON.stringify(sj));
  // ── les filtres par personne
  const fil = await E(() => [...document.querySelectorAll('#contenu .ax-fil button, #contenu [data-axa^="fd"], #contenu [data-axa="fd"]')].filter(e => e.offsetParent).length);
  console.log('  boutons de filtre vus :', fil);
  // ── notes : première note, Réglages
  await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 400);
  const mn = await E(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const b = e.getBoundingClientRect(); return { haut: Math.round(b.top), bas: Math.round(b.bottom) }; };
    return { note: r('#contenu .ach-n'), regl: r('#contenu .ach-regl'), reglB: r('#contenu .ach-regl-b'), h: innerHeight }; });
  console.log('  ', JSON.stringify(mn));
  if (!tel) v('N0 ordinateur et tablette : « Réglages › » n’est pas affiché (les deux lignes de réglage sont sur la page, il les répétait), les deux lignes y sont', !mn.reglB && !!mn.regl, mn);
  if (tel) {
    v('N1 téléphone : la première note se voit dans le premier écran', mn.note && mn.note.haut < mn.h - 120, mn);
    v('N2 téléphone : les lignes de réglage ne sont pas sur la page, « Réglages › » oui', !mn.regl && !!mn.reglB, mn);
    await L.capture(c, CAP + 'rc-tel-notes-' + tag + '.png');
    await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 400);
    const f1 = await panneau(p);
    v('N3 la fenêtre « Réglages » dit les DEUX réglages (ticket et kilomètres) avec leur « Changer › »', /sans ticket/.test(f1) && /Kilomètres/.test(f1) && (f1.match(/Changer/g) || []).length === 2 && !/démonstration/.test(f1), f1);
    const dep = await L.deborde(c), d = await L.doigts(p, '#calque .panneau');
    v('N4 la fenêtre Réglages : aucun glissement latéral, cibles ≥ 44 px, texte lisible', dep.bouge === 0 && d.petits.length === 0 && d.ecrases.length === 0, { dep, petits: d.petits, ecrases: d.ecrases });
    await L.capture(c, CAP + 'rc-tel-reglages-' + tag + '.png');
    // « Changer › » du ticket : mène à la Comptabilité (cxAller ndf) ; la fenêtre doit se fermer, pas rester par-dessus
    await L.toucher(c, '#calque [data-axa="regle"]'); await L.calme(p, 700);
    const apr = await E(() => ({ fenetre: !!document.querySelector('#calque .panneau'), h1: (document.querySelector('#contenu h1') || {}).textContent }));
    v('N5 « Changer › » (ticket) ferme la fenêtre et mène à la Comptabilité, pas une fenêtre empilée', !apr.fenetre && /Compta/i.test(apr.h1 || ''), apr);
    await L.aller(p, 'achats'); await L.calme(p, 300);
    await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 400);
  } else { await L.toucher(c, '[data-axa="kmtarif"]'); await L.calme(p, 400); }
  if (tel) { await L.toucher(c, '#calque [data-axa="kmtarif"]'); await L.calme(p, 400); }
  // ── tarif au kilomètre : vraie frappe au clavier
  const champ = await E(() => { const e = document.getElementById('ax-km'); return e ? { v: e.value, mode: e.inputMode, type: e.type } : null; });
  v('K0 le champ du tarif est un champ texte à clavier décimal (pas un champ numérique qui avale la virgule)', champ && champ.type === 'text' && champ.mode === 'decimal', champ);
  const essai = async (saisie) => { await p.fill('#ax-km', ''); await p.click('#ax-km'); await p.keyboard.type(saisie, { delay: 15 }); const tape = await E(() => document.getElementById('ax-km').value);
    await L.toucher(c, '[data-axa="kmok"]'); await L.calme(p, 400); return { tape, km: await E(() => AX.kmTarif), t: await toast(p), ferme: await E(() => !document.querySelector('#calque .panneau')) }; };
  let r = await essai('0,65');
  v('K1 « 0,65 » tapé au clavier devient 0,65 € le km (et non 65)', r.tape === '0,65' && r.km === 0.65 && r.ferme, r);
  await L.aller(p, 'achats'); await L.toucher(c, tel ? '[data-axa="reglages"]' : '[data-axa="kmtarif"]'); await L.calme(p, 300); if (tel) { await L.toucher(c, '#calque [data-axa="kmtarif"]'); await L.calme(p, 300); }
  v('K2 le champ rouvert remontre « 0,65 »', await E(() => document.getElementById('ax-km').value) === '0,65');
  for (const [s, motif] of [['abc', /tarif/], ['0', /tarif/], ['-1', /tarif/], ['0,6,5', /tarif/], ['', /tarif/]]) {
    await p.fill('#ax-km', ''); await p.click('#ax-km'); if (s) await p.keyboard.type(s, { delay: 10 }); const av = await E(() => AX.kmTarif);
    await L.toucher(c, '[data-axa="kmok"]'); await L.calme(p, 300); const ap = await E(() => AX.kmTarif), t = await toast(p), ouv = await E(() => !!document.getElementById('ax-km'));
    v('K3 « ' + s + ' » est refusé avec une phrase, le tarif reste ' + av + ', la fenêtre reste ouverte', ap === av && motif.test(t) && ouv, { av, ap, t, ouv });
  }
  // un tarif qui se lit mal : « 1.500 » = 1 500 € du km ? doit être refusé ou borné (un tarif au kilomètre n'est jamais de 1 500 €)
  await p.fill('#ax-km', ''); await p.click('#ax-km'); await p.keyboard.type('1.500', { delay: 10 }); const av2 = await E(() => AX.kmTarif);
  await L.toucher(c, '[data-axa="kmok"]'); await L.calme(p, 300); const ap2 = await E(() => AX.kmTarif);
  console.log('  tarif « 1.500 » : avant', av2, 'après', ap2, ' message :', await toast(p));
  { const mt = await toast(p); v('K4 « 1.500 » (1 500 ou 1,5 ?) est refusé avec la phrase « n’est pas clair », le tarif ne bouge pas (restes achats 1 : il devenait 1,50 € sans un mot)', ap2 === av2 && /pas clair/.test(mt), { av2, ap2, mt }); }
  await E(() => { try { fermerPanneau(); } catch (e) {} AX.kmTarif = 0.6; });
  // ── le réglage « sans ticket » du gérant change les boutons des notes
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// Restes des recontrôles « Tâches · Absences · Menu », tour 1 (17 novembre 2026). Six défauts rejoués AVANT, rejoués APRÈS la correction :
//  A. « Au » suit « Du » tant qu'on n'a pas touché « Au » (demande de congé) ;
//  B. « 2 semaines · 1 mois … 6 mois » tient sur une ligne, entier, dès 320 px ;
//  C. un message posé il y a plus d'un instant ne reste pas collé sur la fiche qu'on ouvre ensuite (celui de LA MÊME action reste) ;
//  D. l'appui long sur la barre dont le relâcher ne produit AUCUN clic n'avale pas le premier toucher suivant ;
//  E. « Voir comme Marc » (revue, prototype nu, rôle technicien) change vraiment le rôle ;
//  F. le sigle « RTT » ne s'écrit pas « rtt » dans « Mes heures ».
// usage : node restes-taches-absences-1.js   — « N ✓ · M ✗ », sort en 1 si un contrôle tombe. 127.0.0.1 seulement.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const P = process.env.PARTIES || 'ABCDEF';   // PARTIES=BD : ne rejouer que ces parties (les mutations)
(async () => {
  // A — Du / Au
  if (P.includes('A')) { const c = await L.ouvrir({ profil:'iphone', nuit:false, qui:'sm', hash:'absences' }); const p = c.p; await L.calme(p, 700);
    await L.toucher(c, '[data-atdem]'); await L.calme(p, 400);
    const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); }, [id, x]);
    const lire = () => p.evaluate(() => ({ du:document.getElementById('ad-du').value, au:document.getElementById('ad-au').value, alerte:(document.getElementById('ad-apercu').innerText || ''), btn:document.querySelector('[data-atenvoi]').disabled }));
    const d0 = await lire(); v('A : le formulaire propose deux dates (population)', !!d0.du && !!d0.au && d0.au >= d0.du, d0);
    await set('ad-du', '2026-12-14'); const a1 = await lire();
    v('A : « Du » après la fin par défaut → « Au » suit (même jour)', a1.au === '2026-12-14', a1);
    v('A : le bouton de date « Au » montre la nouvelle date (14 déc.)', await p.evaluate(() => /14/.test(document.getElementById('ad-au').nextElementSibling.innerText)), await p.evaluate(() => document.getElementById('ad-au').nextElementSibling.innerText));
    v('A : aucun « date de fin avant le début » et le bouton répond', !/date de fin est avant/.test(a1.alerte) && !a1.btn, a1);
    await set('ad-au', '2026-12-16'); await set('ad-du', '2026-12-20'); const a2 = await lire();
    v('A : « Au » touché à la main ne bouge plus (le message reste, clair)', a2.au === '2026-12-16' && /date de fin est avant/.test(a2.alerte) && a2.btn, a2);
    await L.capture(c, O.CAP + 'restes1-du-au.png'); await L.fin(c); }
  // B — le sélecteur de période du calendrier, sur les téléphones
  for (const profil of P.includes('B') ? ['petit', 'android', 'iphone', 'ipad'] : []) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 600);
    await p.evaluate(() => { aOnglet = 'calendrier'; rendre(); }); await L.calme(p, 600);
    const m = await p.evaluate(() => { const g = document.querySelector('.ac-per'); if (!g) return null; const r = g.getBoundingClientRect(), B = [...g.querySelectorAll('button')].map(b => b.getBoundingClientRect()), W = document.documentElement.clientWidth;
      return { n:B.length, droite:Math.round(Math.max(...B.map(b => b.right))), gd:Math.round(r.right), W, deborde:g.scrollWidth > g.clientWidth + 1, texte:[...g.querySelectorAll('button')].map(b => b.scrollWidth > b.clientWidth + 1) }; });
    const tag = `B ${profil}${nuit ? ' nuit' : ''}`;
    v(`${tag} : le sélecteur existe, cinq boutons (population)`, !!m && m.n === 5, m);
    if (m) { v(`${tag} : aucun bouton ne sort de la rangée (${m.droite} ≤ ${m.gd}), la rangée tient dans l'écran (${m.gd} ≤ ${m.W}), rien de coupé`, m.droite <= m.gd + 0.5 && m.gd <= m.W && !m.deborde && !m.texte.some(Boolean), m); }
    if (profil === 'petit' && !nuit) await L.capture(c, O.CAP + 'restes1-periode-petit.png');
    await L.fin(c); }
  // C et D — au téléphone, gérant
  if (P.includes('C') || P.includes('D')) { const c = await L.ouvrir({ profil:'iphone', nuit:false, qui:'marc', hash:'taches' }); const p = c.p; await L.calme(p, 700);
    if (P.includes('C')) {
    // C : un message ancien ne couvre pas la fiche ; celui de la même action reste
    await p.evaluate(() => { toast('Ajoutée pour demain à 14 h', { lib:'Annuler', fn:() => {} }); }); await L.calme(p, 700);
    const idt = await p.evaluate(() => TACHES.find(x => !x.fait && x.qui === 'marc').id);
    await p.evaluate(id => document.querySelector(`[data-tmodif="${id}"]`).click(), idt); await L.calme(p, 500);
    const c1 = await p.evaluate(() => ({ fiche:!!document.querySelector('#calque .panneau'), toast:!!(document.getElementById('toast') || { classList:{ contains:() => false } }).classList.contains('on') }));
    v('C : la fiche est ouverte et le message de 0,7 s a disparu', c1.fiche && !c1.toast, c1);
    await p.evaluate(() => { fermerPanneau(); toast('Même action', { lib:'Annuler', fn:() => {} }); ouvrirPanneau('<h2>Essai</h2>'); });
    const c2 = await p.evaluate(() => document.getElementById('toast').classList.contains('on'));
    v('C : le message posé par LA MÊME action (puis un panneau) reste', c2, c2);
    await p.evaluate(() => { fermerPanneau(); document.getElementById('toast').classList.remove('on'); }); }
    if (P.includes('D')) {
    // D : appui long, relâcher SANS clic, plus d'une demi-seconde plus tard le premier toucher répond
    const D = await p.evaluate(async () => {
      const dorm = ms => new Promise(r => setTimeout(r, ms)), bar = document.querySelector('.opg-barre'); if (!bar) return { err:'pas de barre' };
      const cible = bar.querySelector('button, a'); const r = cible.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const T = el => new Touch({ identifier:7, target:el, clientX:x, clientY:y });
      cible.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true, touches:[T(cible)], targetTouches:[T(cible)], changedTouches:[T(cible)] }));
      await dorm(700);   // l'appui long a eu lieu : « Ma barre » monte
      const ouverte = !!document.querySelector('#calque .panneau');
      document.dispatchEvent(new TouchEvent('touchend', { bubbles:true, changedTouches:[T(cible)] }));   // relâcher : AUCUN clic derrière
      await dorm(700); fermerPanneau();
      let recu = 0; cible.addEventListener('click', ev => { recu++; ev.preventDefault(); ev.stopPropagation(); });
      document.dispatchEvent(new TouchEvent('touchend', { bubbles:true, changedTouches:[T(cible)] }));   // un autre doigt se lève
      cible.click(); await dorm(100);
      return { ouverte, recu }; });
    v('D : l\'appui long ouvre « Ma barre »', D.ouverte === true, D);
    v('D : sans clic au relâcher, le premier toucher suivant (0,7 s plus tard) n\'est pas avalé', D.recu === 1, D); }
    await L.fin(c); }
  // E — revue en technicien : « Voir comme Marc »
  if (P.includes('E')) { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); const p = c.p; await L.calme(p, 600);
    await p.evaluate(() => rlChanger('tech', { muet:true })); await L.calme(p, 400); await L.aller(c.p, 'absences'); await L.toucher(c, '[data-atdem]');
    await p.evaluate(() => { for (const [i, x] of [['ad-du', jour(40)], ['ad-au', jour(41)]]) { const e = document.getElementById(i); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); } }); await L.calme(p, 300);
    await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 500);
    const t = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || ''); v('E : le message de la demande propose « Voir comme Marc »', /Voir comme Marc/.test(t), t.slice(0, 100));
    await p.evaluate(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Voir comme Marc/.test(x.textContent)); b && b.click(); }); await L.calme(p, 700);
    const e = await p.evaluate(() => ({ role:ROLE, h1:(document.querySelector('#contenu h1') || {}).textContent, valider:document.querySelectorAll('#contenu [data-aok]').length }));
    v('E : le rôle devient le gérant, l\'écran est « Absences et congés » avec ses boutons « Valider »', e.role === 'patron' && /Absences et congés/.test(e.h1) && e.valider > 0, e);
    await L.fin(c); }
  // F — « RTT » s'écrit en majuscules dans Mes heures
  if (P.includes('F')) { const c = await L.ouvrir({ profil:'iphone', nuit:false, qui:'marc', hash:'accueil' }); const p = c.p; await L.calme(p, 500);
    const f = await p.evaluate(() => ({ un:paieAbsTxt({ RTT:1 }), deux:paieAbsTxt({ 'Congé payé':2, RTT:1 }) }));
    v('F : paieAbsTxt écrit « RTT » (pas « rtt »)', f.un === '1 j RTT' && /RTT/.test(f.deux) && !/rtt/.test(f.deux), f);
    v('F : « congé payé » reste en minuscules dans la phrase', /2 j congé payé/.test(f.deux), f);
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });

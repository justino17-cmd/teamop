// Sonde « double-auth-securite » (étape 3, § 4.4, 4.5, 5.3) : la page « Sécurité » et la case « Gérer la sécurité des connexions ».
// Population : 6 personnes (sessions ?auto=, une par personne), la page lue pour Marc, 3 chiffres = les lignes du tableau, le tableau (ordinateur) et les cartes (téléphone), l'état vide,
// des valeurs LONGUES (nom de 60 signes, appareil de 40, adresse IPv6 de 39, trois raisons), 3 profils tactiles.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/';
(async () => {
  console.log('\n── 1. qui la voit : la case, jamais le nom du rôle ──');
  const vus = {};
  for (const k of ['marc', 'julie', 'sm', 'kb']) {
    const c = await L.ouvrir({ qui:k, profil:'mac' });
    vus[k] = await c.p.evaluate(() => ({ menu:[...document.querySelectorAll('#menu .m-liste a')].some(a => /Sécurité/.test(a.textContent)), droit:droitVoit('securite'), case:droitSp(eqDe(acteur()), 'securite'), palette:palEntrees().some(e => e.l === 'Sécurité'), barre:rlLignes().some(l => l.k === 'securite') }));
    if (k !== 'marc') {
      await c.p.evaluate(() => { location.hash = '#securite'; }); await c.p.waitForTimeout(900);
      vus[k].adresse = await c.p.evaluate(() => ({ route:route, toast:(document.getElementById('toast') || {}).textContent || '', h1:(document.querySelector('#contenu h1') || {}).textContent || '' }));
    }
    v('population : ' + k + ' — session ouverte, aucune erreur', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  v('Marc (administrateur) : la ligne « Sécurité » est au menu, dans la recherche, et la case est la sienne', vus.marc.menu && vus.marc.droit && vus.marc.case && vus.marc.palette && vus.marc.barre, vus.marc);
  for (const k of ['julie', 'sm', 'kb']) v(k + ' : pas de ligne au menu, ni à la recherche, ni par l’adresse #securite (retour à son écran + « Cette page n’est pas pour toi. »)', !vus[k].menu && !vus[k].droit && !vus[k].case && !vus[k].palette && vus[k].adresse.route !== 'securite' && /Cette page n’est pas pour toi\./.test(vus[k].adresse.toast), vus[k]);

  console.log('\n── 2. la page de Marc : trois chiffres = les lignes, comptes verrouillés, tableau ──');
  const c = await L.ouvrir({ qui:'marc', profil:'mac' }); await L.aller(c.p, 'securite');
  const p = await c.p.evaluate(() => ({ h1:document.querySelector('#contenu h1').textContent, sur:(document.querySelector('#contenu .surtitre') || {}).textContent, phrase:(document.querySelector('#contenu .tete .gris') || {}).textContent, kpis:[...document.querySelectorAll('#contenu .sec-kpis .kpi')].map(k => k.textContent.replace(/\s+/g, ' ').trim()),
    lignes:document.querySelectorAll('#contenu .sec-tab tbody tr').length, cartes:document.querySelectorAll('#contenu .sec-carte').length, verrous:[...document.querySelectorAll('#contenu .sec-vl')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), titre:[...document.querySelectorAll('#contenu h2')].map(h => h.textContent),
    pied:(document.querySelector('#contenu .sec-pied') || {}).textContent || '', rouges:document.querySelectorAll('#contenu tr.sec-rouge').length, mots:[...document.querySelectorAll('#contenu .sec-tab tbody .st')].map(s => s.textContent) }));
  v('« Sécurité » : surtitre « Personnel », phrase « Qui s’est connecté de façon inhabituelle ou s’est fait refuser, et quels comptes sont verrouillés. »', p.h1 === 'Sécurité' && /Personnel/i.test(p.sur) && /Qui s’est connecté de façon inhabituelle ou s’est fait refuser, et quels comptes sont verrouillés\./.test(p.phrase), p.phrase);
  v('départ : 2 lignes d’avant (Karim approuvée en rouge, Léa bloquée), donc « 2 connexions inhabituelles ou refusées · 1 bloquée depuis un téléphone · 1 compte verrouillé »', p.lignes === 2 && /^2 connexions inhabituelles ou refusées$/.test(p.kpis[0]) && /^1 bloquée depuis un téléphone$/.test(p.kpis[1]) && /^1 compte verrouillé$/.test(p.kpis[2]), p.kpis);
  v('les chiffres SUIVENT les lignes : ajouter une ligne les fait bouger tout seul (3 · 1 · 1)', await (async () => { await c.p.evaluate(() => { SECU.comptes.tl.histo.unshift({ ts:secuMaint() - 600000, appareil:'Edge · Windows', adresse:'198.51.100.8', raisons:['Appareil jamais utilisé pour ce compte'], resultat:'nombre' }); rendre(); }); await c.p.waitForTimeout(500);
    return (await c.p.evaluate(() => [...document.querySelectorAll('#contenu .sec-kpis .kpi b')].map(b => b.textContent).join('|'))) === '3|1|1'; })());
  v('le deuxième et le troisième chiffre sont en rouge quand ils sont > 0', await c.p.evaluate(() => { const b = [...document.querySelectorAll('#contenu .sec-kpis .kpi b')]; return b[1].style.color.includes('rouge') && b[2].style.color.includes('rouge') && !b[0].style.color; }));
  v('« Comptes verrouillés » : Léa Roux, « Verrouillé depuis hier à 18:02 : bloquée depuis son téléphone », bouton « Déverrouiller »', p.verrous.length === 1 && /Léa Roux/.test(p.verrous[0]) && /Verrouillé depuis hier à 18:02 : bloquée depuis son téléphone/.test(p.verrous[0]) && /Déverrouiller/.test(p.verrous[0]) && p.titre.includes('Comptes verrouillés'), p.verrous);
  v('chaque ligne inhabituelle ou refusée a un filet rouge ET un mot (« Inhabituelle », « Refusée ») : jamais la couleur seule', p.rouges === p.lignes && p.mots.every(m => /Inhabituelle|Refusée/.test(m)) && p.mots.length === p.lignes, p.mots);
  v('le pied dit ce que la page ne montre pas : « Tu vois ici ni mot de passe ni code. »', /Une connexion inhabituelle \(autre appareil, autre réseau, hors des heures de travail, mots de passe faux juste avant\) n’aboutit qu’après approbation sur le téléphone de la personne\. Tu ne vois ici ni mot de passe ni code\./.test(p.pied));
  v('« Déverrouiller » mène au panneau de Léa (case obligatoire, bouton grisé)', await (async () => { await c.p.evaluate(() => document.querySelector('[data-sec2="deverrouiller|lr"]').click()); await c.p.waitForTimeout(500);
    return c.p.evaluate(() => /Déverrouiller le compte de Léa/.test(document.querySelector('#calque .panneau h2').textContent) && document.getElementById('sec-tel-ok').disabled); })());
  await c.p.evaluate(() => fermerPanneau());

  console.log('\n── 3. l’état vide, les valeurs longues ──');
  await c.p.evaluate(() => { Object.values(SECU.comptes).forEach(x => { x.histo = []; x.verrou = null; }); rendre(); }); await c.p.waitForTimeout(500);
  const vide = await c.p.evaluate(() => ({ kpis:[...document.querySelectorAll('#contenu .sec-kpis .kpi b')].map(b => b.textContent), vide:(document.querySelector('#contenu .sec-vide') || {}).textContent || '', tab:!!document.querySelector('#contenu .sec-tab'), verr:!!document.querySelector('#contenu .sec-verrous') }));
  v('état vide : « Rien d’inhabituel pour l’instant. », trois « Aucune », pas de tableau, pas de carte rouge', /Rien d’inhabituel pour l’instant\./.test(vide.vide) && vide.kpis.join('|') === 'Aucune|Aucune|Aucune' && !vide.tab && !vide.verr, vide);
  await c.p.evaluate(() => { const p = EQUIPE.find(x => x.k === 'tl'); p.prenom = 'Tom-Étienne-Alexandre-Jean-Baptiste'; p.nom = 'de la Tour-Maubourg-Saint-Pierre'; const c = SECU.comptes.tl; c.histo = [{ ts:secuMaint() - 3600000, appareil:'Navigateur-très-long · Linux-X', adresse:'2001:0db8:85a3:0000:0000:8a2e:0370:7334', raisons:['Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)'], resultat:'bloquee' }]; c.verrou = { le:secuMaint() - 7200000, par:'telephone', jusqua:null, n:1 }; rendre(); }); await c.p.waitForTimeout(500);
  const hv = await c.p.evaluate(() => ({ nom:EQUIPE.find(x => x.k === 'tl').prenom + ' ' + EQUIPE.find(x => x.k === 'tl').nom, l:document.querySelectorAll('#contenu .sec-tab tbody tr').length }));
  v('population : un nom de 60 signes, un appareil de 40, une adresse IPv6 de 39, trois raisons', hv.nom.length >= 60 && hv.l === 1, hv.nom.length);
  const dev = await L.deborde(c); v('mac : rien ne déborde avec les valeurs longues', dev.bouge === 0, dev);
  await L.capture(c, CAP + 'securite-longues-mac.png'); v('aucune erreur JavaScript (mac)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  console.log('\n── 4. sur téléphone et iPad portrait : des CARTES, jamais de défilement latéral ──');
  for (const [pf, nuit] of [['ipad', false], ['iphone', false], ['iphone', true], ['android', true], ['petit', false]]) {
    const d = await L.ouvrir({ qui:'marc', profil:pf, nuit }); await L.aller(d.p, 'securite');
    await d.p.evaluate(() => { const p = EQUIPE.find(x => x.k === 'tl'); p.prenom = 'Tom-Étienne-Alexandre-Jean-Baptiste'; p.nom = 'de la Tour-Maubourg-Saint-Pierre'; const c = SECU.comptes.tl; c.histo = [{ ts:secuMaint() - 3600000, appareil:'Navigateur-très-long · Linux-X', adresse:'2001:0db8:85a3:0000:0000:8a2e:0370:7334', raisons:['Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)'], resultat:'bloquee' }, ...SECU.comptes.kb.histo.map(h => ({ ...h }))]; rendre(); }); await d.p.waitForTimeout(500);
    const m = await d.p.evaluate(() => ({ cartes:document.querySelectorAll('#contenu .sec-carte').length, tab:getComputedStyle(document.querySelector('#contenu .sec-tab')).display, btn:[...document.querySelectorAll('#contenu .sec-vl .btn')].map(b => Math.round(b.getBoundingClientRect().height)) }));
    const dev2 = await L.deborde(d), doigts = await L.doigts(d.p, '#contenu');
    v(pf + (nuit ? ' nuit' : ' jour') + ' : des cartes (2 de plus que le tableau), le tableau est caché', m.cartes >= 2 && m.tab === 'none', m);
    v(pf + (nuit ? ' nuit' : ' jour') + ' : aucun débordement horizontal (contre la largeur posée du profil)', dev2.bouge === 0 && dev2.seconde <= d.largeur + 1, dev2);
    v(pf + (nuit ? ' nuit' : ' jour') + ' : cibles ≥ 44 px, champs ≥ 16 px', doigts.petits.length === 0 && doigts.champs.length === 0, doigts);
    v(pf + (nuit ? ' nuit' : ' jour') + ' : aucun texte écrasé', doigts.ecrases.length === 0, doigts.ecrases);
    await L.capture(d, CAP + 'securite-' + pf + (nuit ? '-nuit' : '-jour') + '.png');
    v(pf + ' : aucune erreur JavaScript', d.err.length === 0, d.err.slice(0, 3)); await L.fin(d);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

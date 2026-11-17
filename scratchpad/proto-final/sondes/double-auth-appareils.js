// Sonde « double-auth-appareils » (étape 3, § 9) : chaque écran de cette étape, profil par profil, jour ET nuit — débordement, cibles ≥ 44 px, champs ≥ 16 px, textes écrasés,
// le NOMBRE lisible et au-dessus de la pastille (petit 320 × 568), le téléphone qui ne recouvre rien d'utile (1100 px et plus), la bande « Tu vois l'application comme … », les encoches posées.
// Population : 6 profils jour + 3 profils nuit ; 8 écrans (fiche Connexion, panneau « Mot de passe provisoire », « Nouveau téléphone », « Déverrouiller », bandeau d'Équipe, confirmation, bande, Mon compte) ;
// toutes les valeurs LONGUES posées (nom de 60 signes, appareil de 40, adresse IPv6 de 39).
// ⛔ Les captures vont hors du dépôt ; les REGARDER (outil Read) : ce que cette sonde ne mesure pas, l'œil le voit.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/';
const PROFILS = [['mac', false], ['mac720', false], ['windows', true], ['ipad', false], ['iphone', false], ['iphone', true], ['android', true], ['petit', false], ['petit', true]];
const preparer = c => c.p.evaluate(() => { const p = EQUIPE.find(x => x.k === 'tl'); p.prenom = 'Tom-Étienne-Alexandre-Jean-Baptiste'; p.nom = 'de la Tour-Maubourg-Saint-Pierre'; secuTelCreer('marc', 'iPhone de Marc', '246802'); const x = SECU.comptes.lr; x.verrou = { le:secuMaint() - 20 * 3600000, par:'telephone', jusqua:null, n:1 };
  SECU.comptes.tl.histo = [{ ts:secuMaint() - 3600000, appareil:'Navigateur-très-long · Linux-X', adresse:'2001:0db8:85a3:0000:0000:8a2e:0370:7334', raisons:['Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)'], resultat:'bloquee' }]; });
const mesurer = async (c, nom, zone, o) => { o = o || {}; const dev = await L.deborde(c), d = await L.doigts(c.p, zone);
  const t = c.profil + (c.nuit ? ' nuit' : ' jour') + ' · ' + nom;
  v(t + ' : aucun débordement horizontal (contre la largeur posée)', dev.bouge === 0 && dev.seconde <= c.largeur + 1, dev);
  v(t + ' : cibles ≥ 44 px', d.petits.length === 0, d.petits);
  v(t + ' : champs ≥ 16 px (pas de zoom d’iOS)', d.champs.length === 0, d.champs);
  v(t + ' : aucun texte écrasé', d.ecrases.length === 0, d.ecrases); };
(async () => {
  for (const [pf, nuit] of PROFILS) {
    const c = await L.ouvrir({ qui:'marc', profil:pf, nuit }); c.nuit = nuit; const cap = (n) => L.capture(c, CAP + 'app-' + n + '-' + pf + (nuit ? '-nuit' : '-jour') + '.png');
    await preparer(c); const tag = pf + (nuit ? ' nuit' : ' jour');
    // 1. Équipe : le bandeau rouge et la fiche « Connexion » (une personne verrouillée, une au nom très long)
    await L.aller(c.p, 'equipe'); await mesurer(c, 'Équipe (bandeau rouge, cartes)', '#contenu'); if (['mac', 'iphone', 'petit'].includes(pf)) await cap('equipe');
    await c.p.evaluate(() => eqFiche('lr')); await c.p.waitForTimeout(600); await mesurer(c, 'fiche de Léa (Connexion, verrouillée)', '#calque .panneau');
    if (['mac', 'iphone', 'android'].includes(pf)) { await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); const b = p.querySelector('.cn-acces'); if (b) b.scrollIntoView({ block:'center' }); }); await c.p.waitForTimeout(300); await cap('fiche-connexion'); }
    await c.p.evaluate(() => eqFiche('tl')); await c.p.waitForTimeout(500); await mesurer(c, 'fiche de Tom (nom de 60 signes)', '#calque .panneau');
    // 2. les panneaux de l'étape : Nouveau téléphone, Déverrouiller, Mot de passe provisoire
    await c.p.evaluate(() => { fermerPanneau(); secuPanTelephone('kb'); }); await c.p.waitForTimeout(500); await mesurer(c, '« Nouveau téléphone »', '#calque .panneau'); if (['iphone', 'android'].includes(pf)) await cap('nouveau-telephone');
    await c.p.evaluate(() => { fermerPanneau(); secuPanDeverrouiller('lr'); }); await c.p.waitForTimeout(500); await mesurer(c, '« Déverrouiller »', '#calque .panneau');
    await c.p.evaluate(() => { fermerPanneau(); secuPanProv('tl', 'L’ancien téléphone de Tom-Étienne-Alexandre-Jean-Baptiste est révoqué : il ne peut plus approuver de connexion.'); }); await c.p.waitForTimeout(500); await mesurer(c, '« Mot de passe provisoire »', '#calque .panneau');
    const prov = await c.p.evaluate(() => { const e = document.querySelector('[data-sec="provisoire"]'), r = e.getBoundingClientRect(); return { ok:r.right <= innerWidth && r.left >= 0, larg:Math.round(r.width), haut:Math.round(r.height) }; });
    v(tag + ' · le mot de passe provisoire (18 signes, 22 px) tient dans l’écran', prov.ok, prov); if (['mac', 'petit'].includes(pf)) await cap('provisoire');
    await c.p.evaluate(() => { secuProvTermine(); fermerPanneau(); });
    // 3. la confirmation : le NOMBRE lisible, au-dessus de la pastille, sans recouvrement par le téléphone
    await c.p.evaluate(() => { secuConfirmer('marc', 'banque-ouvrir', null, {}); }); await c.p.waitForTimeout(700);
    const cf = await c.p.evaluate(() => { const z = document.querySelector('#sec-conf .sec-conf-c'), n = document.querySelector('#sec-conf [data-sec="nombre"]'), r = z.getBoundingClientRect(), rn = n.getBoundingClientRect(), fs = parseFloat(getComputedStyle(n).fontSize);
      const past = document.querySelector('#sec-conf [data-ops-ouvrir]'), rp = past ? past.getBoundingClientRect() : null, ph = document.querySelector('#opsec .ops-fenetre'), rph = ph && getComputedStyle(ph).display !== 'none' ? ph.getBoundingClientRect() : null;
      const sec = document.getElementById('sec-conf').getBoundingClientRect();
      return { carte:{ l:Math.round(r.left), r:Math.round(r.right), t:Math.round(r.top), b:Math.round(r.bottom) }, nombre:{ t:Math.round(rn.top), b:Math.round(rn.bottom), h:Math.round(rn.height), fs:Math.round(fs) }, dansEcran:rn.top >= 0 && rn.bottom <= innerHeight, pastille:rp ? { t:Math.round(rp.top), b:Math.round(rp.bottom), h:Math.round(rp.height) } : null,
        telRecouvre:!!(rph && !(rph.right <= r.left || rph.left >= r.right || rph.bottom <= r.top || rph.top >= r.bottom)), bas:Math.round(innerHeight - r.bottom), defile:z.scrollHeight > z.clientHeight + 1 }; });
    v(tag + ' · confirmation : le NOMBRE est entièrement lisible (chiffres ≥ 56 px) et dans l’écran', cf.nombre.fs >= 56 && cf.dansEcran, cf);
    if (cf.pastille) v(tag + ' · confirmation : le nombre est AU-DESSUS de la pastille « Ouvrir OP Security » (qui fait ≥ 44 px)', cf.nombre.b <= cf.pastille.t + 1 && cf.pastille.h >= 44, cf);
    v(tag + ' · confirmation : le téléphone posé à droite ne recouvre pas la carte (1100 px et plus)', !cf.telRecouvre, cf);
    await mesurer(c, 'fenêtre de confirmation', '#sec-conf'); if (['mac720', 'iphone', 'petit', 'ipad'].includes(pf)) await cap('confirmation');
    await c.p.evaluate(() => secuConfFermer(true));
    // 4. la bande « Tu vois l'application comme … » : fine, toujours visible, ne recouvre pas le haut de l'écran
    await c.p.evaluate(() => { SECU.vraie = 'marc'; sessionOuvrir('sm'); secuBande(); }); await c.p.waitForTimeout(900);
    const bd = await c.p.evaluate(() => { const b = document.querySelector('.sec-bande'), r = b.getBoundingClientRect(), bt = b.querySelector('button').getBoundingClientRect(); const prem = [...document.querySelectorAll('#contenu h1, #contenu .tete')].map(e => e.getBoundingClientRect().top).filter(x => x > 0)[0];
      return { h:Math.round(r.height), top:Math.round(r.top), btn:Math.round(bt.height), texte:b.textContent.replace(/\s+/g, ' ').trim(), debordeTexte:b.scrollWidth > b.clientWidth + 1, premier:Math.round(prem || 0), padding:parseFloat(getComputedStyle(document.body).paddingTop) }; });
    v(tag + ' · bande : en haut, fixe, « Tu vois l’application comme Sophie. » + « Revenir à mon compte », bouton ≥ 44 px', bd.top === 0 && bd.h >= 40 && bd.btn >= 44 && /Tu vois l’application comme Sophie\./.test(bd.texte) && /Revenir à mon compte/.test(bd.texte), bd);
    v(tag + ' · bande : ne recouvre rien (le contenu part SOUS elle)', bd.premier === 0 || bd.premier >= bd.h - 2 || bd.padding >= bd.h - 1, bd);
    await mesurer(c, 'bande', '.sec-bande'); if (['mac', 'iphone'].includes(pf)) await cap('bande');
    await c.p.evaluate(() => { SECU.vraie = null; secuBande(); });
    v(tag + ' : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

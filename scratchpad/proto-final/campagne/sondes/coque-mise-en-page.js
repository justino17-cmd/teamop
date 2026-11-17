// Campagne « coque » (17 novembre 2026) — la MISE EN PAGE de la coque sur les sept profils, jour ET nuit : écran de chargement, lien, connexion
// (avec une erreur LONGUE et un identifiant long), première connexion, menu (colonne ou feuille), barre du bas, « Ma barre », recherche, aide clavier.
// Pour chaque : aucun glissement latéral (contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px, rien de coupé sous l'encoche
// ni sous la barre, texte écrasé ; une capture par écran (à REGARDER). Usage : PROFIL=… NUIT=1 node coque-mise-en-page.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'iphone', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit', 'ipad'].includes(PROFIL), PHONE = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const tag = `${PROFIL}${NUIT ? '-nuit' : ''}`;
(async () => {
  let c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: null, attente: 300 }), p = c.p;
  const mesure = async (nom, zone, opt) => {
    opt = opt || {};
    await L.calme(p, 700);
    const d = await L.deborde(c); v(`${nom} : aucun glissement latéral (page ${d.seconde} px pour ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur + 1, d);
    if (c.doigt && !opt.sansDoigts) { const g = await L.doigts(p, zone); v(`${nom} : cibles au doigt ≥ 44 px`, g.petits.length === 0, g.petits.slice(0, 6)); v(`${nom} : champs ≥ 16 px (pas de zoom d’iOS)`, g.champs.length === 0, g.champs); v(`${nom} : aucun texte écrasé`, g.ecrases.length === 0, g.ecrases); }
    // rien ne sort de l'écran : tout élément visible de la zone reste dans la largeur
    const sort = await p.evaluate(({ z, L }) => [...document.querySelectorAll(z + ' *')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && e.offsetParent !== null && cs.position !== 'fixed' && (r.right > L + 1 || r.left < -1) && !e.closest('.pl-defile,[data-defile],svg'); }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 25) + ' ' + Math.round(e.getBoundingClientRect().left) + '→' + Math.round(e.getBoundingClientRect().right)), { z: zone || 'body', L: c.largeur });
    v(`${nom} : aucun élément ne sort de l’écran`, sort.length === 0, sort);
    await p.screenshot({ path: CAP + `mep-${nom.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${tag}.png` });
  };
  await p.waitForFunction(() => !!document.getElementById('cn-form-lien'), null, { timeout: 12000 }).catch(() => {});
  await mesure('lien', '#cnx');
  // erreur longue sous le champ du lien
  await p.evaluate(() => cnxDire('Lien de connexion invalide — redemande-le à ton entreprise, qui te l’a envoyé par e-mail à l’adresse que tu lui as donnée.'));
  await mesure('lien avec erreur longue', '#cnx');
  await p.evaluate(() => { ESPACE = ESPACE_SLUG; cnxMontrer(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('cn-id').value = 'prenom.nomdefamilletreslongquidepassetoutelaligne'; });
  await mesure('connexion', '#cnx');
  await p.evaluate(() => { const e = document.getElementById('cn-err'); e.style.color = 'var(--doux)'; e.textContent = 'Demande à l’administrateur de ton entreprise de te poser un nouveau mot de passe provisoire : il le fait dans Équipe, sur ta fiche.'; });
  await mesure('connexion avec aide', '#cnx');
  await p.evaluate(() => { cnxDire('Ton compte a été désactivé par ton entreprise : tu ne peux plus te connecter. Contacte ton administrateur.'); });
  await mesure('connexion compte désactivé', '#cnx');
  await p.evaluate(() => cnxPremier(eqDe('marc'), true)); await p.waitForTimeout(300);
  await p.evaluate(() => cnxDire('Trop court : 8 caractères minimum, sans compter les espaces.'));
  await mesure('premiere connexion', '#cnx');
  // l'application : retirer l'écran de connexion et entrer comme Marc
  await p.evaluate(() => { document.getElementById('cnx')?.remove(); sessionOuvrir('marc'); }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('#nv [data-nv="fermer"]')?.click()); await p.waitForTimeout(400);
  await p.evaluate(() => { window.horsLigneDebut = function () { }; });
  await mesure('accueil', '#contenu');
  if (PHONE || PROFIL === 'ipad') {
    if (await p.locator('.tt-menu').first().isVisible().catch(() => false)) {
      await L.toucher(c, '.tt-menu'); await mesure('feuille menu', '#calque .panneau');
      const bas = await p.evaluate(() => { const f = document.querySelector('#calque .panneau'); f.scrollTop = 1e6; const b = f.querySelector('.cn-out'); const r = b.getBoundingClientRect(); return { bas: Math.round(r.bottom), h: innerHeight }; });
      v(`feuille menu : « Se déconnecter » se voit en bas de la feuille (${bas.bas} ≤ ${bas.h})`, bas.bas <= bas.h);
      await p.screenshot({ path: CAP + `mep-feuille-bas-${tag}.png` });
      await L.toucher(c, '[data-mabarre="~ouvrir"]'); await mesure('ma barre', '#calque .panneau'); await L.ranger(p);
    }
    const hb = await p.evaluate(() => { const b = document.querySelector('.opg-barre'); if (!b || b.offsetParent === null) return null; const r = b.getBoundingClientRect(); const t = [...b.querySelectorAll('.opg-tab')].map(e => { const q = e.getBoundingClientRect(); return { n: e.querySelector('.t-n').textContent.trim(), w: Math.round(q.width), coupe: e.querySelector('.t-n').scrollWidth > e.querySelector('.t-n').clientWidth + 1 }; }); return { bas: Math.round(r.bottom), h: innerHeight, t }; });
    if (hb) { v(`barre du bas : aucun mot coupé (${hb.t.map(x => x.n + ' ' + x.w).join(' · ')})`, hb.t.every(x => !x.coupe), hb.t); v(`barre du bas : au-dessus du bas de l’écran (${hb.bas} ≤ ${hb.h})`, hb.bas <= hb.h); }
  } else {
    await mesure('menu colonne', '#menu', { sansDoigts: true });
    const col = await p.evaluate(() => { const m = document.querySelector('#menu'); const r = m.getBoundingClientRect(); const out = m.querySelector('.cn-out').getBoundingClientRect(); return { w: Math.round(r.width), bas: Math.round(out.bottom), h: innerHeight }; });
    v(`menu colonne : « Se déconnecter » reste visible (${col.bas} ≤ ${col.h})`, col.bas <= col.h, col);
    await p.keyboard.press('Control+k'); await L.calme(p, 400); await mesure('recherche', '#pal', { sansDoigts: true });
    await p.keyboard.type('compt'); await L.calme(p, 300); await p.keyboard.press('Escape');
    await p.keyboard.press('Shift+?'); await L.calme(p, 500); await mesure('aide clavier', '#calque .panneau', { sansDoigts: true });
  }
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });

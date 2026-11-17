// SONDE « bouton Retour » — les PARCOURS (17 novembre 2026) : ce que les calques isolés ne montrent pas.
//   1. Accueil → Clients → fiche d'un client → « ＋ Nouvelle intervention » → Retour, Retour, Retour : la fiche, Clients, Accueil (quatre rôles : un parcours par rôle) ;
//   2. une fenêtre qui MÈNE à un autre écran (la feuille « Menu », la recherche) : aucune entrée fantôme, un Retour ramène à l'écran d'avant ;
//   3. rechargé fenêtre ouverte : rien ne se rouvre, UN Retour mène à l'écran d'avant ;
//   4. la Comptabilité plein cadre : Retour la quitte sans sortir de l'application ; « ‹ OP GESTION » ne laisse pas sa fenêtre derrière lui ;
//   5. un seul mécanisme : UN pushState et UN écouteur de popstate dans la page (l'atelier n'a plus le sien) ;
//   6. la visite guidée (prototype « nu ») se ferme par Retour.
// PROFIL=android|iphone|mac (défaut android). Rend « N ✓ · M ✗ ».
const fs = require('fs'), path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android';
const ROLES = { marc: { ecran: 'clients', ligne: '[data-go^="client-x-"]', creer: true }, julie: { ecran: 'clients', ligne: '[data-go^="client-x-"]', creer: true },
  sm: { ecran: 'majournee', ligne: '[data-rl^="go|inter-x-"]', creer: false }, kb: { ecran: 'majournee', ligne: '[data-rl^="go|inter-x-"]', creer: false } };
async function parcoursRole(qui) {
  const R = ROLES[qui], c = await L.ouvrir({ profil: PROFIL, qui }), p = c.p, nom = qui + ' · ' + PROFIL;
  await L.aller(p, 'accueil'); const a0 = await C.hist(p);
  await L.aller(p, R.ecran); await C.defiler(p);
  if (!await L.toucher(c, R.ligne)) { v(nom + ' : une fiche s\'ouvre depuis ' + R.ecran, false); await L.fin(c); return; }
  await L.calme(p, 400); const f = await C.hist(p);
  v(nom + ' : la fiche est une page (adresse ' + f.h + ')', /^#(client|inter)-x-/.test(f.h), f);
  // le calque posé par-dessus la fiche : « ＋ Nouvelle intervention » si le rôle la voit, sinon la feuille « Menu » (téléphone) ou un menu contextuel (ordinateur)
  let genre = '';
  if (R.creer && await L.toucher(c, '[data-creer]')) genre = 'fenetre';
  else if (C.tel(c) && await L.toucher(c, '.tt-menu[data-menu="ouvrir"]')) genre = 'panneau';
  else if (!C.tel(c)) { try { await p.locator('#contenu [data-go]').first().click({ button: 'right', timeout: 3000 }); await L.calme(p, 250); genre = 'menu'; } catch (e) {} }
  const o = await C.hist(p);
  v(nom + ' : un calque est ouvert par-dessus la fiche (' + genre + ') sans changer l\'adresse', genre && o.ouverts.includes(genre) && o.h === f.h && o.pousse === 1, o);
  await C.retour(p); const r1 = await C.hist(p);
  v(nom + ' : Retour 1 : la fenêtre se ferme, on reste sur la fiche', r1.ouverts === '' && r1.h === f.h, r1);
  await C.retour(p); const r2 = await C.hist(p);
  v(nom + ' : Retour 2 : ' + R.ecran, r2.h === '#' + R.ecran && r2.ouverts === '', r2);
  await C.retour(p); const r3 = await C.hist(p);
  v(nom + ' : Retour 3 : Accueil', r3.h === a0.h, [r3.h, a0.h]);
  v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
}
(async () => {
  // ── 5. un seul mécanisme (lu dans le code, commentaires retirés) ──
  const page = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8'), code = page.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');
  const nPush = (code.match(/history\.pushState\(/g) || []).length, nPop = (code.match(/addEventListener\('popstate'/g) || []).length, nBack = (code.match(/history\.(back|go)\(/g) || []).length;
  v('un seul mécanisme : UN pushState dans la page (pas un par calque, pas un pour l\'atelier)', nPush === 1, nPush);
  v('un seul mécanisme : UN écouteur de popstate dans la page', nPop === 1, nPop);
  v('un seul mécanisme : les reculs d\'historique ne se font que dans le mécanisme commun (≤ 4 appels : le recul, l\'avancer repoussé, le retour de la Comptabilité, la commande vocale « précédent »)', nBack >= 1 && nBack <= 4, nBack);
  // ── 1. le parcours, quatre rôles ──
  for (const qui of Object.keys(ROLES)) await parcoursRole(qui);

  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p, tel = C.tel(c);
  // ── 2. une fenêtre qui mène à un autre écran : pas d'entrée fantôme ──
  await L.aller(p, 'accueil'); const a0 = await C.hist(p);
  if (tel) {
    await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); const m1 = await C.hist(p);
    v('feuille « Menu » ouverte : UNE entrée', m1.pousse === 1 && m1.n === a0.n + 1, m1);
    const ok = await L.toucher(c, '#calque [data-go="clients"]'); await C.attendre(p, 700); const m2 = await C.hist(p);
    v('« Clients » depuis la feuille : on y est, la feuille est fermée, aucune entrée de la feuille ne reste', ok && m2.h === '#clients' && m2.ouverts === '' && m2.pousse === 0 && !(m2.st && m2.st.cal), m2);
    v('… l\'historique ne compte que l\'écran d\'avant et le nouveau (' + a0.n + ' → ' + m2.n + ')', m2.n <= a0.n + 1, [a0.n, m2.n]);
    await C.retour(p); const m3 = await C.hist(p);
    v('… UN Retour ramène à l\'Accueil (pas à l\'Accueil-avec-sa-feuille)', m3.h === '#accueil' && m3.ouverts === '', m3);
    await C.avancer(p); const m4 = await C.hist(p);
    v('… Avancer remène à Clients, sans rouvrir la feuille', m4.h === '#clients' && m4.ouverts === '', m4);
  } else {
    await p.keyboard.press('Control+k'); await L.calme(p, 300); const m1 = await C.hist(p);
    v('recherche ouverte : UNE entrée', m1.ouverts === 'recherche' && m1.pousse === 1, m1);
    await p.keyboard.type('Clients'); await L.calme(p, 250); await p.keyboard.press('Enter'); await C.attendre(p, 800); const m2 = await C.hist(p);
    v('une entrée de la recherche mène à un autre écran : la recherche est fermée, aucune entrée ne reste', m2.h !== a0.h && m2.ouverts === '' && m2.pousse === 0 && !(m2.st && m2.st.cal), m2);
    await C.retour(p); const m3 = await C.hist(p);
    v('… UN Retour ramène à l\'Accueil', m3.h === '#accueil' && m3.ouverts === '', m3);
  }
  // ── 3. rechargé fenêtre ouverte ──
  await L.aller(p, 'accueil'); await L.aller(p, 'clients'); const z0 = await C.hist(p);
  await L.toucher(c, '[data-action="clientNouveau"]'); const z1 = await C.hist(p);
  v('rechargement : une fenêtre est ouverte (entrée posée)', z1.ouverts === 'panneau' && z1.pousse === 1, z1);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500); await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await C.attendre(p, 900); const z2 = await C.hist(p);
  v('rechargé : la fenêtre ne se rouvre pas, aucune entrée orpheline (pile vide, état sans marqueur)', z2.ouverts === '' && z2.pousse === 0 && !(z2.st && z2.st.cal) && z2.h === z0.h, z2);
  await C.retour(p); const z3 = await C.hist(p);
  v('… UN Retour mène à l\'écran d\'avant (l\'entrée orpheline a été reculée au chargement)', z3.h === '#accueil', [z3.h, z2.n, z3.n]);
  // ── 3 bis. une adresse changée à la main (lien, saisie) alors qu'une fenêtre est ouverte : la fenêtre part avec l'écran, la pile repart de zéro ──
  await L.aller(p, 'accueil'); await L.toucher(c, '.tt-menu[data-menu="ouvrir"], [data-creer]'); const y1 = await C.hist(p);
  await p.evaluate(() => { location.hash = '#devis'; }); await C.attendre(p, 900); const y2 = await C.hist(p);
  v('adresse changée à la main fenêtre ouverte : on arrive, la fenêtre est fermée, la pile est vide', y1.pousse === 1 && y2.h === '#devis' && y2.ouverts === '' && y2.pousse === 0 && y2.pile === '', [y1, y2]);
  await L.toucher(c, '[data-opd="devis"], [data-dv="nouveau"]'); await C.attendre(p, 500); const y3 = await C.hist(p);
  await L.ranger(p); await C.attendre(p, 600); const y4 = await C.hist(p);
  v('… et la fenêtre suivante repart d\'une pile saine (ouvrir : 1 entrée, fermer : 0, plus d\'état)', y3.pousse === 1 && y4.pousse === 0 && y4.pile === '' && !(y4.st && y4.st.cal), [y3, y4]);
  // ── 4. la Comptabilité dans son cadre ──
  await L.aller(p, 'accueil'); const k0 = await C.hist(p);
  const entree = tel ? async () => { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); return L.toucher(c, '#calque [data-go="comptabilite"]'); } : async () => L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
  const okc = await entree(); await C.attendre(p, 1500); const k1 = await p.evaluate(() => ({ h: location.hash, ouvert: !!document.querySelector('#cpsys:not([hidden])'), pathname: location.pathname }));
  v('la Comptabilité s\'ouvre dans son cadre plein écran', okc && k1.ouvert && k1.h === '#comptabilite', k1);
  if (k1.ouvert) {
    const cadre = p.frames().find(f => /prototype-comptabilite/.test(f.url())); if (cadre) { await cadre.evaluate(() => { const b = document.querySelector('[data-route], [data-r], nav button, aside button, .menu button'); if (b) b.click(); }).catch(() => {}); await p.waitForTimeout(500); }
    await C.retour(p); const k2 = await p.evaluate(() => ({ h: location.hash, ouvert: !!document.querySelector('#cpsys:not([hidden])'), pathname: location.pathname, appli: !!document.getElementById('contenu') }));
    v('Retour depuis la Comptabilité : on la quitte, on est de nouveau dans l\'application (Accueil), le cadre est fermé', !k2.ouvert && k2.h === '#accueil' && k2.pathname === k1.pathname && k2.appli, k2);
    // « ‹ OP GESTION » : la fenêtre ne laisse pas son entrée derrière elle
    await entree(); await C.attendre(p, 1200);
    const sortie = await L.toucher(c, '#cpsys [data-cpsys="retour"]'); await C.attendre(p, 900); const k3 = await C.hist(p);
    v('« ‹ OP GESTION » : retour à l\'Accueil, cadre fermé', sortie && k3.h === '#accueil' && !(await p.evaluate(() => !!document.querySelector('#cpsys:not([hidden])'))), k3);
    await C.retour(p); const k4 = await p.evaluate(() => ({ h: location.hash, ouvert: !!document.querySelector('#cpsys:not([hidden])') }));
    v('… et UN Retour ne ROUVRE PAS la Comptabilité (aucune entrée fantôme derrière « ‹ OP GESTION »)', !k4.ouvert, k4);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  // ── 5 bis. un historique qui ne répond pas (cadre, artefact) : le mécanisme s'éteint de lui-même, l'application reste utilisable ──
  const m = await L.ouvrir({ profil: PROFIL, qui: 'marc', init: () => { try { history.go = function () {}; history.back = function () {}; } catch (e) {} } }); const mp = m.p;
  await L.aller(mp, 'accueil'); await L.aller(mp, 'clients');
  for (let i = 0; i < 3; i++) { await mp.evaluate(() => ouvrirPanneau('<h2>Essai</h2>')); await mp.waitForTimeout(300); await mp.evaluate(() => fermerPanneau()); await mp.waitForTimeout(1900); }
  const q1 = await C.hist(mp);
  v('historique muet : après deux reculs sans réponse, le mécanisme s\'éteint (plus d\'entrée posée)', q1.off === true, q1);
  const nAvant = q1.n; await mp.evaluate(() => ouvrirPanneau('<h2>Essai</h2>')); await mp.waitForTimeout(400); await mp.evaluate(() => fermerPanneau()); await mp.waitForTimeout(400); const q2 = await C.hist(mp);
  v('… éteint : ouvrir et fermer une fenêtre ne pose plus rien dans l\'historique', q2.n === nAvant, [nAvant, q2.n]);
  await mp.evaluate(() => aller('devis')); await mp.waitForTimeout(700); const q3 = await C.hist(mp);
  v('… et la navigation marche toujours (aller « devis »)', q3.h === '#devis', q3);
  v('aucune erreur de page (historique muet)', m.err.length === 0, m.err.slice(0, 3)); await L.fin(m);

  // ── 6. la visite guidée (prototype « nu ») ──
  const g = await L.ouvrir({ profil: PROFIL, qui: 'marc', app: false }); const gp = g.p;
  await L.aller(gp, 'accueil'); await L.aller(gp, 'clients');
  await gp.evaluate(() => { try { gdCommencer(0, 'az'); } catch (e) {} }); await C.attendre(gp, 1500); const g1 = await C.hist(gp);
  // la visite guide : elle change d'écran toute seule (c'est SA navigation, pas celle du Retour) — on mesure donc par rapport à l'écran où elle s'est arrêtée
  v('la visite guidée s\'ouvre : une entrée d\'historique', g1.ouverts.includes('visite') && g1.pousse >= 1 && g1.st && g1.st.cal >= 1, g1);
  await C.retour(gp); const g2 = await C.hist(gp);
  v('Retour ferme la visite (rien d\'ouvert, pile vide, l\'écran dessous est resté où elle l\'avait laissé)', g2.ouverts === '' && g2.pousse === 0 && g2.h === g1.h && !(g2.st && g2.st.cal), [g1.h, g2]);
  await C.retour(gp); const g3 = await C.hist(gp);
  v('… Retour encore : l\'écran d\'avant', g3.h !== g1.h && g3.ouverts === '', [g1.h, g3]);
  v('aucune erreur de page (prototype nu)', g.err.length === 0, g.err.slice(0, 3)); await L.fin(g);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

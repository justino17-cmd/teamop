// Le guide des nouveautés à la VRAIE première connexion (écran de connexion, double authentification, mot de passe à soi — le parcours d'une personne
// qui arrive) : il s'ouvre tout seul, une seule fois ; une reconnexion du même compte ne le rouvre pas ; un autre compte du même appareil l'a, lui, à son tour.
// Usage : PROFIL=mac|iphone QUI=marc,julie,sm node guide-premiere-connexion.js
const S = require('./secu-commun.js'), G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUIS = (process.env.QUI || 'marc').split(','), TEL = G.TEL.includes(PROFIL);
(async () => {
  const c = await S.ouvrir({ profil:PROFIL }), p = c.p;
  let premier = true;
  for (const QUI of QUIS) {
    const tag = `${QUI}/${PROFIL}`;
    if (!premier) { await L.toucher(c, TEL ? '#contenu .tt-menu' : '#menu [data-cnx="sortir"]'); if (TEL) await L.toucher(c, '#calque [data-cnx="sortir"]'); await L.calme(p, 800); } premier = false;
    await S.activer(c, QUI, { guide:true, mdp:'Guide-Premier-Passage-' + QUI });
    await p.waitForTimeout(1600);
    v(`${tag} : le guide s'ouvre TOUT SEUL à la première connexion`, await G.ouvert(p));
    const pg = await G.pages(c);
    v(`${tag} : …avec les cartes de son rôle (${G.QUIS[QUI]} : ${pg.length} cartes, la première « ${pg[0] && pg[0].t} »)`, pg.length >= 2 && pg[0].k === 'menu', pg.map(x => x.k));
    await L.capture(c, G.CAP + `connexion-${PROFIL}-${QUI}.png`);
    const surtout = await p.evaluate(() => { const z = document.getElementById('nv'), r = z.getBoundingClientRect(); return { devant:document.elementFromPoint(innerWidth / 2, innerHeight - 30) === z || z.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 30)), cnx:!!document.getElementById('cnx') }; });
    v(`${tag} : le guide est au-dessus de l'application (rien ne le recouvre) et l'écran de connexion est parti`, surtout.devant && !surtout.cnx, surtout);
    await L.toucher(c, '#nv .nv-tard'); await L.calme(p, 500);
    v(`${tag} : « Plus tard » le ferme`, !(await G.ouvert(p)));
    // reconnexion du MÊME compte (sans rejouer la double authentification : la fonction que la connexion appelle)
    await p.evaluate(() => { const k = SESSION; sessionFermer(); sessionOuvrir(k); }); await p.waitForTimeout(2200);
    v(`${tag} : une reconnexion du même compte ne le rouvre pas`, !(await G.ouvert(p)));
    v(`${tag} : …et il se rouvre à la demande (« Nouveautés »)`, await (async () => { if (TEL) { await L.toucher(c, '#contenu .tt-menu'); await L.calme(p, 300); await L.toucher(c, '#calque .nv-menu'); } else await L.toucher(c, '#menu .nv-menu'); await L.calme(p, 500); const o = await G.ouvert(p); await p.evaluate(() => nvFermer(true)); return o; })());
    await L.ranger(p);
  }
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });

// RECONTRÔLE ADVERSE — LE PROTOTYPE DANS UN CADRE, COMME DANS L'ARTEFACT (17 novembre 2026).
// claude.ai sert la page d'un artefact dans un <iframe> : la page n'est PAS la fenêtre du haut. Les sondes « artefact-* » l'ouvrent en direct
// (window.top === window), donc la branche « cadre » de telechargerFichier (sans pont) n'y est jouée que par les pages voisines, jamais par la
// page principale — et c'est la page principale que le visiteur a sous les doigts. Ici : hôte simulé (hote-artefact.html), window.claude dans la
// page du prototype seulement (niveau 1), pas dans les pages voisines (niveau 2), et cinq états du pont : ok, refusé, absent, nul, qui jette.
//   Contrôles : population d'abord (le cadre est un cadre ; le pont du haut est appelé) ; un geste réel (boutons touchés) ; l'écran DIT l'issue ;
//   jamais « téléchargé » sans fichier au pont ; aucun lien inerte ; aucune erreur JavaScript. 127.0.0.1 seulement.
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
const PROFIL = process.env.PROFIL || 'mac';
const dit = c => c.p.evaluate(() => { const t = document.getElementById('toast'), q = document.getElementById('sortie-carte'); return { toast: t ? t.textContent.trim() : '', carte: q ? q.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : '' }; });
async function aVehicules(c) { return c.p.evaluate(() => Object.keys(vues()).find(r => /^vehic/i.test(r)) || null); }
async function gestes(c, nom, attendu) {
  // 1. le CSV du coût des véhicules, par le VRAI bouton (« Exporter en tableau »), puis les FEC par la vraie fonction (la page voisine est jouée plus bas)
  const r = await aVehicules(c); v(`${nom} : population (la rubrique des véhicules existe : ${r})`, !!r, r);
  if (!r) return;
  await L.aller(c.p, r); await bac.zero(c); await c.p.evaluate(() => { window.top.__adv = window.top.__adv || {}; });
  const ouvre = c.p.locator('[data-vh="cout"]').first(); const n = await ouvre.count();
  v(`${nom} : population (le bouton « coût des véhicules » est là)`, n > 0, n);
  if (!n) return;
  await L.toucher(c, ouvre); await L.calme(c.p, 400);
  const exp = c.p.locator('[data-vh="csvflotte"]').first(); v(`${nom} : population (« Exporter en tableau » est là)`, await exp.count() > 0, '');
  await L.toucher(c, exp); await c.p.waitForTimeout(900);
  const e = await P.etat(c), d = await dit(c), f = e.fichiers;
  if (attendu === 'fichier') v(`${nom} : un vrai fichier .csv non vide arrive au pont du haut, l'écran dit « enregistré »`, f.length === 1 && /\.csv$/.test(f[0].nom) && f[0].taille > 80 && f[0].cadre === 'haut' && /enregistré/i.test(d.toast) && e.liensInertes.length === 0, { f, d, li: e.liensInertes });
  else if (attendu === 'refus') v(`${nom} : refusé → rien d'enregistré, l'écran dit que rien n'est parti`, f.length === 0 && /Rien n.a été enregistré/.test(d.toast) && !/enregistré :/.test(d.toast) && e.liensInertes.length === 0, { f, d });
  else if (attendu === 'indisponible') v(`${nom} : pas de pont → l'écran dit « pas disponible » et montre le texte à copier ; aucun lien inerte ; jamais « téléchargé »`, f.length === 0 && /pas disponible/i.test(d.carte + d.toast) && !/(téléchargé|enregistré :|exporté)/i.test(d.toast) && e.liensInertes.length === 0, { f, d, li: e.liensInertes });
  else if (attendu === 'echec') v(`${nom} : le pont échoue → l'écran le dit, rien d'annoncé`, f.length === 0 && /n.a pas abouti|pas pu|refus|trop|disponible|ne peut pas/i.test(d.toast + d.carte) && e.liensInertes.length === 0, { f, d });
  v(`${nom} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
}
(async () => {
  const CAS = [['pont ok', {}, 'fichier'], ['visiteur refuse', { refuser: true }, 'refus'], ['sans window.claude', { pont: false }, 'indisponible'], ['use(downloads) rend null', { pont: 'nul' }, 'indisponible'], ['use() jette', { pont: 'jette' }, 'indisponible'], ['pont trop lourd', { echec: 'too_large' }, 'echec']];
  for (const [nom, pose, attendu] of CAS) {
    const c = await P.ouvrirHote({ profil: PROFIL, qui: 'marc' }, pose);
    const cadre = await c.p.evaluate(() => { let h = false; try { h = window.top !== window; } catch (e) { h = true; } return { cadre: h, claude: typeof window.claude, parent: window.parent !== window }; });
    v(`${PROFIL} « ${nom} » : population (le prototype tourne DANS un cadre : top !== window, window.claude = ${cadre.claude})`, cadre.cadre && cadre.parent, cadre);
    await gestes(c, `${PROFIL} « ${nom} »`, attendu);
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

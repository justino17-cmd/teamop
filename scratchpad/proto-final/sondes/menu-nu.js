// Le prototype nu (pour l'équipe) montre le MÊME menu que le mode application ; seul l'échafaudage de revue diffère.
const { L, ATTENDU, lireMenu, aplatir, aplatirAttendu } = require('./menu-commun.js'), v = L.v;
(async () => {
  const c = await L.ouvrir({ profil:'mac', app:false, qui:null });
  const m = await lireMenu(c.p); v('nu : le menu du gérant (Patron) = celui de l\'application', aplatir(m.G) === aplatirAttendu(ATTENDU.marc), aplatir(m.G));
  const ech = await c.p.evaluate(() => ({ bandeau:!!document.querySelector('#menu .bandeau-proto'), faite:document.querySelectorAll('#menu .m-faite').length, bande:!!document.querySelector('.rl-bande'), parcours:!!document.querySelector('.rl-az') }));
  v('nu : l\'échafaudage est là (bandeau, « faite », bande des rôles)', ech.bandeau && ech.faite >= 8 && ech.bande && ech.parcours, ech);
  v('nu : pas de « Nouveautés » ni de « Se déconnecter » (ils n\'existent que dans l\'application)', !m.pied.some(x => /^nv-menu|^cn-out/.test(x)), m.pied);
  const sc = await c.p.evaluate(() => ({ mode:document.querySelectorAll('#menu .mode-seg button').length }));
  v('nu : Jour / Nuit / Auto au pied', sc.mode === 3);
  for (const [role, att] of [['gestion', ATTENDU.julie], ['tech', ATTENDU.sm], ['client', ATTENDU.client]]) {
    await L.toucher(c, `[data-rl="role|${role}"]`); await L.calme(c.p, 500);
    if (role === 'client') { const k = await c.p.evaluate(() => ({ lignes:document.querySelectorAll('#menu .rl-mlien, #menu .m-liste a:not(.btn)').length, contact:!!document.querySelector('#menu .rl-contact') }));
      v(`nu, « Tester en tant que » client : le menu de gauche ne répète pas les cinq destinations (les onglets de la page les portent), il dit comment joindre l'entreprise`, k.lignes === 0 && k.contact, k); }
    else { const mm = await lireMenu(c.p); v(`nu, « Tester en tant que » ${role} : mêmes lignes que dans l'application`, aplatir(mm.G) === aplatirAttendu(att), aplatir(mm.G)); }
    const e = await c.p.evaluate(() => ({ bande:!!document.querySelector('.rl-bande'), barre:document.querySelectorAll('#barre-bas .opg-tab').length })); v(`nu, ${role} : la bande de revue reste`, e.bande, e);
  }
  await L.toucher(c, '[data-rl="role|patron"]'); await L.calme(c.p, 500);
  const m2 = await lireMenu(c.p); v('nu, retour à « Patron » : le menu du gérant', aplatir(m2.G) === aplatirAttendu(ATTENDU.marc), aplatir(m2.G));
  v('nu : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();

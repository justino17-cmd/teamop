// Sonde « rôles » : qui voit la Boîte mail. Le patron la voit ; la secrétaire, la technicienne, la comptable et le client non (le menu ne la propose pas, et
// taper #boiteMail à la main les ramène chez eux). Le nom « moi » donné au module est celui de la personne connectée.
const { lib, v, entrer, fin, sortie } = require('./mail-commun.js');
(async () => {
  const cas = [['marc', true], ['julie', false], ['sm', false]];
  for (const [qui, voit] of cas) {
    const c = await entrer({ profil:'mac', qui, sansAller:true }), p = c.p;
    const menu = await p.evaluate(() => ({ role:ROLE, permis:rlPermis('boiteMail'), menu:/Boîte mail/.test(document.getElementById('menu').textContent), pop:document.getElementById('menu').textContent.length }));
    v(qui + ' (' + menu.role + ') : population du menu relue (non vide)', menu.pop > 100, menu.pop);
    v(qui + ' : le menu ' + (voit ? 'propose' : 'ne propose PAS') + ' la Boîte mail', menu.menu === voit && menu.permis === voit, menu);
    await p.evaluate(() => { location.hash = 'boiteMail'; }); await lib.calme(p, 1500);
    const apres = await p.evaluate(() => ({ route, hote:document.getElementById('courrier-hote') ? !document.getElementById('courrier-hote').hidden : false, modules:document.querySelectorAll('[data-opcourrier]').length }));
    if (voit) { v(qui + ' : #boiteMail ouvre la rubrique et monte le module', apres.route === 'boiteMail' && apres.modules === 1, apres); }
    else v(qui + ' : #boiteMail à la main ramène chez lui, aucun module monté', apres.route !== 'boiteMail' && apres.modules === 0 && !apres.hote, apres);
    if (voit) { const moi = await p.evaluate(() => courrierSource().capacites().then(k => k.moi)); v('« moi » donné au module est le prénom du patron', moi === 'Marc', moi);
      await require('./mail-commun.js').pret(p); const suivi = await p.evaluate(() => !!window.R().querySelector('[data-folder=s_moi]')); v('le dossier « Assignés à moi » existe (la source déclare son « moi »)', suivi); }
    v(qui + ' : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  }
  const c = await entrer({ profil:'mac', sansAller:true }), p = c.p;
  await p.evaluate(() => rlChanger('client', { muet:true })); await lib.calme(p, 800);
  await p.evaluate(() => { location.hash = 'boiteMail'; }); await lib.calme(p, 1200);
  const cl = await p.evaluate(() => ({ route, modules:document.querySelectorAll('[data-opcourrier]').length, permis:rlPermis('boiteMail') }));
  v('le client ne peut pas ouvrir la Boîte mail (route ramenée, aucun module)', !cl.permis && cl.route !== 'boiteMail' && cl.modules === 0, cl);
  await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });

// Sonde « persistance » : le module est monté UNE fois, dans un hôte qui ne bouge pas. Cinq rendre() avec un composeur ouvert, aller ailleurs et revenir,
// changer de rôle : ce qui doit survivre survit, ce qui doit disparaître disparaît.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  const c = await entrer({ profil:'mac' }), p = c.p;
  const noeud0 = await S(c, () => { window.__n = document.querySelector('[data-opcourrier]'); return !!window.__n; });
  await ouvrirMsg(c, 'm1');
  await p.locator('#courrier-hote .msg.sel').first().click(); await p.keyboard.press('r'); await p.waitForTimeout(500);
  await p.locator('#courrier-hote #cBody').fill('Texte tapé pour la persistance.'); await p.waitForTimeout(200);
  for (let i = 0; i < 5; i++) { await S(c, () => rendre()); await p.waitForTimeout(250); }
  const apres5 = await S(c, () => { const b = R().querySelector('#cBody'), s = R().querySelector('#cSheet'); return { texte:b ? b.value : null, feuille:!!s && s.getBoundingClientRect().width > 300, memeNoeud:document.querySelector('[data-opcourrier]') === window.__n }; });
  v('cinq rendre() avec le composeur ouvert : le texte tapé est gardé', apres5.texte === 'Texte tapé pour la persistance.', apres5);
  v('cinq rendre() : la feuille est toujours ouverte et le module n\'a pas été remonté (même nœud)', apres5.feuille && apres5.memeNoeud && noeud0, apres5);
  // aller à Clients et revenir : la lecture et le brouillon restent
  await S(c, () => aller('clients')); await lib.calme(p, 600);
  const masque = await S(c, () => ({ cache:document.getElementById('courrier-hote').hidden, noeud:document.querySelector('[data-opcourrier]') === window.__n }));
  v('sur une autre rubrique, l\'hôte est masqué (jamais retiré) et le module est toujours là', masque.cache && masque.noeud, masque);
  await S(c, () => aller('boiteMail')); await lib.calme(p, 900);
  const retour = await S(c, () => { const b = R().querySelector('#cBody'), s = R().querySelector('#cSheet'); return { texte:b ? b.value : null, visible:!!s && s.getBoundingClientRect().width > 300, sujet:(R().querySelector('.rsubj') || {}).textContent || '', cache:document.getElementById('courrier-hote').hidden }; });
  v('retour sur la Boîte mail : le brouillon est là, visible, avec son texte', retour.visible && retour.texte === 'Texte tapé pour la persistance.' && !retour.cache, retour);
  v('retour : le message ouvert n\'a pas changé', /Climatisation chambre 214/.test(retour.sujet), retour.sujet);
  await cap(c, 'persistance-retour');
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(500);
  // changement de rôle : module démonté, clé de stockage propre au rôle
  const cleAvant = await S(c, () => Object.keys(localStorage).filter(k => /^proto_courrier_/.test(k)));
  await S(c, () => rlChanger('gestion', { muet:true })); await lib.calme(p, 1200);
  const ailleurs = await S(c, () => ({ role:COURRIER.role, inst:!!COURRIER.inst, modules:document.querySelectorAll('[data-opcourrier]').length, hash:location.hash }));
  v('changement de rôle : le module du patron est démonté (ses brouillons ne passent pas à une secrétaire)', ailleurs.inst === false && ailleurs.modules === 0, ailleurs);
  await S(c, () => rlChanger('patron', { muet:true, h:'boiteMail' })); await p.waitForTimeout(500); await require('./mail-commun.js').pret(p);
  const role = await S(c, () => ({ role:COURRIER.role, nouveau:document.querySelector('[data-opcourrier]') !== window.__n, un:document.querySelectorAll('[data-opcourrier]').length, cles:Object.keys(localStorage).filter(k => /^proto_courrier_/.test(k)), lignes:window.R() ? window.R().querySelectorAll('.msg').length : 0 }));
  v('retour du patron : un seul module neuf est monté, avec ses messages', role.role === 'patron' && role.nouveau && role.un === 1 && role.lignes > 0, role);
  v('la clé de stockage porte le rôle (brouillons séparés par rôle)', role.cles.length >= 1 && role.cles.every(k => /^proto_courrier_[a-z]+$/.test(k)), { avant:cleAvant, apres:role.cles });
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });

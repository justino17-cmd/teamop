// Sonde « fichier absent / en retard » : la page qui charge le module à la première ouverture se comporte proprement si prototype-courrier.js MANQUE ou TARDE :
// un message clair (jamais un écran vide), un bouton « Réessayer », et le module se monte quand le fichier revient.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  lib.absents.add('apercu/prototype-courrier.js');
  let c = await entrer({ profil:'mac', sansAller:true }), p = c.p;
  await lib.aller(p, 'boiteMail'); await p.waitForTimeout(2500);
  const e = await S(c, () => ({ etat:COURRIER.etat, msg:(document.querySelector('.courrier-msg') || {}).innerText || '', bouton:!!document.querySelector('[data-courrier=reessayer]'), titre:!!document.querySelector('#contenu h1'), hote:document.getElementById('courrier-hote') ? document.getElementById('courrier-hote').hidden : true }));
  v('fichier absent : un message clair (« n\'a pas pu s\'ouvrir ») et pas un écran vide', e.etat === 'echec' && /n’a pas pu s’ouvrir/.test(e.msg) && e.titre, e);
  v('fichier absent : un bouton « Réessayer » est proposé, l\'hôte reste masqué', e.bouton && e.hote, e);
  await cap(c, 'absent-message');
  lib.absents.delete('apercu/prototype-courrier.js');
  await p.locator('[data-courrier=reessayer]').first().click(); await require('./mail-commun.js').pret(p, 9000);
  const apres = await S(c, () => ({ etat:COURRIER.etat, lignes:window.R() ? window.R().querySelectorAll('.msg').length : 0, msg:!!document.querySelector('.courrier-msg') }));
  v('le fichier revient, « Réessayer » : le module se monte et le message disparaît', apres.etat === 'pret' && apres.lignes > 0 && !apres.msg, apres);
  v('aucune erreur JavaScript non rattrapée (hors le chargement refusé)', c.err.filter(x => !/prototype-courrier|404|Failed to load/i.test(x)).length === 0, c.err.slice(0, 3));
  await fin(c);
  // fichier qui TARDE : 7,5 s ; après 6 s la page le dit, puis le module se monte
  c = await entrer({ profil:'mac', sansAller:true }); p = c.p;
  await p.route('**/prototype-courrier.js', async r => { await new Promise(s => setTimeout(s, 7500)); r.continue(); });
  await lib.aller(p, 'boiteMail'); await p.waitForTimeout(1500);
  const t1 = await S(c, () => ({ etat:COURRIER.etat, msg:(document.querySelector('.courrier-msg') || {}).innerText || '' }));
  v('fichier lent (1,5 s) : « Ouverture de la boîte mail… » est affiché (pas d\'écran vide)', t1.etat === 'charge' && /Ouverture de la boîte mail/.test(t1.msg), t1);
  await p.waitForTimeout(5200);
  const t2 = await S(c, () => ({ etat:COURRIER.etat, msg:(document.querySelector('.courrier-msg') || {}).innerText || '' }));
  v('fichier lent (6,7 s) : la page dit que ça prend plus de temps et propose « Réessayer »', t2.etat === 'charge' && /plus de temps/.test(t2.msg) && /Réessayer/.test(t2.msg), t2);
  await require('./mail-commun.js').pret(p, 9000);
  v('fichier lent : il finit par arriver et le module se monte', await S(c, () => COURRIER.etat === 'pret' && window.R().querySelectorAll('.msg').length > 0));
  await fin(c); await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });

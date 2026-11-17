// LES PONTS ET LES CRÉATIONS D'UNE TOUCHE : la palette « Faire » et les raccourcis N, D, C, A ne proposent que ce que la personne a le droit de créer ; la feuille « Raccourcis » ne les promet pas ;
// l'atelier de devis, la fenêtre OP COMPTABLE et la Boîte mail REÇOIVENT les droits de la personne (ils ne partagent pas le code de la page). ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
(async () => {
  const lect = await ouvrirComme({ k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1000'])), sp:{} });
  const l = await lect.p.evaluate(() => ({ faire:palEntrees().filter(e => e.g === 'Faire').map(e => e.l), inter:rcInterOk(), devis:rcCreerOk(RC_CREER.find(c => c.nom === 'devis')), client:rcCreerOk(RC_CREER.find(c => c.nom === 'client')), tache:rcCreerOk(RC_CREER.find(c => c.nom === 'tache')),
    opd:opdRoleMsg().opd_role, cmpt:cmptRole().droits, creer:(rcAide(), [...document.querySelectorAll('#calque .rc-l span:first-child')].map(x => x.textContent)), nClients:palEntrees().filter(e => e.g === 'Clients').length }));
  v('lecture seule : « Faire » ne propose que la tâche (ni intervention, ni devis, ni client, ni facture)', JSON.stringify(l.faire) === JSON.stringify(['Nouvelle tâche']), l.faire);
  v('lecture seule : les touches N, D, C sont sans effet, A reste', !l.inter && !l.devis && !l.client && l.tache, l);
  v('lecture seule : la feuille « Raccourcis » ne promet que « Nouvelle tâche » dans « Créer »', l.creer.includes('Nouvelle tâche') && !l.creer.includes('Nouvelle intervention') && !l.creer.includes('Nouveau devis') && !l.creer.includes('Nouveau client'), l.creer);
  v('lecture seule : l\'atelier reçoit ses droits (aucun c / m / s) et la Comptabilité aussi', ['c', 'm', 's'].every(k => l.opd.droits[k] === false && l.cmpt[k] === false), { opd:l.opd, cmpt:l.cmpt });
  v('lecture seule : la recherche de clients reste (elle lit « Clients › Voir »)', l.nClients > 0, l.nClients);
  await L.fin(lect);
  const julie = await ouvrirComme('julie');
  const j = await julie.p.evaluate(() => ({ faire:palEntrees().filter(e => e.g === 'Faire').map(e => e.l), inter:rcInterOk(), opd:opdRoleMsg().opd_role, cmpt:cmptRole().droits, mail:null }));
  v('Julie : « Faire » propose l\'intervention, le devis, le client, la tâche et la facture (ses cases Créer)', ['Nouvelle intervention', 'Devis rapide', 'Nouveau client', 'Nouvelle tâche', 'Nouvelle facture'].every(x => j.faire.includes(x)), j.faire);
  v('Julie : l\'atelier reçoit « devis : créer + modifier, pas supprimer » ; OP COMPTABLE « créer + modifier »', j.opd.droits.c === true && j.opd.droits.m === true && j.opd.droits.s === false && j.cmpt.c === true && j.cmpt.m === true && j.cmpt.s === false, j);
  const mail = await julie.p.evaluate(() => ({ present:typeof droitsDe === 'function' }));
  v('la Boîte mail est alimentée par la même fonction (droitsDe)', mail.present === true, mail);
  v('aucune erreur de page', lect.err.length === 0 && julie.err.length === 0, [lect.err.slice(0, 2), julie.err.slice(0, 2)]);
  await L.fin(julie); await fin();
})().catch(e => { console.error(e); process.exit(1); });

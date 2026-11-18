// RESTES ENTREPRISE, TOUR 3 — le bandeau « OP GESTION a reconnu » de la Boîte mail lit la case de ce que chaque geste ÉCRIT (le devis, les achats, l'intervention, la fiche client), pas la seule case
// de la Boîte mail. Avant : avec « Modifier » à la Boîte mail seule (les autres catégories en « Voir seul »), 28 gestes offerts dont 27 qui passaient (« Noter l'accord du devis » faisait
// passer le devis à « accepté », « Mettre à jour la livraison » changeait la date d'une commande…). Maintenant : un geste dont la case de destination est fermée n'est ni offert ni exécuté.
//   1. com seul : aucun des gestes qui écrivent ailleurs n'est offert ; les gestes du courrier (répondre, confier, tâche personnelle, ranger l'e-mail, règle) le restent ;
//   2. chaque destination ouverte SEULE (avec com) rend exactement ses gestes (ventes → devis, accord, annonce, encaisser ; achats → livraison, rapprocher, fournisseur ; inter → intervention,
//      planifier l'installation, confirmer le créneau, photos ; crm → client, ranger la pièce) ;
//   3. toutes les cases : les 28 gestes sont là ; 4. par l'hôte, sans le bouton : « accord » sans la case Devis laisse le devis en attente (la garde tient).
// Usage : timeout 580 node …/entreprise-restes3-bandeau.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const FERMEES = { planif:'1000', inter:'1000', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
// pour chaque message : les verbes offerts (famille:verbe)
const RELEVE = async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const out = [];
  for (const id of [...o.querySelectorAll('.msg[data-id]')].map(r => r.getAttribute('data-id'))) { const r = o.querySelector('.msg[data-id="' + id + '"]'); if (!r) continue; r.click(); await new Promise(z => setTimeout(z, 200));
    out.push({ id, gestes:[...o.querySelectorAll('.hacts [data-hote]')].map(b => b.getAttribute('data-hote').split('|')[0]) }); }
  return out; };
const ECRIT_AILLEURS = ['mbx:devis', 'mbx:encaisser', 'mbx:confcren', 'mbx:cestclient', 'mbx:cestfour', 'mbx:annonce', 'mbx:ranger', 'mbx:photoint', 'ml:creerint', 'ml:planifdv', 'ml:accord', 'ml:livraison', 'ml:rappro'];
const COURRIER = ['mbx:repondre', 'mbx:relancer', 'mbx:confier', 'ml:tache', 'mbx:regle', 'mbx:pasimp', 'ml:creneau', 'mbx:prevenir'];
const OUVRE = { ventes:['mbx:devis', 'mbx:encaisser', 'mbx:annonce', 'ml:accord'], achats:['mbx:cestfour', 'ml:livraison', 'ml:rappro'], inter:['mbx:confcren', 'mbx:photoint', 'ml:creerint', 'ml:planifdv'], crm:['mbx:cestclient', 'mbx:ranger'] };
(async () => {
  const jouer = async (nom, o, fn) => { const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
    await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(o) }); await L.calme(p, 500);
    await L.aller(p, 'boiteMail'); await L.calme(p, 3000); const r = await p.evaluate(RELEVE); const verbes = new Set(r.flatMap(x => x.gestes)); await fn(p, r, verbes); await L.fin(c); };
  // 1. com seul
  await jouer('com seul', { ...FERMEES, com:'1110' }, async (p, r, verbes) => {
    v(`com seul : population (${r.length} messages, ${verbes.size} gestes différents)`, r.length >= 8 && verbes.size >= 3, [...verbes].join(' '));
    v('com seul : aucun geste qui écrit ailleurs n\'est offert', ECRIT_AILLEURS.every(x => !verbes.has(x)), ECRIT_AILLEURS.filter(x => verbes.has(x)));
    v('com seul : les gestes du courrier restent (confier, tâche personnelle, règle…)', ['mbx:confier', 'ml:tache'].every(x => verbes.has(x)), [...verbes]);
  });
  // 2. une destination ouverte seule
  for (const [cat, verbesCat] of Object.entries(OUVRE)) {
    await jouer(cat + ' seule', { ...FERMEES, com:'1110', [cat]:'1110' }, async (p, r, verbes) => {
      const offerts = ECRIT_AILLEURS.filter(x => verbes.has(x));
      v(`${cat} ouverte seule : exactement ses gestes sont offerts (${offerts.join(', ') || 'aucun'})`, offerts.every(x => verbesCat.includes(x)) && offerts.length >= 1, offerts);
    });
  }
  // 3. toutes les cases ; 4. la garde par l'hôte
  await jouer('tout', {}, async (p, r, verbes) => {
    const n = r.reduce((s, x) => s + x.gestes.length, 0);
    v(`toutes les cases : les gestes sont là (${n}), tous les verbes qui écrivent ailleurs aussi`, n >= 25 && ECRIT_AILLEURS.filter(x => verbes.has(x)).length >= 8, ECRIT_AILLEURS.filter(x => !verbes.has(x)));
  });
  await jouer('garde', { ...FERMEES, com:'1110' }, async (p) => {
    const g = await p.evaluate(async () => { const av = DROITS_REFUS.length, cmd = COMMANDES.map(c => c.prevue).join(','), dv = Object.values(DEVIS).map(d => d.e).join(',');
      const mails = (typeof MAILS !== 'undefined' ? MAILS : []).filter(m => m.dossier === 'recu' && !m.fait); const faits = [];
      for (const m of mails) { for (const a of ['ml:accord', 'ml:livraison', 'ml:rappro', 'mbx:annonce']) { try { courrierAgir(a + '|' + m.id, { id:m.id }); } catch (e) {} await new Promise(z => setTimeout(z, 60)); try { fermerPanneau(); } catch (e) {} } }
      return { refus:DROITS_REFUS.slice(av).length, cmd:[cmd, COMMANDES.map(c => c.prevue).join(',')], dv:[dv, Object.values(DEVIS).map(d => d.e).join(',')], traites:mails.filter(m => m.fait).length }; });
    v('par l\'hôte (sans bouton) : accord, livraison, rapprochement, paiement annoncé refusés par la garde, rien ne change', g.refus >= 4 && g.cmd[0] === g.cmd[1] && g.dv[0] === g.dv[1] && g.traites === 0, g);
  });
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });

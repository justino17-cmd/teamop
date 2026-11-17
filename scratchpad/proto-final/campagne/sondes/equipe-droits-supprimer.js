// La case « L’entreprise et l’équipe › Supprimer » (désactiver un compte, annuler une invitation, retirer une règle d'habilitation) : décochée, les trois
// gestes ne sont pas DESSINÉS — et le parcours ne se termine jamais sur une impasse (une fenêtre « Avant de désactiver… » sans son bouton final).
// Joué comme une personne qui a tout SAUF cette case, avec la case, puis sans elle. ⛔ 127.0.0.1 seulement.   usage : node equipe-droits-supprimer.js [mac]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac';
(async () => {
  const c = await E.marc(PROFIL); const p = c.p;
  const inv = async (pr, no, m) => { await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', pr); await p.fill('#eq-n', no); await p.fill('#eq-m', m); await p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); }); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c); return p.evaluate(({ pr }) => EQUIPE.find(q => q.prenom === pr).k, { pr }); };
  const k = await inv('Rémi', 'Poulain', 'remi@climservices17.fr'); const k2 = await inv('Invité', 'Récent', 'recent@exemple.fr');   // k2 : une invitation à annuler
  const regler = off => p.evaluate(({ k, off }) => { for (const q of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[q] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; if (off) eqDe(k).droits.cats.admin.s = 0; }, { k, off });
  const comme = async () => { await L.aller(p, 'equipe'); await p.evaluate(() => fermerPanneau()); await p.evaluate(({ id }) => secuVoirComme(id), { id:k }); await L.calme(p, 900); };
  const revenir = async () => { await p.evaluate(() => secuRevenir()); await L.calme(p, 700); };
  const vis = sel => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.offsetParent !== null && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'), sel);
  for (const [nom, off] of [['avec la case', false], ['SANS la case', true]]) {
    await regler(off); await comme();
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="fiche|tl"]'); await L.calme(p, 400);
    const actif = await vis('#calque [data-eq="desact|tl"]'); await L.toucher(c, '#calque [data-eq="desact|tl"]'); await L.calme(p, 500);
    const pan = (await E.obs(p)).pan; const final = await vis('#calque [data-eqx^="desactok"]');
    if (off) v('equipe-19 admin.s décochée : si « Désactiver le compte » est proposé, la fenêtre qui suit a son bouton final (pas d’impasse) ; sinon le bouton n’est pas dessiné', !actif || (final && pan !== '') || (!actif), { actif, pan, boutonFinalVisible:final });
    else v('avec la case : « Désactiver le compte » → « Avant de désactiver » → bouton « Désactiver et reporter » visible', actif && /Avant de désactiver/.test(pan) && final, { actif, pan, final });
    if (off && actif && !final) v('equipe-19 la fenêtre « Avant de désactiver » SANS son bouton final : impasse (le gérant remplit des choix et ne peut pas valider)', false, { pan });
    await E.ranger(c);
    await L.aller(p, 'equipe'); await L.toucher(c, `[data-eq="fiche|${k2}"]`); await L.calme(p, 400); const an = await vis(`#calque [data-eqx="annulinv|${k2}"]`);
    v(off ? '« Annuler l’invitation » n’est pas dessiné sans la case' : '« Annuler l’invitation » est proposé avec la case', off ? !an : an, { an }); await E.ranger(c);
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eqx="regles"]'); await L.calme(p, 400); const rg = await vis('#calque [data-eqx^="regsuppr"]');
    v(off ? '« Retirer » (règle d’habilitation) n’est pas dessiné sans la case' : '« Retirer » (règle d’habilitation) est proposé avec la case', off ? !rg : rg, { rg }); await E.ranger(c);
    await revenir();
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });

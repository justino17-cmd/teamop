// Rôles : ce que voient et peuvent faire la secrétaire (julie), le chef d'équipe (kb) et la technicienne (sm) dans « Devis » ;
// et SURTOUT : qui est nommé dans l'historique du devis, le message de relance et le journal (jamais « Marc » pour ce que fait Julie).
// usage : node devis-atelier-roles.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  for (const qui of ['julie', 'kb', 'sm']) {
    const c = await L.ouvrir({ profil, qui, hash: 'devis' }), p = c.p; await L.calme(p, 700);
    const info = await p.evaluate(() => ({ permis: rlPermis('devis'), permisCtr: rlPermis('contrats'), role: ROLE, acteur: typeof acteur === 'function' ? acteur() : null, h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, menu: [...document.querySelectorAll('.menu a, .menu button, #menu [data-go], nav [data-go]')].map(b => b.textContent.trim().split('\n')[0]).filter(Boolean).slice(0, 40), prenom: (typeof H_NOM === 'function' && typeof rlQui === 'function') ? H_NOM(rlQui()) : null }));
    console.log(`── ${qui} :`, JSON.stringify({ permis: info.permis, role: info.role, acteur: info.acteur, h1: info.h1, hash: info.hash, nom: info.prenom }));
    if (!info.permis) {
      v(`${qui} : sans droit « devis » → #devis tapé à la main le ramène chez lui (pas la liste des devis)`, info.h1 !== 'Devis', info);
      const t = await p.evaluate(() => { opdOuvrir('devis'); return (document.getElementById('toast') || {}).innerText || ''; }); await L.calme(p, 300);
      v(`${qui} : « Composer un devis » refusé avec une phrase claire`, /pas ouvert|n.a pas accès/.test(t) && !(await p.evaluate(() => { const z = document.getElementById('opdz'); return !!z && !z.hidden; })), t);
      await L.fin(c); continue; }
    v(`${qui} : voit la page Devis`, info.h1 === 'Devis', info.h1);
    const prenom = String(info.prenom || '').split(' ')[0];
    // Devis rapide préparé PAR cette personne
    await L.toucher(c, '[data-dv="nouveau"]'); await p.selectOption('#dvn-cli', 'mr'); await p.fill('#dvn-objet', 'Essai de rôle'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 500);
    const cle = await p.evaluate(() => location.hash.replace('#devis-x-', '')); let h = await p.evaluate(k => DEVIS_REG[k].trace.map(t => t[1]).join(' | '), cle);
    v(`${qui} : l’historique du devis préparé dit « Préparé par ${prenom} » (pas Marc)`, new RegExp('Préparé par ' + prenom).test(h) && !/Marc/.test(h), h);
    // dicter
    await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="dicter"]'); await p.fill('#dvd-t', 'Devis pour Mme Roux, une pompe de relevage, une heure de main-d’œuvre et le déplacement'); await L.toucher(c, '[data-dvd="go"]'); await L.calme(p, 500);
    const cle2 = await p.evaluate(() => location.hash.replace('#devis-x-', '')); h = await p.evaluate(k => DEVIS_REG[k].trace.map(t => t[1]).join(' | '), cle2);
    v(`${qui} : le devis dicté dit « Dicté par ${prenom} » (pas Marc)`, new RegExp(prenom).test(h) && !/Marc/.test(h), h);
    // relance
    await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="relancer|D-2026-031"]'); await L.calme(p, 300);
    const m = await p.evaluate(() => document.getElementById('ml-m').value); v(`${qui} : le message de relance est signé ${prenom} (pas Marc)`, new RegExp('Cordialement,\\s*\\n?' + prenom).test(m) || (new RegExp(prenom).test(m.slice(-160)) && !/Marc/.test(m.slice(-160))), m.slice(-140));
    await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 500); h = await p.evaluate(() => DEVIS_REG['D-2026-031'].trace.map(t => t[1]).join(' | '));
    v(`${qui} : l’historique de la relance dit « Relancé par ${prenom} »`, new RegExp('Relancé par ' + prenom).test(h), h);
    // accord noté / refus noté
    await L.aller(p, 'devis-x-D-2026-038'); await L.toucher(c, '[data-dv="reponse|D-2026-038"]'); await L.toucher(c, '[data-dv="repOui|D-2026-038"]'); await L.calme(p, 500);
    h = await p.evaluate(() => DEVIS_REG['D-2026-038'].trace.map(t => t[1]).join(' | ')); v(`${qui} : « Accord noté par ${prenom} »`, new RegExp('Accord noté par ' + prenom).test(h), h);
    await L.aller(p, 'devis-x-D-2026-041'); await L.toucher(c, '[data-dv="reponse|D-2026-041"]'); await p.selectOption('#dvr-motif', 'Trop cher'); await L.toucher(c, '[data-dv="repNon|D-2026-041"]'); await L.calme(p, 500);
    h = await p.evaluate(() => DEVIS_REG['D-2026-041'].trace.map(t => t[1]).join(' | ')); v(`${qui} : « Refus noté par ${prenom} »`, new RegExp('Refus noté par ' + prenom).test(h), h);
    // nouvelle version
    await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="version|D-2026-031"]'); await L.calme(p, 400);
    h = await p.evaluate(() => { const x = DEVIS_REG[location.hash.replace('#devis-x-', '')]; return x.trace.map(t => t[1]).join(' | '); }); v(`${qui} : « Repris du devis … par ${prenom} »`, new RegExp('par ' + prenom).test(h), h);
    console.log('  err', c.err.length); await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

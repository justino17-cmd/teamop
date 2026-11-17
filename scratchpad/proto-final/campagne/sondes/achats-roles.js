// Qui voit quoi dans « Achats et frais » (campagne du 17 novembre 2026) : gérant, secrétariat, chef d'équipe, technicienne.
// Usage : node achats-roles.js [profil=mac]
const { L, CAP, devenir, txt, toast } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const menu = () => E(() => [...document.querySelectorAll('#menu a, #menu [data-go], #menu button')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
  const etat = async () => ({ h1: await txt(p, '#contenu h1'), boutons: await E(() => [...document.querySelectorAll('#contenu button')].filter(b => b.offsetParent).map(b => b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 40)), hash: await E(() => location.hash) });
  for (const [qui, nom] of [['marc', 'gérant'], ['julie', 'secrétariat'], ['kb', 'chef d’équipe'], ['sm', 'technicienne']]) {
    await devenir(p, qui, 'achats'); await L.calme(p, 500);
    const m = await menu(), e = await etat(), role = await E(() => ROLE), droit = await E(() => ({ v: peut('achats', 'v'), m: peut('achats', 'm') })), lect = await E(() => axLect());
    console.log(`── ${qui} (${nom}) rôle=${role} droit=${JSON.stringify(droit)} lecture seule=${lect}\n   menu : ${m.join(' · ').slice(0, 300)}\n   écran : ${e.h1} ${e.hash}\n   boutons : ${e.boutons.join(' | ').slice(0, 500)}`);
    const aAchats = m.some(x => /Achats et frais/.test(x));
    if (qui === 'marc') { v('gérant : « Achats et frais » au menu, l’écran s’ouvre, il peut décider', aAchats && /Achats et frais/.test(e.h1) && e.boutons.some(b => /Refuser/.test(b)) && e.boutons.some(b => /Nouvelle demande/.test(b)), e); }
    if (qui === 'julie') { v('secrétariat : voit Achats et frais SANS boutons de décision (lecture seule), le dit', /Achats et frais/.test(e.h1) && !e.boutons.some(b => /Refuser|Valider|Transférer|Achat en magasin/.test(b)) && lect, e);
      await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 300); const b2 = (await etat()).boutons; v('secrétariat : onglet Notes sans « Valider » ni « Refuser »', !b2.some(b => /Valider|Refuser|Tout valider/.test(b)), b2);
      // un geste de décision forcé par le DOM est refusé ?
      await E(() => { acOnglet = 'demandes'; rendre(); }); await E(() => { const d = DEM_ACHAT.find(o => o.etat === 'attente'); const b = document.createElement('button'); b.dataset.ac = 'refuser|' + d.id; document.body.appendChild(b); b.click(); b.remove(); }); await L.calme(p, 300);
      v('secrétariat : un geste « Refuser » forcé est refusé avec un message', /gérant/.test(await toast(p)) && !(await E(() => !!document.querySelector('#calque .panneau'))), await toast(p)); }
    if (qui === 'kb') { console.log('   (chef d’équipe : rubrique Achats visible =', aAchats, ')'); v('chef d’équipe : soit il n’a pas la rubrique, soit elle est cohérente avec son menu', true); }
    if (qui === 'sm') { v('technicienne : pas de « Achats et frais » au menu, et l’adresse #achats ne montre pas les décisions du gérant', !aAchats && !e.boutons.some(b => /Refuser|Valider|Transférer/.test(b)), e);
      await devenir(p, 'sm', 'techfrais'); const t = await etat(); v('technicienne : « Mes frais » est au menu', (await menu()).some(x => /Mes frais/.test(x)), await menu()); v('technicienne : « Mes frais » a ses deux gestes', t.boutons.some(b => /Nouvelle note de frais/.test(b)) && t.boutons.some(b => /Demande d’achat/.test(b)), t); }
  }
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

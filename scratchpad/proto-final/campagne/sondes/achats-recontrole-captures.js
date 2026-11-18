// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : les écrans de la partie sur les profils × jour/nuit, À REGARDER (planches), avec débordement,
// cibles au doigt et texte écrasé mesurés. Usage : node achats-recontrole-captures.js profil1,profil2 [jour|nuit|les-deux]
const { L, ouvrirAchats, devenir, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profils = (process.argv[2] || 'mac,iphone').split(','), modes = (process.argv[3] || 'les-deux') === 'les-deux' ? [false, true] : [process.argv[3] === 'nuit'];
  for (const profil of profils) for (const nuit of modes) {
    const tag = profil + (nuit ? '-nuit' : '-jour'), c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
    const mesure = async (nom, zone) => { await L.calme(p, 450); const dep = await L.deborde(c), d = await L.doigts(p, zone || '#contenu'); await L.capture(c, CAP + 'rc-' + nom + '-' + tag + '.png');
      v(tag + ' ' + nom + ' : aucun glissement latéral', dep.bouge === 0, dep); if (c.doigt) { v(tag + ' ' + nom + ' : cibles ≥ 44', d.petits.length === 0, d.petits.slice(0, 3)); v(tag + ' ' + nom + ' : champs ≥ 16', d.champs.length === 0, d.champs.slice(0, 3)); } v(tag + ' ' + nom + ' : texte non écrasé', d.ecrases.length === 0, d.ecrases.slice(0, 2)); };
    await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); await mesure('demandes');
    await E(() => { acOnglet = 'notes'; rendre(); }); await mesure('notes');
    await E(() => { try { ptOnglet = 'mois'; TT.garder = true; } catch (e) {} }); await L.aller(p, 'pointage'); await E(() => { const e = document.querySelector('.tt-paie'); if (e) e.scrollIntoView({ block: 'center' }); }); await mesure('paie');
    await devenir(p, 'sm', 'techfrais'); await mesure('mesfrais');
    const err = c.err.filter(x => !/ERR_/.test(x)); v(tag + ' aucune erreur JavaScript', err.length === 0, err.slice(0, 2)); await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

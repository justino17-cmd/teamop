// Mise en page de « Tâches » et « Absences et congés » : un profil, jour ET nuit, chaque écran et chaque fenêtre.
// Mesure : glissement latéral (contre la largeur POSÉE du profil), cibles au doigt (< 44 px), champs (< 16 px), textes écrasés, erreurs JS.
// usage : node taches-absences-mise-en-page.js <profil> [capturer]   — rend « N ✓ · M ✗ » ; sort en 1 si un contrôle tombe.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', capt = process.argv[3] !== 'non';
const ECRANS = {
  marc: [
    ['taches-auj', 'taches', p => p.evaluate(() => document.querySelector('[data-tonglet=auj]').click())],
    ['taches-avenir', 'taches', p => p.evaluate(() => document.querySelector('[data-tonglet=avenir]').click())],
    ['taches-faites', 'taches', p => p.evaluate(() => document.querySelector('[data-tonglet=faites]').click())],
    ['taches-choix', 'taches', p => p.evaluate(() => { document.querySelector('[data-tsel=t1]').click(); document.querySelector('[data-tsel=t12]').click(); })],
    ['tache-fiche', 'taches', p => p.evaluate(() => tDetail('t3'))],
    ['tache-fiche-t1', 'taches', p => p.evaluate(() => tDetail('t1'))],
    ['tache-nouvelle', 'taches', p => p.evaluate(() => document.querySelector('[data-tnouv]').click())],
    ['tache-propositions', 'taches', p => p.evaluate(() => document.querySelector('[data-tsuggs]').click())],
    ['tache-titre-long', 'taches', p => p.evaluate(() => { TACHES.push({ id: 'tlong', t: 'Rappeler monsieur Jean-Baptiste de la Fontaine-Beauregard-Dupont pour le contrôle annuel de sa pompe à chaleur Daikin Altherma 3 série H', qui: 'julie', d: AUJ, h: '14:30', urgent: true, creePar: 'marc', creeLe: '31/10', note: 'Prévenir avant de venir, la grille est fermée de 12 h à 14 h et le chien est méchant. '.repeat(3) }); rendre(); })],
    ['absences-valider', 'absences', p => p.evaluate(() => document.querySelector('[data-aonglet=valider]').click())],
    ['absences-calendrier', 'absences', p => p.evaluate(() => document.querySelector('[data-aonglet=calendrier]').click())],
    ['absences-calendrier-sophie', 'absences', p => p.evaluate(() => { document.querySelector('[data-aonglet=calendrier]').click(); document.querySelector('[data-acqui=sm]').click(); })],
    ['absences-soldes', 'absences', p => p.evaluate(() => document.querySelector('[data-aonglet=soldes]').click())],
    ['absence-nouvelle', 'absences', p => p.evaluate(() => document.querySelector('[data-anouv]').click())],
    ['absence-refus', 'absences', p => p.evaluate(() => document.querySelector('[data-anon]').click())],
    ['absence-export', 'absences', p => p.evaluate(() => document.querySelector('[data-aexport]').click())],
  ],
  sm: [
    ['mes-conges', 'absences', p => Promise.resolve()],
    ['mes-conges-demande', 'absences', p => p.evaluate(() => document.querySelector('[data-atdem]').click())],
    ['mes-taches', 'taches', p => Promise.resolve()],
    ['mes-taches-fiche', 'taches', p => p.evaluate(() => tDetail('t11'))],
  ],
};
(async () => {
  for (const nuit of [false, true]) for (const qui of ['marc', 'sm']) {
    const c = await L.ouvrir({ profil, qui, nuit, hash: qui === 'marc' ? 'taches' : 'absences' }); const p = c.p; const tag = `${profil}${nuit ? ' nuit' : ' jour'} ${qui}`;
    for (const [nom, route, prep] of ECRANS[qui]) {
      await O.neuf(c, route); await L.calme(p, 300);
      if (nuit !== undefined) await p.evaluate(n => { try { mode = n ? 'nuit' : 'jour'; appliquerMode(); } catch (e) {} }, nuit);
      await prep(p); await L.calme(p, 500);
      const panneau = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
      const dep = await L.deborde(c); const zone = panneau ? '#calque .panneau' : '#contenu'; const d = c.doigt ? await L.doigts(p, zone) : { petits: [], champs: [], ecrases: await L.doigts(p, zone).then(x => x.ecrases) };
      const pop = await p.evaluate(zone => document.querySelectorAll(zone + ' *').length, zone);
      v(`${tag} · ${nom} : population non vide (${pop} éléments)`, pop > 20);
      v(`${tag} · ${nom} : aucun glissement latéral (${dep.largeur} px)`, dep.bouge === 0, dep);
      if (c.doigt) { v(`${tag} · ${nom} : cibles au doigt ≥ 44 px`, d.petits.length === 0, d.petits.slice(0, 8)); v(`${tag} · ${nom} : champs ≥ 16 px`, d.champs.length === 0, d.champs.slice(0, 5)); }
      v(`${tag} · ${nom} : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases.slice(0, 3));
      if (capt) await L.capture(c, `${O.CAP}mep/${profil}-${nuit ? 'nuit' : 'jour'}-${qui}-${nom}.png`);
    }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });

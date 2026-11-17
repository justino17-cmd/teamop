// « Mon entreprise » : la ligne existe pour le gérant et pour lui seul, cinq cartes + six liens, l'état de chaque carte, aucun débordement
// aux six largeurs de la spécification (contre la largeur POSÉE du profil), cibles ≥ 44 px au doigt, champs ≥ 16 px (zoom d'iOS),
// et des VALEURS LONGUES (nom de 60, adresse de 80, IBAN de 34).
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de conclure.
const { L, v, CAP, PROFILS, ouvrirEnt, fin } = require('./entreprise-commun.js');
(async () => {
  // 1. qui voit la ligne : le gérant, pas la technicienne ni le bureau (la case « L'entreprise et l'équipe » arrive à l'étape des droits)
  for (const [qui, voit] of [['marc', true], ['julie', false], ['sm', false], ['kb', false]]) {
    const c = await L.ouvrir({ profil:'mac', qui }); await L.calme(c.p, 300);
    const r = await c.p.evaluate(() => ({ menu:!!document.querySelector('#menu a[href="#entreprise"]'), permis:rlPermis('entreprise'), lignes:document.querySelectorAll('#menu .m-liste a').length }));
    v(`${qui} : la ligne « Mon entreprise » ${voit ? 'est au menu' : 'n’est pas au menu'}`, r.menu === voit && r.permis === voit && r.lignes > 3, r);
    if (!voit) { await c.p.evaluate(() => { location.hash = '#entreprise'; }); await L.calme(c.p, 500);
      const h = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, hash:location.hash })); v(`${qui} : l’adresse #entreprise tapée ne montre pas l’écran`, !/Mon entreprise/.test(h.h1 || ''), h); }
    await L.fin(c);
  }
  // 2. la ligne est dans le groupe « Personnel », après « Véhicules »
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await L.calme(c.p, 300);
    const g = await c.p.evaluate(() => { const R = [...document.querySelectorAll('#menu .m-liste > *')]; let cur = '', out = {}; R.forEach(e => { if (e.classList.contains('grp')) { cur = e.textContent.trim(); out[cur] = []; } else if (cur) out[cur].push((e.querySelector('.m-n') || e).textContent.trim()); }); return out; });
    v('menu du gérant : « Personnel » = Équipe, Temps de travail, Véhicules, Mon entreprise, Sécurité (jamais un groupe d’une seule ligne ; double-auth étape 3 : la 21e ligne du gérant)', (g['Personnel'] || []).join('|') === 'Équipe|Temps de travail|Véhicules|Mon entreprise|Sécurité', g['Personnel']);
    await L.fin(c); }
  // 3. l'écran, aux six largeurs
  let nEcrans = 0;
  for (const profil of PROFILS) for (const nuit of (profil === 'mac' || profil === 'iphone' ? [false, true] : [false])) {
    const c = await ouvrirEnt({ profil, nuit }); const tag = `${profil} ${nuit ? 'nuit' : 'jour'}`; nEcrans++;
    const r = await c.p.evaluate(() => ({ h1:document.querySelector('#contenu h1').textContent, cartes:[...document.querySelectorAll('[data-ent^="carte|"]')].map(e => e.dataset.ent.split('|')[1]), liens:[...document.querySelectorAll('[data-ent^="lien|"]')].map(e => e.dataset.ent.split('|')[1]),
      etats:[...document.querySelectorAll('[data-ent^="carte|"]')].map(e => (e.querySelector('.st') || {}).textContent || (e.querySelector('.ent-ligne') || {}).textContent), bandeau:(document.querySelector('.ent-ban') || {}).textContent, aide:[...document.querySelectorAll('.ent-aide')].length }));
    v(`${tag} : titre « Mon entreprise »`, r.h1 === 'Mon entreprise', r.h1);
    v(`${tag} : cinq cartes dans l’ordre ident, legal, logo, banque, horaires`, r.cartes.join('|') === 'ident|legal|logo|banque|horaires', r.cartes);
    v(`${tag} : six liens « Ce qui se règle ailleurs »`, r.liens.join('|') === 'rdv|auto|ndf|stock|boites|metiers', r.liens);
    v(`${tag} : une phrase d’aide par carte (5)`, r.aide === 5, r.aide);
    v(`${tag} : états Complète / À compléter / initiales / Complète / Complète`, r.etats.join('|') === 'Complète|À compléter|Les initiales CS sont utilisées|Complète|Complète', r.etats);
    v(`${tag} : le bandeau dit que les factures peuvent partir (nom, adresse, SIRET présents) et ce qui reste à compléter — jamais « complète » tant qu'une mention manque`, /^Tes factures peuvent partir\. Il reste à compléter, dans tes mentions légales\s:\sla forme juridique/.test(r.bandeau || '') && !/Ta fiche est complète/.test(r.bandeau || ''), r.bandeau);
    const d = await L.deborde(c); v(`${tag} : la page ne glisse pas de côté (largeur posée ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur, d);
    if (c.doigt) { const t = await L.doigts(c.p, '#contenu'); v(`${tag} : cibles ≥ 44 px`, t.petits.length === 0, t.petits); v(`${tag} : aucun texte écrasé`, t.ecrases.length === 0, t.ecrases); }
    if (nuit || profil === 'mac' || profil === 'iphone' || profil === 'petit') await L.capture(c, `${CAP}structure-${profil}-${nuit ? 'nuit' : 'jour'}.png`, false);
    await L.fin(c);
  }
  v('population : écrans mesurés', nEcrans >= 8, nEcrans);
  // 4. valeurs longues : le texte passe à la ligne, ne déborde pas
  for (const profil of ['petit', 'iphone', 'mac720']) {
    const c = await ouvrirEnt({ profil });
    await c.p.evaluate(() => { ENTREPRISE.nom = 'Société Générale de Climatisation et de Chauffage Atlantique'.slice(0, 60); ENTREPRISE.adr = 'Zone industrielle de la Pointe de Beauregard bâtiment C, 17000 La Rochelle-sur-Mer'.slice(0, 85).replace(/,.*$/, '') + ', 17000 La Rochelle'; ENTREPRISE.iban = 'FR76 3000 6000 0112 3456 7890 1890 1234'.slice(0, 40); ENTREPRISE.mail = 'direction-generale-tres-longue@climatisation-chauffage-atlantique.example.fr'; CP_EXPERT.cab = 'Cabinet d’expertise comptable Atlantique Conseil et Associés'; rendre(); });
    await L.calme(c.p, 500);
    const m = await c.p.evaluate(() => ({ nom:ENTREPRISE.nom.length, adr:ENTREPRISE.adr.length, iban:ENTREPRISE.iban.length }));
    v(`${profil} valeurs longues posées (nom ${m.nom}, adresse ${m.adr}, IBAN ${m.iban} signes)`, m.nom >= 55 && m.adr >= 60 && m.iban >= 34, m);
    const d = await L.deborde(c); v(`${profil} valeurs longues : aucun débordement`, d.bouge === 0 && d.seconde <= d.largeur, d);
    await L.capture(c, `${CAP}structure-longues-${profil}.png`, false);
    await L.fin(c);
  }
  // 5. un panneau, aux six largeurs : champs ≥ 16 px, pas de débordement, le bouton « Enregistrer » est atteignable
  for (const profil of PROFILS) {
    const c = await ouvrirEnt({ profil });
    for (const k of ['ident', 'legal', 'logo', 'banque', 'horaires']) {
      await L.toucher(c, `[data-ent="carte|${k}"]`); await L.calme(c.p, 250);
      const ouv = await c.p.evaluate(() => !!document.querySelector('#calque .panneau'));
      v(`${profil} carte ${k} : le panneau s’ouvre`, ouv);
      if (ouv) {
        const t = await L.doigts(c.p, '#calque .panneau'); if (c.doigt) v(`${profil} panneau ${k} : champs ≥ 16 px, cibles ≥ 44 px`, t.champs.length === 0 && t.petits.length === 0, { champs:t.champs, petits:t.petits });
        else v(`${profil} panneau ${k} : champs ≥ 16 px`, t.champs.length === 0, t.champs);
        const d = await L.deborde(c); v(`${profil} panneau ${k} : aucun débordement`, d.bouge === 0 && d.seconde <= d.largeur, d);
        const dedans = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'), b = P.querySelector('.actions .btn:not(.gris)'); if (!b) return 'sans bouton'; b.scrollIntoView({ block:'center' }); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0 ? 'atteint' : 'hors écran ' + Math.round(r.bottom) + '/' + innerHeight; });
        v(`${profil} panneau ${k} : « Enregistrer » atteignable`, dedans === 'atteint', dedans);
        if (k === 'ident' && (profil === 'iphone' || profil === 'mac')) await L.capture(c, `${CAP}panneau-ident-${profil}.png`, false);
        if (k === 'horaires' && profil === 'iphone') await L.capture(c, `${CAP}panneau-horaires-${profil}.png`, false);
        await L.ranger(c.p);
      }
    }
    await L.fin(c);
  }
  await fin();
})();

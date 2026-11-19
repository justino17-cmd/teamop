// Campagne « métiers » : dans Équipe, les trois écrans du métier 3D n'apparaissent comme lignes à régler (« Ce que Julie voit », cases Voir / Créer…)
// que si l'entreprise a le métier 3D. Le gérant ouvre la fiche de Julie, avec et sans le métier 3D, et on lit sa phrase « Ce que … voit » et ses cases.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const TROIS = /Registre sanitaire|Carte des box|Devis xylophage/;
(async () => {
  for (const [lib, packs, avec] of [['sans 3D', O.METIERS.clim, false], ['avec 3D', O.METIERS.d3, true]]) {
    const c = await O.ouvrir({ packs }), p = c.p; await L.aller(p, 'equipe'); const t0 = (await O.lire(p)).texte;
    v(`équipe ${lib} : l'écran Équipe s'ouvre et nomme Julie`, /Julie/.test(t0), t0.slice(0, 120));
    v(`équipe ${lib} : la liste de l'équipe ${avec ? 'peut' : 'ne doit pas'} nommer un écran 3D`, TROIS.test(t0) === false || avec, t0.slice(0, 160));
    const ouvre = await L.toucher(c, p.locator('#contenu button, #contenu a, #contenu [data-eq]').filter({ hasText: /Julie/ }).locator('visible=true').first()); await L.calme(p, 700);
    const e = await O.lire(p); v(`équipe ${lib} : la fiche de Julie s'ouvre`, ouvre && /Julie/.test(e.texte) && e.texte.length > 300, e.route + ' ' + e.texte.slice(0, 100));
    const voit = (e.texte.match(/Ce que Julie voit[^.]{0,400}/i) || [''])[0]; notes.push(`Fiche de Julie ${lib} : « ${voit.slice(0, 300)} »`);
    v(`équipe ${lib} : la phrase « Ce que Julie voit » ${avec ? 'cite' : 'ne cite pas'} les écrans 3D`, !voit || TROIS.test(voit) === avec, voit.slice(0, 300));
    // le réglage des droits (cases), ouvert par le bouton qui parle de droits / permissions / menu
    const dr = await L.toucher(c, p.locator('#contenu button, #calque button').filter({ hasText: /Droits|Permissions|Ce qu.elle (voit|peut)|Régler|Personnaliser/ }).locator('visible=true').first()); await L.calme(p, 700);
    const e2 = await O.lire(p); notes.push(`Réglage des droits ${lib} (ouvert : ${dr}) : ` + e2.texte.slice(0, 200));
    if (dr) v(`équipe ${lib} : le réglage des droits ${avec ? 'propose' : 'ne propose pas'} les trois écrans 3D`, TROIS.test(e2.texte) === avec, (e2.texte.match(TROIS) || ['(rien)'])[0]);
    v(`équipe ${lib} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c);
  }
  await L.fermer(); process.exit(O.bilan('metier-3d-droits', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });

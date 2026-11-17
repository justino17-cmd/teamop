// MISE EN PAGE des écrans « Interventions », sur un profil, jour ou nuit : débordement latéral (contre la largeur POSÉE du profil), cibles au doigt,
// champs sous 16 px, texte écrasé, contenu caché sous la barre du bas, et une capture de chaque écran à REGARDER.
// usage : node interventions-mise-en-page.js <profil> [nuit] [filtre de noms]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L, fs = require('fs');
const LONGUES = `CLIENTS.mr.nom = 'Madame Marie-Hélène de Montmorency-Laval-Saint-Aubin'; CLIENTS.vp.nom = 'Société d’exploitation des établissements Dupont-Lefèvre et fils, Saint-Jean-d’Angély'; CLIENTS.vp.adr = '12 quai Valin, bâtiment B, résidence des Hauts de la Rochelle-sur-Mer, 17000 La Rochelle';
  { const i = INTS.find(o => o.id === 'i1'); i.titre = 'Dépannage de la climatisation de la grande salle du restaurant et de la cuisine centrale'; i.motif = 'La clim de la salle fait un bruit de ferraille et ne refroidit plus depuis ce matin, et le client demande qu’on regarde aussi l’unité de la cuisine centrale avant le service de midi. ' + 'Très long. '.repeat(20); }
  { const F = fiche('i1'); F.compte = 'Le ventilateur extérieur faisait un bruit de ferraille : nous l’avons graissé, resserré, puis nous avons testé la machine pendant vingt minutes. '.repeat(5) + 'Supercalifragilisticexpialidocious'.repeat(3); F.trouve = 'Roulement usé. '.repeat(40); F.signeNom = 'Jean-Baptiste de la Tour-Maubourg-Saint-Exupéry';
    F.pieces = [{ nom:'Roulement à billes à double rangée étanche pour moteur de ventilateur extérieur Daikin RXM35R', q:'12 345,67 L', pu:10 }, { nom:'Supercalifragilisticexpialidocious'.repeat(2), q:'1' }]; F.photos.push({ nom:'Photo de l’unité extérieure sur le toit, côté nord, prise depuis l’échelle' }); }
  `;
const ECRANS = [
  { n: 'liste', qui: 'marc', h: 'interventions' },
  { n: 'liste-tout', qui: 'marc', h: 'interventions', prep: "filtreInt='tout'; rendre();" },
  { n: 'fiche-encours', qui: 'marc', h: 'inter-x-i1' },
  { n: 'fiche-planifiee', qui: 'marc', h: 'inter-x-i2' },
  { n: 'fiche-aplanifier', qui: 'marc', h: 'inter-x-i5' },
  { n: 'fiche-retard', qui: 'marc', h: 'inter-x-i3' },
  { n: 'fiche-fait', qui: 'marc', h: 'inter-x-i6' },
  { n: 'fiche-fait-facturee', qui: 'marc', h: 'inter-x-i24' },
  { n: 'creation', qui: 'marc', h: 'interventions', prep: 'ouvrirCreation({});', zone: '#fenetre .fen' },
  { n: 'creation-nouveau-client', qui: 'marc', h: 'interventions', prep: "ouvrirCreation({}); CREA.nouveau = true; rendreCreation();", zone: '#fenetre .fen' },
  { n: 'creation-forfait', qui: 'marc', h: 'interventions', prep: "ouvrirCreation({cli:'hp'}); CREA.fact = 'forfait'; rendreCreation();", zone: '#fenetre .fen' },
  { n: 'modifier', qui: 'marc', h: 'inter-x-i2', prep: "ACTIONS.modifInt({dataset:{id:'i2'}});", zone: '#calque .panneau' },
  { n: 'mail', qui: 'marc', h: 'inter-x-i6', prep: "panneauMail('i6');", zone: '#calque .panneau' },
  { n: 'sms', qui: 'marc', h: 'inter-x-i6', prep: "panneauSms('i6');", zone: '#calque .panneau' },
  { n: 'client-voit-pdf', qui: 'marc', h: 'clientvoit', prep: "voirInt='i6'; modeClient='pdf'; rendre();" },
  { n: 'client-voit-plein', qui: 'marc', h: 'clientvoit', prep: "voirInt='i6'; modeClient='pdf'; rendre(); docPlein(document.querySelector('.pdf'));", zone: '#docplein' },
  { n: 'client-voit-tel', qui: 'marc', h: 'clientvoit', prep: "voirInt='i6'; modeClient='web'; rendre();" },
  { n: 'client-voit-ordi', qui: 'marc', h: 'clientvoit', prep: "voirInt='i6'; modeClient='ordi'; rendre();" },
  { n: 'tech-journee', qui: 'sm', h: 'majournee' },
  { n: 'tech-fiche', qui: 'sm', h: 'inter-x-i1' },
  { n: 'tech-fiche-planifiee', qui: 'sm', h: 'inter-x-i2' },
  { n: 'tech-pas-fini', qui: 'sm', h: 'inter-x-i2', prep: "feuillePasFini('i2');", zone: '#calque .panneau' },
  { n: 'tech-manque', qui: 'sm', h: 'inter-x-i1', prep: "ACTIONS.terminer({dataset:{id:'i1'}});", zone: '#calque .panneau' },
  { n: 'tech-fait', qui: 'sm', h: 'inter-x-i20' },
  // les valeurs LONGUES : un nom de client de 80 signes, un titre de 90, des pièces au nom interminable, un compte rendu de 700 signes, un mot sans espace
  { n: 'longues-fiche-tech', qui: 'sm', h: 'inter-x-i1', prep: LONGUES },
  { n: 'longues-fiche-bureau', qui: 'marc', h: 'inter-x-i1', prep: LONGUES },
  { n: 'longues-liste', qui: 'marc', h: 'interventions', prep: LONGUES + "filtreInt='tout'; rendre();" },
  { n: 'longues-journee', qui: 'sm', h: 'majournee', prep: LONGUES },
  { n: 'longues-fiche-fait', qui: 'marc', h: 'inter-x-i6', prep: LONGUES },
  { n: 'longues-client-voit', qui: 'marc', h: 'clientvoit', prep: LONGUES + "voirInt='i1'; modeClient='web'; rendre();" },
];
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', filtre = process.argv[4] ? new RegExp(process.argv[4]) : null;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v, sortie = [];
  let courant = 'marc';
  for (const e of ECRANS) {
    if (filtre && !filtre.test(e.n)) continue;
    if (e.qui !== courant) { await I.devenir(c, e.qui, 'accueil'); courant = e.qui; }
    await p.evaluate(() => { try { if (CREA) fermerCreation(); } catch (x) {} try { docPleinFermer(); } catch (x) {} try { fermerPanneau(); } catch (x) {} });   // l'écran d'avant ne reste pas ouvert par-dessus : une fenêtre de création ou un document plein écran couvrent tout
    await L.aller(p, e.h); if (e.prep) { try { await p.evaluate(e.prep); } catch (x) { console.log('  · préparation de', e.n, ':', x.message.slice(0, 80)); } await L.calme(p, 700); }
    const zone = e.zone || '#contenu', nom = `${e.n}/${profil}${nuit ? '/nuit' : ''}`;
    const existe = await p.evaluate(z => !!document.querySelector(z) && document.querySelector(z).offsetHeight > 0, zone); if (!v(`${nom} : l’écran est là (population)`, existe)) continue;
    const dep = await L.deborde(c); v(`${nom} : pas de glissement latéral`, dep.bouge === 0, dep);
    const d = await L.doigts(p, zone);
    // un bouton ou un champ sans nom (ni texte, ni aria-label, ni libellé qui l'entoure, ni title, ni placeholder)
    const nu = await p.evaluate(z => { const R = document.querySelector(z), out = []; let n = 0;
      for (const e of R.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, textarea')) { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue; n++;
        const lab = e.closest('label'), nomE = (e.getAttribute('aria-label') || e.getAttribute('title') || (e.tagName === 'INPUT' || e.tagName === 'SELECT' || e.tagName === 'TEXTAREA' ? (e.placeholder || (lab && lab.textContent) || (e.id && document.querySelector('label[for="' + e.id + '"]') && 'x')) : e.textContent) || '').replace(/\s+/g, ' ').trim();
        if (!nomE && !(e.type === 'file') && !(e.hasAttribute('hidden'))) out.push(e.tagName + ' ' + [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 20)).join(' ')); }
      return { n, out }; }, zone);
    v(`${nom} : tous les boutons et champs ont un nom (${nu.n} recensés)`, nu.out.length === 0, nu.out.slice(0, 6));
    v(`${nom} : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases);
    if (c.doigt) { v(`${nom} : champs à 16 px au moins`, d.champs.length === 0, d.champs); if (process.env.REEL !== '0') { const r = await I.doigtsReel(p, zone); v(`${nom} : cibles au doigt ≥ 44 px`, r.length === 0, r); } else v(`${nom} : cibles au doigt ≥ 44 px (mesure simple)`, d.petits.length === 0, d.petits); }
    // le bas de l'écran n'est pas recouvert par la barre fixe : le dernier contenu doit pouvoir passer au-dessus
    const bas = await p.evaluate(z => { const R = document.querySelector(z); if (!R) return null; scrollTo(0, 1e6); if (R.scrollHeight > R.clientHeight + 4 && getComputedStyle(R).overflowY !== 'visible') R.scrollTop = 1e6;
      const fixes = [...document.querySelectorAll('body *')].filter(x => { const cs = getComputedStyle(x); return cs.position === 'fixed' && x.offsetHeight > 20 && x.offsetHeight < 260 && x.getBoundingClientRect().bottom > innerHeight - 4 && x.getBoundingClientRect().width > innerWidth * .5 && cs.visibility !== 'hidden' && !/voile|calque|fenetre/.test(x.id + x.className); });
      const haut = fixes.length ? Math.min(...fixes.map(x => x.getBoundingClientRect().top)) : innerHeight;
      const feuilles = [...R.querySelectorAll('*')].filter(x => x.offsetParent && x.getBoundingClientRect().height > 0); const dern = feuilles.reduce((m, x) => Math.max(m, x.getBoundingClientRect().bottom), 0);
      return { barreHaut: Math.round(haut), dernierBas: Math.round(dern), fixes: fixes.map(x => x.id || x.className).slice(0, 3) }; }, zone);
    if (bas && !e.zone) v(`${nom} : le bas du contenu passe au-dessus de la barre fixe`, bas.dernierBas <= bas.barreHaut + 2, bas);
    await L.capture(c, I.CAP + `mep-${e.n}-${profil}${nuit ? '-nuit' : '-jour'}.png`);
    if (process.env.TEXTES) fs.writeFileSync(I.CAP + `txt-${e.n}.txt`, await I.texte(p, zone));   // les mots de l'écran, à relire comme un artisan de 55 ans
    sortie.push({ n: e.n, dep, d, bas });
  }
  console.log('erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  fs.writeFileSync(`${__dirname}/../interventions-mep-${profil}-${nuit ? 'nuit' : 'jour'}.json`, JSON.stringify(sortie, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

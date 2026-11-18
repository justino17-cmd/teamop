// Outils communs des sondes « bouton Retour » (17 novembre 2026) : la table des calques recensés (même liste que CAL_GENRES de la page, relue de la page elle-même),
// les gestes qui les OUVRENT et qui les FERMENT (au doigt sur téléphone et tablette, à la souris sur ordinateur), et les mesures d'historique.
// ⛔ Jamais contre teamop.fr : tout se passe sur 127.0.0.1, entreprise fictive.
const L = require('../lib.js'), v = L.v;
const A = require('./atelier-outils.js');
exports.L = L; exports.v = v; exports.A = A;

// l'état d'historique et de calques, lu dans la page
exports.hist = async p => { await p.waitForTimeout(150); return exports.histBrut(p); };   // history.length met un instant à suivre un pushState quand un cadre charge : on laisse passer ce battement
exports.histBrut = p => p.evaluate(() => ({ n: history.length, h: location.hash, st: history.state, pile: CAL.pile.join(','), pousse: CAL.pousse, ignore: CAL.ignore, off: CAL.off, y: Math.round(scrollY), ouverts: calOuverts().join(',') }));
exports.attendre = async (p, ms) => { await p.waitForTimeout(ms || 450); await L.calme(p, 150); };
// Retour / Avancer du navigateur (ce que fait le bouton d'Android, le balayage d'iOS, Alt+←), puis on laisse l'historique rendre son verdict
exports.retour = async (p) => { await p.goBack().catch(() => {}); await exports.attendre(p, 500); };
exports.avancer = async (p) => { await p.goForward().catch(() => {}); await exports.attendre(p, 500); };
// une marque posée DANS l'écran : si le rendu de l'écran est rejoué, elle disparaît (le défilement et les champs avec elle)
exports.marquer = p => p.evaluate(() => { const c = document.getElementById('contenu'); document.getElementById('sonde-marque')?.remove(); const i = document.createElement('i'); i.id = 'sonde-marque'; i.hidden = true; c.appendChild(i); return true; });
exports.marque = p => p.evaluate(() => !!document.getElementById('sonde-marque'));
exports.defiler = async (p) => { await p.evaluate(() => { const h = Math.max(document.documentElement.scrollHeight - innerHeight, 0); scrollTo(0, Math.min(180, h)); }); await L.calme(p, 150); };

const tel = c => c.largeur <= 900;                // téléphone ou tablette : pas de clavier, pas de souris
const etroit = c => c.largeur <= 760;             // la barre du haut porte le bouton « Menu » (la tablette en 820 px a son menu latéral permanent)
const dessus = (c, s) => c.p.locator(s).first();
// Les calques, dans l'ordre de la page. `ecran` : la rubrique où l'on se place AVANT d'ouvrir ; `ouvrir(c)` rend vrai si le geste a porté ; `croix(c)` ferme par le geste de l'utilisateur ;
// `rend` : fermer ce calque redessine l'écran dessous (c'est vrai aussi de SA croix : ce n'est pas le Retour qui le décide) ; `profils` : où le calque existe.
exports.GENRES = [
  { k: 'panneau', nom: 'panneau (Nouveau client)', ecran: 'clients',
    ouvrir: c => L.toucher(c, '[data-action="clientNouveau"]'), croix: c => L.toucher(c, '#calque .panneau .x') },
  { k: 'panneau', nom: 'feuille « Menu »', ecran: 'accueil', profils: 'etroit',
    ouvrir: c => L.toucher(c, '.tt-menu[data-menu="ouvrir"]'), croix: c => L.toucher(c, '#calque .panneau .x') },
  { k: 'fenetre', nom: 'fenêtre « Nouvelle intervention »', ecran: 'interventions', rend: true,
    ouvrir: c => L.toucher(c, '[data-creer]'), croix: c => L.toucher(c, '#fenetre [data-action="cFermer"]') },
  { k: 'menu', nom: 'menu contextuel (clic droit sur une carte)', ecran: 'clients', profils: 'bureau',
    ouvrir: async c => { try { await c.p.locator('#contenu [data-go^="client-x-"]').first().click({ button: 'right', timeout: 4000 }); await L.calme(c.p, 250); return true; } catch (e) { return false; } },
    croix: async c => { await c.p.keyboard.press('Escape'); await L.calme(c.p, 250); return true; } },
  { k: 'date', nom: 'choisir une date (dans « Nouvelle tâche »)', ecran: 'taches', dans: 'panneau',
    ouvrirParent: c => L.toucher(c, '[data-tnouv]'), ouvrir: c => L.toucher(c, '#calque .dt-btn'), croix: async c => { await c.p.keyboard.press('Escape'); await L.calme(c.p, 250); return true; } },
  { k: 'planning', nom: 'fenêtre « Quels jours ? » du planning', ecran: 'planning', rend: true,
    prepare: async c => { await L.toucher(c, '[data-plvue="multi"]'); },
    ouvrir: c => L.toucher(c, '[data-mpop="dates"]'), croix: c => L.toucher(c, '[data-mpop="dates"]') },
  { k: 'recherche', nom: 'recherche (Ctrl + K)', ecran: 'accueil', profils: 'bureau',
    ouvrir: async c => { await c.p.keyboard.press('Control+k'); await L.calme(c.p, 250); return await c.p.evaluate(() => !!document.getElementById('pal')); },
    croix: async c => { await c.p.keyboard.press('Escape'); await L.calme(c.p, 250); return true; } },
  { k: 'pdf', nom: 'document en grand (PDF)', ecran: 'inter-x-i6',
    ouvrir: c => L.toucher(c, '[data-pdfplein]'), croix: c => L.toucher(c, '#docplein [data-dpfermer]') },
  { k: 'visionneuse', nom: 'justificatif en grand (fiche d\'un achat)', ecran: 'comptabilite', dans: 'panneau',
    ouvrirParent: async c => { await L.toucher(c, '[data-cx="grp|achats"]'); await c.p.evaluate(() => { const b = document.querySelector('[data-cx="sec|fachats"]'); if (b) b.click(); }); await L.calme(c.p, 300); return L.toucher(c, '[data-cx^="doc|ach"]'); },
    ouvrir: c => L.toucher(c, '#calque [data-cx^="justif|"]'), croix: c => L.toucher(c, '#cx-vis .cx-vis-x') },
  { k: 'paiement', nom: 'paiement en ligne en plein écran', ecran: 'comptabilite',
    prepare: async c => { await L.toucher(c, '[data-cx="grp|tresorerie"]'); await c.p.evaluate(() => { const b = document.querySelector('[data-cx="sec|enligne"]'); if (b) b.click(); }); await L.calme(c.p, 350); },
    ouvrir: c => L.toucher(c, '[data-cx="enlignePlein"]'), croix: c => L.toucher(c, '[data-cx="enlignePlein"]') },
  { k: 'carte', nom: 'carte du planning en plein écran', ecran: 'planning', rend: true,
    prepare: async c => { await L.toucher(c, '[data-plvue="carte"]'); await L.calme(c.p, 500); },
    ouvrir: c => L.toucher(c, '[data-crplein]'), croix: c => L.toucher(c, '[data-crplein]') },
  { k: 'atelier', nom: 'atelier de devis', ecran: 'devis',
    ouvrir: async c => { const f = await A.ouvrirAtelier(c, 'devis', null); return !!f; },
    croix: async c => { const f = L.cadre(c.p, /prototype-documents/); if (!f) return false; await f.locator('[data-fen-x]').first().click().catch(() => {}); await c.p.waitForTimeout(900); return true; } },
  // les quatre calques « oubliés » du recontrôle du 18/11, réglés au tour 1 des restes : OP Security (téléphone simulé en plein écran), sa confirmation, la feuille d'une tournée sur la carte, le panneau d'un cadre
  { k: 'securite', nom: 'OP Security : le téléphone simulé en plein écran', ecran: 'clients', profils: 'sansvolet',
    ouvrir: async c => { await c.p.evaluate(() => { opsMonter(); opsOuvrir(); }); await L.calme(c.p, 300); return await c.p.evaluate(() => document.getElementById('opsec').hasAttribute('data-ouvert')); },
    croix: async c => { await c.p.evaluate(() => opsFermer()); await L.calme(c.p, 300); return true; } },
  { k: 'confirmation', nom: 'confirmation OP Security (« Confirme sur ton téléphone »)', ecran: 'taches',
    ouvrir: async c => { await c.p.evaluate(() => { SECU.auto = false; secuGarde('banque-ouvrir', () => {}); }); await L.calme(c.p, 300); return await c.p.evaluate(() => !!document.getElementById('sec-conf')); },
    croix: c => L.toucher(c, '#sec-conf [data-sec3="annuler"]') },
  { k: 'feuille', nom: 'feuille d\'une tournée sur la carte du planning', ecran: 'planning', profils: 'etroit', rend: true,
    prepare: async c => { await L.toucher(c, '[data-plvue="carte"]'); await L.calme(c.p, 600); },
    ouvrir: async c => { await L.toucher(c, '[data-crsel]'); await L.calme(c.p, 600); return await c.p.evaluate(() => !!document.getElementById('cr-ftel')); },
    croix: c => L.toucher(c, '#cr-ftel [data-crsel]') },
  { k: 'cadre', nom: 'panneau de la Comptabilité plein cadre (Réglages)', ecran: 'comptabilite', rend: true,
    prepare: async c => { await c.p.evaluate(() => { cpSysteme = true; rendre(); }); await c.p.waitForTimeout(1700); await L.calme(c.p, 300); },   // le plein cadre : la porte du menu pose cpSysteme, aller() par programme garde l'ancienne page
    ouvrir: async c => { await c.p.waitForTimeout(300); const f = L.cadre(c.p, /prototype-comptabilite\.html/); if (!f) return false; await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await c.p.waitForTimeout(500); return await f.evaluate(() => !!document.querySelector('#calque').innerHTML); },
    croix: async c => { const f = L.cadre(c.p, /prototype-comptabilite\.html/); if (!f) return false; await f.evaluate(() => fermer()); await c.p.waitForTimeout(500); return true; } },
  { k: 'nouveautes', nom: 'guide des nouveautés', ecran: 'accueil',
    ouvrir: async c => { if (etroit(c)) { if (!await L.toucher(c, '.tt-menu[data-menu="ouvrir"]')) return false; return L.toucher(c, '#calque .nv-menu[data-nv="ouvrir"]'); } return L.toucher(c, '#menu .nv-menu[data-nv="ouvrir"]'); },
    croix: c => L.toucher(c, '#nv [data-nv="fermer"]') },
];
exports.AILLEURS = ['visite'];
exports.applicable = (g, c) => !g.profils || (g.profils === 'sansvolet' ? c.largeur < 1100 : g.profils === 'etroit' ? etroit(c) : !tel(c));   // 'sansvolet' : OP Security n'est un calque qu'en dessous de 1100 px (au-delà c'est un volet permanent)
exports.dessus = dessus; exports.tel = tel; exports.etroit = etroit;

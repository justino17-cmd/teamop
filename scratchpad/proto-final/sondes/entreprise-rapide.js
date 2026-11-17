// « Mon entreprise » + « Achats et frais » : la sonde RAPIDE (une seule ouverture, une minute) — un contrôle par promesse de la spécification, jouée par les
// vrais panneaux et les vraies fonctions de la page. Elle sert d'abord aux contre-épreuves (entreprise-mutations.js : on remet un défaut dans une COPIE de la page
// et elle doit tomber) ; les sondes complètes (structure, champs, destinations, garde-facture, liens, lecture-seule, phrases, logo, achats-lisible) vont plus loin.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de conclure.
const fs = require('fs'), path = require('path');
const { L, v, ouvrirEnt, remplir, fiche, toast, fin } = require('./entreprise-commun.js');
const PAGE = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
const PREP = (id, cli) => `(() => { INTS.push({ id:'${id}', d:AUJ, h:'09:00', dur:60, tech:'sm', cli:'${cli}', titre:'Essai', type:'Entretien', st:'planifiee', fact:{ mode:'forfait', forfait:100, tva:20, zone:1 } }); const F = fiche('${id}'); F.coches = Object.fromEntries(tousControles(F).map(k => [k, true])); F.signature = 'signee'; F.absent = false; F.compte = 'Entretien réalisé.'; return manque(F).length; })()`;
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const cliquer = async (c, sel) => { await c.p.locator(sel).first().click(); await L.calme(c.p, 200); };
(async () => {
  v('fichier : dix-sept appels à logoEnt et aucune initiale écrite en dur', (PAGE.match(/\$\{logoEnt\('(?:div|span)'\)\}/g) || []).length === 17 && !/class="logo-ent">CS</.test(PAGE));
  const c = await ouvrirEnt({ profil:'mac' });
  // ── les champs : injection refusée, adresse en une chaîne, assurance en quatre champs, PAIE_CAB, SIRET de démonstration
  await cliquer(c, '[data-ent="carte|ident"]'); const avant = await fiche(c.p);
  await remplir(c.p, 'en-nom', '<img src=x onerror="window.__pwn=1">'); await cliquer(c, '[data-ent="identok"]');
  const inj = await c.p.evaluate(() => ({ nom:ENTREPRISE.nom, pwn:window.__pwn, img:!!document.querySelector('img[src="x"]'), err:(document.getElementById('en-nom-err') || {}).textContent }));
  v('< > " refusés dans le nom : rien d’écrit, aucun élément injecté', inj.nom === avant.E.nom && !inj.pwn && !inj.img && /ne peut pas contenir de signes/.test(inj.err || ''), inj);
  await remplir(c.p, 'en-nom', 'Essai Climat'); await remplir(c.p, 'en-rue', '3 rue des Mouettes'); await remplir(c.p, 'en-cp', '17000'); await remplir(c.p, 'en-ville', 'La Rochelle'); await cliquer(c, '[data-ent="identok"]');
  const od = await c.p.evaluate(() => ({ adr:ENTREPRISE.adr, o:opdDonnees().entreprise }));
  v('adresse en UNE chaîne « rue, code postal ville », relue par opdDonnees', od.adr === '3 rue des Mouettes, 17000 La Rochelle' && od.o.adresse === '3 rue des Mouettes' && od.o.cp === '17000' && od.o.ville === 'La Rochelle', od);
  await cliquer(c, '[data-ent="carte|legal"]'); await c.p.selectOption('#fl-forme', 'Entreprise individuelle (EI)'); await remplir(c.p, 'fl-rcs', 'RM 17'); await remplir(c.p, 'fl-ass', 'Assurances Océan'); await remplir(c.p, 'fl-num', 'RC 555'); await remplir(c.p, 'fl-asc', 'Océan, La Rochelle'); await remplir(c.p, 'fl-zone', 'France'); await cliquer(c, '[data-cx="ficheok"]');
  const as = await c.p.evaluate(() => { const f = FACTURES.find(x => x.num !== '—' && CLIENTS[x.cli].type === 'pro'); return { siret:ENTREPRISE.siret, avert:(document.getElementById('toast') || {}).textContent || '', o:opdDonnees().entreprise, pdf:pdfFacture(f).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') }; });
  v('le SIRET de démonstration (clé fausse) s’enregistre AVEC l’avertissement', as.siret === '123 456 789 00012' && /numéro de contrôle ne correspond pas/.test(as.avert), as);
  v('l’assurance saisie arrive à l’atelier (assureur, assurNum) ET au pied de la facture', as.o.assureur === 'Assurances Océan' && as.o.assurNum === 'RC 555' && /Assurance : Assurances Océan n° RC 555 \(Océan, La Rochelle\), zone couverte : France/.test(as.pdf), { o:as.o.assureur, n:as.o.assurNum, p:as.pdf.slice(-300) });
  await cliquer(c, '[data-ent="carte|banque"]'); await remplir(c.p, 'en-expmail', 'compta@nouveau-cabinet.fr'); await remplir(c.p, 'en-cab', 'Nouveau Cabinet'); await remplir(c.p, 'en-bic', 'ABCDFRPP'); await cliquer(c, '[data-ent="banqueok"]');
  const pc = await c.p.evaluate(() => ({ nom:PAIE_CAB.nom, mail:PAIE_CAB.mail, fac:pdfFacture(FACTURES.find(x => x.num !== '—' && x.st !== 'avoir')) }));
  v('PAIE_CAB suit le cabinet de la carte (une seule source) ; le BIC s’écrit sur la facture', pc.nom === 'Nouveau Cabinet' && pc.mail === 'compta@nouveau-cabinet.fr' && /BIC ABCDFRPP/.test(pc.fac), { nom:pc.nom, mail:pc.mail });
  const lg = await c.p.evaluate(() => { ENTREPRISE.logo = 'data:image/png;base64,AAAA'; const F = FACTURES.find(x => x.num !== '—' && x.st !== 'avoir'); const r = { facture:pdfFacture(F), devis:(dvInit(), docDevis(DV[0])), contrat:pdfContrat(null, CONTRATS.find(k => k.st === 'signe')), registre:rgDoc('t1', 'tout') }; ENTREPRISE.logo = ''; return Object.fromEntries(Object.entries(r).map(([k, h]) => [k, /<img class="logo-ent" src="data:image\/png/.test(h) && !/>ES</.test(h)])); });
  v('le logo choisi est une image dans la facture, le devis, le contrat et le registre', Object.values(lg).length === 4 && Object.values(lg).every(Boolean), lg);
  // ── la porte
  const cli = await c.p.evaluate(() => Object.keys(CLIENTS).find(k => CLIENTS[k].mail && CLIENTS[k].type === 'pro'));
  await c.p.evaluate(() => { ENTREPRISE.siret = ''; reglages.auto = true; });
  const m1 = await c.p.evaluate(PREP('t-r-1', cli)); await c.p.evaluate(() => ACTIONS.terminer({ dataset:{ id:'t-r-1' } })); await L.calme(c.p, 200);
  const f1 = await c.p.evaluate(() => { const f = FACTURES.find(x => x.int === 't-r-1'); return { st:f.st, num:f.num, id:f.id }; });
  v('terminer sans SIRET : la facture reste « à valider » (refus silencieux)', m1 === 0 && f1.st === 'avalider' && f1.num === '—' && !/Il manque/.test(await toast(c.p)), { m1, f1 });
  const sortie = await c.p.evaluate(id => { const f = FACTURES.find(x => x.id === id); const r = envoyerFacture(f, true); return { r, st:f.st }; }, f1.id);
  v('envoyerFacture rend false et n’envoie rien quand le SIRET manque', sortie.r === false && sortie.st === 'avalider', sortie);
  await c.p.evaluate(id => { ACTIONS.apercuEnvoi({ dataset:{ id } }); ACTIONS.envoyer({ dataset:{ id } }); }, f1.id); await L.calme(c.p, 200);
  const t2 = await toast(c.p); v('envoyer (forcé) : le toast dit le manque, jamais « Facture envoyée »', /Il manque/.test(t2) && !/Facture envoyée/.test(t2), t2);
  await c.p.evaluate(() => ACTIONS.toutValider({})); await L.calme(c.p, 200); const t3 = await toast(c.p);
  v('toutValider : « Aucune facture n’est partie », dit une fois', /Aucune facture n’est partie : il manque/.test(t3) && (t3.match(/il manque/gi) || []).length === 1 && !/0 facture/.test(t3), t3);
  await c.p.evaluate(() => { ENTREPRISE.siret = '732 829 320 00074'; const k = Object.keys(CLIENTS).find(x => CLIENTS[x].type === 'part'); CLIENTS[k]._m = CLIENTS[k].mail; CLIENTS[k].mail = ''; window.__sans = k; });
  const sansMail = await c.p.evaluate(() => window.__sans); await c.p.evaluate(PREP('t-r-2', sansMail)); await c.p.evaluate(() => ACTIONS.terminer({ dataset:{ id:'t-r-2' } }));
  const f2 = await c.p.evaluate(() => FACTURES.find(x => x.int === 't-r-2').st); v('un client sans e-mail retient l’envoi automatique', f2 === 'avalider', f2);
  await c.p.evaluate(PREP('t-r-3', cli)); await c.p.evaluate(() => ACTIONS.terminer({ dataset:{ id:'t-r-3' } })); const f3 = await c.p.evaluate(() => FACTURES.find(x => x.int === 't-r-3').st); v('SIRET rempli et client joignable : la facture part toute seule', f3 === 'envoyee', f3);
  // ── la pastille, les liens, la lecture seule, la phrase « Paramètres », Achats
  await c.p.evaluate(() => { ENTREPRISE.siret = ''; ENTREPRISE.nom = ''; rendre(); });
  const pas = await c.p.evaluate(() => ({ n:rlPastille('entreprise'), dom:(document.querySelector('#menu a[href="#entreprise"] .nb') || {}).textContent }));
  v('la pastille de la ligne compte ce qui manque (nom + SIRET = 2)', pas.n === 2 && pas.dom === '2', pas);
  await c.p.evaluate(() => { ENTREPRISE.siret = '732 829 320 00074'; ENTREPRISE.nom = 'Essai Climat'; rendre(); });
  await L.aller(c.p, 'entreprise'); await cliquer(c, '[data-ent="lien|rdv"]'); await L.calme(c.p, 500);
  const lien = await c.p.evaluate(() => ({ h:location.hash, t:(document.querySelector('#calque .panneau h2') || {}).textContent, s:(document.querySelector('#calque .panneau .surtitre') || {}).textContent }));
  v('le lien « Rendez-vous en ligne » mène au Planning et à son panneau (surtitre « Planning »)', lien.h === '#planning' && lien.t === 'Rendez-vous en ligne' && lien.s === 'Planning', lien);
  await L.aller(c.p, 'entreprise'); await c.p.evaluate(() => { entModifiable = () => false; }); await cliquer(c, '[data-ent="carte|banque"]');
  const ro = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return { actifs:[...P.querySelectorAll('input,select')].filter(e => !e.disabled).length, enreg:P.querySelectorAll('.actions .btn:not(.gris)').length }; });
  v('en lecture seule : champs désactivés, aucun « Enregistrer »', ro.actifs === 0 && ro.enreg === 0, ro);
  await c.p.evaluate(() => { const b = document.createElement('button'); b.dataset.ent = 'banqueok'; document.body.appendChild(b); b.click(); b.remove(); }); const tro = await toast(c.p); v('une écriture forcée est avalée et dite', /Ce geste n’est pas ouvert à ton compte/.test(tro), tro);
  await c.p.evaluate(() => { location.reload; }); await L.fin(c);
  { const c2 = await ouvrirEnt({ profil:'mac' }); await L.aller(c2.p, 'achats');
    const a = await c2.p.evaluate(() => ({ kpis:document.querySelectorAll('#contenu .kpis .kpi').length, lignes:[...document.querySelectorAll('#contenu .ach-compta .ligne-clic')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), groupe:(document.querySelector('#contenu .groupe') || {}).textContent, sous:document.querySelector('#contenu .tete .gris').textContent, menu:(document.querySelector('#menu a[href="#achats"] .m-sous') || {}).textContent, onglets:[...document.querySelectorAll('#contenu .pr-vues .l-long')].map(e => e.textContent) }));
    v('Achats : deux chiffres puis deux lignes sous « Ça se règle dans la Comptabilité »', a.kpis === 2 && a.lignes.length === 2 && norm(a.groupe) === 'Ça se règle dans la Comptabilité', a);
    v('Achats : sous-titre, ligne du menu et onglets', norm(a.sous) === 'Le matériel que ton équipe demande, et les frais qu’elle te fait rembourser.' && a.menu === 'Demandes de l’équipe' && a.onglets.join('|') === 'Demandes de matériel|Notes de frais', a);
    v('plus aucune phrase « Paramètres » dans le fichier (hors NV_PLACE)', PAGE.split('\n').filter(l => /Paramètres/.test(l)).length === 1, 1);
    v('aucune erreur de page', c2.err.length === 0, c2.err);
    await L.fin(c2); }
  await fin();
})();

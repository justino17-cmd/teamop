// « Achats et frais » se comprend sans explication (spécification § 3) : la ligne grise du menu tient sur UNE ligne (« Demandes de l'équipe »), le sous-titre
// dit QUOI (≤ 3 lignes sur iPhone), DEUX chiffres (demandes de matériel, notes de frais) puis DEUX lignes « Ça se règle dans la Comptabilité » qui mènent
// ailleurs, « ＋ Demande » passe SOUS le sous-titre sur téléphone, les onglets tiennent sur 320 px, l'aide « Comment ça marche ? », les états vides, la lecture
// seule sans bouton de décision, et le technicien lit « Mes frais » avec sa phrase. Jour ET nuit, sur les profils.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (profils, boutons) avant de conclure.
const { L, v, ouvrirEnt, PROFILS, CAP, fin } = require('./entreprise-commun.js');
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const RAPIDE = !!process.env.RAPIDE;
(async () => {
  let nm = 0;
  for (const profil of (RAPIDE ? ['mac', 'iphone'] : [...PROFILS, 'windows'])) for (const nuit of (RAPIDE ? [false] : [false, true])) {
    const c = await ouvrirEnt({ profil, nuit }); const tag = `${profil} ${nuit ? 'nuit' : 'jour'}`; await L.aller(c.p, 'achats');
    // la ligne du menu : un seul « petit gris », sur une ligne, non tronquée
    if (c.largeur > 760) {
      const m = await c.p.evaluate(() => { const a = document.querySelector('#menu a[href="#achats"]'), s = a && a.querySelector('.m-sous'); if (!s) return null; const lh = parseFloat(getComputedStyle(s).lineHeight) || 16, r = s.getBoundingClientRect(); return { txt:s.textContent, lignes:Math.round(r.height / lh), tronque:s.scrollWidth > s.clientWidth + 1, dispo:Math.round(s.clientWidth), ecrit:Math.round(s.scrollWidth) }; });
      nm++; v(`${tag} : menu : « Achats et frais » dit « Demandes de l’équipe » sur UNE ligne, sans être coupé`, !!m && m.txt === 'Demandes de l’équipe' && m.lignes === 1 && !m.tronque, m);
    } else {
      await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 400);
      const m = await c.p.evaluate(() => { const a = [...document.querySelectorAll('#calque [data-go="achats"]')][0]; if (!a) return null; const s = a.querySelector('.m-sous, small'); const t = a.textContent.replace(/\s+/g, ' '); return { t, sousLigne:s ? Math.round(s.getBoundingClientRect().height / (parseFloat(getComputedStyle(s).lineHeight) || 16)) : 0, tronque:s ? s.scrollWidth > s.clientWidth + 1 : false }; });
      nm++; v(`${tag} : feuille « Menu » : « Achats et frais » et « Demandes de l’équipe » sur une ligne`, !!m && /Achats et frais/.test(m.t) && /Demandes de l’équipe/.test(m.t) && m.sousLigne <= 1 && !m.tronque, m); await L.ranger(c.p); }
    // l'en-tête : sous-titre, boutons, deux chiffres puis deux lignes, onglets
    const h = await c.p.evaluate(() => { const T = document.querySelector('#contenu .tete'), st = T.querySelector('.gris'), lh = parseFloat(getComputedStyle(st).lineHeight) || 20, act = T.querySelector('.actions'), kp = [...document.querySelectorAll('#contenu .kpis .kpi')], lg = [...document.querySelectorAll('#contenu .ach-compta .ligne-clic')], g = document.querySelector('#contenu .groupe'), tabs = [...document.querySelectorAll('#contenu .pr-vues [role=tab]')];
      const vis = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const r = st.getBoundingClientRect(), a = act && act.getBoundingClientRect(), W = document.getElementById('contenu').getBoundingClientRect().width;
      return { sous:st.textContent, lignes:Math.round(r.height / lh), kpis:kpis(kp), nKpi:kp.length, lignesCx:lg.map(e => e.textContent.replace(/\s+/g, ' ').trim()), groupe:g ? g.textContent : '', onglets:tabs.map(t => [...t.querySelectorAll('.l-long, .l-court')].filter(vis).map(x => x.textContent).join('')), tabsOK:tabs.every(t => t.scrollWidth <= t.clientWidth + 1), bouton:act ? { texte:act.textContent.trim(), sous:a.top >= r.bottom - 1, large:Math.round(a.width), W:Math.round(W) } : null, cible:lg.every(e => e.getBoundingClientRect().height >= 43.5) };
      function kpis(K) { return K.map(k => k.querySelector('b').textContent + ' ' + k.querySelector('span').textContent.replace(/\s+/g, ' ')); } });
    nm++;
    v(`${tag} : sous-titre « Le matériel que ton équipe demande, et les frais qu’elle te fait rembourser. »`, norm(h.sous) === 'Le matériel que ton équipe demande, et les frais qu’elle te fait rembourser.', h.sous);
    if (c.largeur <= 400) v(`${tag} : sous-titre sur trois lignes au plus`, h.lignes <= 3, h.lignes);
    v(`${tag} : DEUX chiffres seulement (demandes de matériel, notes de frais)`, h.nKpi === 2 && /demandes? de matériel à décider/.test(h.kpis[0]) && /notes? de frais à valider/.test(h.kpis[1]), h.kpis);
    v(`${tag} : puis le titre « Ça se règle dans la Comptabilité » et DEUX lignes (factures fournisseurs à payer, achats sans facture)`, norm(h.groupe) === 'Ça se règle dans la Comptabilité' && h.lignesCx.length === 2 && /de factures fournisseurs à payer/.test(h.lignesCx[0]) && /achats? sans facture/.test(h.lignesCx[1]), { g:h.groupe, l:h.lignesCx });
    v(`${tag} : les deux lignes sont des lignes (≥ 44 px), pas des chiffres déguisés`, h.cible, h.cible);
    v(`${tag} : onglets « Demandes de matériel » ${c.largeur <= 760 ? '(court « Matériel »)' : ''} et « Notes de frais » ${c.largeur <= 760 ? '(court « Frais »)' : ''}, qui tiennent`, h.tabsOK && (c.largeur <= 760 ? h.onglets.join('|').replace(/\d+/g, '').trim() === 'Matériel|Frais' || /^Matériel\s*\d*\|Frais\s*\d*$/.test(h.onglets.join('|')) : /^Demandes de matériel\s*\d*\|Notes de frais\s*\d*$/.test(h.onglets.join('|'))), h.onglets);
    if (c.largeur <= 760) v(`${tag} : « ＋ Demande » passe SOUS le sous-titre, sur la largeur utile`, !!h.bouton && h.bouton.sous && h.bouton.large >= h.bouton.W * 0.85, h.bouton); else v(`${tag} : « ＋ Demande » est là`, !!h.bouton && /Demande/.test(h.bouton.texte), h.bouton);
    const d = await L.deborde(c); v(`${tag} : aucun débordement (largeur posée ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur, d);
    if (c.doigt) { const t = await L.doigts(c.p, '#contenu'); v(`${tag} : cibles ≥ 44 px, aucun texte écrasé`, t.petits.length === 0 && t.ecrases.length === 0, t); }
    if (profil === 'iphone' || profil === 'petit' || profil === 'mac' || profil === 'windows') await L.capture(c, `${CAP}achats-${profil}-${nuit ? 'nuit' : 'jour'}.png`, false);
    await L.fin(c);
  }
  v('population : profils mesurés', nm >= 6, nm);
  // les gestes : les deux lignes mènent à la Comptabilité, l'aide, les états vides
  { const c = await ouvrirEnt({ profil:'mac' }); await L.aller(c.p, 'achats');
    let n = 0;
    for (const [i, dest] of [[0, 'factures à payer'], [1, 'achats sans facture']]) { await L.aller(c.p, 'achats'); await L.toucher(c, `#contenu .ach-compta .ligne-clic >> nth=${i}`); await L.calme(c.p, 600); n++;
      const r = await c.p.evaluate(() => ({ hash:location.hash, onglet:CP.onglet, cat:CX.cat, st:CX.st })); v(`la ligne « ${dest} » mène à la Comptabilité › Factures (adresse et filtre)`, r.hash === '#comptabilite' && r.onglet === 'factures' && r.cat === 'achats', r); }
    v('population : deux lignes touchées', n === 2, n);
    await L.aller(c.p, 'achats'); await L.toucher(c, '#contenu .ach-aide');
    const a = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? P.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ') : ''; });
    v('« Comment ça marche ? » : trois temps (un technicien écrit « Il me faut… » / ça arrive ici / tu acceptes ou tu refuses) puis ce que devient une demande', /1\. Un technicien écrit « Il me faut… » ou envoie la photo d’un ticket depuis son téléphone\./.test(a) && /2\. Ça arrive ici\./.test(a) && /3\. Toi, tu acceptes ou tu refuses ; une phrase toute prête t’évite de taper\./.test(a) && /Le matériel accepté part en commande ou se prend dans le stock ; la note de frais validée est remboursée avec la paie\./.test(a), a);
    await L.ranger(c.p);
    await c.p.evaluate(() => { DEM_ACHAT.length = 0; NDF.length = 0; acOnglet = 'demandes'; rendre(); }); await L.calme(c.p, 300);
    const e1 = norm(await c.p.evaluate(() => document.querySelector('#contenu').innerText)); v('état vide des demandes : « Aucune demande de matériel en attente. Quand un technicien écrit « Il me faut… » depuis son téléphone, elle arrive ici. »', e1.includes('Aucune demande de matériel en attente. Quand un technicien écrit « Il me faut… » depuis son téléphone, elle arrive ici.'), e1.slice(0, 200));
    await L.toucher(c, '#contenu .pr-vues [data-ac="onglet|notes"]'); const e2 = norm(await c.p.evaluate(() => document.querySelector('#contenu').innerText)); v('état vide des notes : « Aucune note de frais à valider. Quand un technicien envoie la photo d’un ticket, elle arrive ici. »', e2.includes('Aucune note de frais à valider. Quand un technicien envoie la photo d’un ticket, elle arrive ici.'), e2.slice(0, 200));
    v('aucune erreur de page', c.err.length === 0, c.err); await L.fin(c); }
  // lecture seule (la gestion) : sous-titre, pas de « ＋ Demande », aucun bouton de décision
  { const c = await ouvrirEnt({ profil:'mac', qui:'julie' }); await L.aller(c.p, 'achats');
    const r = await c.p.evaluate(() => ({ sous:document.querySelector('#contenu .tete .gris').textContent, dem:!!document.querySelector('[data-axa="dem"]'), lignes:document.querySelectorAll('#contenu .ach-compta .ligne-clic').length,
      decision:[...document.querySelectorAll('#contenu [data-ac], #contenu [data-axa]')].map(e => e.dataset.ac ? e.dataset.ac.split('|')[0] : e.dataset.axa.split('|')[0]).filter(a => !['onglet', 'fiche', 'inter'].includes(a)), bandeau:(document.querySelector('.ax-lect') || {}).textContent || '', nd:document.querySelectorAll('#contenu [data-ac="commande"], #contenu [data-ac="magasin"], #contenu [data-ac="refuser"]').length }));
    v('lecture seule : sous-titre « Le matériel demandé et les frais avancés par l’équipe. Tu peux les regarder ; c’est le gérant qui décide. »', norm(r.sous) === 'Le matériel demandé et les frais avancés par l’équipe. Tu peux les regarder ; c’est le gérant qui décide.', r.sous);
    v('lecture seule : « ＋ Demande » n’est pas dessiné', !r.dem, r.dem);
    v('lecture seule : aucun bouton de décision dessiné (accepter, refuser, magasin, transférer…)', r.nd === 0, r.decision);
    v('lecture seule : les deux lignes vers la Comptabilité restent (elle a la Comptabilité)', r.lignes === 2, r.lignes);
    await L.fin(c); }
  // le technicien : « Mes frais » et sa phrase
  { const c = await ouvrirEnt({ profil:'iphone', qui:'sm' }); await L.aller(c.p, 'techfrais');
    const t = norm(await c.p.evaluate(() => document.querySelector('#contenu .tete').innerText)); v('technicien : « Mes frais » dit « Tu as acheté quelque chose pour le travail ? Envoie la photo du ticket. Il te manque du matériel ? Écris-le : le bureau te répond. »', /Mes frais/.test(t) && t.includes('Tu as acheté quelque chose pour le travail ? Envoie la photo du ticket. Il te manque du matériel ? Écris-le : le bureau te répond.') && !/Achats/.test(t), t);
    const d = await L.deborde(c); v('technicien : aucun débordement', d.bouge === 0 && d.seconde <= d.largeur, d);
    await L.capture(c, `${CAP}achats-technicien-iphone.png`, false); await L.fin(c); }
  await fin();
})();

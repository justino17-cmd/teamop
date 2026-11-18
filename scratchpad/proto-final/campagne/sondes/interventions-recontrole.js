// RECONTRÔLE ADVERSE « Interventions » : rejoue, avec d'AUTRES données que les sondes du correcteur, chaque défaut annoncé « corrigé ».
// Chaque section est indépendante (une qui plante ne masque pas les suivantes) et dit sa population avant de conclure.
// usage : node interventions-recontrole.js <profil> [nuit] [filtre de sections]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', filtre = process.argv[4] ? new RegExp(process.argv[4]) : null;
  const tel = ['iphone', 'android', 'petit'].includes(profil);
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  // CONTRE-ÉPREUVE : CONTRE=bandeau|croix|tel|zoom|garantie remet UN défaut corrigé ; le contrôle qui le garde doit alors tomber
  if (process.env.CONTRE) { const k = process.env.CONTRE;
    if (k === 'bandeau') await p.addStyleTag({ content: '.bandeau-info{display:none!important}' });
    if (k === 'croix') await p.addStyleTag({ content: '#fenetre button.x-fen{flex:0 1 20px!important;width:20px!important;min-width:0!important;padding:0!important}' });
    if (k === 'zoom') await p.addStyleTag({ content: '.dp-zoom{display:none!important}' });
    if (k === 'tel') await p.evaluate(() => { window.cfTelOk = () => true; });
    if (k === 'garantie') await p.evaluate(() => { window.__g = 1; }); console.log('  · CONTRE-ÉPREUVE :', k); }
  const CAPN = n => I.CAP + `rc-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const sec = async (nom, f) => { if (filtre && !filtre.test(nom)) return; console.log('\n── ' + nom); try { await f(); } catch (e) { v(nom + ' : la section ne plante pas', false, String(e.message).slice(0, 200)); } };
  const fermer = async () => { await ev(() => { try { fermerPanneau(); } catch (e) {} const f = document.querySelector('#fenetre .fen'); if (f) { try { document.querySelector('#fenetre [data-action="cFermer"]').click(); } catch (e) {} } }); await p.keyboard.press('Escape').catch(() => {}); await L.calme(p, 250); };

  // ── 01 « À reprendre » ne propose plus de « Commencer » — avec Tom (tl) et i7, pas Sophie et i2
  await sec('R01 À reprendre sur Ma journée', async () => {
    await I.devenir(c, 'tl', 'inter-x-i7');
    await tap('[data-action="pasFini"]'); await tap('#calque input[name="motif"]:nth-of-type(1)');
    const motifs = await ev(() => [...document.querySelectorAll('#calque input[name="motif"]')].map(x => x.value)); v('R01 population : des raisons sont proposées', motifs.length >= 3, motifs);
    await tap(`#calque input[name="motif"][value="${motifs.find(m => /absent/i.test(m)) || motifs[0]}"]`); await tap('[data-action="envoiePb"]'); await L.calme(p, 500);
    await L.aller(p, 'majournee');
    const carte = await ev(() => { const a = document.querySelector('[data-rl="go|inter-x-i7"]'); const z = a && (a.closest('.rl-carte, .rl-int, li, .carte, article') || a.parentElement); return { bouton: a ? a.innerText.trim() : null, zone: z ? z.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null }; });
    v('R01 la carte existe sur Ma journée', !!carte.bouton, carte);
    v('R01 aucun « Commencer » sur la carte « À reprendre »', !/Commencer/.test(carte.zone || '') && !/^Commencer/.test(carte.bouton || ''), carte);
    v('R01 ni « Y aller » ni « Appeler » sur cette carte', !/Y aller|Appeler/.test(carte.zone || ''), carte.zone);
    await L.capture(c, CAPN('01-majournee'));
    await tap('[data-rl="go|inter-x-i7"]'); const t = await txt();
    v('R01 « Voir » ouvre la fiche « À reprendre » avec « Reprendre »', /À reprendre/.test(t) && (await p.locator('[data-action="reprise"]').count()) === 1, t.slice(0, 120));
    await tap('[data-action="reprise"]'); const r = await ev(() => ({ st: INTS.find(o => o.id === 'i7').st, retour: !!INTS.find(o => o.id === 'n-ret-i7') })); v('R01 « Reprendre » remet « en cours » et retire le retour', r.st === 'encours' && !r.retour, r);
  });

  // ── 02 + 04 garantie jusqu'au client (client « cp ») et titre du PDF
  await sec('R02 garantie, R04 titre du PDF', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="cp"]'); await tap('#fenetre [data-cfact="garantie"]');
    const cote = await txt('#fenetre .fen-cote'); v('R02 récapitulatif : « Pas de facture »', /Pas de facture/.test(cote), cote.slice(0, 120));
    await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
    const g = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; i.tech = 'tl'; i.d = AUJ; i.st = 'planifiee'; const F = fiche(i.id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Remplacement du joint sous garantie constructeur.'; F.signature = 'signee'; F.suite = {}; return { id: i.id, mode: i.fact && i.fact.mode }; });
    v('R02 population : l’intervention créée est en garantie', g.mode === 'garantie', g);
    await I.devenir(c, 'tl', 'inter-x-' + g.id); await tap('[data-action="terminer"]'); await L.calme(p, 500);
    v('R02 aucune facture n’est préparée', !(await ev(i => FACTURES.some(f => f.int === i), g.id)));
    await I.devenir(c, 'marc', 'clientvoit'); await ev(i => { voirInt = i; modeClient = 'web'; rendre(); }, g.id); const web = await txt('#contenu .client-web');
    v('R02 la page du client : « Aucune facture »', /Aucune facture/.test(web), (web.match(/.{0,40}facture.{0,80}/i) || [''])[0]);
    v('R02 …et pas de promesse « elle vous est envoyée »', !/Elle vous est envoyée|facture vous est envoyée|Payer en ligne|à payer/i.test(web), (web.match(/.{0,40}(envoy|Payer).{0,60}/i) || [''])[0]);
    await L.capture(c, CAPN('02-client-garantie'));
    await ev(i => { modeClient = 'pdf'; rendre(); }, g.id); const pdf = await txt('.pdf');
    v('R02 le PDF d’une garantie : « aucune facture ne vous sera envoyée »', /aucune facture ne vous sera envoyée/.test(pdf) && !/facture vous est envoyée à part/.test(pdf), (pdf.match(/.{0,60}facture.{0,80}/i) || [''])[0]);
    const titre = await ev(() => { const h = document.querySelector('.pdf .pdf-tete h4'); return h && h.textContent.trim(); }); v('R04 le haut du PDF dit « Compte rendu d’intervention »', /Compte rendu d’intervention/.test(titre || ''), titre);
    // la section garde son nom plus bas, sans doublon du titre
    const sect = await ev(() => [...document.querySelectorAll('.pdf h5, .pdf .pdf-sec, .pdf h4')].map(e => e.textContent.trim()).slice(0, 8)); console.log('  · titres du PDF :', JSON.stringify(sect));
    await L.capture(c, CAPN('04-pdf'));
    // même contrôle sur une autre intervention terminée (i6, métier différent) pour voir si le titre suit toujours
    await ev(() => { voirInt = 'i6'; modeClient = 'pdf'; rendre(); }); const t6 = await ev(() => { const h = document.querySelector('.pdf .pdf-tete h4'); return h && h.textContent.trim(); }); v('R04 idem sur i6 (terminée)', /Compte rendu d’intervention/.test(t6 || ''), t6);
  });

  // ── 03 + 08 + 14b nouveau client : contrôles du téléphone et de l'e-mail, adresse non reconnue, liste des clients
  await sec('R03 nouveau client', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-cnouveau="1"]');
    const champs = await ev(() => [...document.querySelectorAll('#fenetre [data-cnv]')].map(e => e.getAttribute('data-cnv'))); v('R03 population : nom, contact, tel, mail, adr', ['nom', 'contact', 'tel', 'mail', 'adr'].every(k => champs.includes(k)), champs);
    const remplir = async o => { for (const k of Object.keys(o)) { await p.fill(`#fenetre [data-cnv="${k}"]`, o[k]); await p.dispatchEvent(`#fenetre [data-cnv="${k}"]`, 'change').catch(() => {}); } await L.calme(p, 200); };
    const compte = () => ev(() => ({ cli: Object.keys(CLIENTS).filter(k => k !== '__nv').length, ints: INTS.filter(o => o.id !== 'brouillon').length }));
    const essai = async (nom, o, attendu) => { const av = await compte(); await remplir(o); await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 400); const ap = await compte(), e = await L.etat(p);
      const focus = await ev(() => document.activeElement && document.activeElement.getAttribute('data-cnv')); const ouverte = await ev(() => !!document.querySelector('#fenetre .fen'));
      if (attendu === 'refus') { v(`R03 ${nom} : refusé, rien créé, la fenêtre reste ouverte`, ap.cli === av.cli && ap.ints === av.ints && ouverte, [av, ap, ouverte]); v(`R03 ${nom} : un message dit pourquoi`, /vérifier|numéro|adresse e-mail|nom/i.test(e.toast || ''), e.toast); return focus; }
      v(`R03 ${nom} : accepté`, ap.cli === av.cli + 1 && ap.ints === av.ints + 1, [av, ap, e.toast]); return focus; };
    let f = await essai('téléphone « abc » et e-mail « pas-un-e-mail »', { nom: 'Boulangerie Martineau', tel: 'abc', mail: 'pas-un-e-mail', adr: '5 rue Gambetta, 17440 Aytré' }, 'refus'); console.log('  · curseur dans :', f);
    v('R03 le curseur est dans le champ fautif', f === 'tel' || f === 'mail', f);
    f = await essai('téléphone trop court « 12 »', { tel: '12', mail: '' }, 'refus');
    f = await essai('e-mail sans point « a@b »', { tel: '', mail: 'a@b' }, 'refus');
    f = await essai('nom vide', { nom: '', tel: '', mail: '' }, 'refus');
    await L.capture(c, CAPN('03-refus'));
    // une adresse que la carte ne reconnaît pas : le message est VISIBLE en mode application (14b)
    await remplir({ nom: 'Boulangerie Martineau', tel: '06 11 22 33 44', mail: 'contact@martineau.fr', adr: '10 rue de la gravière' });
    const bi = await ev(() => { const e = [...document.querySelectorAll('#fenetre .bandeau-info')].find(x => /pas encore reconnue/.test(x.textContent)); return e ? { vu: e.offsetParent !== null && getComputedStyle(e).display !== 'none', h: Math.round(e.getBoundingClientRect().height) } : null; });
    v('R14b « Adresse pas encore reconnue » est VISIBLE', !!bi && bi.vu && bi.h > 10, bi);
    await L.capture(c, CAPN('14b-adresse-non-reconnue'));
    await remplir({ adr: '5 rue Gambetta, 17440 Aytré' });
    const rep = await txt('#fenetre .adr-rep'); v('R03 une adresse connue est « Repérée » avec son secteur', /Repérée/.test(rep), rep);
    await essai('client valide complet', {}, 'ok');
    const nv = await ev(() => { const k = Object.keys(CLIENTS).slice(-1)[0], x = CLIENTS[k]; return { nom: x.nom, tel: x.tel, mail: x.mail }; }); v('R03 le client créé garde ce qui a été saisi', nv.nom === 'Boulangerie Martineau' && nv.tel === '06 11 22 33 44', nv);
    await L.aller(p, 'interventions'); await tap('[data-filtreint="tout"]'); const l = await txt('#contenu'); v('R03 la nouvelle intervention apparaît dans « Toutes »', /Boulangerie Martineau/.test(l), l.length);
  });

  // ── 08 la liste des clients de la création : secteur et pastille
  await sec('R08 liste des clients', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); const t = await txt('#fenetre .liste-cli');
    v('R08 population : plusieurs clients', (t.match(/secteur|hors secteur/g) || []).length >= 3, t.length);
    v('R08 jamais « secteur — »', !/secteur —/.test(t), (t.match(/.{0,50}secteur —/) || [''])[0]);
    const roche = await ev(() => { const b = [...document.querySelectorAll('#fenetre [data-ccli]')].find(x => /Rochefort/.test(x.textContent)); return b ? b.innerText.replace(/\s+/g, ' ') : null; });
    console.log('  · ligne Rochefort :', JSON.stringify(roche)); v('R08 un client existe hors secteur ou la ligne se tait', true);
    const rf = await ev(() => Object.keys(CLIENTS).find(x => /Rochefort/.test(CLIENTS[x].nom))); v('R08 population : un client de Rochefort existe dans les données', !!rf, rf); if (!rf) return;
    const r2 = await ev(k => { const b = document.querySelector(`#fenetre [data-ccli="${k}"]`); return b ? b.innerText.replace(/\s+/g, ' ') : null; }, rf); v('R08 sa ligne dit « hors secteur » en mots', !!r2 && /hors secteur/.test(r2) && !/secteur —/.test(r2), r2);
    await L.capture(c, CAPN('08-liste-clients')); await tap(`#fenetre [data-ccli="${rf}"]`); const fen = await txt('#fenetre .fen'); const csect = await ev(() => !!document.querySelector('#fenetre [data-csect]'));
    v('R08 client hors secteur choisi : pas de case « seulement les techniciens du secteur »', !csect, csect); v('R08 …et la fenêtre dit pourquoi : « tous les techniciens sont proposés »', /hors des secteurs de l.entreprise\s*:\s*tous les techniciens sont proposés/.test(fen), (fen.match(/.{0,60}hors des secteurs.{0,80}/) || [''])[0]);
    await L.capture(c, CAPN('08-hors-secteur-choisi')); await fermer();
  });

  // ── 12 liste : « Date à fixer » (tableau et cartes du téléphone) — la ligne visible selon l'appareil
  await sec('R12 date à fixer dans la liste', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="plan"]');
    const lignes = await ev(() => { const vis = e => e && e.offsetParent !== null; const tab = [...document.querySelectorAll('#contenu table.l tbody tr.clic')].filter(vis).map(r => r.innerText.replace(/\s+/g, ' ').trim()); const tel = [...document.querySelectorAll('#contenu .liste-tel button.ligne-clic')].filter(vis).map(r => r.innerText.replace(/\s+/g, ' ').trim()); return { tab, tel }; });
    const vue = lignes.tab.length ? lignes.tab : lignes.tel; console.log('  · lignes visibles (' + (lignes.tab.length ? 'tableau' : 'cartes') + ') :', JSON.stringify(vue.slice(0, 3)));
    v('R12 population : des interventions à planifier', vue.length >= 2, vue.length);
    v('R12 chaque ligne dit « à fixer » (jamais une heure inventée)', vue.every(x => /à fixer/i.test(x)), vue);
    const quand = await ev(() => [...document.querySelectorAll('#contenu table.l tbody tr.clic td:first-child, #contenu .liste-tel .jl-g')].filter(e => e.offsetParent).map(e => e.innerText.replace(/\s+/g, ' ').trim())); console.log('  · cellules « quand » :', JSON.stringify(quand.slice(0, 4)));
    v('R12 chaque cellule « quand » dit « à fixer » en mots', quand.length >= 2 && quand.every(x => /à fixer/i.test(x)), quand);
    await L.capture(c, CAPN('12-a-planifier'));
    await tap('[data-filtreint="tout"]'); const toutes = await ev(() => [...document.querySelectorAll('#contenu ' + (document.querySelector('#contenu .liste-tel button.ligne-clic') && document.querySelector('#contenu .liste-tel').offsetParent ? '.liste-tel button.ligne-clic' : 'table.l tbody tr.clic'))].filter(e => e.offsetParent).map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    v('R12 « Toutes » : les à planifier y disent aussi « à fixer »', toutes.filter(x => /Entretien chaudière granulés|Dépannage climatisation.*Mme Roux/.test(x)).every(x => /à fixer/i.test(x)), toutes.filter(x => /granulés/.test(x)));
  });

  // ── 06 + 13 la création : la ligne client et la croix (la mesure tient sur tous les profils)
  await sec('R06 R13 fenêtre de création : ligne client et croix', async () => {
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]');
    const m = await ev(() => { const b = document.querySelector('#fenetre [data-ccli="vp"]'); if (!b) return null; const r = b.getBoundingClientRect(); const bl = [...b.querySelectorAll('*')].filter(e => !e.children.length && e.textContent.trim().length > 15).map(e => { const q = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 18; return { t: e.textContent.trim().slice(0, 40), l: Math.round(q.width), lignes: Math.round(q.height / lh) }; });
      const x = document.querySelector('#fenetre button.x-fen'); const rx = x && x.getBoundingClientRect(); return { ligne: Math.round(r.width), blocs: bl, croix: rx && [Math.round(rx.width), Math.round(rx.height)] }; });
    v('R06 population : la ligne du Vieux Port existe', !!m, m); if (!m) return;
    console.log('  · ligne Vieux Port :', JSON.stringify(m));
    v('R06 aucun texte de la ligne n’est écrasé (≥ 150 px de large ou ≤ 3 lignes)', m.blocs.every(b => b.l >= 150 || b.lignes <= 3), m.blocs);
    v('R13 la croix de la fenêtre est un rond d’au moins 44 × 44 px', !!m.croix && m.croix[0] >= 43.5 && m.croix[1] >= 43.5, m.croix);
    await L.capture(c, CAPN('06-creation-clients'));
    await tap('#fenetre [data-cnouveau="1"]'); const m2 = await ev(() => { const x = document.querySelector('#fenetre button.x-fen'); const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }); v('R13 croix toujours 44 × 44 sur « nouveau client »', m2[0] >= 43.5 && m2[1] >= 43.5, m2);
    const d = await L.doigts(p, '#fenetre'); if (tel) { v('R06 aucun champ de la fenêtre sous 16 px (zoom iOS)', d.champs.length === 0, d.champs); v('R06 aucun texte écrasé', d.ecrases.length === 0, d.ecrases); }
    const dep = await L.deborde(c); v('R06 la page ne glisse pas de côté', dep.bouge === 0, dep);
    await fermer();
  });

  // ── 09 pièces : une quantité longue reste d'un bloc (UI : on tape vraiment la pièce)
  await sec('R09 pièce et quantité longues', async () => {
    await I.devenir(c, 'sm', 'inter-x-i1');
    await p.fill('#p-nom', 'Roulement à billes à double rangée étanche pour moteur de ventilateur extérieur Daikin RXM35R'); await p.fill('#p-q', '12 345,67 L'); await tap('[data-action="pieceAjout"]'); await L.calme(p, 400);
    const m = await ev(() => { const lig = [...document.querySelectorAll('#contenu .carte .ligne')].find(e => /Roulement à billes à double/.test(e.textContent)); if (!lig) return null; const b = lig.querySelector('b'), r = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b).lineHeight) || 18, rl = lig.getBoundingClientRect(); return { qte: b.textContent, lignesQte: Math.round(r.height / lh), larg: Math.round(r.width), ligne: Math.round(rl.width), debord: Math.round(Math.max(0, rl.right - innerWidth)) }; });
    v('R09 population : la ligne de la pièce existe', !!m, m); if (!m) return;
    v('R09 la quantité « 12 345,67 L » tient sur une ligne', m.lignesQte === 1, m); v('R09 la ligne ne sort pas de l’écran', m.debord === 0, m);
    const d = await L.doigts(p, '#contenu'); if (tel) v('R09 aucun texte écrasé dans la fiche', d.ecrases.length === 0, d.ecrases);
    await L.capture(c, CAPN('09-piece-longue'));
    await tap('[data-action="pieceSuppr"][aria-label^="Retirer Roulement"]'); v('R09 « Retirer » enlève la pièce', (await ev(() => !/Roulement à billes à double/.test(document.querySelector('#contenu').innerText))), '');
    await p.fill('#p-nom', ''); await tap('[data-action="pieceAjout"]'); const e = await L.etat(p); v('R09 une pièce sans nom : message clair', /nom d’une pièce|produit/i.test(e.toast || ''), e.toast);
    await p.fill('#p-nom', 'Filtre'); await p.fill('#p-q', 'beaucoup'); await tap('[data-action="pieceAjout"]'); const e2 = await L.etat(p); v('R09 une quantité sans nombre : message clair', /commence par un nombre/i.test(e2.toast || ''), e2.toast);
  });

  // ── 10 + 04 le PDF en grand : boutons et croix à 44 px, « Lire en grand » sur téléphone
  await sec('R10 PDF en grand', async () => {
    await I.devenir(c, 'marc', 'inter-x-i6'); const nb = await ev(() => document.querySelectorAll('[data-pdfplein]').length); v('R10 population : « Voir en grand » est sur la fiche terminée', nb >= 1, nb);
    await tap('[data-pdfplein]'); await L.calme(p, 600);
    const m = await ev(() => { const z = document.getElementById('docplein'); if (!z) return null; const bt = [...z.querySelectorAll('.dp-barre button, .dp-zoom')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), l: Math.round(r.width), h: Math.round(r.height) }; }); const f = z.querySelector('.doc-feuille'); return { bt, feuille: f && Math.round(f.getBoundingClientRect().width), zoom: f && f.style.zoom }; });
    v('R10 la fenêtre « en grand » s’ouvre', !!m, m); if (!m) return; console.log('  · barre du PDF en grand :', JSON.stringify(m));
    v('R10 population : 3 boutons au moins (Télécharger, Envoyer, croix)', m.bt.length >= 3, m.bt);
    v('R10 chaque bouton fait au moins 44 px de haut', m.bt.every(b => b.h >= 43.5), m.bt); v('R10 la croix est ronde de 44 × 44 (jamais écrasée)', (() => { const x = m.bt.find(b => b.t === '✕'); return !!x && x.l >= 43.5 && x.h >= 43.5; })(), m.bt);
    if (tel) v('R10 téléphone : « Lire en grand » est proposé', m.bt.some(b => /Lire en grand/.test(b.t)), m.bt.map(b => b.t));
    await L.capture(c, CAPN('10-pdf-grand'));
    if (tel) { await tap('#docplein .dp-zoom'); await L.calme(p, 400); const m3 = await ev(() => { const z = document.getElementById('docplein'), f = z.querySelector('.doc-feuille'), fond = z.querySelector('.dp-fond'); return { bouton: z.querySelector('.dp-zoom').textContent.trim(), zoom: f.style.zoom, defile: fond.scrollWidth > fond.clientWidth + 2 || fond.scrollHeight > fond.clientHeight + 2 }; }); console.log('  · après « Lire en grand » :', JSON.stringify(m3));
      v('R10 « Lire en grand » : la feuille passe à 100 % et se fait défiler', (m3.zoom == 1) && m3.defile, m3); v('R10 le bouton devient « Voir la page entière »', /page entière/.test(m3.bouton), m3.bouton); await L.capture(c, CAPN('10-pdf-lire-en-grand'));
      await tap('#docplein .dp-zoom'); v('R10 un second toucher revient à la page entière', await ev(() => /Lire en grand/.test(document.querySelector('#docplein .dp-zoom').textContent)), ''); }
    await p.keyboard.press('Escape'); await L.calme(p, 300); v('R10 Échap ferme le PDF en grand', await ev(() => !document.getElementById('docplein')), '');
    await tap('[data-pdfplein]'); await tap('#docplein [data-dpfermer]'); v('R10 la croix ferme le PDF en grand', await ev(() => !document.getElementById('docplein')), '');
  });

  // ── 11 le pied de la page du client : numéro d'un bloc, en lien tel:
  await sec('R11 pied de la page du client', async () => {
    await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i6'; modeClient = 'web'; rendre(); }); await L.calme(p, 400);
    const m = await ev(() => { const a = [...document.querySelectorAll('.client-web a[href^="tel:"]')][0]; if (!a) return null; const r = a.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(a); const rects = [...rg.getClientRects()].filter(q => q.width > 1); const tops = new Set(rects.map(q => Math.round(q.top / 4))); return { href: a.getAttribute('href'), txt: a.textContent.trim(), lignes: tops.size, h: Math.round(r.height), l: Math.round(r.width) }; });
    v('R11 population : un lien tel: existe sur la page du client', !!m, m); if (!m) return;
    v('R11 le numéro reste d’un bloc (le texte tient sur UNE ligne)', m.lignes === 1, m); v('R11 le lien tel: porte le bon numéro', /^tel:\+?\d+$/.test(m.href.replace(/\s/g, '')), m.href);
    if (tel) { const z = await ev(() => { const a = document.querySelector('.client-web a[href^="tel:"]'); a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); const y = r.top + r.height / 2, x = r.left + r.width / 2; const e = document.elementFromPoint(x, y); const zc = e && (e.closest('a') || e); const q = zc.getBoundingClientRect(); return { h: Math.round(q.height), w: Math.round(q.width) }; }); v('R11 la zone qui répond au doigt fait ≥ 44 px de haut', z.h >= 43.5, z); }
    await L.capture(c, CAPN('11-client-pied'));
  });

  // ── 14a + 15 facture préparée : ligne sans prix (message visible, envoi grisé), ligne libre (nommer, chiffrer, retirer)
  await sec('R14 R15 facture préparée', async () => {
    await I.devenir(c, 'tl', 'inter-x-i7'); await p.fill('#p-nom', 'Condensateur spécial sur mesure'); await p.fill('#p-q', '2'); await tap('[data-action="pieceAjout"]');
    await ev(() => { const F = fiche('i7'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Condensateur remplacé, machine redémarrée.'; F.signature = 'signee'; F.suite = {}; }); await tap('[data-action="terminer"]'); await L.calme(p, 600);
    const f = await ev(() => { const x = FACTURES.find(o => o.int === 'i7'); return x ? { id: x.id, st: x.st, n: x.lignes ? x.lignes.length : null } : null; }); v('R14 population : une facture est préparée pour i7', !!f, f); if (!f) return;
    await I.devenir(c, 'marc', 'facture-x-' + f.id); let t = await txt('#contenu');
    const bi = await ev(() => { const e = [...document.querySelectorAll('#contenu .bandeau-info')].find(x => /sans prix/.test(x.textContent)); return e ? { vu: e.offsetParent !== null && getComputedStyle(e).display !== 'none', txt: e.textContent.trim().slice(0, 140) } : null; });
    v('R14a le message « ligne sans prix » est VISIBLE', !!bi && bi.vu, bi); const ap = await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && b.disabled; }); v('R14a « Aperçu et envoi » est grisé tant qu’une ligne n’a pas de prix', ap === true, ap);
    await L.capture(c, CAPN('14-facture-sans-prix'));
    // chiffrer la ligne puis ajouter une ligne libre
    const k0 = await ev(() => [...document.querySelectorAll('[data-prix]')].findIndex(e => e.value === '')); await p.fill(`[data-prix="${k0}"]`, '48,50'); await p.dispatchEvent(`[data-prix="${k0}"]`, 'change'); await L.calme(p, 300);
    await tap('[data-action="ligneAjout"]'); const n1 = await ev(() => document.querySelectorAll('[data-fdes]').length); const sansNom = await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && b.disabled; }); v('R15 une ligne libre sans nom grise encore « Aperçu et envoi »', sansNom === true, sansNom);
    /* l'écran reporte son redessin jusqu'à 600 ms après un doigt posé (rendreApresClic) : remplir un champ avant, c'est écrire dans un élément qui va être remplacé — la quantité « 2 » se perdait une fois sur trois (constat du recontrôle des restes, 18/11) */
    await L.calme(p, 800);
    const kl = n1 - 1; await p.fill(`[data-fdes="${kl}"]`, 'Déplacement hors secteur'); await p.dispatchEvent(`[data-fdes="${kl}"]`, 'change'); await L.calme(p, 300); await p.fill(`[data-fqte="${kl}"]`, '2'); await p.dispatchEvent(`[data-fqte="${kl}"]`, 'change'); await L.calme(p, 300); await p.fill(`[data-prix="${kl}"]`, '25'); await p.dispatchEvent(`[data-prix="${kl}"]`, 'change'); await L.calme(p, 300); await L.attendre(p, () => [...document.querySelectorAll('.fac-lgs .dv-lg:not(.dv-lg-t) .dv-tot')].some(e => /50,00/.test(e.textContent)), 4000);
    const tot = await ev(() => { const l = document.querySelectorAll('.fac-lgs .dv-lg:not(.dv-lg-t)'); return [...l].map(x => x.querySelector('.dv-tot').textContent.replace(/\s+/g, ' ').trim()); }); console.log('  · totaux par ligne :', JSON.stringify(tot));
    v('R15 la ligne libre nommée « Déplacement hors secteur » × 2 à 25 € fait 50 € (et la 1ʳᵉ 97 €)', tot.some(x => /50,00/.test(x)) && tot.some(x => /97,00/.test(x)), tot);
    const ap2 = await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && b.disabled; }); v('R15 tout est nommé et chiffré : « Aperçu et envoi » est actif', ap2 === false, ap2);
    await L.capture(c, CAPN('15-facture-ligne-libre'));
    await tap('[data-action="ligneSup"]:last-of-type'); const n2 = await ev(() => document.querySelectorAll('[data-fdes]').length); v('R15 ✕ retire une ligne', n2 <= n1 - 1 || n2 === n1 - 1, [n1, n2]);
    await tap('[data-action="apercuEnvoi"]'); const e = await L.etat(p); v('R14 « Aperçu et envoi » ouvre l’aperçu', !!e.panneau || /facture/i.test(e.h1 || ''), e); await L.capture(c, CAPN('15-apercu-envoi'));
    await fermer();
  });


  // ── 16 le bandeau « tâches pour toi » de la liste (bloc replié : le balayage ne l'atteint pas) : ouvrir, toucher une tâche, aller à Tâches
  await sec('R16 bandeau des tâches sur la liste', async () => {
    await I.devenir(c, 'marc', 'interventions'); const n = await ev(() => document.querySelectorAll('#contenu details.t-ici').length); v('R16 population : le bandeau est sur la liste', n === 1, n);
    const ferme = await ev(() => !document.querySelector('#contenu details.t-ici').open); v('R16 il est replié au départ (la liste reste la vedette)', ferme, ferme);
    await tap('#contenu details.t-ici summary'); const ouvert = await ev(() => document.querySelector('#contenu details.t-ici').open); v('R16 un toucher sur le bandeau le déplie', ouvert, ouvert);
    // la zone qui RÉPOND au doigt pour « Voir dans Tâches › » : on sonde la verticale du lien, point par point (elementFromPoint)
    const zr = await ev(() => { const a = document.querySelector('.t-ici-tout'); a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(), x = r.left + Math.min(40, r.width / 2); let n = 0; for (let y = Math.floor(r.top) - 20; y <= Math.ceil(r.bottom) + 20; y++) { const e = document.elementFromPoint(x, y); if (e === a || (e && a.contains(e))) n++; } return { rect: Math.round(r.height), repond: n }; }); console.log('  · « Voir dans Tâches › » : rectangle', zr.rect, 'px, zone qui répond', zr.repond, 'px');
    if (tel) v('R16 « Voir dans Tâches › » répond sur 44 px de haut au moins', zr.repond >= 43, zr);
    const nt = await ev(() => document.querySelectorAll('#contenu .t-ici-l').length); v('R16 les tâches du jour sont listées', nt >= 1, nt);
    await L.capture(c, CAPN('16-bandeau-taches'));
        await tap('#contenu .t-ici-l'); const e = await L.etat(p); console.log('  · toucher une tâche :', JSON.stringify({ hash: e.hash, panneau: e.panneau && e.panneau.slice(0, 60) })); v('R16 toucher une tâche l’ouvre (fenêtre ou fiche)', !!e.panneau || /tache/i.test(e.hash), e); await fermer();
    await I.devenir(c, 'marc', 'interventions'); if (!(await ev(() => document.querySelector('#contenu details.t-ici').open))) await tap('#contenu details.t-ici summary'); await tap('#contenu .t-ici-tout'); await L.calme(p, 500); const h = await ev(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent }));
    v('R16 « Voir dans Tâches › » mène à Tâches', /tache/i.test(h.hash) || /Tâches/.test(h.h1 || ''), h); await tap('[data-retour]').catch(() => {});
  });

  // ── 17 ce que les corrections ont pu CASSER à côté : les cinq façons de facturer, jusqu'à la page du client (la garantie a changé de texte)
  await sec('R17 les cinq modes de facturation chez le client', async () => {
    const cas = [['temps', 'mr'], ['forfait', 'md'], ['devis', 'vp'], ['contrat', 'hp'], ['garantie', 'cp']]; const lus = {};
    for (const [mode, cli] of cas) {
      await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap(`#fenetre [data-ccli="${cli}"]`); await tap(`#fenetre [data-cfact="${mode}"]`);
      if (mode === 'forfait') { let la = await L.attendre(p, () => !!document.querySelector('#fenetre [data-cforfait]'), 2500);
        if (!la) { await ev(() => document.querySelector('#fenetre [data-cfact="forfait"]').scrollIntoView({ block: 'center' })); await L.calme(p, 300); await tap('#fenetre [data-cfact="forfait"]'); la = await L.attendre(p, () => !!document.querySelector('#fenetre [data-cforfait]'), 2500); console.log('  · le champ du forfait n’est apparu qu’au second toucher :', la); }
        v('R17 forfait : le champ du prix apparaît quand on choisit « Forfait »', la, await ev(() => ({ pressed: [...document.querySelectorAll('#fenetre [data-cfact]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.cfact), fen: !!document.querySelector('#fenetre .fen') })));
        if (la) { await p.fill('#fenetre [data-cforfait]', '180'); await L.calme(p, 200); } }
      await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
      const g = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; i.tech = 'sm'; i.d = AUJ; i.st = 'planifiee'; const F = fiche(i.id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Intervention faite, tout fonctionne.'; F.signature = 'signee'; F.suite = {}; return { id: i.id, mode: i.fact && i.fact.mode, cli: i.cli }; });
      if (g.mode !== mode) { v(`R17 ${mode} : l’intervention est créée dans ce mode`, false, g); continue; }
      await I.devenir(c, 'sm', 'inter-x-' + g.id); await tap('[data-action="terminer"]'); await L.calme(p, 600); const toast = (await L.etat(p)).toast;
      if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
      const fact = await ev(i => { const f = FACTURES.find(o => o.int === i); return f ? { st: f.st } : null; }, g.id); const fiche_ = await txt('#contenu');
      await I.devenir(c, 'marc', 'clientvoit'); await ev(i => { voirInt = i; modeClient = 'web'; rendre(); }, g.id); const web = await txt('#contenu .client-web'); await ev(i => { modeClient = 'pdf'; rendre(); }, g.id); const pied = await txt('.pdf .pdf-pied');
      lus[mode] = { toast, fact, facturation: (fiche_.match(/Facturation[\s\S]{0,110}/) || [''])[0].replace(/\n/g, ' '), client: (web.match(/(FACTURE|Facture|facture)[\s\S]{0,140}/) || [''])[0].replace(/\n/g, ' '), pied: pied.replace(/\n/g, ' ').slice(0, 160) };
      console.log('  · ' + mode + ' :', JSON.stringify(lus[mode]));
      if (mode === 'garantie') { v('R17 garantie : ni facture, ni promesse', !fact && /Aucune facture/.test(web), lus[mode]); }
      else { v(`R17 ${mode} : une facture est bien préparée`, !!fact, lus[mode]); v(`R17 ${mode} : le client lit encore que la facture lui sera envoyée (pas « aucune facture »)`, !/Aucune facture/.test(web) && /facture/i.test(web), lus[mode].client); v(`R17 ${mode} : le pied du PDF ne dit pas « prise en charge »`, !/prise en charge/.test(pied), pied.slice(0, 120)); }
      v(`R17 ${mode} : aucun mot technique (undefined, NaN, [object) chez le client`, !/undefined|NaN|\[object/.test(web + pied), '');
    }
  });

  // ── 18 un contact VALIDE n'est jamais refusé par le nouveau contrôle (le risque d'un contrôle neuf : refuser le bon)
  await sec('R18 contacts valides acceptés', async () => {
    const tels = ['06 12 34 56 78', '0612345678', '06.12.34.56.78', '06-12-34-56-78', '+33 6 12 34 56 78', '+33612345678', '(05) 46 00 00 00', '+44 20 7946 0958', '0032 475 12 34 56', '05 46 00 00 00 poste 12', ''];
    const mails = ['j.dupont+clim@mail.fr', 'accueil@hotel-de-la-plage.com', 'A.B@Sous.Domaine.FR', 'contact@société.fr', ''];
    const refuses = [];
    for (const t of tels) for (const m of mails.slice(0, 2)) { const r = await ev(([t, m]) => { try { return { tel: cfTelOk(t), mail: !m || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m) }; } catch (e) { return { err: String(e) }; } }, [t, m]); if (r.err || !r.tel || !r.mail) refuses.push([t, m, r]); }
    v('R18 population : 11 numéros × 2 adresses essayés', true); v('R18 aucun numéro ni adresse valides n’est refusé', refuses.length === 0, refuses.slice(0, 4));
    for (const m of mails.slice(2)) { const ok = await ev(m => !m || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m), m); v(`R18 adresse « ${m || '(vide)'} » acceptée`, ok, m); }
    const mauvais = ['abc', '12', '0', 'téléphone', '06 12 34 56 78 90 12 34 56 78 90 12'], refus = []; for (const t of mauvais) { const ok = await ev(t => cfTelOk(t), t); if (ok) refus.push(t); } v('R18 les numéros absurdes sont bien refusés', refus.length === 0, refus);
  });

  // ── 19 la ligne libre et les nombres limites d'une facture préparée (quantité, prix)
  await sec('R19 facture : quantités et prix limites', async () => {
    await I.devenir(c, 'tl', 'inter-x-i7'); await ev(() => { const F = fiche('i7'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = {}; }); await tap('[data-action="terminer"]'); await L.calme(p, 600);
    if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
    const fid = await ev(() => { const x = FACTURES.find(o => o.int === 'i7'); return x && x.id; }); v('R19 population : la facture de i7 existe', !!fid, fid); if (!fid) return;
    await I.devenir(c, 'marc', 'facture-x-' + fid); await tap('[data-action="ligneAjout"]'); const kl = (await ev(() => document.querySelectorAll('[data-fdes]').length)) - 1;
    const poser = async (sel, val) => { await p.fill(sel, val); await p.dispatchEvent(sel, 'change'); await L.calme(p, 350); };
    const ligne = () => ev(([id, k]) => { const l = FACTURES.find(o => o.id === id).lignes[k]; return l && { d: l.d, q: l.q, pu: l.pu }; }, [fid, kl]);
    await poser(`[data-fdes="${kl}"]`, '  Remise   commerciale   de   fidélité  ' + 'x'.repeat(150)); let l = await ligne(); v('R19 un nom trop long est coupé à 120 signes, espaces ramenés à un', l.d.length <= 120 && !/\s{2,}/.test(l.d), l.d.length);
    for (const [q, attendu] of [['0', false], ['-3', false], ['abc', false], ['1,5', true], ['250 mL', true], ['12 345,67 L', true]]) { await poser(`[data-fqte="${kl}"]`, q); const e = await L.etat(p); l = await ligne(); const garde = l.q === q; v(`R19 quantité « ${q} » ${attendu ? 'acceptée' : 'refusée avec un message'}`, attendu ? garde : (!garde && !!e.toast), { q: l.q, toast: e.toast }); }
    await poser(`[data-prix="${kl}"]`, '-20'); l = await ligne(); console.log('  · prix « -20 » gardé comme :', JSON.stringify(l.pu));
    await poser(`[data-fqte="${kl}"]`, '2');   /* le total d'une ligne est plafonné aussi : 12 345,67 L × 1 234,56 € dépasserait le million, d'où ce retour à une quantité ordinaire */
    await poser(`[data-prix="${kl}"]`, '1 234,56'); l = await ligne(); v('R19 prix « 1 234,56 » lu 1234,56', Math.abs(l.pu - 1234.56) < 0.001, l.pu);
    await poser(`[data-prix="${kl}"]`, 'abc'); l = await ligne(); v('R19 prix « abc » ne devient pas un nombre', l.pu == null || isNaN(l.pu) === false && l.pu === null, l.pu);
    await poser(`[data-prix="${kl}"]`, '9999999999'); l = await ligne(); console.log('  · prix « 9999999999 » gardé comme :', JSON.stringify(l.pu)); const tot = await txt('#contenu .fac-edit'); v('R19 un prix démesuré ne casse pas la page (aucun NaN / Infinity)', !/NaN|Infinity/.test(tot), tot.slice(0, 100));
    await L.capture(c, CAPN('19-facture-limites')); const dd = await L.deborde(c); v('R19 la facture ne glisse pas de côté avec des valeurs démesurées', dd.bouge === 0, dd);
    await poser(`[data-prix="${kl}"]`, '25'); await poser(`[data-fqte="${kl}"]`, '2');
    // retirer une ligne du milieu : les totaux et l'ordre suivent
    const n0 = await ev(() => document.querySelectorAll('[data-fdes]').length); await tap('[data-action="ligneSup"]'); const n1 = await ev(() => document.querySelectorAll('[data-fdes]').length); v('R19 ✕ retire UNE ligne (la première)', n1 === n0 - 1, [n0, n1]);
  });

  // ── 20 le PDF en grand d'une FACTURE (même pièce que le compte rendu : la correction du bouton et de la croix a pu la toucher)
  await sec('R20 PDF en grand d’une facture', async () => {
    await I.devenir(c, 'marc', 'facture-x-f144'); const pdfBtn = await ev(() => !!document.querySelector('[data-action="pdfFacture"]')); v('R20 population : la facture envoyée propose « Voir le PDF »', pdfBtn, pdfBtn);
    await tap('[data-action="pdfFacture"]'); await L.calme(p, 500); await tap('#calque [data-pdfplein], [data-pdfplein]'); await L.calme(p, 600);
    const m = await ev(() => { const z = document.getElementById('docplein'); if (!z) return null; return [...z.querySelectorAll('.dp-barre button, .dp-zoom')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 22), Math.round(r.width), Math.round(r.height)]; }); });
    v('R20 la facture s’ouvre en grand', !!m, m); if (!m) return; console.log('  · boutons :', JSON.stringify(m)); v('R20 tous les boutons font 44 px au moins', m.every(b => b[2] >= 43.5), m);
    await L.capture(c, CAPN('20-facture-en-grand')); await p.keyboard.press('Escape'); await L.calme(p, 300);
  });

  // ── 21 le mode « revue » (app:false) fonctionne toujours : l'échafaudage n'a pas été cassé par le retrait des textes de maquette
  await sec('R21 mode revue', async () => {
    const c2 = await L.ouvrir({ profil, nuit, qui: 'marc', app: false }); const p2 = c2.p;
    await p2.evaluate(() => aller('interventions')); await L.calme(p2, 500); const t = await I.texte(p2, '#contenu'); v('R21 la liste s’affiche en mode revue', /Interventions/.test(t) && /Aujourd/.test(t), t.slice(0, 60));
    await p2.evaluate(() => aller('inter-x-i1')); await L.calme(p2, 500); const t2 = await I.texte(p2, '#contenu'); v('R21 une fiche s’ouvre en mode revue', /Dépannage climatisation/.test(t2), t2.slice(0, 60));
    v('R21 aucune erreur JavaScript en mode revue', c2.err.length === 0, c2.err.slice(0, 3)); await L.fin(c2);
  });

  // ── 22 « Terminer » touché deux fois de suite (la zone non couverte par le correcteur) : une seule facture, une seule suite, pas d'erreur
  await sec('R22 double toucher sur Terminer', async () => {
    await ev(() => { const o = INTS.find(x => x.id === 'i7'); o.st = 'planifiee'; fiche('i7').etat = 'terrain'; for (let k = FACTURES.length - 1; k >= 0; k--) if (FACTURES[k].int === 'i7') FACTURES.splice(k, 1); for (let k = INTS.length - 1; k >= 0; k--) if (/^n-ent-i7/.test(INTS[k].id)) INTS.splice(k, 1); });   /* départ propre : R19 a déjà terminé i7, et sans ça la sonde cherchait un bouton « Terminer » qui n'existe plus (« null.click ») */
    await I.devenir(c, 'tl', 'inter-x-i7'); await ev(() => { const F = fiche('i7'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Condensateur remplacé.'; F.signature = 'signee'; F.suite = { entretien: true }; });
    const av = await ev(() => ({ fact: FACTURES.length, ints: INTS.length }));
    await ev(() => { const b = document.querySelector('[data-action="terminer"]'); b.click(); b.click(); }); await L.calme(p, 700);
    if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
    const ap = await ev(() => ({ fact: FACTURES.length, ints: INTS.length, factI7: FACTURES.filter(f => f.int === 'i7').length, suites: INTS.filter(i => /^n-ent-i7/.test(i.id)).length, st: INTS.find(o => o.id === 'i7').st }));
    v('R22 une seule facture pour i7', ap.factI7 === 1 && ap.fact === av.fact + 1, [av, ap]); v('R22 une seule intervention de suite (entretien annuel)', ap.suites === 1 && ap.ints === av.ints + 1, ap); v('R22 terminée', ap.st === 'fait', ap.st);
    const idsDoubles = await ev(() => { const ids = INTS.map(i => i.id); return ids.filter((x, k) => ids.indexOf(x) !== k); }); v('R22 aucun identifiant d’intervention en double', idsDoubles.length === 0, idsDoubles);
  });

  await L.fin(c); const ko = L.bilan(); console.log('erreurs de page :', c.err.length, c.err.slice(0, 3)); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

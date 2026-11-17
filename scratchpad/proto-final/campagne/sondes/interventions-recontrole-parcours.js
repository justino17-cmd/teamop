// RECONTRÔLE ADVERSE « Interventions » : trois parcours de bout en bout, joués avec d'AUTRES données que ceux du correcteur.
//   A  la technicienne de A à Z sur une intervention que personne n'avait jouée (i16, garage Rochefort, hors secteur), paiement « en totalité »,
//      relevé non numérique, pièce du catalogue, deux photos, puis ce que voient le bureau, la facture et le client ;
//   B  le bureau crée une intervention pour un client existant, la pose sur le créneau d'un technicien, qui la reçoit, ne peut pas finir
//      (« Client absent »), le bureau la replanifie, le technicien la termine ;
//   C  « Terminer » alors qu'il manque des choses, puis le chemin entier d'une facture : chiffrer, TVA, envoi, ce que le client lit.
// usage : node interventions-recontrole-parcours.js <A|B|C> [profil] [nuit]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const quel = process.argv[2] || 'A', profil = process.argv[3] || 'petit', nuit = process.argv[4] === 'nuit';
  const tel = ['iphone', 'android', 'petit'].includes(profil);
  const c = await L.ouvrir({ profil, qui: quel === 'B' ? 'marc' : 'sm', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `rcp-${quel}-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  const dep = async nom => { const d = await L.deborde(c); v(`${nom} : la page ne glisse pas de côté`, d.bouge === 0, d); };
  const ecrase = async nom => { if (!tel) return; const d = await L.doigts(p, '#contenu'); v(`${nom} : aucun champ sous 16 px, aucun texte écrasé`, d.champs.length === 0 && d.ecrases.length === 0, { champs: d.champs, ecrases: d.ecrases }); };

  if (quel === 'A') {
    // ── A1 la journée de Sophie : pointer, ouvrir la mise en service de 16 h (Rochefort)
    await L.aller(p, 'majournee'); let t = await txt();
    v('A1 Ma journée : trois interventions pour Sophie', (await ev(() => document.querySelectorAll('[data-rl^="go|inter-x-"]').length)) === 3, await ev(() => [...document.querySelectorAll('[data-rl^="go|inter-x-"]')].map(e => e.dataset.rl)));
    await tap('[data-ptx="debut|sm"]'); let e = await L.etat(p); v('A1 « Je commence ma journée » : confirmé par un message', /Bonne journée/.test(e.toast), e.toast);
    await L.capture(c, CAPN('1-journee')); await dep('A1');
    await tap('[data-rl="go|inter-x-i16"]'); await L.calme(p, 500); e = await L.etat(p); t = await txt();
    v('A2 la fiche s’ouvre (Rochefort)', /inter-x-i16/.test(e.hash) && /Rochefort/.test(t), [e.hash, t.slice(0, 80)]);
    v('A2 après le pointage, plus de message « Tu n’as pas commencé ta journée »', !/pas commencé ta journée/.test(e.toast || ''), e.toast);
    v('A2 la fiche n’affiche aucun prix à la technicienne', !/\d\s?€/.test(t.replace(/\(€[^)]*\)/g, '')), (t.match(/.{15}\d\s?€.{10}/) || [''])[0]);
    await L.capture(c, CAPN('2-fiche')); await dep('A2'); await ecrase('A2');
    // ── A3 « Terminer » à vide : tout ce qui manque est nommé, une seule fois chacun
    await tap('[data-action="terminer"]'); e = await L.etat(p); const pan = await txt('#calque .panneau'); v('A3 Terminer à vide : une fenêtre dit ce qui manque', /Il manque encore/.test(e.panneau || pan), e.panneau);
    const manque = await ev(() => manque(fiche('i16'))); v('A3 population : plusieurs choses manquent (contrôles, signature, compte rendu)', manque.length >= 3, manque);
    const absentsFen = manque.filter(m => !pan.toLowerCase().replace(/\s/g, ' ').includes(m.slice(0, 12).toLowerCase().replace(/\s/g, ' '))); v('A3 la fenêtre nomme chaque manque, sans doublon', absentsFen.length === 0 && new Set(manque).size === manque.length, { absentsFen, fenetre: pan.replace(/\n/g, ' | ') });
    await L.capture(c, CAPN('3-manque')); await p.keyboard.press('Escape'); await L.calme(p, 300);
    // ── A4 les relevés : une lettre dans un champ de chiffres
    const rel = p.locator('input[data-releve]'); const nr = await rel.count(); v('A4 population : des relevés', nr >= 2, nr);
    await rel.nth(0).fill('abc'); await rel.nth(0).dispatchEvent('change'); await L.calme(p, 300); const r0 = await ev(() => Object.values(fiche('i16').releves || {})); console.log('  · relevé « abc » gardé comme :', JSON.stringify(r0));
    await rel.nth(0).fill('12,5'); await rel.nth(0).dispatchEvent('change'); await rel.nth(1).fill('14'); await rel.nth(1).dispatchEvent('change'); await L.calme(p, 300);
    // ── A5 contrôles, texte long, deux photos, pièce du catalogue
    const nonCoches = await p.locator('input[data-ctrl]:not(:checked)').count(); for (let k = 0; k < nonCoches; k++) await L.toucher(c, p.locator('input[data-ctrl]:not(:checked)').first().locator('xpath=..'), { delai: 3000 });
    await p.fill('textarea[data-champ="compte"]', 'Pompe à chaleur remise en route : purge du circuit, contrôle de pression, essai de 20 minutes. ' + 'Tout fonctionne. '.repeat(25)); await p.fill('textarea[data-champ="trouve"]', 'Pression basse, purgeur bloqué.'); await L.calme(p, 300);
    for (let k = 0; k < 2; k++) await p.setInputFiles('input[data-photo="i16"]', { name: 'p' + k + '.png', mimeType: 'image/png', buffer: I.PNG }); await L.calme(p, 500);
    let F = await I.F(p, 'i16'); v('A5 deux photos ajoutées', F.photos >= 2, F.photos);
    v('A5 le texte du compte rendu a survécu aux photos', (await p.inputValue('textarea[data-champ="compte"]')).length > 300, '');
    await p.fill('#p-nom', 'Nettoyant'); const sug = await ev(() => document.querySelectorAll('#catalogue option').length); v('A5 le catalogue de pièces propose des produits', sug >= 3, sug);
    const opt = await ev(() => document.querySelector('#catalogue option').value || document.querySelector('#catalogue option').textContent); await p.fill('#p-nom', opt); await p.fill('#p-q', '0,5 L'); await tap('[data-action="pieceAjout"]'); await L.calme(p, 400);
    { const sh = await ev(() => { const z = document.querySelector('#calque .panneau'); return z ? z.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; }); console.log('  · feuille juste après l’ajout de la pièce :', JSON.stringify(sh)); await L.capture(c, CAPN('4a-feuille-apres-piece')); if (sh) { const ok = await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 }); v('A5 la feuille des pièces se ferme par « C’est bon »', ok && !(await L.etat(p)).panneau, (await L.etat(p)).panneau); } }
    F = await I.F(p, 'i16'); v('A5 la pièce « ' + opt.slice(0, 30) + ' » 0,5 L est notée', F.pieces.some(x => /0,5 L/.test(x)), F.pieces);
    await L.capture(c, CAPN('4-rempli')); await dep('A5'); await ecrase('A5');
    // ── A6 signature, puis paiement « en totalité »
    await p.locator('#signe').evaluate(e => e.scrollIntoView({ block: 'center' })); await L.calme(p, 300); const surLeCanevas = await ev(() => { const r = document.querySelector('#signe').getBoundingClientRect(); return [.2, .5, .8].map(f => { const e = document.elementFromPoint(r.left + r.width * f, r.top + r.height * .6); return e ? e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 24) : null; }); }); console.log('  · sous le doigt, au milieu de la signature :', JSON.stringify(surLeCanevas), JSON.stringify(await ev(() => { const r = document.querySelector('#signe').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width * .5, r.top + r.height * .6); const chaine = []; for (let x = e; x && chaine.length < 5; x = x.parentElement) chaine.push(x.tagName + '#' + x.id + '.' + String(x.className).slice(0, 30) + ' pos=' + getComputedStyle(x).position + ' « ' + (x.textContent || '').trim().slice(0, 50) + ' »'); return { chaine, canevas: [Math.round(r.top), Math.round(r.height)], vh: innerHeight }; }))); await I.signer(c, '#signe'); F = await I.F(p, 'i16'); v('A6 la signature est prise', F.signature === true, F.manque);
    const totalOk = await tap('input[data-paie="i16"][value="total"]'); v('A6 population : le choix « en totalité » existe', totalOk, '');
    F = await I.F(p, 'i16'); console.log('  · paiement :', JSON.stringify(F.paiement), '· manque :', JSON.stringify(F.manque));
    const champsPaie = await ev(() => [...document.querySelectorAll('[data-paiemontant], [data-paiemode]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-paiemontant') !== null ? 'montant' : 'mode:' + e.dataset.paiemode)); console.log('  · champs du paiement :', JSON.stringify(champsPaie));
    if (champsPaie.includes('mode:Espèces')) await tap('[data-paiemode="Espèces"]'); await L.calme(p, 300); F = await I.F(p, 'i16');
    await L.capture(c, CAPN('5-paiement')); v('A6 plus rien ne manque', F.manque.length === 0, F.manque);
    // ── A7 Terminer
    const av = await ev(() => ({ ints: INTS.length, fact: FACTURES.length }));
    await tap('[data-action="terminer"]'); await L.calme(p, 700); e = await L.etat(p); F = await I.F(p, 'i16'); t = await txt();
    v('A7 terminée', F.st === 'fait' && F.etat === 'bureau', [F.st, F.etat]); v('A7 l’écran dit « Intervention terminée »', /Intervention terminée/.test(t), t.slice(0, 100));
    const feuille = await ev(() => (document.querySelector('#calque .panneau') || {}).textContent || ''); console.log('  · feuille après Terminer :', JSON.stringify(feuille.replace(/\s+/g, ' ').slice(0, 140)));
    await L.capture(c, CAPN('6-terminee')); if (/Noter les pièces/.test(feuille)) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
    const ap = await ev(() => ({ ints: INTS.length, fact: FACTURES.length, f: FACTURES.find(f => f.int === 'i16') && FACTURES.find(f => f.int === 'i16').id })); v('A7 une facture est préparée', !!ap.f && ap.fact === av.fact + 1, ap);
    await dep('A7'); await ecrase('A7');
    // ── A8 ce que voit le bureau, la facture et le client
    await I.devenir(c, 'marc', 'inter-x-i16'); t = await txt(); v('A8 le bureau voit « terminée » et la facture préparée', /Intervention terminée/.test(t) && /Ouvrir la facture/.test(t), (t.match(/Facturation[\s\S]{0,160}/) || [''])[0]);
    await I.devenir(c, 'marc', 'facture-x-' + ap.f); t = await txt('#contenu'); const lg = await ev(() => document.querySelectorAll('[data-fdes]').length); v('A8 la facture reprend les lignes de l’intervention', lg >= 1, lg);
    v('A8 le paiement noté sur place figure sur la facture', /Noté sur place/.test(t) && /(totalité|payé|Espèces)/i.test(t), (t.match(/Noté sur place[\s\S]{0,160}/) || [''])[0]);
    await L.capture(c, CAPN('7-facture'));
    await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i16'; modeClient = 'web'; rendre(); }); await L.calme(p, 400); t = await txt('#contenu .client-web');
    v('A8 « Ce que voit le client » : le compte rendu est lisible, sans le mot « prototype »', /Pompe à chaleur remise en route/.test(t) && !/prototype/i.test(t), t.slice(0, 120));
    v('A8 le client ne lit pas de balise technique (data-, undefined, NaN, [object)', !/undefined|NaN|\[object|data-/.test(t), (t.match(/.{0,30}(undefined|NaN|\[object|data-).{0,30}/) || [''])[0]);
    await L.capture(c, CAPN('8-client')); await dep('A8');
  }

  if (quel === 'B') {
    // ── B1 le bureau crée et pose sur le créneau de Karim (kb), aujourd'hui
    await L.aller(p, 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="hp"]'); await tap('#fenetre [data-ctype="Entretien"]'); await tap('#fenetre [data-cdur="90"]');
    const slots = await ev(() => [...document.querySelectorAll('#fenetre [data-dispo]:not([disabled])')].map(b => b.dataset.dispo)); console.log('  · créneaux libres proposés :', slots.length, slots.slice(0, 4));
    v('B1 population : des créneaux libres sont proposés', slots.length >= 3, slots.length);
    const aujKb = slots.find(s => /^kb\|/.test(s)); v('B1 Karim a un créneau libre (le premier est posé)', !!aujKb, slots.filter(s => /^kb/.test(s))); console.log('  · créneau choisi :', aujKb);
    if (aujKb) await tap(`#fenetre [data-dispo="${aujKb}"]`); await L.calme(p, 400);
    const cote = await txt('#fenetre .fen-cote'); console.log('  · récapitulatif :', JSON.stringify(cote.replace(/\n/g, ' | ').slice(0, 260)));
    v('B1 le récapitulatif nomme Karim et l’heure', /Karim/.test(cote), cote.slice(0, 160)); await L.capture(c, CAPN('1-creation'));
    await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 600); const n = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; return { id: i.id, tech: i.tech, d: i.d, h: i.h, st: i.st, cli: i.cli }; });
    v('B1 l’intervention est créée chez Karim, « planifiée », pour l’Hôtel de la Plage', n.tech === 'kb' && n.st === 'planifiee' && n.cli === 'hp', n); console.log('  · créée :', JSON.stringify(n));
    // ── B2 Karim la reçoit
    await I.devenir(c, 'kb', 'majournee'); await L.capture(c, CAPN('2-journee-karim')); await dep('B2');
    await ev(id => { INTS.find(o => o.id === id).d = AUJ; }, n.id); await I.devenir(c, 'kb', 'majournee');   // le prototype est un samedi : on remet la date du jour pour que la carte soit celle d'aujourd'hui
    const carte = await ev(id => { const a = document.querySelector(`[data-rl="go|inter-x-${id}"]`); return a ? a.innerText.trim() : null; }, n.id); v('B2 la carte apparaît sur Ma journée de Karim (date du jour posée)', !!carte, carte);
    await I.devenir(c, 'kb', 'inter-x-' + n.id); await tap('[data-action="pasFini"]'); await tap('#calque input[name="motif"][value="Client absent"]');
    const motifs = await ev(() => [...document.querySelectorAll('#calque input[name="motif"]')].map(x => x.value)); console.log('  · raisons :', JSON.stringify(motifs));
    if (!motifs.includes('Client absent')) await tap(`#calque input[name="motif"][value="${motifs[1]}"]`);
    await tap('[data-action="envoiePb"]'); await L.calme(p, 500); let e = await L.etat(p); const st = await ev(id => ({ st: INTS.find(o => o.id === id).st, retour: INTS.find(o => o.id === 'n-ret-' + id) }), n.id);
    v('B2 « Je ne peux pas finir » : la fiche passe « à reprendre »', st.st === 'reprendre', st); console.log('  · retour créé :', JSON.stringify(st.retour && { st: st.retour.st, note: st.retour.note }));
    v('B2 un retour « à planifier » attend le bureau', !!st.retour && st.retour.st === 'aplanifier', st.retour);
    t = await txt(); v('B2 l’écran de Karim dit que le bureau est prévenu (pas de message d’erreur)', /Le bureau est prévenu/.test(t), t.slice(0, 160)); await L.capture(c, CAPN('3-a-reprendre'));
    // ── B3 le bureau voit et replanifie
    await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="plan"]'); t = await txt('#contenu'); v('B3 le bureau voit le retour dans « À planifier »', /Hôtel de la Plage/.test(t) && /Retour/.test(t), t.slice(0, 160));
    await L.aller(p, 'inter-x-n-ret-' + n.id); t = await txt(); console.log('  · fiche du retour :', JSON.stringify(t.slice(0, 200).replace(/\n/g, ' | '))); v('B3 la fiche du retour s’ouvre', /Hôtel de la Plage/.test(t), t.slice(0, 120));
    const boutons = await ev(() => [...document.querySelectorAll('#contenu [data-action], #contenu [data-go]')].filter(b => b.offsetParent).map(b => (b.textContent || '').trim().slice(0, 24) + '|' + (b.dataset.action || b.dataset.go))); console.log('  · gestes de la fiche du retour :', JSON.stringify(boutons));
    await L.capture(c, CAPN('4-retour'));
    const form = await ev(() => ({ date: !!document.querySelector('#contenu input[data-dt]'), heure: !!document.querySelector('#contenu select'), planifier: [...document.querySelectorAll('#contenu button')].some(b => b.offsetParent && /^Planifier$/.test(b.textContent.trim())) }));
    v('B3 la fiche du retour propose date, heure, technicien et « Planifier »', form.date && form.heure && form.planifier, form);
    // on choisit Karim s'il est dans la liste, et une date de la semaine suivante
    await ev(() => { const s = [...document.querySelectorAll('#contenu select')].find(x => [...x.options].some(o => /Karim/.test(o.textContent))); if (s) { s.value = [...s.options].find(o => /Karim/.test(o.textContent)).value; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await L.calme(p, 300); await L.capture(c, CAPN('5-planifier-retour'));
    await ev(() => [...document.querySelectorAll('#contenu button')].find(b => b.offsetParent && /^Planifier$/.test(b.textContent.trim())).scrollIntoView({ block: 'center' })); await L.calme(p, 300);
    await L.toucher(c, p.getByRole('button', { name: 'Planifier', exact: true }).first(), { delai: 4000 }); await L.calme(p, 500); e = await L.etat(p);
    const apres = await ev(id => { const r = INTS.find(o => o.id === 'n-ret-' + id); return r && { st: r.st, tech: r.tech, d: r.d, h: r.h }; }, n.id); console.log('  · après « Planifier » :', JSON.stringify({ apres, toast: e.toast }));
    v('B3 « Planifier » pose le retour au planning (planifiée, avec un technicien et une date)', !!apres && apres.st === 'planifiee' && !!apres.tech && !!apres.d, apres);
    v('B3 un message confirme', !!e.toast, e.toast);
    await L.capture(c, CAPN('6-retour-planifie'));
    // Karim voit le retour planifié dans son planning/liste
    await I.devenir(c, 'kb', 'inter-x-n-ret-' + n.id); t = await txt(); v('B4 Karim ouvre le retour planifié', /Hôtel de la Plage/.test(t) && /Planifiée/i.test(t), t.slice(0, 160)); await L.capture(c, CAPN('7-karim-retour'));
    console.log('  · erreurs de page :', c.err.length);
  }

  if (quel === 'C') {
    // ── C1 « Terminer » alors qu'il manque : chaque manque se corrige, la fenêtre se met à jour
    await I.devenir(c, 'sm', 'inter-x-i2'); await tap('[data-action="terminer"]'); let e = await L.etat(p); v('C1 Terminer incomplet : la fenêtre dit ce qui manque', /Il manque encore/.test(e.panneau || ''), e.panneau);
    const lignes = await ev(() => [...document.querySelectorAll('#calque .panneau li, #calque .panneau .manque')].map(x => x.textContent.trim())); console.log('  · manques listés :', JSON.stringify(lignes));
    await L.capture(c, CAPN('1-manque')); await p.keyboard.press('Escape'); await L.calme(p, 300);
    await ev(() => { const F = fiche('i2'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Mise en service faite : pression, cycle de chauffe, explications au client.'; F.suite = {}; });
    await tap('[data-absent="i2"]'); await L.calme(p, 300); const m5 = await ev(() => manque(fiche('i2'))); v('C1 « Client pas sur place » : la signature n’est plus exigée', !m5.some(m => /signature/.test(m)), m5);
    await tap('[data-action="terminer"]'); await L.calme(p, 700); const F = await I.F(p, 'i2'); v('C1 terminée sans signature, avec le client absent', F.st === 'fait', [F.st, F.etat]);
    if (await ev(() => /Noter les pièces/.test((document.querySelector('#calque .panneau') || {}).textContent || ''))) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 });
    const fid = await ev(() => { const f = FACTURES.find(o => o.int === 'i2'); return f && f.id; }); v('C1 population : la facture de i2 est préparée', !!fid, fid); if (!fid) { L.bilan(); await L.fermer(); process.exit(1); }
    // ── C2 la facture : chiffrer, TVA (particulier : 5,5 / 10 / 20), envoi
    await I.devenir(c, 'marc', 'facture-x-' + fid); let t = await txt('#contenu'); await L.capture(c, CAPN('2-facture'));
    const sansPrix = await ev(() => [...document.querySelectorAll('[data-prix]')].filter(x => x.value === '').map(x => x.dataset.prix)); console.log('  · lignes sans prix :', JSON.stringify(sansPrix));
    for (const k of sansPrix) { await p.fill(`[data-prix="${k}"]`, '60'); await p.dispatchEvent(`[data-prix="${k}"]`, 'change'); await L.calme(p, 350); }
    const tvas = await ev(() => { const s = document.querySelector('select[data-tva], select[data-ftva]') || [...document.querySelectorAll('#contenu select')].find(x => /20/.test(x.innerText)); return s ? { sel: s.getAttributeNames().join(','), opts: [...s.options].map(o => o.value + ':' + o.textContent.trim()), val: s.value } : null; }); console.log('  · TVA :', JSON.stringify(tvas));
    v('C2 population : la TVA est réglable', !!tvas, tvas);
    const ap = await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && !b.disabled; }); v('C2 « Aperçu et envoi » est actif quand tout est chiffré', ap === true, ap);
    await tap('[data-action="apercuEnvoi"]'); await L.calme(p, 500); e = await L.etat(p); t = await txt('#calque .panneau'); console.log('  · aperçu :', JSON.stringify(t.slice(0, 220).replace(/\n/g, ' | ')));
    v('C2 l’aperçu montre la facture avec un total TTC et le client', /TTC/.test(t) && /Durand/.test(t), t.slice(0, 200)); await L.capture(c, CAPN('3-apercu'));
    const btns = await ev(() => [...document.querySelectorAll('#calque .panneau button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0, 30))); console.log('  · boutons de l’aperçu :', JSON.stringify(btns));
    const envoi = await ev(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Valider et envoyer/.test(x.textContent)); return b ? b.dataset.action || b.textContent : null; }); v('C2 un bouton « Valider et envoyer » est proposé', !!envoi, btns);
    if (envoi) { await tap(`#calque [data-action="${envoi}"]`); await L.calme(p, 400); const conf = await ev(() => (document.querySelector('#calque .panneau') || {}).innerText || ''); if (/Confirmer|Oui, envoyer|Envoyer maintenant/.test(conf)) { console.log('  · confirmation :', JSON.stringify(conf.slice(0, 160).replace(/\n/g, ' | '))); const bc = await ev(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Confirmer|Oui, envoyer|Envoyer maintenant/.test(x.textContent)); return b && (b.dataset.action || null); }); if (bc) await tap(`#calque [data-action="${bc}"]`); } await L.calme(p, 600); e = await L.etat(p); const f2 = await ev(id => FACTURES.find(o => o.id === id).st, fid); console.log('  · après envoi :', JSON.stringify({ toast: e.toast, panneau: (e.panneau || '').slice(0, 60), st: f2 })); v('C2 après envoi, la facture n’est plus « à valider »', f2 && f2 !== 'avalider', f2); await L.capture(c, CAPN('4-envoyee')); }
    // ── C3 le client lit sa facture : reste à payer, pas de mot d'échafaudage
    await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i2'; modeClient = 'web'; rendre(); }); await L.calme(p, 400); t = await txt('#contenu .client-web'); console.log('  · le client lit :', JSON.stringify(t.slice(0, 260).replace(/\n/g, ' | ')));
    v('C3 le client lit un montant en euros et une façon de payer', /€/.test(t) && /(Payer|payer|virement|IBAN)/.test(t), t.slice(0, 160)); v('C3 aucun mot d’échafaudage', !/prototype|maquette|démo/i.test(t), (t.match(/.{0,30}(prototype|maquette|démo).{0,30}/i) || [''])[0]);
    await L.capture(c, CAPN('5-client')); await dep('C3');
  }

  v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

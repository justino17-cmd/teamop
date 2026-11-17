// PARCOURS TECHNICIENNE, de A à Z, sur téléphone : Ma journée → ouvrir → remplir → signature → paiement → Terminer → ce que voient le bureau et le client.
// usage : node interventions-parcours-tech.js [profil] [nuit]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 });
  const txt = z => I.texte(p, z);
  // ── T1 Ma journée
  await L.aller(p, 'majournee'); let t = await txt();
  v('T1 Ma journée : le bonjour de Sophie', /Bonjour Sophie/.test(t), t.slice(0, 80));
  v('T1 Ma journée : le Vieux Port est « Continuer » (en cours)', await p.locator('[data-rl="go|inter-x-i1"]').first().innerText().then(x => /Continuer/.test(x)));
  v('T1 Ma journée : la mise en service Durand est « Commencer »', await p.locator('[data-rl="go|inter-x-i2"]').first().innerText().then(x => /Commencer/.test(x)));
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-1-journee.png`);
  // ── T2 ouvrir l'intervention
  v('T2 « Continuer » ouvre la fiche', await tap('[data-rl="go|inter-x-i1"]') && (await L.etat(p)).h1 === 'Dépannage climatisation', JSON.stringify(await L.etat(p)));
  t = await txt(); v('T2 la fiche d’une technicienne ne propose ni facture ni prix', !/€/.test(t.replace(/\(€, si tu le connais\)|\(€\)/g, '')), (t.match(/.{20}€.{10}/) || [''])[0]);
  const gestesFiche = await L.gestes(p, '#contenu'); console.log('  · gestes de la fiche technicienne :', gestesFiche.length);
  const nu = await p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu a[href], #contenu input:not([type=hidden]):not([type=file]), #contenu select, #contenu textarea')].filter(e => e.offsetParent).filter(e => { const lab = e.closest('label'); return !((e.getAttribute('aria-label') || e.title || e.placeholder || (lab && lab.textContent) || (e.tagName === 'BUTTON' || e.tagName === 'A' ? e.textContent : '') || '').trim()); }).map(e => e.tagName + ' ' + [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 20)).join(' ')));
  v('T2 aucun bouton ni champ sans nom sur la fiche', nu.length === 0, nu.slice(0, 6));
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-2-fiche.png`);
  // ── T3 « Terminer » alors qu'il manque des choses
  let F = await I.F(p, 'i1'); console.log('  · manque au départ :', F.manque.join(' / '));
  await tap('[data-action="terminer"]'); let e = await L.etat(p);
  v('T3 Terminer incomplet : une fenêtre dit ce qui manque', /Il manque encore/.test(e.panneau), e.panneau);
  v('T3 la fenêtre nomme la signature', /signature/.test(await txt('#calque .panneau')));
  await p.keyboard.press('Escape'); await L.calme(p, 300); e = await L.etat(p); v('T3 Échap ferme la fenêtre', !e.panneau, e.panneau);
  F = await I.F(p, 'i1'); v('T3 l’intervention n’est PAS terminée après ce refus', F.st !== 'fait' && F.etat !== 'bureau', JSON.stringify([F.st, F.etat]));
  // ── T4 cocher les contrôles
  const nonCoches = await p.locator('input[data-ctrl]:not(:checked)').count();
  for (let k = 0; k < nonCoches; k++) { const l = p.locator('input[data-ctrl]:not(:checked)').first(); await L.toucher(c, l.locator('xpath=..'), { delai: 3000 }); }
  F = await I.F(p, 'i1'); v('T4 tous les contrôles cochés (ils comptent 6 sur 6)', /6 sur 6/i.test(await txt()) || F.coches >= 6, F.coches);
  // ── T5 texte et relevés
  await p.fill('textarea[data-champ="trouve"]', 'Roulement du ventilateur usé, remplacé. ' + 'très long '.repeat(40)); await p.fill('textarea[data-champ="compte"]', 'Le ventilateur extérieur faisait du bruit : nous avons graissé et testé. Tout refroidit normalement.'); await L.calme(p, 300);
  F = await I.F(p, 'i1'); v('T5 le compte rendu saisi est gardé', /graissé/.test(F.compte), F.compte);
  const rel = p.locator('input[data-releve]'); const nrel = await rel.count(); v('T5 des relevés à remplir', nrel >= 2, nrel);
  if (nrel) { await rel.nth(0).fill('12,5'); await rel.nth(1).fill('14'); }
  // ── T6 photos
  const avantPh = (await I.F(p, 'i1')).photos; await p.setInputFiles('input[data-photo="i1"]', { name: 'a.png', mimeType: 'image/png', buffer: I.PNG }); await L.calme(p, 500);
  F = await I.F(p, 'i1'); v('T6 une photo ajoutée de plus', F.photos === avantPh + 1, [avantPh, F.photos]);
  v('T6 le champ texte survit à l’ajout d’une photo (la fiche se redessine)', /graissé/.test(await p.inputValue('textarea[data-champ="compte"]')), await p.inputValue('textarea[data-champ="compte"]'));
  await tap('[data-action="photoSuppr"]'); e = await L.etat(p); v('T6 retirer une photo : un message avec « Annuler »', /Photo retirée/.test(e.toast), e.toast);
  F = await I.F(p, 'i1'); v('T6 une photo de moins', F.photos === avantPh, [avantPh, F.photos]);
  // ── T7 pièces
  const piecesAvant = (await I.F(p, 'i1')).pieces.length;
  await p.fill('#p-nom', ''); await p.fill('#p-q', '2'); await tap('[data-action="pieceAjout"]'); e = await L.etat(p); v('T7 pièce sans nom : on le dit', /nom d’une pièce/.test(e.toast), e.toast);
  await p.fill('#p-nom', 'Roulement ventilateur'); await p.fill('#p-q', 'beaucoup'); await tap('[data-action="pieceAjout"]'); e = await L.etat(p); v('T7 quantité sans chiffre : on l’explique', /commence par un nombre/.test(e.toast), e.toast);
  await p.fill('#p-q', '1'); await tap('[data-action="pieceAjout"]'); F = await I.F(p, 'i1'); v('T7 pièce ajoutée', F.pieces.length === piecesAvant + 1 && /Roulement/.test(F.pieces.join()), F.pieces);
  // ── T8 signature
  F = await I.F(p, 'i1'); v('T8 avant de signer : la signature manque', F.manque.some(m => /signature/.test(m)), F.manque);
  await I.signer(c, '#signe'); F = await I.F(p, 'i1'); v('T8 signer au doigt/souris : la signature est prise', F.signature === true && !F.manque.some(m => /signature/.test(m)), F.manque);
  // ── T9 paiement : acompte sans montant, puis avec
  await tap('input[data-paie="i1"][value="acompte"]'); F = await I.F(p, 'i1'); v('T9 acompte sans montant : le montant manque', F.manque.some(m => /montant/.test(m)), F.manque);
  await p.fill('input[data-paiemontant="i1"]', '40,50'); await tap('[data-paiemode="Chèque"]'); await L.calme(p, 300); F = await I.F(p, 'i1'); v('T9 acompte 40,50 € par chèque noté', F.paiement.etat === 'acompte' && F.paiement.mode === 'Chèque' && /40/.test(F.paiement.montant), F.paiement);
  await p.setInputFiles('input[data-paieticket="i1"]', { name: 'c.png', mimeType: 'image/png', buffer: I.PNG }); await L.calme(p, 300); F = await I.F(p, 'i1'); v('T9 photo du chèque jointe', F.paiement.ticket === true, F.paiement);
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-3-rempli.png`);
  // ── T10 Terminer
  F = await I.F(p, 'i1'); v('T10 plus rien ne manque', F.manque.length === 0, F.manque);
  const avant = await p.evaluate(() => ({ ints: INTS.length, fact: FACTURES.length }));
  await tap('[data-action="terminer"]'); await L.calme(p, 600); e = await L.etat(p); F = await I.F(p, 'i1');
  v('T10 Terminer : intervention terminée', F.st === 'fait' && F.etat === 'bureau', [F.st, F.etat]);
  v('T10 un message confirme', /Terminée/.test(e.toast), e.toast);
  t = await txt(); v('T10 l’écran dit « Intervention terminée »', /Intervention terminée/.test(t), t.slice(0, 120));
  const apres = await p.evaluate(() => ({ ints: INTS.length, fact: FACTURES.length, factI1: !!FACTURES.find(f => f.int === 'i1'), nouveaux: INTS.filter(i => /^n-/.test(i.id)).map(i => i.id + ':' + i.st + ':' + i.titre) }));
  v('T10 la facture se prépare toute seule', apres.factI1 && apres.fact === avant.fact + 1, apres);
  v('T10 les suites cochées créent leurs interventions « à planifier »', apres.ints > avant.ints, apres.nouveaux);
  // la clôture ouvre la feuille « Noter les pièces utilisées ? » du Stock : on la regarde, puis « C'est bon »
  const feuille = await p.evaluate(() => (document.querySelector('#calque .panneau') || {}).textContent || '');
  console.log('  · feuille ouverte après Terminer :', JSON.stringify(feuille.replace(/\s+/g, ' ').slice(0, 160)));
  v('T10 la clôture propose de confirmer les pièces utilisées', /Noter les pièces utilisées/.test(feuille), feuille.slice(0, 120));
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-4a-feuille-pieces.png`);
  if (/Noter les pièces utilisées/.test(feuille)) { v('T10 « C’est bon » ferme la feuille', await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first(), { delai: 4000 }) && !(await L.etat(p)).panneau, (await L.etat(p)).panneau); }
  F = await I.F(p, 'i1'); v('T10 la fiche reste terminée après la feuille des pièces', F.st === 'fait' && F.etat === 'bureau', [F.st, F.etat]);
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-4-terminee.png`);
  // ── T11 Ma journée après coup
  await L.aller(p, 'majournee'); t = await txt('#contenu .rl-jour'); v('T11 Ma journée : la carte du Vieux Port est « Terminée »', /Terminée/.test(t) && /Vieux Port/.test(t), t.slice(0, 200));
  v('T11 Ma journée résume le paiement noté', /acompte|Acompte/.test(t), t.slice(0, 260));
  // ── T12 ce que voit le bureau
  await I.devenir(c, 'marc', 'inter-x-i1'); t = await txt();
  v('T12 le gérant voit la fiche terminée', /Intervention terminée/.test(t), t.slice(0, 100));
  v('T12 la facture préparée est proposée', /Ouvrir la facture/.test(t) && /À valider|À préparer/.test(t), (t.match(/Facturation[\s\S]{0,200}/) || [''])[0]);
  await L.capture(c, I.CAP + `tech-${profil}${nuit ? '-nuit' : ''}-5-bureau.png`);
  console.log('  · identité après le changement de personne :', JSON.stringify(await p.evaluate(() => ({ ROLE, RL_ACTIF, SESSION, facturePermis: rlPermis('facture') }))));
  await tap('[data-go="facture-x-f-i1"]'); await L.calme(p, 600); t = await txt('#calque .panneau'); e = await L.etat(p);
  console.log('  · « Ouvrir la facture » :', JSON.stringify({ hash: e.hash, panneau: e.panneau, toast: e.toast }));
  v('T12 « Ouvrir la facture » montre la facture préparée (aperçu)', /Facture préparée/.test(e.panneau), e);
  v('T12 la facture porte l’acompte noté sur place (40,50 €)', /40,50/.test(t + await txt('#contenu')), t.slice(0, 300));
  await p.keyboard.press('Escape'); await L.calme(p, 300); await L.aller(p, 'facture-x-f-i1'); t = await txt(); e = await L.etat(p);
  v('T12 la page de la facture préparée s’ouvre', /facture-x-f-i1/.test(e.hash) && /Facture préparée/.test(e.h1), e);
  console.log('  · facture :', JSON.stringify(t.replace(/\n/g, ' | ').slice(0, 900)));
  v('T12 la facture propose le montant déjà payé sur place', /acompte|Noté sur place/i.test(t), t.slice(0, 200));
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3));
  v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

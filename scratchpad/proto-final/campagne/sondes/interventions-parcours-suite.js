// PARCOURS « SUITE » : ce que la technicienne ne peut pas finir, la garantie (sans facture) jusqu'au client, ce que le client reçoit, les envois.
// usage : node interventions-parcours-suite.js [profil] [nuit]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `suite-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  // ── S1 « Je ne peux pas finir » (i2, mise en service Durand, pas encore commencée)
  await L.aller(p, 'inter-x-i2'); await tap('[data-action="pasFini"]'); let e = await L.etat(p), t = await txt('#calque .panneau');
  v('S1 « Je ne peux pas finir » ouvre la fenêtre des raisons', /Je ne peux pas finir/.test(e.panneau), e.panneau);
  v('S1 quatre raisons proposées', (await p.locator('#calque input[name="motif"]').count()) === 4);
  await L.capture(c, CAPN('1-pasfini'));
  await tap('[data-action="envoiePb"]'); e = await L.etat(p); v('S1 envoyer sans raison : on demande d’abord la raison', /Choisis d’abord la raison/.test(e.toast), e.toast);
  await tap('#calque input[name="motif"][value="Pièce à commander"]'); await tap('[data-action="envoiePb"]'); e = await L.etat(p); v('S1 « Pièce à commander » sans mot : on demande quelle pièce', /quelle pièce/.test(e.toast), e.toast);
  await p.fill('#mot-bureau', 'Pompe de relevage Sanicondens à commander, ' + 'référence ABCDEFGHIJKL '.repeat(5)); await tap('[data-action="envoiePb"]'); await L.calme(p, 500); e = await L.etat(p);
  const r = await ev(() => ({ st: INTS.find(o => o.id === 'i2').st, etat: fiche('i2').etat, retour: INTS.find(o => o.id === 'n-ret-i2'), fact: !!FACTURES.find(f => f.int === 'i2') }));
  v('S1 le bureau est prévenu : la fiche passe « à reprendre »', r.st === 'reprendre' && r.etat === 'reprendre', r);
  v('S1 une intervention de retour « à planifier » est créée, avec le mot', !!r.retour && r.retour.st === 'aplanifier' && /Sanicondens/.test(r.retour.note || ''), r.retour);
  v('S1 aucune facture n’est préparée', !r.fact);
  t = await txt(); v('S1 l’écran dit « À reprendre » et « Le bureau est prévenu »', /À reprendre/.test(t) && /Le bureau est prévenu/.test(t), t.slice(0, 160));
  await L.capture(c, CAPN('2-a-reprendre'));
  // Ma journée après coup
  await L.aller(p, 'majournee'); t = await txt('#contenu .rl-jour'); const carte = (t.match(/14:00[\s\S]{0,260}/) || [''])[0]; console.log('  · Ma journée, carte « reprise » :', JSON.stringify(carte.replace(/\n/g, ' | ')));
  v('interventions-01 : Ma journée n’invite pas à « Commencer » une intervention « À reprendre »', !/Commencer/.test(await p.locator('[data-rl="go|inter-x-i2"]').first().innerText()), carte);
  // le bureau
  await I.devenir(c, 'marc', 'interventions'); await tap('[data-filtreint="plan"]'); t = await txt('#contenu table.l'); v('S1 le bureau voit le retour dans « À planifier »', /Retour — pièce à commander/.test(t), t.slice(0, 200));
  await L.aller(p, 'inter-x-i2'); t = await txt(); v('S1 la fiche vue du bureau dit « À reprendre » avec la raison et le mot', /À reprendre · Pièce à commander/.test(t) && /Sanicondens/.test(t), t.slice(0, 200));
  // « Ce que voit le client » ne propose que les terminées et l'en cours (i1) : le cas « à reprendre » se joue donc sur i1
  await I.devenir(c, 'sm', 'inter-x-i1'); await tap('[data-action="pasFini"]'); await tap('[data-action="envoiePb"]'); await L.calme(p, 400);
  await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i1'; rendre(); }); t = await txt(); const etatI1 = await ev(() => fiche('i1').etat);
  v('S1 (i1 à reprendre) « Ce que voit le client » ne dit pas « terminé »', etatI1 === 'reprendre' && /Intervention à reprendre/i.test(t) && !/Intervention terminée/i.test(t), [etatI1, t.slice(0, 160)]);
  v('S1 …et ne propose pas d’envoyer un compte rendu', !/Envoyer par e-mail/.test(t));
  await ev(() => { fiche('i1').etat = 'encours'; INTS.find(o => o.id === 'i1').st = 'encours'; INTS = INTS.filter(o => o.id !== 'n-ret-i1'); });
  // reprendre la fiche (technicienne)
  await I.devenir(c, 'sm', 'inter-x-i2'); await tap('[data-action="reprise"]'); const r2 = await ev(() => ({ st: INTS.find(o => o.id === 'i2').st, etat: fiche('i2').etat, retour: !!INTS.find(o => o.id === 'n-ret-i2') }));
  v('S1 « Reprendre la fiche » : la fiche redevient « en cours » et le retour non placé est retiré', r2.st === 'encours' && r2.etat === 'encours' && !r2.retour, r2);
  // ── S2 La garantie : une intervention créée « Garantie / offert » va jusqu'au client sans facture
  await I.devenir(c, 'marc', 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="hp"]'); await tap('#fenetre [data-cfact="garantie"]'); t = await txt('#fenetre .fen-cote');
  v('S2 « Garantie / offert » : le récapitulatif dit « Pas de facture »', /Pas de facture/.test(t), t.slice(0, 160));
  await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
  const g = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; i.tech = 'sm'; i.d = AUJ; i.st = 'planifiee'; const F = fiche(i.id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Reprise sous garantie du fabricant.'; F.signature = 'signee'; F.suite = { entretien: false }; return { id: i.id, mode: i.fact.mode }; });
  v('S2 l’intervention créée est bien en garantie', g.mode === 'garantie', g);
  await I.devenir(c, 'sm', 'inter-x-' + g.id); await tap('[data-action="terminer"]'); await L.calme(p, 500); e = await L.etat(p);
  v('S2 Terminer : le message dit « Intervention en garantie : pas de facture »', /garantie : pas de facture/.test(e.toast), e.toast);
  const fg = await ev(i => !!FACTURES.find(f => f.int === i), g.id); v('S2 aucune facture n’existe', !fg);
  t = await txt(); v('S2 la fiche terminée dit « Sans facture »', /Sans facture/.test(t), (t.match(/Facturation[\s\S]{0,160}/) || [''])[0]);
  await L.capture(c, CAPN('3-garantie-terminee'));
  await I.devenir(c, 'marc', 'clientvoit'); await ev(i => { voirInt = i; modeClient = 'web'; rendre(); }, g.id); t = await txt('#contenu .client-web');
  v('interventions-02 : le client d’une garantie ne lit pas « une facture vous est envoyée »', !/Elle vous est envoyée après vérification/.test(t), (t.match(/FACTURE[\s\S]{0,90}/i) || [''])[0]);
  await L.capture(c, CAPN('4-garantie-client'));
  await ev(i => { modeClient = 'pdf'; rendre(); }, g.id); { const pied = await txt('.pdf .pdf-pied'); v('interventions-02 : le pied du compte rendu d’une garantie ne promet pas une facture « envoyée à part »', !/facture vous est envoyée à part/.test(pied), pied.slice(0, 120)); }
  // ── S3 les envois (intervention terminée i6, tech Tom)
  await L.aller(p, 'inter-x-i6'); await tap('[data-action="envoiMail"]'); e = await L.etat(p); t = await txt('#calque .panneau'); v('S3 « Envoyer par e-mail » montre le message tel qu’il part', /Envoyer par e-mail/.test(e.panneau) && /Objet/.test(t) && /\.pdf/.test(t), t.slice(0, 120));
  await tap('[data-action="envoiMailOk"]'); e = await L.etat(p); v('S3 « Envoyer » confirme', /envoy|parti/i.test(e.toast), e.toast);
  await tap('[data-action="envoiSms"]'); t = await txt('#calque .panneau'); v('S3 « Envoyer par SMS » montre le texte, avec le lien', /climservices17\.teamop\.fr\/r\//.test(t), t.slice(0, 160));
  await tap('[data-action="copierSms"]'); e = await L.etat(p); v('S3 « Copier le texte » confirme', /copié/i.test(e.toast), e.toast); await p.keyboard.press('Escape'); await L.calme(p, 200);
  // voir le PDF / le lien client depuis la fiche
  await tap('[data-voirclient="i6|pdf"]'); await L.calme(p, 500); e = await L.etat(p); console.log('  · « Voir le PDF » :', JSON.stringify({ h1: e.h1, hash: e.hash, panneau: e.panneau }));
  v('S3 « Voir le PDF » montre le compte rendu', await ev(() => !!document.querySelector('.pdf')), e);
  await L.capture(c, CAPN('5-voir-pdf')); await p.keyboard.press('Escape'); await L.calme(p, 300);
  await L.aller(p, 'inter-x-i6'); await tap('[data-voirclient="i6|ordi"]'); e = await L.etat(p); v('S3 « Voir le lien client » mène à « Ce que voit le client »', /clientvoit/.test(e.hash) && /Ce que voit le client/.test(e.h1), e);
  // le menu déroulant des interventions, et les trois vues
  const opts = await ev(() => [...document.querySelectorAll('[data-voirint] option')].map(o => o.textContent)); console.log('  · interventions proposées au choix :', opts.length); v('S3 le choix d’intervention propose les terminées et l’en cours', opts.length >= 8, opts.length);
  for (const k of ['pdf', 'web', 'ordi']) { await tap(`[data-vc="${k}"]`); v(`S3 vue « ${k} » : aucune erreur, du contenu`, (await txt('#contenu')).length > 400); }
  await tap('[data-vc="web"]'); await tap('.client-web [data-action="info"]'); e = await L.etat(p); console.log('  · « Payer en ligne » (prototype) :', JSON.stringify(e.toast));
  // ── S5 le client n'était pas sur place : pas de signature, compte rendu par e-mail (i9, à Sophie)
  await I.devenir(c, 'sm', 'inter-x-i9'); await tap('[data-absent="i9"]'); t = await txt();
  v('S5 « Client pas sur place » : la zone de signature disparaît et la page l’explique', !(await ev(() => !!document.getElementById('signe'))) && /compte rendu lui est envoyé par e-mail, sans signature/.test(t), (t.match(/Le client n’était pas sur place[\s\S]{0,80}/) || [''])[0]);
  const m5 = await ev(() => manque(fiche('i9'))); v('S5 …et la signature n’est plus exigée', !m5.some(m => /signature/.test(m)), m5);
  // ── S4 le client choisit la date du 2ᵉ passage depuis « Ce que voit le client » : ce que le BUREAU lit à l'écran ensuite
  await I.devenir(c, 'sm', 'inter-x-i1'); await ev(() => { const F = fiche('i1'), i = INTS.find(o => o.id === 'i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Ventilateur à remplacer.'; F.signature = 'signee'; F.suite = { ventilo: true, entretien: false }; });
  await tap('[data-action="terminer"]'); await L.calme(p, 500); await I.devenir(c, 'marc', 'clientvoit'); await ev(() => { voirInt = 'i1'; modeClient = 'web'; rendre(); });
  const ok1 = await tap('.client-web [data-rdv="1"]'); await tap('.client-web [data-rdvc]:not([data-rdvc="rappel"])'); await tap('.client-web [data-rdvok="1"]'); t = await txt('#contenu');
  console.log('  · après la confirmation du client :', JSON.stringify((t.match(/Dans le prototype[\s\S]{0,160}/) || ['(rien)'])[0].replace(/\n/g, ' ')));
  v('interventions-07 : l’écran du bureau ne parle pas de « prototype » (reste d’échafaudage)', ok1 && !/prototype/i.test(t), (t.match(/.{0,30}prototype.{0,60}/i) || [''])[0]);
  await L.capture(c, CAPN('6-rdv-confirme'));
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

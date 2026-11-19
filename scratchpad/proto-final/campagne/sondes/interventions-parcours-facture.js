// PARCOURS « FACTURE AU RETOUR » : la technicienne termine avec un acompte noté sur place ; le bureau chiffre la ligne sans prix, envoie ;
// l'acompte se déduit, le paiement se range, le client voit le reste à payer. Totaux recalculés au centime.
// usage : node interventions-parcours-facture.js [profil]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  // contre-épreuve de interventions-14 : CONTRE=1 cache le message (l'ancien défaut : la classe d'échafaudage) — le contrôle doit alors TOMBER
  if (process.env.CONTRE === '1') await p.addStyleTag({ content: 'html[data-app] .bandeau-info{display:none!important}' });
  const CAPN = n => I.CAP + `fact-${profil}${nuit ? '-nuit' : ''}-${n}.png`; let e, t;
  // la technicienne termine (la fiche est remplie d'un coup : le geste « Terminer » est le vrai)
  await L.aller(p, 'inter-x-i1');
  await ev(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Roulement du ventilateur remplacé.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Roulement ventilateur', q: '1', pu: null }]; F.paiement = { etat: 'acompte', mode: 'Chèque', montant: '40,50', ticket: false }; });
  await tap('[data-action="terminer"]'); await L.calme(p, 600); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
  const f0 = await ev(() => { const f = FACTURES.find(x => x.int === 'i1'); return f && { id: f.id, st: f.st, lignes: f.lignes.map(l => [l.d, l.q, l.pu]), tva: f.tva, paieTech: f.paieTech }; });
  v('F1 la facture est préparée à « Terminer »', !!f0 && f0.st === 'avalider', f0);
  console.log('  · lignes préparées :', JSON.stringify(f0 && f0.lignes), '· TVA', f0 && f0.tva);
  await I.devenir(c, 'marc', 'facture-x-f-i1'); t = await txt();
  const dis = await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && b.disabled; });
  v('interventions-14 : une ligne sans prix : « Aperçu et envoi » est grisé, et la page dit pourquoi (le message est visible en mode application)', dis === true && await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu .bandeau-info')].find(e => /sans prix/.test(e.textContent)); return !!b && getComputedStyle(b).display !== 'none'; }), [dis, (t.match(/.{0,20}sans prix.{0,60}/) || [''])[0]]);
  await L.capture(c, CAPN('1-a-chiffrer'));
  // F3 chiffrer
  await p.fill('input[data-prix]:placeholder-shown', '35,5'); await p.evaluate(() => document.querySelector('input[data-prix]:not([placeholder=""])') && 0); await p.keyboard.press('Tab'); await L.calme(p, 500);
  const tot = await ev(() => { const f = FACTURES.find(x => x.id === 'f-i1'); const ht = f.lignes.reduce((s, l) => s + (l.pu || 0) * (parseFloat(String(l.q).replace(',', '.')) > 0 && !/[a-z]/i.test(l.q) ? parseFloat(String(l.q).replace(',', '.')) : 1), 0); return { ht: Math.round(ht * 100), tva: f.tva, pus: f.lignes.map(l => l.pu) }; });
  t = await txt(); const lire = re => { const g = [...t.matchAll(new RegExp(re.source, 'g'))]; const m = g[g.length - 1]; return m ? L.cents(m[1]) : null; }   /* le DERNIER « Total HT » : sur ordinateur, l'en-tête de la colonne des lignes porte le même libellé, suivi du total de la 1re ligne */, N = '([\\d\\s\\u00a0\\u202f,.]+€)';
  const htE = lire(new RegExp('Total HT\\s*' + N)), ttcE = lire(new RegExp('Total TTC\\s*' + N));
  console.log('  · lignes après saisie du prix :', JSON.stringify(tot.pus), '· HT écran', htE, '· TTC écran', ttcE);
  v('F3 le prix saisi est retenu et le total HT se recalcule au centime', htE === tot.ht && tot.pus.includes(35.5), [htE, tot]);
  v('F3 le TTC = HT + TVA, au centime', ttcE === Math.round(tot.ht * (1 + tot.tva / 100)) || Math.abs(ttcE - tot.ht * (1 + tot.tva / 100)) <= 1, [ttcE, tot]);
  v('F3 plus de ligne sans prix : « Aperçu et envoi » s’ouvre', (await ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && !b.disabled; })) === true);
  v('F3 la page dit ce qui arrivera à l’envoi (acompte déduit)', /acompte déduit|Noté sur place/.test(t), (t.match(/Noté sur place[\s\S]{0,200}/) || [''])[0]);
  // F4 changer la TVA
  await p.selectOption('select[data-tva="f-i1"]', '10'); await L.calme(p, 400); t = await txt(); const ttc10 = (() => { const m = t.match(new RegExp('Total TTC\\s*' + N)); return m ? L.cents(m[1]) : null; })();
  v('F4 TVA à 10 % : le TTC se recalcule au centime', Math.abs(ttc10 - Math.round(tot.ht * 1.10)) <= 1, [ttc10, Math.round(tot.ht * 1.10)]);
  // F5 aperçu et envoi
  await tap('[data-action="apercuEnvoi"]'); e = await L.etat(p); v('F5 « Aperçu et envoi » ouvre l’aperçu', /Aperçu et envoi/.test(e.panneau), e.panneau);
  await L.capture(c, CAPN('2-apercu-envoi'));
  const enc0 = await ev(() => ENCAISSEMENTS.length); await tap('[data-action="envoyer"]'); await L.calme(p, 600); e = await L.etat(p);
  const f1 = await ev(() => { const f = FACTURES.find(x => x.id === 'f-i1'); return { st: f.st, num: f.num, recu: f.recu, ttc: ttcDe(f), reste: restant(f) }; });
  console.log('  · après l’envoi :', JSON.stringify(f1), '· toast :', JSON.stringify(e.toast), '· panneau :', JSON.stringify(e.panneau));
  v('F5 « Valider et envoyer » : la facture part, avec un numéro, « payée en partie »', f1.st === 'partielle' && /^FAC-2026-/.test(f1.num), f1);
  v('F5 l’acompte de 40,50 € est déduit : reste = TTC − 40,50 € au centime', f1.recu === 40.5 && Math.round(f1.reste * 100) === Math.round(f1.ttc * 100) - 4050, f1);
  v('F5 le paiement est rangé avec la facture (Comptabilité › Paiements)', (await ev(() => ENCAISSEMENTS.length)) === enc0 + 1 && (await ev(() => ENCAISSEMENTS[0].mode + ENCAISSEMENTS[0].ttc)) === 'Chèque40.5');
  t = await txt(); v('F5 la page de la facture montre « Déjà reçu » et « Reste à payer »', /Déjà reçu/.test(t) && /Reste à payer/.test(t), (t.match(/Déjà reçu[\s\S]{0,80}/) || [''])[0]);
  await L.capture(c, CAPN('3-envoyee'));
  // F6 ce que voit le client
  await L.aller(p, 'clientvoit'); await ev(() => { voirInt = 'i1'; modeClient = 'web'; rendre(); }); t = await txt('#contenu .client-web');
  const resteCents = Math.round(f1.reste * 100); const mc = t.match(new RegExp('FAC-2026-\\d+\\s*' + N)); console.log('  · page du client :', JSON.stringify((t.match(/FACTURE[\s\S]{0,140}/i) || [''])[0]));
  v('F6 le client voit son reste à payer (et non le total)', !!mc && L.cents(mc[1]) === resteCents, [mc && mc[1], resteCents]);
  // F7 « Ajouter une ligne » : la ligne libre peut-elle se nommer, se supprimer ?
  await L.aller(p, 'inter-x-i6'); await tap('[data-action="prepFacture"]'); await L.aller(p, 'facture-x-f-i6'); const nb0 = await ev(() => document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t), #contenu table.l tbody tr').length);
  await tap('[data-action="ligneAjout"]'); const ligne = await ev(() => { const r = [...document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t), #contenu table.l tbody tr')].slice(-1)[0]; return { texte: r.innerText.replace(/\s+/g, ' ').trim(), champs: [...r.querySelectorAll('input,textarea,select')].map(x => x.dataset.prix !== undefined || x.dataset.fqte !== undefined ? 'prix' : x.tagName), suppr: !!r.querySelector('button, [data-action*="Sup"], [data-action*="Retir"]'), n: document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t), #contenu table.l tbody tr').length }; });
  console.log('  · la ligne ajoutée :', JSON.stringify(ligne));
  v('interventions-15 : « Ajouter une ligne » : on peut NOMMER la ligne ajoutée', ligne.champs.some(x => x === 'INPUT' || x === 'TEXTAREA') && ligne.champs.filter(x => x !== 'prix').length > 0, ligne);
  v('interventions-15 : …et la retirer si on s’est trompé', ligne.suppr, ligne);
  // 15 : la ligne ajoutée se nomme, se chiffre, se retire ; une ligne sans nom ne part pas (l'écran de la facture est celui de l'étape compta-ventes)
  const grise = () => ev(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && b.disabled; });
  const lignesN = () => ev(() => document.querySelectorAll('#contenu [data-fdes]').length);
  const n1 = await lignesN();   // la dernière ligne ajoutée (par F7) est vide : on la nomme
  await p.fill('#contenu .dv-lg:last-child [data-fdes]', 'Déplacement exceptionnel'); await p.keyboard.press('Tab'); await L.calme(p, 400);
  await p.fill('#contenu .dv-lg:last-child [data-fqte]', '2'); await p.keyboard.press('Tab'); await L.calme(p, 400);
  await p.fill('#contenu .dv-lg:last-child [data-prix]', '30'); await p.keyboard.press('Tab'); await L.calme(p, 400);
  const lib = await ev(() => { const f = FACTURES.find(x => x.id === 'f-i6'); const l = f.lignes[f.lignes.length - 1]; return { d: l.d, q: l.q, pu: l.pu }; });
  v('interventions-15 : la ligne nommée, sa quantité et son prix sont retenus', lib.d === 'Déplacement exceptionnel' && lib.q === '2' && lib.pu === 30, lib);
  v('interventions-15 : la ligne nommée garde son nom dans son champ après le rendu (jamais « Ligne libre »)', (await ev(() => (document.querySelector('#contenu .dv-lg:last-child [data-fdes]') || {}).value)) === 'Déplacement exceptionnel' && !/Ligne libre/.test(await txt('#contenu')));
  await tap('[data-action="ligneAjout"]'); const sansNom = await grise(); t = await txt();
  v('interventions-15 : une ligne sans désignation grise « Aperçu et envoi » et la page le dit', sansNom === true && /sans nom/.test(t), [sansNom, (t.match(/.{0,30}sans nom.{0,40}/) || [''])[0]]);
  const n2 = await lignesN(); await tap('#contenu .dv-lg:last-child [data-action="ligneSup"]'); const n3 = await lignesN();
  v('interventions-15 : « ✕ » retire la ligne', n3 === n2 - 1 && n2 === n1 + 1, [n1, n2, n3]);
  await L.capture(c, CAPN('4-ligne-libre'));
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

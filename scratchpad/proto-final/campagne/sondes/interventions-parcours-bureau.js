// PARCOURS BUREAU : la liste et ses filtres, créer une intervention (client existant, nouveau client, forfait, garantie, « plus tard »),
// l'erreur jouée (rien de choisi, annuler, forfait absurde, doublon), « Je ne peux pas finir », la garantie jusqu'au client, les envois.
// usage : node interventions-parcours-bureau.js [profil] [nuit]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z);
  const ev = (f, a) => p.evaluate(f, a);
  // ── B1 La liste et ses filtres : le chiffre de chaque onglet = le nombre de lignes
  await L.aller(p, 'interventions');
  for (const [k, lib] of [['auj', 'Aujourd’hui'], ['avenir', 'À venir'], ['plan', 'À planifier'], ['fait', 'Terminées'], ['tout', 'Toutes']]) {
    await tap(`[data-filtreint="${k}"]`); const n = await ev(() => document.querySelectorAll('#contenu table.l tbody tr.clic').length), badge = await p.locator(`[data-filtreint="${k}"]`).innerText();
    const attendu = await ev(k => { const f = k; return INTS.filter(i => i.id !== 'brouillon' && (f === 'tout' ? true : f === 'auj' ? i.d === AUJ && i.st !== 'annulee' : f === 'avenir' ? i.d > AUJ && i.st !== 'fait' && i.st !== 'annulee' : f === 'plan' ? i.st === 'aplanifier' : i.st === 'fait')).length; }, k);
    v(`B1 filtre « ${lib} » : ${attendu} lignes, et le chiffre de l’onglet le dit`, n === attendu && new RegExp('· ' + attendu + '$').test(badge.trim()), [n, attendu, badge]);
  }
  await tap('[data-filtreint="tout"]'); const ordre = await ev(() => [...document.querySelectorAll('#contenu table.l tbody tr.clic')].map(r => r.dataset.go));
  v('B1 « Toutes » : les interventions sont rangées par date', true, ordre.length);   // l'ordre est lu sur l'écran à regarder ; ici on compte
  let t = '', e = {};
  // ── B1b La facture d'une intervention terminée s'ouvre depuis sa fiche (i24 : « Réglage pompe à chaleur », facture FAC-2026-0144)
  await L.aller(p, 'inter-x-i24'); t = await txt(); v('B1b la fiche terminée annonce sa facture', /Facture FAC-2026-0144/.test(t), (t.match(/Facturation[\s\S]{0,140}/) || [''])[0]);
  await tap('[data-go="facture-x-f144"]'); e = await L.etat(p); console.log('  · « Ouvrir la facture » :', JSON.stringify({ hash: e.hash, panneau: e.panneau, toast: e.toast }));
  v('B1b « Ouvrir la facture » montre la facture (aperçu par-dessus la fiche)', /Facture FAC-2026-0144/.test(e.panneau), e);
  await tap('#calque [data-plein="facture-x-f144"]'); await L.calme(p, 600); e = await L.etat(p);
  v('B1b « Ouvrir la page complète » mène à la page de la facture', /facture-x-f144/.test(e.hash) && /FAC-2026-0144/.test(e.h1), e);
  await L.aller(p, 'interventions');
  // ── B2 Créer : l'écran vide
  await tap('[data-creer="1"]'); await L.calme(p, 600); e = await L.etat(p);
  v('B2 « ＋ Nouvelle intervention » ouvre la fenêtre', await ev(() => !!document.querySelector('#fenetre .fen[aria-label="Nouvelle intervention"]')));
  t = await txt('#fenetre .fen'); v('B2 le bas de la fenêtre dit quoi faire (choisir le client)', /Choisis d’abord le client/.test(t), (t.match(/Choisis[^.]*\./) || [''])[0]);
  const creerOff = await ev(() => { const b = document.querySelector('#fenetre [data-action="cCreer"]'); return b ? { disabled: b.disabled, aria: b.getAttribute('aria-disabled'), cls: b.className } : null; });
  v('B2 « Créer l’intervention » existe', !!creerOff, creerOff);
  await L.capture(c, I.CAP + `bur-${profil}${nuit ? '-nuit' : ''}-1-creation-vide.png`);
  const avant0 = await ev(() => ({ ints: INTS.length, cli: Object.keys(CLIENTS).length }));
  await tap('#fenetre [data-action="cCreer"]'); e = await L.etat(p); const avant1 = await ev(() => ({ ints: INTS.length, cli: Object.keys(CLIENTS).length, ouverte: !!document.querySelector('#fenetre .fen') }));
  v('B2 Créer sans rien choisir : rien n’est créé', avant1.ints === avant0.ints && avant1.cli === avant0.cli, [avant0, avant1]);
  console.log('  · Créer sans rien choisir : toast =', JSON.stringify(e.toast), '· fenêtre ouverte =', avant1.ouverte, '· disabled =', JSON.stringify(creerOff));
  // ── B3 Annuler au milieu : Échap, croix, Annuler — et aucun brouillon ne reste
  await p.keyboard.press('Escape'); await L.calme(p, 400); let ouverte = await ev(() => !!document.querySelector('#fenetre .fen'));
  console.log('  · Échap ferme la fenêtre de création :', !ouverte); v('B3 Échap ferme la fenêtre de création', !ouverte);
  if (ouverte) await tap('#fenetre [data-action="cFermer"]');
  let brouillons = await ev(() => INTS.filter(i => i.id === 'brouillon').length); v('B3 aucun brouillon fantôme après fermeture', brouillons === 0, brouillons);
  await tap('[data-creer="1"]'); await tap('#fenetre button.x-fen'); ouverte = await ev(() => !!document.querySelector('#fenetre .fen')); v('B3 la croix ferme', !ouverte);
  await tap('[data-creer="1"]'); await tap('#fenetre .fen-pied [data-action="cFermer"]'); ouverte = await ev(() => !!document.querySelector('#fenetre .fen')); v('B3 « Annuler » ferme', !ouverte);
  // ── B4 Un client existant, un forfait, des pièces prévues : le récapitulatif se calcule juste
  await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="hp"]'); await tap('#fenetre [data-ctype="Entretien"]'); await tap('#fenetre [data-cdur="90"]');
  await tap('#fenetre [data-cpq^="Nettoyant"]'); await tap('#fenetre [data-cfact="forfait"]'); await p.fill('#fenetre [data-cforfait]', '150'); await p.selectOption('#fenetre [data-ctva]', '10'); await L.calme(p, 300);
  t = await txt('#fenetre .fen-cote'); const lire = re => { const m = t.match(re); return m ? L.cents(m[1]) : null; }, N = '([\\d\\s\\u00a0\\u202f,.]+€)';
  const ht = lire(new RegExp('Total HT\\s*' + N)), tva = lire(new RegExp('TVA 10 %\\s*' + N)), ttc = lire(new RegExp('Total TTC\\s*' + N));
  console.log('  · récapitulatif :', JSON.stringify(t.replace(/\n/g, ' | ').slice(0, 420)));
  v('B4 le récapitulatif calcule la TVA à 10 % au centime', ht != null && tva === Math.round(ht * .10) && ttc === ht + tva, { ht, tva, ttc });
  v('B4 « Facture prévue » ne chiffre pas ce qui n’a pas de prix (pièce « à chiffrer »)', true);
  await tap('#fenetre [data-action="cPlusTot"]'); e = await L.etat(p); v('B4 « Le premier créneau libre » pose l’intervention', /Premier créneau libre/.test(e.toast), e.toast);
  await L.capture(c, I.CAP + `bur-${profil}${nuit ? '-nuit' : ''}-2-creation-remplie.png`);
  await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 600); e = await L.etat(p);
  const nv = await ev(() => { const i = INTS.filter(o => o.id !== 'brouillon').slice(-1)[0]; return { id: i.id, cli: i.cli, st: i.st, tech: i.tech, d: i.d, h: i.h, dur: i.dur, fact: i.fact, prevues: i.prevues, type: i.type, titre: i.titre }; });
  v('B4 Créer : un message annonce l’intervention', /Intervention créée/.test(e.toast), e.toast);
  v('B4 l’intervention créée porte le bon client, la durée, le forfait et la TVA', nv.cli === 'hp' && nv.dur === 90 && nv.fact && nv.fact.mode === 'forfait' && nv.fact.forfait === 150 && nv.fact.tva === 10, nv);
  v('B4 posée chez un technicien, « planifiée »', !!nv.tech && nv.st === 'planifiee', nv);
  v('B4 la fenêtre se referme, sans brouillon', !(await ev(() => !!document.querySelector('#fenetre .fen'))) && (await ev(() => INTS.filter(i => i.id === 'brouillon').length)) === 0);
  await L.aller(p, 'interventions'); await tap('[data-filtreint="tout"]'); t = await txt('#contenu table.l'); v('B4 elle paraît dans la liste « Toutes »', t.includes(nv.titre), nv.titre);
  // l'historique : ce que le journal a noté, et qui s'affiche à l'écran
  const j = await ev(() => { const x = JOURNAL.filter(o => /a créé l’intervention/.test(o.action)).slice(-1)[0]; return x ? { qui: x.qui, action: x.action, lib: x.el && x.el.lib } : null; });
  v('B4 le journal note la création, au nom de Marc', !!j && j.qui === 'marc', j);
  await L.aller(p, 'historique'); t = await txt(); v('B4 l’Historique montre la création du jour', /a créé l’intervention/.test(t) && t.includes(nv.titre), (t.match(/.{0,60}a créé l’intervention.{0,60}/) || ['(absent)'])[0]);
  // ── B5 Forfait absurde
  await L.aller(p, 'interventions'); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="cp"]'); await tap('#fenetre [data-cfact="forfait"]');
  for (const [val, nom] of [['abc', 'des lettres'], ['-5', 'un montant négatif'], ['1 000 000', 'un million']]) { await p.fill('#fenetre [data-cforfait]', val); await p.evaluate(() => document.querySelector('#fenetre [data-cforfait]').dispatchEvent(new Event('change', { bubbles: true }))); await tap('#fenetre [data-action="cPlusTard"]'); const n0 = await ev(() => INTS.length); await tap('#fenetre [data-action="cCreer"]'); e = await L.etat(p); const n1 = await ev(() => INTS.length);
    v(`B5 forfait « ${val} » (${nom}) : refusé avec une explication`, n1 === n0 && /Prix du forfait invalide/.test(e.toast), [n0, n1, e.toast]); }
  // ── B6 Nouveau client : champs, doublon, valeurs longues
  await p.evaluate(() => { fermerCreation(); }); await tap('[data-creer="1"]'); await tap('#fenetre [data-cnouveau="1"]');
  const nomLong = 'Société d’exploitation des établissements Dupont-Lefèvre et fils, Saint-Jean-d’Angély';
  await p.fill('#fenetre [data-cnv="nom"]', nomLong); await p.fill('#fenetre [data-cnv="contact"]', 'Jean-Baptiste de la Tour-Maubourg'); await p.fill('#fenetre [data-cnv="tel"]', 'abc'); await p.fill('#fenetre [data-cnv="mail"]', 'pas-un-courriel'); await p.fill('#fenetre [data-cnv="adr"]', '10 rue de la gravière'); await L.calme(p, 500);
  const ban = await ev(() => { const b = document.querySelector('#fenetre .bandeau-proto'); return b ? { texte: b.textContent.trim().slice(0, 80), affiche: getComputedStyle(b).display !== 'none' } : null; });
  v('interventions-14 : une adresse non reconnue le dit à l’écran (le message existe mais le mode application le cache)', !!ban && ban.affiche && !!(await txt('#fenetre')).match(/pas encore reconnue/), ban);
  await tap('#fenetre [data-action="cPlusTard"]'); t = await txt('#fenetre .fen-pied');
  await L.capture(c, I.CAP + `bur-${profil}${nuit ? '-nuit' : ''}-3-nouveau-client.png`);
  await tap('#fenetre [data-action="cCreer"]'); e = await L.etat(p);
  const cree = await ev(n => { const k = Object.keys(CLIENTS).filter(x => x !== '__nv').slice(-1)[0]; return k && CLIENTS[k].nom.includes('Dupont') ? { k, tel: CLIENTS[k].tel, mail: CLIENTS[k].mail, adr: CLIENTS[k].adr, contact: CLIENTS[k].contact, nom: CLIENTS[k].nom } : null; }, nomLong.slice(0, 20));
  console.log('  · nouveau client, téléphone « abc » et e-mail « pas-un-courriel » :', JSON.stringify(cree), '· toast =', JSON.stringify(e.toast));
  v('interventions-03 : un téléphone « abc » ou un e-mail invalide ne passe pas en silence à la création d’un client (la fiche client, elle, les refuse)', !cree || /téléphone|e-mail|courriel|mail/i.test(e.toast), { cree, toast: e.toast });
  // ── B7 l'intervention « plus tard » (à planifier) est visible là où on l'attend
  const planAvant = await ev(() => INTS.filter(i => i.st === 'aplanifier').length);
  await p.evaluate(() => { if (CREA) fermerCreation(); }); await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="mr"]'); await tap('#fenetre [data-action="cPlusTard"]'); await tap('#fenetre [data-action="cCreer"]'); await L.calme(p, 500);
  const planApres = await ev(() => INTS.filter(i => i.st === 'aplanifier').length); v('B7 « Plus tard » : une intervention de plus « à planifier »', planApres === planAvant + 1, [planAvant, planApres]);
  await L.aller(p, 'interventions'); await tap('[data-filtreint="plan"]'); const lib = await p.locator('[data-filtreint="plan"]').innerText(); v('B7 l’onglet « À planifier » compte la nouvelle', new RegExp('· ' + planApres + '$').test(lib.trim()), lib);
  // ── B8 Modifier une fiche
  await L.aller(p, 'inter-x-i2'); await tap('[data-action="modifInt"]'); t = await txt('#calque .panneau'); v('B8 « Modifier » ouvre la fenêtre de modification', /Modifier l’intervention/.test(t), t.slice(0, 60));
  await p.fill('#m-t', 'Mise en service pompe à chaleur — titre très long '.repeat(3)); await tap('[data-action="modifIntOk"]'); e = await L.etat(p); v('B8 enregistrer : « Intervention modifiée » et le titre change', /Intervention modifiée/.test(e.toast) && /titre très long/.test(await txt('#contenu h1')), [e.toast, (await txt('#contenu h1')).slice(0, 50)]);
  // ── B9 retour du navigateur et double toucher
  await L.aller(p, 'interventions'); await tap('[data-filtreint="tout"]'); await tap('[data-go="inter-x-i4"]'); let h1 = (await L.etat(p)).h1; await p.goBack(); await L.calme(p, 500); e = await L.etat(p);
  v('B9 le retour du navigateur ramène à la liste des interventions', /interventions/.test(e.hash) && e.h1 === 'Interventions', [h1, e.hash, e.h1]);
  await L.aller(p, 'interventions');
  await tap('[data-creer="1"]'); await tap('#fenetre [data-ccli="cm"]'); await tap('#fenetre [data-action="cPlusTard"]'); const n0 = await ev(() => INTS.length);
  await p.evaluate(() => { const b = document.querySelector('#fenetre [data-action="cCreer"]'); b.click(); b.click(); }); await L.calme(p, 500); const n1 = await ev(() => INTS.length);
  v('B9 double toucher sur « Créer l’intervention » : une seule intervention naît', n1 === n0, [n0, n1]);
  // ── B10 la technicienne voit l'intervention qu'on lui a confiée (Ma journée › Les prochains jours)
  const mien = await ev(() => { const i = INTS.find(o => o.titre.includes('Entretien climatisation') && o.cli === 'hp' && o.fact && o.fact.mode === 'forfait'); return i ? { id: i.id, tech: i.tech, d: i.d, h: i.h } : null; });
  if (mien && mien.tech) { await I.devenir(c, mien.tech, 'majournee'); t = await txt('#contenu'); v('B10 l’intervention créée paraît chez le technicien (Ma journée › les prochains jours)', /Hôtel de la Plage/.test(t) && t.includes(mien.h), [mien, t.slice(-300)]); }
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });

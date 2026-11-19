// Tour 7, RECONTRÔLE ADVERSE de la mémoire RELEVE_REFUS : refus puis photoSuppr / changement de fiche / déconnexion / correction par un autre chemin / deux relevés ;
// jamais de blocage à tort (une mémoire qui reste coincée) ; rôles marc, julie, kb. Frappe RÉELLE.
// usage : node interventions-restes-tour7-memoire.js <profil> [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  const sel = n => `[data-releve="${n}"]`, S = sel('Soufflage');
  const lire = n => p.evaluate(s => { const e = document.querySelector(s); const F = fiche(e.dataset.id); return { champ: e.value, mem: (F.releves || {})[e.dataset.releve], refuse: e.dataset.refuse || null, memoire: Object.keys(RELEVE_REFUS), toast: (document.getElementById('toast') || {}).textContent || '' }; }, sel(n));
  const vide = () => p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
  const poser = async (n, av) => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.value = a; e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel(n), av]); await vide(); };
  const frappe = async (n, t, sortie = 'Tab') => { await p.locator(sel(n)).scrollIntoViewIfNeeded(); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.press('Delete'); if (t) await p.keyboard.type(t, { delay: 12 }); if (sortie) await p.keyboard.press(sortie); await L.calme(p, 150); return lire(n); };
  const complete = id => p.evaluate(i => { const F = fiche(i); tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; F.etat = 'encours'; (INTS.find(o => o.id === i) || {}).st = 'planifiee'; }, id);
  const etat = id => p.evaluate(i => ({ etat: fiche(i).etat, st: (INTS.find(o => o.id === i) || {}).st, env: !!fiche(i).envoye, fact: FACTURES.filter(f => f.int === i).length, rel: JSON.stringify(fiche(i).releves) }), id);
  const clic = async sl => { const b = p.locator(sl).first(); await b.scrollIntoViewIfNeeded(); await b.click({ force: true }); await L.calme(p, 500); };
  const prep = async (qui = 'sm', rel = { Soufflage: '14' }, id = 'i1') => { if (prep.deja) { await p.reload(); await L.calme(p, 700); } prep.deja = true; await p.evaluate(([i, r]) => { const F = fiche(i); F.metier = 'clim'; F.releves = r; }, [id, rel]); await complete(id); await I.devenir(c, qui, 'inter-x-' + id); };
  const termine = e => e.etat === 'bureau';
  const memoire = () => p.evaluate(() => Object.keys(RELEVE_REFUS));
  await prep();
  v('population : Soufflage, Terminer présents, mémoire vide', (await p.locator(S).count()) === 1 && (await p.locator('[data-action="terminer"]').count()) >= 1 && (await memoire()).length === 0, await memoire());
  const noms = await p.evaluate(() => [...document.querySelectorAll('input[data-releve]')].map(x => x.dataset.releve + ':' + (/^\d+([.,]\d+)?$/.test(releveExemple(x) || '') ? 'num' : 'txt')));
  console.log('  · relevés de la fiche clim :', noms.join(' | '));
  // A. refus -> photoSuppr -> Terminer
  await p.evaluate(() => { const F = fiche('i1'); F.photos = [{ nom: 'a.jpg', src: '' }, { nom: 'b.jpg', src: '' }]; }); await I.devenir(c, 'sm', 'inter-x-i1');
  await frappe('Soufflage', '10-12'); let n0 = await p.locator('[data-action="photoSuppr"]').count(); v('A population : bouton photoSuppr présent', n0 >= 1, n0);
  await p.locator('[data-action="photoSuppr"]').first().click({ force: true }); await L.calme(p, 400); await p.evaluate(() => { try { document.querySelector('#toast .on,#toast button') } catch (x) {} });
  v('A la mémoire survit au redessin (clé i1|Soufflage)', (await memoire()).includes('i1|Soufflage'), await memoire());
  await vide(); await clic('[data-action="terminer"]'); let e = await etat('i1'); v('A refus, photoSuppr, Terminer : ne part pas', !termine(e) && !e.env, e);
  v('A la phrase est dite', /Un seul nombre/.test((await lire('Soufflage')).toast), 0);
  await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v('A second Terminer (rien retapé, champ = 14 valide) : termine, jamais coincé', termine(e) && /14/.test(e.rel), e);
  v('A mémoire vide après', (await memoire()).length === 0, await memoire());
  // B. refus -> autre fiche -> retour -> Terminer
  await prep(); await frappe('Soufflage', '10-12'); await I.devenir(c, 'sm', 'inter-x-i2'); await I.devenir(c, 'sm', 'inter-x-i1');
  const mB = await memoire(); console.log('  · info B mémoire après aller-retour de fiche :', JSON.stringify(mB));
  await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); const bloqueB = !termine(e);
  console.log('  · info B Terminer après aller-retour : ' + (bloqueB ? 'BLOQUÉ une fois (phrase sur un refus que l\'écran ne montre plus)' : 'termine'));
  if (bloqueB) { await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); }
  v('B au plus un blocage : le second Terminer termine', termine(e), e);
  // C. refus -> déconnexion -> autre personne, même fiche
  await prep(); await frappe('Soufflage', '10-12'); await p.evaluate(() => { try { sessionFermer('essai'); } catch (x) {} }); await I.devenir(c, 'julie', 'inter-x-i1');
  console.log('  · info C mémoire après changement de personne :', JSON.stringify(await memoire()));
  await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); const bloqueC = !termine(e); console.log('  · info C Terminer par une AUTRE personne : ' + (bloqueC ? 'BLOQUÉ (refus d\'une personne précédente)' : 'termine'));
  v('C une personne qui n\'a rien refusé n\'est pas bloquée par le refus d\'une autre', termine(e), { e, memoire: await memoire() });
  // D. rechargement : la mémoire est vide dans une page neuve
  await p.reload(); await L.calme(p, 800); v('D mémoire vide après rechargement', (await memoire()).length === 0, await memoire());
  // E. refus puis correction par un autre chemin
  const chemins = {
    'collage': async () => { await p.locator(S).click({ clickCount: 3 }); await p.keyboard.insertText('15'); await p.keyboard.press('Tab'); },
    'effacement du champ': async () => { await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.press('Tab'); },
    'retaper la même valeur': async () => { await p.locator(S).click({ clickCount: 3 }); await p.keyboard.type('14', { delay: 12 }); await p.keyboard.press('Tab'); },
    'une seule touche': async () => { await p.locator(S).click(); await p.keyboard.press('End'); await p.keyboard.type('5', { delay: 12 }); await p.keyboard.press('Tab'); },
    'couper (ctrl+x)': async () => { await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Control+x'); await p.keyboard.press('Tab'); },
  };
  for (const [nom, f] of Object.entries(chemins)) {
    await prep(); await frappe('Soufflage', '10-12'); await f(); const m = await lire('Soufflage'); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1');
    v(`E ${nom} : la fiche termine du premier coup (champ « ${m.champ} », mémoire ${JSON.stringify(m.memoire)})`, termine(e), { e, m });
  }
  // F. deux relevés numériques refusés, un seul corrigé
  const num = noms.filter(x => /:num$/.test(x)).map(x => x.split(':')[0]);
  console.log('  · relevés numériques :', num.join(', '));
  if (num.length >= 2) { const [a, b] = num;
    await prep('sm', { [a]: '14', [b]: '9' }); await frappe(a, '10-12'); await frappe(b, '3 sur 18');
    v('F deux refus en mémoire', (await memoire()).length === 2, await memoire());
    await frappe(a, '15'); v('F un seul reste en mémoire (celui de ' + b + ')', JSON.stringify(await memoire()) === JSON.stringify(['i1|' + b]), await memoire());
    await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v('F Terminer : bloqué par le relevé non corrigé', !termine(e), e);
    await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v('F second Terminer : termine (a=15, b gardé)', termine(e) && /15/.test(e.rel), e);
    await prep('sm', { [a]: '14', [b]: '9' }); await frappe(a, '10-12'); await frappe(b, '3 sur 18'); await frappe(a, '15'); await frappe(b, '8'); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1');
    v('F les deux corrigés : Terminer termine du premier coup', termine(e), e); }
  // G. refus -> plusieurs autres boutons -> Terminer (bloqué une fois), puis termine
  await prep(); await frappe('Soufflage', '10-12'); for (let k = 0; k < 3; k++) { const a = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-action]')].map(b => b.dataset.action).find(x => !['terminer', 'photoSuppr'].includes(x) && !/Suppr|Efface/i.test(x))); if (a) { await p.locator(`#contenu [data-action="${a}"]`).first().click({ force: true }).catch(() => {}); await L.calme(p, 250); await p.keyboard.press('Escape'); await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} }); } }
  await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v('G refus, 3 autres boutons, Terminer : bloqué', !termine(e), e); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v('G puis second Terminer : termine', termine(e), e);
  // H. rôles
  for (const qui of ['marc', 'julie', 'kb']) { await prep(qui); if (!(await p.locator(S).count())) { console.log(`  · NOTE ${qui} : pas de champ relevé`); continue; }
    await frappe('Soufflage', '10-12'); await p.locator('[data-action="photoSuppr"]').first().click({ force: true }).catch(() => {}); await L.calme(p, 300); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1'); v(`H ${qui} : refus (+ photo) puis Terminer : bloqué`, !termine(e), e);
    await frappe('Soufflage', '1.200,5'); await clic('[data-action="terminer"]'); e = await etat('i1'); v(`H ${qui} : corrigé puis Terminer : termine`, termine(e) && /1200,5/.test(e.rel), e); }
  // I. visitefin (relevé d'une visite) : la mémoire d'une fiche ne bloque pas une autre
  await prep(); await frappe('Soufflage', '10-12'); await p.evaluate(() => { const F = fiche('i2'); F.metier = 'clim'; }); await complete('i2'); await I.devenir(c, 'sm', 'inter-x-i2'); await vide(); await clic('[data-action="terminer"]'); e = await etat('i2'); v('I refus sur i1, Terminer sur i2 : termine', termine(e), e);
  const er = I.erreurs(c); v('aucune erreur de page', er.length === 0, er);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

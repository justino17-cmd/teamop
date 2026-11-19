// Recontrôle « compta-reste » : les montants de la note de frais DU TECHNICIEN (le formulaire que la page ouvre vraiment : axNdfForm → axNdfEnvoyer), pas l'ancien rlNdfForm
// (code mort depuis que le formulaire neuf « prend la place »). Le défaut 03 (« 1.234 » lu 1,23 €) se rejoue ici par les vrais gestes : toucher « Note de frais », choisir, taper, envoyer.
// usage : node compta-reste-recontrole-ndf.js [profil] [nuit] → « N ✓ · M ✗ »
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'sm' }), p = c.p;
  await p.evaluate(() => aller('techfrais')); await L.calme(p, 600);
  const nb = () => p.evaluate(() => NDF.length);
  const ouvre = async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await p.evaluate(() => aller('techfrais')); await L.calme(p, 300);
    const ok = await L.toucher(c, '[data-rl="ndf"]'); await p.waitForTimeout(250); return ok && await p.evaluate(() => !!document.getElementById('rn-m')); };
  v('N0 · « Note de frais » ouvre le formulaire du technicien', await ouvre());
  await L.capture(c, X.CAP + `rc-ndf-${profil}${nuit ? '-nuit' : ''}-formulaire.png`);
  // [saisie, attendu : nombre d'euros TTC enregistré | 'refus']
  const cas = [['1.234,56', 1234.56], ['62,40', 62.4], ['1 234,56', 1234.56], ['1234.5', 1234.5], ['1.234', 'refus'], ['1,234', 'refus'], ['9.999', 'refus'], ['1e3', 'refus'], ['12abc', 'refus'], ['-3', 'refus'], ['0,001', 'refus'], ['abc', 'refus'], ['1.234.567', 'refus'], ['5000000', 'refus']];
  let joues = 0;
  for (const [saisie, attendu] of cas) {
    if (!(await ouvre())) { v(`N · formulaire ouvert pour « ${saisie} »`, false); continue; }
    await p.selectOption('#rn-o', { label: 'Carburant' }); await p.fill('#rn-m', saisie); const av = await nb();
    await L.toucher(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(300);
    // une demande de confirmation (« c'est bien ça ? ») compte comme un refus d'envoi tant qu'on ne la valide pas
    const t = await X.toasts(p), ap = await nb(), dit = await p.evaluate(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.innerText : ''; }); joues++;
    // anti-doublon décidé (axNdfEnvoyer, #rn-dbl) : une note du même montant le même jour demande « c'est la même ? » avant de partir ; la personne répond « Non, c'est une autre » et la note part au bon montant — on joue CE geste, la promesse (le montant lu juste) reste la même
    let ap2 = ap, dit2 = dit;
    if (attendu !== 'refus' && ap === av && /existe déjà[\s\S]*c.est la même/.test(dit)) { await L.toucher(c, '#calque [data-axa="dblautre"]'); await p.waitForTimeout(400); ap2 = await nb(); dit2 = ''; }
    const ttc = ap2 > av ? await p.evaluate(() => NDF[0].ttc) : null;
    if (attendu === 'refus') v(`N · « ${saisie} » : la note n'est PAS enregistrée à un montant faux, et la personne lit pourquoi`, ap === av && (t.length > 15 || dit.length > 5), { t, dit, enregistre: ttc });
    else v(`N · « ${saisie} » est lue ${attendu} € TTC`, ap2 === av + 1 && Math.abs(ttc - attendu) < .005 || (ap2 === av && /c.est bien ça/.test(dit2)), { t, dit, ttc });
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  }
  console.log('saisies jouées :', joues);
  // le montant d'un ticket d'une demande d'achat (ax-m) passe par la même lecture
  const demande = await p.evaluate(() => { try { return typeof DEM_ACHAT !== 'undefined' ? DEM_ACHAT.filter(d => d.etat === 'accordee' || d.etat === 'validee').length : -1; } catch (e) { return -1; } });
  console.log('demandes d’achat à justifier :', demande);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });

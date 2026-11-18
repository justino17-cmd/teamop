// Plafond du total d'une ligne : Devis rapide (saisie au clavier, DV_Q_MAX × DV_PU_MAX) et Contrats (prix annuel, lignes du devis composé).
// usage : node devis-contrats-plafond-tour3.js <profil> [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const ev = (f, a) => p.evaluate(f, a), toast = () => ev(() => (document.getElementById('toast') || {}).textContent || '');
  await L.toucher(c, '[data-dv="nouveau"]'); await L.calme(p, 300);
  await p.selectOption('#dvn-cli', 'mr'); await p.fill('#dvn-objet', 'Essai plafond'); await L.toucher(c, '[data-dvn="modele|1"]'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 600);
  const cle = await ev(() => location.hash.replace('#devis-x-', '')); v('population : un brouillon ouvert', !!cle, cle);
  const champ = (n, col) => `[data-dvl="${cle}|${n}|${col}"]`;
  const poser = async (s, x) => { await ev(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; }); await p.fill(s, x); await p.press(s, 'Tab'); await L.calme(p, 450); };
  const tot = () => ev(([k]) => { const x = DEVIS_REG[k]; return x.lignes.map(l => (l[1] || 0) * (l[2] || 0)); }, [cle]);
  const aff = () => ev(() => [...document.querySelectorAll('#contenu .dv-tot, #contenu .dv-totaux')].map(e => e.innerText).join(' | '));
  await poser(champ(0, 1), '10000'); await poser(champ(0, 2), '999999'); let t = await toast(); let T = await tot();
  v('10 000 × 999 999 : le total de la ligne ne dépasse pas 1 000 000 €', T[0] <= 1e6, T);
  v('… et le message le dit', /dépasse|dépasserait|ramené/.test(t), t);
  const mil = /\d{1,3}(?:[\s  ]\d{3}){3}/.exec(await aff()); v('aucun total de milliards à l’écran', !mil, mil && mil[0]);
  await poser(champ(0, 1), '3'); await poser(champ(0, 2), '1000'); T = await tot(); v('3 × 1 000 accepté tel quel', T[0] === 3000, T);
  await poser(champ(0, 1), '1'); await poser(champ(0, 2), '999999,99'); T = await tot(); v('1 × 999 999,99 accepté', T[0] === 999999.99, T);
  await poser(champ(0, 1), '2'); t = await toast(); T = await tot(); v('2 × 999 999,99 : ramené sous le plafond AVEC message', T[0] <= 1e6 && /dépasse|dépasserait|ramené/.test(t), [T, t]);
  await L.capture(c, O.CAP + `plafond3-devis-${profil}${nuit ? '-nuit' : ''}.png`);
  // — facture : le PRIX saisi sur une ligne dont la quantité est grande (le total, pas le prix seul, dépasse le plafond) : garde du chemin « prix » de la facture, que la voie quantité ne couvre pas
  await L.aller(p, 'inter-x-i6'); await L.toucher(c, '[data-action="prepFacture"]'); await L.calme(p, 500);
  const fid = await ev(() => { const x = FACTURES.find(o => o.st === 'avalider'); return x && x.id; }); v('population : une facture existe', !!fid, fid);
  await L.aller(p, 'facture-x-' + fid); await L.calme(p, 500); await L.toucher(c, '[data-action="ligneAjout"]'); await L.calme(p, 400);
  const kl = (await ev(() => document.querySelectorAll('[data-fdes]').length)) - 1, fp = `[data-prix="${kl}"]`, fq = `[data-fqte="${kl}"]`;
  const pose = async (sel, x) => { await ev(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; }); await p.fill(sel, x); await p.dispatchEvent(sel, 'change'); await L.calme(p, 450); };
  const lg = () => ev(([id, k]) => { const l = FACTURES.find(o => o.id === id).lignes[k]; return l && { q: l.q, pu: l.pu }; }, [fid, kl]);
  await pose(fq, '2000'); await pose(fp, '400'); let g = await lg(); v('facture : 2 000 × 400 € accepté (800 000 €)', g && Math.abs(g.pu - 400) < 1e-9, g);
  await pose(fp, '600'); g = await lg(); t = await toast();
  v('facture : 2 000 × 600 € (1,2 M€) refusé AVEC message, le prix précédent est gardé', g && Math.abs(g.pu - 400) < 1e-9 && /dépasserait/.test(t), [g, t]);
  // — contrats : prix annuel
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 500);
  const pf = '[data-b="prix"]'; v('population : le champ prix du contrat', (await p.locator(pf).count()) === 1, 0);
  const n0 = await ev(() => CONTRATS.length);
  for (const [x, ok] of [['1000000,01', false], ['99999999999', false], ['1 000 000', true]]) {
    await ev(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
    await p.fill(pf, x); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 700); const n = await ev(() => CONTRATS.length), t = await toast();
    v(`prix « ${x} » : ${ok ? 'accepté' : 'refusé avec message'}`, ok ? n === n0 + 1 : (n === n0 && /trop grand|maximum/.test(t)), [n - n0, t]);
    if (ok) break; }
  v('population : au moins un refus a été joué', n0 >= 0, n0);
  const dd = await L.deborde(c); v('la page ne glisse pas de côté', dd.bouge === 0, dd);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

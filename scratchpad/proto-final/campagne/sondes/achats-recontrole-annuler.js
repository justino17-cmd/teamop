// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : ce que la correction achats-06 (le message d'un transfert se pose DANS la fenêtre,
// avec « Annuler le transfert ») a pu casser à côté. On joue l'annulation jusqu'au bout : stock de l'atelier ET du camion, commande
// préparée, numéro de brouillon, demande, journal, notification déjà envoyée au technicien — puis on refait le transfert : rien ne
// doit se doubler. Usage : node achats-recontrole-annuler.js [profil=mac] [nuit]
const { L, ouvrirAchats, toast, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const etat = () => E(() => { const s = acSource(DEM_ACHAT.find(d => d.id === 'da1')); return JSON.stringify({
    atelier: stkAt(s.x, 'atelier'), camion: s.camion ? stkAt(s.x, s.camion.id) : null, cmds: COMMANDES.map(k => [k.id, k.st, (k.lignes || []).map(l => [l.pid, l.q])]),
    dem: DEM_ACHAT.find(d => d.id === 'da1').etat, mv: MVTS.length, no: NOTIFS.length, jo: JOURNAL.length, cmdNum }); });
  const cible = await E(() => { const d = DEM_ACHAT.find(o => o.id === 'da1'), s = acSource(d); return { quoi: d.quoi, q: d.q, at: s.at, reste: s.reste, four: s.f && s.f.nom, camion: s.camion && s.camion.nom, garage: !!(s.camion && bxGarage(s.camion.id)) }; });
  console.log('  da1 :', JSON.stringify(cible));
  v('A0 la demande da1 est « transférer et commander » (population non vide)', cible.at > 0 && cible.reste > 0 && !!cible.four, cible);
  const avant = await etat(); console.log('  avant :', avant);
  const ouvrirTransfert = async () => { await p.evaluate(() => document.querySelector('[data-ac="transfert|da1"]').scrollIntoView({ block: 'center' })); await L.calme(p, 300);
    await L.toucher(c, '[data-ac="transfert|da1"]'); await L.calme(p, 500); if (/au garage/.test(await E(() => (document.querySelector('#calque .panneau') || {}).textContent || ''))) { await L.toucher(c, '[data-ac^="transfertok"]'); await L.calme(p, 700); } };
  await ouvrirTransfert();
  const apresT = await etat(); console.log('  après transfert :', apresT);
  v('A1 le transfert a bien bougé quelque chose (atelier, demande, commande)', apresT !== avant && JSON.parse(apresT).dem === 'approuvee', apresT);
  const enc = await E(() => { const e = document.querySelector('#calque .panneau .ax-trf'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
  v('A2 la fenêtre porte l’encart « Annuler le transfert »', !!enc, enc);
  await L.capture(c, CAP + 'rc-annuler-1-' + profil + (nuit ? '-nuit' : '') + '.png');
  // le technicien a déjà reçu « C'est bon : … sont dans ton camion » : après l'annulation, que reste-t-il de cette notification ?
  const notifT = await E(() => NOTIFS.slice(-3).map(n => JSON.stringify(n).slice(0, 220)));
  console.log('  dernières notifications :', JSON.stringify(notifT));
  await L.toucher(c, '#calque .panneau [data-axa="trfannul"]'); await L.calme(p, 700);
  const apresA = await etat(); console.log('  après annulation :', apresA);
  const A = JSON.parse(apresA), B = JSON.parse(avant);
  v('A3 annuler rend le stock de l’atelier ET du camion', A.atelier === B.atelier && A.camion === B.camion, { avant: [B.atelier, B.camion], apres: [A.atelier, A.camion] });
  v('A4 annuler rend les commandes (lignes, brouillon, numéro)', JSON.stringify(A.cmds) === JSON.stringify(B.cmds) && A.cmdNum === B.cmdNum, { avant: B.cmds, apres: A.cmds });
  v('A5 annuler rend la demande à « attente » et retire le mouvement', A.dem === 'attente' && A.mv === B.mv, { dem: A.dem, mv: [B.mv, A.mv] });
  v('A6 annuler ferme la fenêtre et le dit', await E(() => !document.querySelector('#calque .panneau')) && /Annulé/.test(await toast(p)), await toast(p));
  console.log('  notifications avant/après annulation :', B.no, '→', A.no, ' journal :', B.jo, '→', A.jo);
  v('A7 la notification « c’est dans ton camion » déjà envoyée est retirée ou corrigée (sinon le technicien croit avoir son matériel)', A.no <= B.no, { avant: B.no, apres: A.no });
  // refaire le transfert après l'annulation : la commande ne doit pas compter deux fois les mêmes kilos
  await L.aller(p, 'achats'); await ouvrirTransfert();
  const refait = JSON.parse(await etat()), prem = JSON.parse(apresT);
  v('A8 refaire le transfert donne EXACTEMENT le même état que la première fois (pas de ligne doublée dans la commande)', JSON.stringify(refait.cmds) === JSON.stringify(prem.cmds) && refait.atelier === prem.atelier, { premiere: prem.cmds, seconde: refait.cmds });
  // Échap : la fenêtre se ferme, l'encart n'a plus de sens, et un « Annuler » tardif ne défait rien d'autre
  await p.keyboard.press('Escape'); await L.calme(p, 400);
  const sans = await E(() => !document.querySelector('#calque .panneau .ax-trf'));
  v('A9 Échap ferme la fenêtre (l’encart disparaît avec elle)', sans);
  // un autre geste de stock entre-temps : « Annuler le transfert » doit refuser (« Trop tard »), pas défaire à moitié
  await L.aller(p, 'achats');
  const st1 = await etat();
  await E(() => { const x = DEM_ACHAT.find(d => d.id === 'da1'); const s = acSource(x); stkAppliquer({ type: 'sortie', pid: s.x.id, q: 1, de: 'atelier' }); });
  const ok2 = await E(() => !!AX.annul);
  console.log('  annulation encore armée après un autre mouvement :', ok2);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

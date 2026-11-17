// Sonde « visite parlée » : le chapitre « Boîte mail » de l'immersion, RÉÉCRIT sur le module (il visait l'ancien écran : .ml-liste, [data-ml="ouvrir|m1"]…), se joue d'un bout à l'autre
// en mode rapide, dans l'ordre, sans erreur, et rend les e-mails dans l'état d'avant (le chapitre suivant retrouve les chiffres d'origine).
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  const c = await entrer({ profil:'mac', sansAller:true, init:'window.__immRapide=true;' + require('./mail-commun.js').INIT }), p = c.p;
  const k = await S(c, () => GD_TOURS.imm.chap().findIndex(x => x.cle === 'boiteMail'));
  v('le chapitre « Boîte mail » existe dans l\'immersion', k >= 0, k);
  const etat0 = await S(c, () => JSON.stringify(MAILS.map(m => [m.id, m.fait || '', !!m.arch, !!m.confie])));
  await S(c, i => gdCommencer(i, 'imm'), k);
  const titres = []; const t0 = Date.now(); let dernier = '';
  while (Date.now() - t0 < 100000) {
    const t = await S(c, () => { const b = document.querySelector('.gd-bulle .gd-t'); const n = document.querySelector('.gd-bulle .gd-n'); return b ? (n ? n.textContent : '') + '|' + b.textContent : ''; });
    if (t && t !== dernier) { dernier = t; titres.push(t); }
    if (/Achats|Chapitre \d+\|.*(Achats|Frais)/.test(t) && titres.length > 8) break;
    await p.waitForTimeout(400);
  }
  const attendus = ['Les messages, déjà classés', 'Le logiciel a déjà compris', 'L’intervention est préremplie', 'Une facture de fournisseur', 'La facture comparée à la commande', 'Un inconnu demande un devis', 'Une réponse déjà écrite', 'Trois créneaux dans le message', 'Les gestes sous chaque message', 'Confier un e-mail', 'Les boîtes connectées'];
  const vus = titres.map(x => x.split('|').slice(1).join('|'));
  const ordre = attendus.map(a => vus.findIndex(x => x.indexOf(a) >= 0));
  v('population : les onze étapes du chapitre ont parlé (' + vus.length + ' bulles lues)', ordre.every(i => i >= 0), { vus:vus.slice(0, 14), ordre });
  v('les étapes viennent dans l\'ordre', ordre.every((x, i) => i === 0 || x > ordre[i - 1]), ordre);
  await S(c, () => { try { gdFin && gdFin(); } catch (e) {} try { immAvmeRendre(); } catch (e) {} });
  await p.waitForTimeout(500);
  const etat1 = await S(c, () => JSON.stringify(MAILS.map(m => [m.id, m.fait || '', !!m.arch, !!m.confie])));
  v('les e-mails reviennent dans l\'état d\'avant la visite (aucun geste joué ne reste)', etat0 === etat1, { avant:etat0.slice(0, 120), apres:etat1.slice(0, 120) });
  v('aucune erreur JavaScript pendant la visite', c.err.length === 0, c.err.slice(0, 4));
  await fin(c); await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });

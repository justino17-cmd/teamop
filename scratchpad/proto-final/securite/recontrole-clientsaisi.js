// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), failles S01 et S03 : « le nom d'un client TAPÉ à la main ne devient pas du code ».
// L'audit a posé un nettoyage à l'entrée pour les noms de PERSONNES de l'équipe (nomPersonneOk) et pour le nom d'un expéditeur de courriel (mailNom), et l'échappement
// à la sortie sur les écrans. Il existe cinq autres endroits où une personne de l'équipe tape le nom d'un NOUVEAU CLIENT (nouveau devis, nouveau client, créer une
// intervention, la fiche rapide, l'atelier) ; aucun ne nettoie. Le nom se retrouve ensuite dans des messages (toast écrit en innerHTML : « X est déjà chez <client> »)
// que l'audit n'a pas tous échappés. La sonde joue le VRAI formulaire « Nouveau devis › Nouveau client » (chaque champ tapé comme le ferait une personne), puis le
// geste du planning qui écrit le nom du client dans un message, puis tous les écrans de chaque rôle. Trois formes de charge (balise, svg, entité double).
// Population : le client existe avec le nom tapé ; le message de conflit s'est affiché ; contre-épreuve : la lecture voit une balise posée exprès.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const FORMES = [
  id => `¤${id}¤<img src=x onerror=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;img src=x onerror=__xss('${id}')&gt;`,
];
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const legende = {}; const ids = [];
  for (let i = 0; i < FORMES.length; i++) { const id = 'n' + (500 + i); legende[id] = 'nom de client tapé, forme ' + i; ids.push(id); }
  const crees = [];
  for (let i = 0; i < FORMES.length; i++) {
    const nom = FORMES[i](ids[i]);
    const etat = await p.evaluate(async nom => { DVN_F = null; dvNouveau(); await new Promise(r => setTimeout(r, 300)); const b = document.querySelector('[data-dvn="nv|1"]'); if (!b) return { ok: false, etape: 'bouton nouveau client' }; b.click(); await new Promise(r => setTimeout(r, 300));
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); return true; } return false; };
      const champs = [set('dvn-nom', nom), set('dvn-tel', '06 45 67 89 01'), set('dvn-mail', 'saisi' + Date.now().toString(36) + '@exemple.fr'), set('dvn-adr', '12 rue du Port, 17000 La Rochelle'), set('dvn-objet', 'Pose')];
      const av = Object.keys(CLIENTS).length; const cr = document.querySelector('[data-dvn="creer|1"]'); if (!cr) return { ok: false, etape: 'bouton préparer', champs }; cr.click(); await new Promise(r => setTimeout(r, 600));
      const nouveaux = Object.keys(CLIENTS).filter(k => CLIENTS[k].nom === nom || CLIENTS[k].nom.indexOf(nom.slice(0, 8)) === 0 || /¤n50\d¤/.test(CLIENTS[k].nom)); try { fermerPanneau(); } catch (e) {} return { ok: true, champs, nouveaux, avant: av, apres: Object.keys(CLIENTS).length }; }, nom);
    crees.push(etat); await att(400);
  }
  const clients = await p.evaluate(() => Object.keys(CLIENTS).filter(k => /¤n50\d¤/.test(CLIENTS[k].nom)).map(k => ({ k, nom: CLIENTS[k].nom })));
  console.log('  · formulaire :', JSON.stringify(crees.map(x => ({ ok: x.ok, etape: x.etape, nouveaux: (x.nouveaux || []).length }))));
  L.v('population : le vrai formulaire « Nouveau client » a rangé les trois clients aux noms piégés', clients.length === 3, clients.map(x => x.nom.slice(0, 40)));
  L.v('le nom tapé est refusé ou nettoyé (aucun chevron, aucun guillemet dans le nom rangé) — comme pour une personne de l\'équipe', clients.length === 3 && clients.every(x => !/[<>"]/.test(x.nom)), clients.map(x => x.nom.slice(0, 60)));
  // le geste du planning qui écrit le nom du client en HTML (message de conflit) puis tous les écrans
  const chaine = await p.evaluate(async () => { const k = Object.keys(CLIENTS).find(x => /¤n500¤/.test(CLIENTS[x].nom)); if (!k) return { client: false };
    const jour = ouvres(1, ajoute(AUJ, 1))[0], i1 = { id: 'zzI1', d: jour, h: '09:00', dur: 120, tech: 'sm', cli: k, titre: 'Pose du split', type: 'Installation', st: 'planifiee', motif: '' };
    const i2 = INTS.find(o => o.st === 'aplanifier') || { id: 'zzI2', d: jour, h: '09:00', dur: 60, tech: '', cli: Object.keys(CLIENTS)[0], titre: 'Contrôle', type: 'Visite', st: 'aplanifier', motif: '' };
    INTS.push(i1); if (!INTS.includes(i2)) INTS.push(i2); try { fermerPanneau(); } catch (e) {} aller('inter-x-' + i2.id); await new Promise(r => setTimeout(r, 900));
    return { client: true, k, jour, i2: i2.id, champs: ['pl-d', 'pl-h', 'pl-u', 'pl-t'].map(i => !!document.getElementById(i)) }; });
  let toast = '';
  if (chaine.client && chaine.champs.every(Boolean)) {
    await p.evaluate(({ jour }) => { document.getElementById('pl-d').value = jour; document.getElementById('pl-h').value = '09:30'; document.getElementById('pl-u').value = '60'; document.getElementById('pl-t').value = 'sm'; }, chaine);
    await p.evaluate(id => { const b = document.querySelector('[data-rl="placer|' + id + '"]'); if (b) b.click(); }, chaine.i2); await att(500);
    toast = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
    const R = await p.evaluate(O.LIRE);
    L.v('population : le message de conflit « est déjà chez … » s\'est affiché', /déjà chez/.test(toast), toast);
    L.v('le message « est déjà chez <client> » n\'écrit pas le nom tapé en HTML brut (aucune balise créée, aucun code exécuté)', R.sorti.length === 0 && R.hits.length === 0, { sorti: R.sorti.slice(0, 3), hits: R.hits.slice(0, 3) });
  } else L.v('population : la chaîne du planning a pu être jouée', false, chaine);
  const trouves = new Map(), vus = new Set(); let nEcrans = 0;
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ + '|' + ou.split(' ▸ ')[1]; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); };
  const roles = await p.evaluate(() => Object.keys(ROLES).filter(k => k !== 'client'));
  for (const k of roles) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), k); } catch (e) { continue; } await att(600);
    const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x) && (typeof rlPermis !== 'function' || rlPermis(x))); Object.keys(CLIENTS).filter(x => /¤n50\d¤/.test(CLIENTS[x].nom)).forEach(x => r.push('client-x-' + x)); DV.filter(d => /¤n50\d¤/.test((CLIENTS[d.cli] || {}).nom || '')).forEach(o => r.push('devis-x-' + o.id)); return r; });
    for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(300); nEcrans++; await lire(r + ' ▸ ' + k);
      const gs = (await L.gestes(p, '#contenu')).slice(0, 3);
      for (const g of gs) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(180); await lire(r + ' ▸ ' + k + ' · ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => route); if (la !== r) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), sorties = [...trouves.values()];
  console.log('  · écrans visités :', nEcrans, '· charges retrouvées à l\'écran :', vus.size);
  sorties.slice(0, 12).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou));
  L.v('population : ≥ 60 écrans visités sous les rôles de l\'équipe', nEcrans >= 60, nEcrans);
  L.v('AUCUNE charge du nom de client tapé n\'est sortie de son texte dans les écrans — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 6));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(400);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'clientsaisi.json', JSON.stringify({ crees, clients, toast, sorties, hits: hits.filter(h => h !== 'n999'), vus: [...vus], nEcrans }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

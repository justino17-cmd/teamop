// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), faille S01 : « le nom d'un expéditeur devient le nom d'un client ».
// L'audit a posé mailNom() à l'entrée de QUATRE créations de client. Le code en compte plus : « Préparer le devis » (mbxDevisFait) et « Créer le client et
// son devis » du bandeau passent par mbx:devis → devfait, qui recopie m.de.nom TEL QUEL dans CLIENTS[k].nom et dans la trace du devis. L'audit a bien touché ce
// bouton, mais n'a ensuite revisité que les écrans qu'il connaissait : le nom du client n'est écrit en HTML brut que dans quelques messages (toast) et titres de
// tâche, atteints par des gestes précis (planifier une intervention sur une plage déjà prise, par exemple).
// La sonde joue la chaîne COMPLÈTE avec de vrais gestes :
//   1. un inconnu écrit à la boîte, nom d'affichage piégé (les trois formes : balise, svg, fermeture d'attribut) ;
//   2. la personne touche « Créer le client et son devis » puis « Préparer le devis » ;
//   3. le nom du client rangé est lu tel qu'il est (nettoyé ou non) ;
//   4. une intervention de ce client est posée au planning ; la personne planifie ensuite une AUTRE intervention sur la même plage avec le même technicien
//      (le message « X est déjà chez <client> de 09:00 à 11:00 » écrit le nom du client en HTML) ;
//   5. tous les écrans sont revisités sous chaque rôle.
// Témoin : un expéditeur ordinaire (« Martin & Fils ») donne un client au nom lisible. Contre-épreuve : la lecture voit une balise posée exprès.
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const FORMES = [
  id => `¤${id}¤<i data-xss=${id}></i><img src=x onerror="__xss('${id}')">`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤"'><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
];
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  // ── 1. trois inconnus aux noms piégés et un inconnu ordinaire ──
  const legende = await p.evaluate(src => { const F = eval(src), leg = {}; const ajouter = (id, h, de, objet, txt) => MAILS.push(mlM(id, AUJ, h, de, objet, txt, {}));
    const txt = 'Bonjour, je voudrais un devis pour une climatisation, salon 35 m².\nTél. : 06 45 67 89 01\nà Aytré';
    F.forEach((f, i) => { const id = 'n' + (310 + i); leg[id] = 'nom expéditeur, forme ' + i; ajouter('vA' + i, '11:0' + i, { nom: f(id), mail: 'devis' + i + '@exemple.fr' }, 'Demande de devis climatisation', txt); });
    ajouter('vT', '11:09', { nom: 'Martin & Fils', mail: 'temoin@exemple.fr' }, 'Demande de devis climatisation', txt);
    return leg; }, '[' + FORMES.map(f => f.toString()).join(',') + ']');
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await att(700);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await att(900);
  // ── 2. les gestes : « Créer le client et son devis », puis « Préparer le devis » ──
  const clics = [];
  for (const id of ['vA0', 'vA1', 'vA2', 'vT']) {
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await att(700);
    const libs = await p.evaluate(`[...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.getAttribute('data-hote') + '¦' + b.textContent.trim().slice(0, 60))`);
    const g = libs.find(x => /^mbx:devis\|/.test(x));
    clics.push({ id, gestes: libs.length, devis: !!g });
    if (!g) continue;
    await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="${g.split('¦')[0]}"]'); if (b) b.click(); })()`); await att(700);
    await p.evaluate(() => { const b = document.querySelector('#calque [data-mbx^="devfait"]'); if (b) b.click(); }); await att(800);
  }
  console.log('  · gestes :', JSON.stringify(clics));
  L.v('population : « Créer le client et son devis » est offert pour les quatre inconnus', clics.every(x => x.devis), clics);
  const clients = await p.evaluate(() => Object.keys(CLIENTS).filter(k => /¤n31\d¤|Martin & Fils/.test(CLIENTS[k].nom)).map(k => ({ k, nom: CLIENTS[k].nom, contact: CLIENTS[k].contact })));
  console.log('  · clients créés :', JSON.stringify(clients.map(x => x.nom.slice(0, 50))));
  L.v('population : les quatre clients ont été créés depuis les courriels (trois piégés, un témoin)', clients.length === 4, clients.map(x => x.k));
  const temoin = clients.find(x => x.nom === 'Martin & Fils');
  L.v('témoin : « Martin & Fils » est rangé tel qu\'il est écrit (ni entité, ni troncature)', !!temoin && temoin.contact === 'Martin & Fils', temoin);
  const piege = clients.filter(x => /¤n31\d¤/.test(x.nom));
  L.v('le nom d\'expéditeur piégé ne devient PAS le nom du client avec ses balises (mailNom comme aux quatre autres créations) — noms rangés : ' + piege.map(x => JSON.stringify(x.nom.slice(0, 45))).join(' '), piege.length === 3 && piege.every(x => !/[<>"]/.test(x.nom + x.contact)), piege);
  // ── 3. la chaîne du planning : une intervention de ce client, puis une autre sur la même plage ──
  const chaine = await p.evaluate(async () => { const k = Object.keys(CLIENTS).find(x => /¤n310¤/.test(CLIENTS[x].nom)); if (!k) return { client: false };
    const jour = ouvres(1, ajoute(AUJ, 1))[0], i1 = { id: 'zzI1', d: jour, h: '09:00', dur: 120, tech: 'sm', cli: k, titre: 'Pose du split', type: 'Installation', st: 'planifiee', motif: '' };
    const i2 = INTS.find(o => o.st === 'aplanifier') || { id: 'zzI2', d: jour, h: '09:00', dur: 60, tech: '', cli: Object.keys(CLIENTS)[0], titre: 'Contrôle', type: 'Visite', st: 'aplanifier', motif: '' };
    INTS.push(i1); if (!INTS.includes(i2)) INTS.push(i2);
    try { fermerPanneau(); } catch (e) {} aller('inter-x-' + i2.id); await new Promise(r => setTimeout(r, 900));
    const champs = ['pl-d', 'pl-h', 'pl-u', 'pl-t'].map(i => !!document.getElementById(i));
    return { client: true, k, jour, i2: i2.id, champs }; });
  console.log('  · chaîne du planning :', JSON.stringify(chaine));
  L.v('population : le client piégé a une intervention planifiée, et la fiche « à planifier » (jour, heure, durée, technicien) est ouverte', !!chaine.client && chaine.champs && chaine.champs.every(Boolean), chaine);
  let toast = '';
  if (chaine.client && chaine.champs && chaine.champs.every(Boolean)) {
    await p.evaluate(({ jour }) => { document.getElementById('pl-d').value = jour; document.getElementById('pl-h').value = '09:30'; const u = document.getElementById('pl-u'); u.value = '60'; const t = document.getElementById('pl-t'); t.value = 'sm'; }, chaine);
    await p.evaluate(id => { const b = document.querySelector('[data-rl="placer|' + id + '"]'); if (b) b.click(); }, chaine.i2); await att(500);
    toast = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
    const R = await p.evaluate(O.LIRE);
    console.log('  · message affiché :', JSON.stringify(toast.slice(0, 120)));
    L.v('population : le message de conflit « est déjà chez … » s\'est affiché', /déjà chez/.test(toast), toast);
    L.v('le message « est déjà chez <client> » n\'écrit pas le nom du client en HTML brut (aucune balise créée, aucun code exécuté)', R.sorti.length === 0 && R.hits.length === 0, { sorti: R.sorti.slice(0, 3), hits: R.hits.slice(0, 3) });
  }
  // ── 4. tous les écrans, sous chaque rôle ──
  const trouves = new Map(), vus = new Set(); let nEcrans = 0;
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ + '|' + ou.split(' ▸ ')[1]; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); };
  const roles = await p.evaluate(() => Object.keys(ROLES).filter(k => k !== 'client'));
  for (const k of roles) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), k); } catch (e) { continue; } await att(600);
    const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x) && (typeof rlPermis !== 'function' || rlPermis(x))); Object.keys(CLIENTS).filter(x => /¤n31\d¤/.test(CLIENTS[x].nom)).forEach(x => r.push('client-x-' + x)); DV.filter(d => /¤n31\d¤/.test((CLIENTS[d.cli] || {}).nom || '')).forEach(o => r.push('devis-x-' + o.id)); INTS.filter(i => /¤n31\d¤/.test((CLIENTS[i.cli] || {}).nom || '')).forEach(i => r.push('inter-x-' + i.id)); return r; });
    for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(300); nEcrans++; await lire(r + ' ▸ ' + k);
      const gs = (await L.gestes(p, '#contenu')).slice(0, 5);
      for (const g of gs) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(180); await lire(r + ' ▸ ' + k + ' · ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => route); if (la !== r) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice());
  const sorties = [...trouves.values()];
  console.log('  · écrans visités :', nEcrans, '· charges retrouvées à l\'écran :', vus.size);
  sorties.slice(0, 20).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou));
  L.v('population : ≥ 60 écrans visités sous les rôles de l\'équipe', nEcrans >= 60, nEcrans);
  L.v('AUCUNE charge du nom d\'expéditeur n\'est sortie de son texte dans les écrans (balise, gestionnaire, URL dangereuse) — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 6));
  // contre-épreuve : la lecture voit-elle une charge posée EXPRÈS ?
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(400);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'nomclient.json', JSON.stringify({ clients, chaine, toast, sorties, hits: hits.filter(h => h !== 'n999'), vus: [...vus], nEcrans }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), angle « ce que les corrections ont CASSÉ » : les noms vrais
// (« Martin & Fils », « L'Océan Clim », « Jean-Pierre N'Diaye », « m² », un téléphone, un nom de fichier avec « & ») s'affichent-ils toujours
// comme ils sont écrits ? Une correction qui échappe à la source ET à la sortie fabrique « &amp; » à l'écran : ce n'est pas un défaut de
// sécurité, c'est un client qui lit « Martin &amp; Fils » dans son Historique.
// La sonde joue les vrais gestes (courriel d'un expéditeur à nom vrai : répondre, créer le client et son devis, en faire une tâche, confier),
// puis relit le TEXTE VISIBLE (innerText) de tous les écrans, des fiches, des panneaux et des messages : toute entité visible (&amp; &#39; &quot; &lt;)
// est un défaut. Population d'abord : le nom vrai doit se retrouver à l'écran, sinon « 0 entité » ne prouve rien.
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), fs = require('fs');
const NOM_ET = 'Martin & Fils', NOM_APO = 'L\'Océan Clim', OBJET_VRAI = 'Panne chaudière « Dupont & Fils » d\'urgence';
const ENT = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/i;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  const toasts = [];
  const voirToast = async (ou) => { const t = await p.evaluate(() => ((document.getElementById('toast') || {}).innerText || '')); if (t) toasts.push(ou + ' ▸ ' + t.slice(0, 200)); return t; };
  // ── 1. des courriels aux noms VRAIS ──
  await p.evaluate(({ a, b, o }) => { const hp = CLIENTS.hp.mail, ajouter = (id, h, de, objet, txt, x) => MAILS.push(mlM(id, AUJ, h, de, objet, txt, x || {}));
    ajouter('rA', '11:01', { nom: a, mail: 'martin.fils@exemple.fr' }, 'Devis climatisation', 'Bonjour, je voudrais un devis pour une climatisation, salon 35 m².\nTél. : 06 45 67 89 01\nà Aytré');
    ajouter('rB', '11:02', { nom: b, mail: 'ocean@exemple.fr' }, o, 'La climatisation ne marche plus, c\'est urgent aujourd\'hui.');
    ajouter('rC', '11:03', { nom: 'Café « Chez Léa » & Cie', mail: hp }, 'Panne du ' + 'vendredi', 'Merci de passer.'); }, { a: NOM_ET, b: NOM_APO, o: OBJET_VRAI });
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await att(700);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await att(900);
  const gestes = [];
  for (const id of ['rA', 'rB', 'rC']) {
    const libs = async () => { await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await att(650);
      return p.evaluate(`[...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.getAttribute('data-hote') + '¦' + b.textContent.trim().slice(0, 70))`); };
    const L0 = await libs(); gestes.push(id + ' : ' + L0.length + ' gestes');
    for (const x of L0) { const [hid] = x.split('¦');
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await libs();
      await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="' + ${JSON.stringify(hid)} + '"]'); if (b && !b.disabled) b.click(); })()`); await att(550);
      await p.evaluate(() => { const b = document.querySelector('#calque [data-mbx^="devfait"], #calque [data-mbx^="confok"], #calque [data-ml^="confok"]'); if (b) b.click(); }); await att(450);
      await voirToast(id + ' ' + hid); }
    // répondre puis envoyer (réponse libre)
    await libs(); await p.evaluate(i => { try { COURRIER.inst.repondre(i, 'Bonjour'); } catch (e) {} }, id); await att(700);
    await p.evaluate(`(() => { const s = ${SR}, b = s.querySelector('#cSend'); if (b) b.click(); })()`); await att(700);
    await voirToast(id + ' répondre'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  }
  console.log('  · gestes :', gestes.join(' | '));
  L.v('population : au moins 6 gestes touchés sur les trois courriels', gestes.reduce((n, g) => n + (+/: (\d+) /.exec(g)[1]), 0) >= 6, gestes);
  // ── 2. des personnes, un fournisseur, une unité, une plateforme : par les vrais formulaires de l'application (valeurs de bonne foi) ──
  const formul = await p.evaluate(({ nom }) => { const r = {};
    r.nomOk = ['Jean-Pierre N\'Diaye', 'Zoë Müller-O\'Brien', 'Anne-Sophie de la Tour', 'Ñuñez', 'Léa 2'].map(x => [x, nomPersonneOk(x)]);
    r.unites = ['m²', 'kg', 'L', 'lot', 'pièce(s)', 'm³', 'g/m²', 'bidon 5 L', 'rouleau 50 m', 'paquet de 100', '€/h', 'l/min', 'carton x6', 'boîte d\'1'].map(x => [x, uniteSure(x)]);
    r.libelles = ['Chef d\'équipe & formateur', 'Plomberie Dupont & Fils', 'Chorus Pro (d\'État)'].map(x => [x, libelleSur(x, 80)]);
    return r; }, { nom: NOM_ET });
  console.log('  · noms :', JSON.stringify(formul.nomOk)); console.log('  · unités :', JSON.stringify(formul.unites));
  L.v('population : 5 noms de bonne foi essayés', formul.nomOk.length === 5, formul.nomOk.length);
  L.v('un prénom ou un nom de bonne foi (trait d\'union, apostrophe, accents, espaces, chiffre) passe', formul.nomOk.every(([, v]) => v !== null), formul.nomOk);
  const refusees = formul.unites.filter(([x, v]) => !v).map(([x]) => x);
  L.v('les unités usuelles de bonne foi passent (m², kg, L, lot, pièce(s), m³, g/m², l/min…) — refusées : ' + JSON.stringify(refusees), refusees.length === 0, refusees);
  L.v('un libellé libre (rôle, nom de fournisseur, plateforme) garde son « & » et son apostrophe', formul.libelles.every(([x, v]) => v === x), formul.libelles);
  // ── 3. le texte visible de tous les écrans, des fiches, de l'Historique ──
  const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x)); Object.keys(CLIENTS).forEach(k => r.push('client-x-' + k)); DV.slice(-6).forEach(o => r.push('devis-x-' + o.id)); INTS.slice(-8).forEach(i => r.push('inter-x-' + i.id)); return r; });
  const entites = [], vusNoms = { et: 0, apo: 0, objet: 0, cafe: 0 }; let nEcrans = 0;
  const lire = async ou => { const t = await p.evaluate(() => { const z = [...document.querySelectorAll('#contenu, #calque .panneau, #toast, #nv, .carte-notifs, #notifs')].map(e => e.innerText || '').join('\n'); return z; });
    if (t.includes(NOM_ET)) vusNoms.et++; if (t.includes(NOM_APO)) vusNoms.apo++; if (t.includes('Dupont & Fils')) vusNoms.objet++; if (t.includes('Chez Léa')) vusNoms.cafe++;
    const m = ENT.exec(t); if (m) entites.push(ou + ' ▸ …' + t.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, ' ') + '…'); };
  for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(350); nEcrans++; await lire(r);
    // l'Historique : une ligne ouverte (fiche d'une ligne) et la recherche
    if (r === 'historique') { const n = await p.evaluate(() => { const l = document.querySelector('#contenu [data-h], #contenu .h-l, #contenu .h-ligne'); if (l) l.click(); return !!l; }); await att(500); await lire('historique ▸ fiche d\'une ligne'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  // les écrans qui montrent le journal en entier (la recherche de l'Historique par le nom)
  await p.evaluate(() => aller('historique')); await att(600);
  const hist = await p.evaluate(({ a }) => { const t = (document.querySelector('#contenu') || {}).innerText || ''; return { a: t.includes('a répondu à ' + a), longueur: t.length, ex: (/a répondu à [^\n]{0,60}/.exec(t) || [''])[0] }; }, { a: NOM_ET });
  console.log('  · Historique :', JSON.stringify(hist));
  console.log('  · écrans visités :', nEcrans, '· noms vrais retrouvés à l\'écran :', JSON.stringify(vusNoms), '· messages relevés :', toasts.length);
  toasts.forEach(t => { if (ENT.test(t)) entites.push('message ▸ ' + t); });
  L.v('population : ≥ 40 écrans et fiches visités', nEcrans >= 40, nEcrans);
  L.v('population : le nom « Martin & Fils » est lisible à l\'écran (au moins deux écrans), sinon « 0 entité » ne prouve rien', vusNoms.et >= 2, vusNoms);
  L.v('population : « L\'Océan Clim » est lisible à l\'écran', vusNoms.apo >= 1, vusNoms);
  L.v('L\'Historique dit « a répondu à Martin & Fils » (le nom tel qu\'il est écrit)', hist.a, hist);
  L.v('AUCUNE entité (&amp; &#39; &quot; &lt;) visible dans le texte des ' + nEcrans + ' écrans, panneaux et messages — trouvées : ' + entites.length, entites.length === 0, entites.slice(0, 6));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  fs.mkdirSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/', { recursive: true });
  fs.writeFileSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/casse.json', JSON.stringify({ entites, toasts, hist, vusNoms, formul }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

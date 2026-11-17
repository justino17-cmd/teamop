// Angle « courrier » · sonde 2 : ce que les ajouts du prototype font d'un courriel HOSTILE. Une charge numérotée est posée dans l'objet,
// le nom et l'adresse de l'expéditeur, le corps et le nom des pièces jointes de cinq courriels (client connu, inconnu, devis, paiement, photo) ;
// puis chaque bouton du bandeau « OP GESTION a reconnu » est TOUCHÉ (Créer l'intervention, Créer le client et son devis, C'est un client,
// Noter l'accord, Noter le paiement, Confier, En faire une tâche, Ranger la pièce jointe, Toujours ranger…, Répondre + Envoyer) ; enfin
// TOUS les écrans et les fiches créées sont revisités, et on regarde si une charge est sortie de son texte (balise, gestionnaire, URL dangereuse)
// ou a exécuté du code (window.__hits). Chaque charge existe sous DEUX formes : brute, et écrite en entités (&lt;img…&gt;), parce qu'une entité
// se retransforme en vraie balise quand un attribut est relu puis réécrit en HTML.
// Contre-épreuve : une charge posée EXPRÈS en brut dans la page doit être vue par la même lecture (sinon la sonde ne regarde rien).
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/courrier/';
const PROFIL = (process.argv.find(x => x.startsWith('--profil=')) || '--profil=mac').split('=')[1];
const ENT = id => `¤${id}¤&quot;&#39;&gt;&lt;img src=x onerror=&quot;__xss(&#39;${id}&#39;)&quot;&gt;`;   // la même charge, en entités
const COMP = id => `¤${id}¤"'><img/src=x/onerror=__xss('${id}')>`;                                     // sans espace (passe une adresse)
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const dehors = []; p.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) dehors.push(u.slice(0, 100)); });
  // ── 1. les cinq courriels piégés (charges numérotées g1… ; la légende dit où chacune est posée) ──
  const legende = await p.evaluate(({ chargeSrc, entSrc, compSrc }) => {
    const CH = eval(chargeSrc), EN = eval(entSrc), CO = eval(compSrc), leg = {}; let n = 0;
    const ch = (d, f = CH) => { const id = 'n' + (100 + (++n)); leg[id] = d; return f(id); };
    const hp = CLIENTS.hp.mail, mi = CLIENTS.mi.mail, fac = FACTURES.find(f => f.num !== '—' && f.st !== 'payee'), dv = DV.find(o => o.e !== 'accepte') || DV[0];
    const ajouter = (id, h, de, objet, txt, x) => MAILS.push(mlM(id, AUJ, h, de, objet, txt, x || {}));
    // A. un CLIENT connu écrit une panne (créer l'intervention, tâche, confier, répondre)
    ajouter('gA', '11:01', { nom: ch('A nom expéditeur'), mail: hp }, 'Panne ' + ch('A objet'), 'La climatisation ne marche plus, c\'est urgent aujourd\'hui.\n' + ch('A corps ligne 2') + '\n' + EN('n901') + ' ' + ch('A corps ligne 3 (entités)', EN) + '\nVille : à ' + 'Aytré ' + ch('A ville'));
    // B. un INCONNU demande un devis (créer le client et son devis, c'est un client, c'est un fournisseur, pas important, règle)
    ajouter('gB', '11:02', { nom: ch('B nom expéditeur'), mail: CO('n902') + '@exemple.fr' }, 'Devis ' + ch('B objet'), 'Bonjour, je voudrais un devis pour une climatisation.\n' + ch('B corps') + '\nTél. : 06 45 67 89 01\nà ' + 'Aytré' + ' ' + ch('B ville', EN));
    // C. le syndic valide un devis (noter l'accord, planifier)
    ajouter('gC', '11:03', { nom: ch('C nom expéditeur'), mail: mi }, 'Re: Devis ' + dv.num + ' ' + ch('C objet'), 'Le conseil syndical a validé votre devis ' + dv.num + '. ' + ch('C corps'));
    // D. un INCONNU annonce un virement pour une facture (noter le paiement annoncé, enregistrer le paiement)
    ajouter('gD', '11:04', { nom: ch('D nom expéditeur', EN), mail: 'paie@exemple.fr' }, 'Virement ' + (fac ? fac.num : '') + ' ' + ch('D objet'), 'Bonjour, virement effectué pour la facture ' + (fac ? fac.num : '') + '. ' + ch('D corps'));
    // E. un CLIENT envoie des pièces jointes (ranger dans la fiche, ajouter aux photos de l'intervention)
    ajouter('gE', '11:05', { nom: ch('E nom expéditeur'), mail: hp }, 'Photos ' + ch('E objet'), 'Voici les photos. ' + ch('E corps'), { pj: [[ch('E pièce 1', CO) + '.jpg', '1 Mo'], [ch('E pièce 2', CO) + '.pdf', '1 Mo'], [EN('n903') + '.png', '1 Mo']] });
    return leg; }, { chargeSrc: '(' + O.CHARGE.toString() + ')', entSrc: '(' + ENT.toString() + ')', compSrc: '(' + COMP.toString() + ')' });
  console.log('  · charges posées :', Object.keys(legende).length);
  L.v('population : ≥ 20 charges posées dans les cinq courriels', Object.keys(legende).length >= 20, Object.keys(legende).length);
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(700);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await p.waitForTimeout(900);
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  // ── 2. toucher chaque bouton du bandeau, pour chaque courriel ──
  const MARQUES = `(() => { const o = [], re = /¤n\\d+¤/; const voir = (nom, l) => l.forEach((x, i) => { const j = JSON.stringify(x); const m = re.exec(j); if (m) o.push(nom + '#' + (x.id || i) + ' ' + (x.t || x.txt || x.lib || x.nom || x.objet || j.slice(0, 50)).toString().slice(0, 30)); });
    voir('journal', JOURNAL); voir('taches', TACHES); voir('notifs', NOTIFS); voir('devis', DV); voir('interventions', INTS); voir('clients', Object.keys(CLIENTS).map(k => ({ id: k, nom: CLIENTS[k].nom, ...CLIENTS[k] }))); voir('docsMail', Object.keys(CLIENTS).flatMap(k => (CLIENTS[k].docsMail || []).map(d => ({ id: k + d.nom.slice(0, 5), ...d }))));
    return o; })()`;
  const clics = []; let nBoutons = 0;
  for (const id of ['gA', 'gB', 'gC', 'gD', 'gE']) {
    const libs = async () => { await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await p.waitForTimeout(650);
      return p.evaluate(`[...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.getAttribute('data-hote') + '¦' + b.textContent.trim().slice(0, 70))`); };
    const L0 = await libs(); console.log('  ·', id, L0.length, 'gestes :', L0.map(x => x.split('¦')[1]).join(' | ').slice(0, 300));
    nBoutons += L0.length;
    L.v('population : le courriel ' + id + ' offre au moins un geste (bandeau « OP GESTION a reconnu »)', L0.length >= 1, L0);
    for (const x of L0) { const [hid, lib] = x.split('¦');
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await libs();
      const av = await p.evaluate(MARQUES);
      const r = await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="' + ${JSON.stringify(hid)} + '"]'); if (!b || b.disabled) return false; b.click(); return true; })()`);
      await p.waitForTimeout(550);
      // un second geste dans le panneau ouvert (valider le devis préparé, choisir un équipier) : par leurs boutons
      await p.evaluate(() => { const b = document.querySelector('#calque [data-mbx^="devfait"], #calque [data-mbx^="confok"], #calque [data-ml^="confok"]'); if (b) b.click(); }); await p.waitForTimeout(450);
      const ap = await p.evaluate(MARQUES); clics.push({ id, lib, r, ecrit: ap.filter(x => !av.includes(x)) });
    }
    // répondre puis envoyer : la réponse reprend le contenu cité
    await libs(); await p.evaluate(i => { try { COURRIER.inst.repondre(i, 'Bonjour'); } catch (e) {} }, id); await p.waitForTimeout(700);
    await p.evaluate(`(() => { const s = ${SR}, b = s.querySelector('#cSend'); if (b) b.click(); })()`); await p.waitForTimeout(700);
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  }
  clics.filter(x => x.ecrit && x.ecrit.length).forEach(x => console.log('  ▸ geste « ' + x.lib.slice(0, 60) + ' » (' + x.id + ') écrit :', x.ecrit.join(' ¦ ')));
  // la demande d'intervention : « Créer l'intervention » préremplit titre et motif avec l'OBJET et le CORPS du courriel ; on valide (« Créer »), comme le ferait la personne
  await p.evaluate(() => COURRIER.inst.ouvrir('gA')); await p.waitForTimeout(600);
  await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="ml:creerint|gA"]'); if (b) b.click(); })()`); await p.waitForTimeout(900);
  const prerempli = await p.evaluate(() => (typeof CREA !== 'undefined' && CREA) ? { titre: String(CREA.titre || '').slice(0, 30), motif: String(CREA.motif || '').slice(0, 30) } : null);
  console.log('  · préremplissage de la création :', JSON.stringify(prerempli));
  L.v('population : « Créer l\'intervention » a prérempli titre et motif avec le texte du courriel piégé', !!prerempli && /¤n\d+¤/.test(prerempli.titre + prerempli.motif), prerempli);
  const Pn = await p.evaluate(O.LIRE); L.v('le formulaire de création, prérempli depuis le courriel, ne laisse sortir aucune charge', Pn.sorti.length === 0, Pn.sorti.slice(0, 4));
  await p.evaluate(() => { const b = document.querySelector('[data-action="cPlusTard"]'); if (b) b.click(); }); await p.waitForTimeout(500);
  const nInt0 = await p.evaluate(() => INTS.length);
  await p.evaluate(() => { const b = document.querySelector('[data-action="cCreer"]'); if (b) b.click(); }); await p.waitForTimeout(900);
  const nInt1 = await p.evaluate(() => INTS.length), intP = await p.evaluate(() => INTS.filter(i => /¤n\d+¤/.test(JSON.stringify(i))).length);
  console.log('  · interventions :', nInt0, '→', nInt1, '· portant une charge :', intP);
  L.v('population : l\'intervention née du courriel piégé a été créée (' + (nInt1 - nInt0) + ') et porte la charge', nInt1 > nInt0 && intP >= 1, { nInt0, nInt1, intP });
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  console.log('  · gestes touchés :', clics.filter(x => x.r).length, '/', clics.length);
  L.v('population : au moins 12 gestes du bandeau ont été touchés pour de bon', clics.filter(x => x.r).length >= 12, clics.length);
  // ce que les gestes ont créé : clients, devis, interventions, tâches, notifications portant une charge
  const cree = await p.evaluate(() => { const poids = s => /¤n\d+¤/.test(JSON.stringify(s)); return { clients: Object.keys(CLIENTS).filter(k => /¤n\d+¤/.test(CLIENTS[k].nom || '')).length, taches: TACHES.filter(poids).length, devis: DV.filter(poids).length, ints: INTS.filter(poids).length, mails: MAILS.filter(m => /¤n\d+¤/.test(m.objet + m.txt + m.de.nom)).length }; });
  console.log('  · objets portant une charge :', JSON.stringify(cree));
  L.v('population : au moins une tâche ou un client ou un devis ou une intervention créé porte une charge (sinon le balayage ne dit rien)', cree.clients + cree.taches + cree.devis + cree.ints >= 2, cree);
  // ── 3. contre-épreuve : la lecture voit-elle une charge brute ? ──
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); });
  await p.waitForTimeout(500);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès, et son gestionnaire', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 3));
  // ── 4. balayage de tous les écrans et des fiches créées ──
  const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x)); Object.keys(CLIENTS).forEach(k => r.push('client-x-' + k)); DV.slice(-6).forEach(o => r.push('devis-x-' + o.id)); INTS.slice(-8).forEach(i => r.push('inter-x-' + i.id)); return r; });
  const trouves = new Map(), vusT = new Set(); let nEcrans = 0;
  for (const r of routes) {
    try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; }
    await p.waitForTimeout(350); nEcrans++;
    let R; try { R = await p.evaluate(O.LIRE); } catch (e) { continue; }
    R.vues.forEach(v => vusT.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou: r }); });
    // une notification ou un panneau laissé ouvert
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  }
  // ce que LES AUTRES voient : le courriel confié, la tâche, l'historique, lus par chaque rôle de l'application (technicien, secrétariat…) — la charge a été posée par un inconnu, lue par l'équipe
  const roles = await p.evaluate(() => Object.keys(ROLES).filter(k => k !== 'patron' && k !== 'client'));
  let nEcransRoles = 0;
  for (const k of roles) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), k); } catch (e) { console.log('  · rôle', k, ':', e.message); continue; } await p.waitForTimeout(600);
    const rr = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))));
    for (const r of rr) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; }
      await p.waitForTimeout(250); nEcransRoles++; let R; try { R = await p.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(v => vusT.add(v)); R.sorti.forEach(s => { const kk = s.sorte + '|' + s.champ + '|' + k; if (!trouves.has(kk)) trouves.set(kk, { ...s, ou: r + ' (rôle ' + k + ')' }); });
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  }
  await p.evaluate(() => rlChanger('patron', { muet: true })); await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(900);
  console.log('  · rôles revisités :', roles.join(','), '· écrans :', nEcransRoles);
  L.v('population : les rôles de l\'équipe (technicien…) ont revisité au moins 10 écrans (' + nEcransRoles + ')', nEcransRoles >= 10, { roles, nEcransRoles });
  // et le module de courrier lui-même (arbre d'ombre), tous les courriels piégés ouverts, objets et noms dans la liste et dans la lecture
  const sombre = await p.evaluate(async SRC => { const sr = eval(SRC), out = [];
    for (const id of ['gA', 'gB', 'gC', 'gD', 'gE']) { COURRIER.inst.ouvrir(id); await new Promise(r => setTimeout(r, 500));
      sr.querySelectorAll('*').forEach(e => { if (e.hasAttribute('data-xss')) out.push(id + ' balise data-xss'); for (const a of e.attributes) if (/^on/i.test(a.name)) out.push(id + ' ' + a.name); if (/^(IMG|IFRAME|SCRIPT|FORM|OBJECT)$/.test(e.tagName) && e.closest('.rbody,.rhead,#rows,.hband,.attbar')) out.push(id + ' ' + e.tagName); }); }
    return out; }, SR);
  const H = await p.evaluate(() => (window.top.__hits || []).slice());
  console.log('  · écrans visités :', nEcrans, '· charges vues (échappées ou non) à l\'écran :', vusT.size);
  L.v('population : ≥ 40 écrans et fiches visités', nEcrans >= 40, nEcrans);
  L.v('population : au moins 4 charges retrouvées à l\'écran, échappées (sinon rien n\'est arrivé jusqu\'aux écrans)', vusT.size >= 4, [...vusT]);
  const sorties = [...trouves.values()];
  L.v('AUCUNE charge n\'est sortie de son texte dans les ' + nEcrans + ' écrans et fiches (balise, gestionnaire, URL dangereuse) — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 8).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUNE charge n\'est sortie dans le module de courrier lui-même', sombre.length === 0, sombre.slice(0, 5));
  L.v('AUCUN code exécuté (window.__hits) : ' + H.length, H.length === 0, H.map(h => legende[h] || h).slice(0, 8));
  L.v('aucune requête vers un autre hôte que 127.0.0.1', dehors.length === 0, dehors.slice(0, 4));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  fs.writeFileSync(CAP + 'gestes-' + PROFIL + '.json', JSON.stringify({ legende, clics, cree, sorties, hits: H }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

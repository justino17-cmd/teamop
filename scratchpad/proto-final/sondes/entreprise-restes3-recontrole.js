// RECONTRÔLE ADVERSE des restes « entreprise », tour 3 (18 novembre 2026). Il cherche ce que les trois corrections (gestes du bandeau filtrés par la case de leur destination ; lien du
// bandeau qui passe à la ligne ; rangée « Réponse rapide » retirée en Voir seul) ont cassé À CÔTÉ :
//   a. « offert ⇔ non refusé » sur une MATRICE de cases (pas seulement « ouverte seule » en 1110) : chaque destination en Voir seul, en Voir + Modifier sans Créer, en Voir + Créer sans Modifier,
//      pour la Boîte mail en 1110 : chaque geste offert est joué, aucun n'est refusé par la garde ; et la population dit combien de gestes ont été joués ;
//   b. les autres personnes de la démonstration (Julie, SM, KB) : leurs gestes offerts passent tous la garde, et le nombre de gestes d'une personne qui a tout n'a pas bougé (28) ;
//   c. « Proposer un créneau » (ml:creneau) : il n'est pas dans la table, il passe par courrierRepondre sans passer par la garde, et l'envoi POSE des « options » dans le planning (BUREAU) :
//      avec la Boîte mail seule (Planning en Voir seul), l'envoi écrit-il au planning ? (mesure, avec la population des options avant / après) ;
//   d. le bandeau d'un message dont les gestes sont filtrés : il ne laisse pas une rangée vide (hauteur, marge) sur trois profils, jour et nuit ;
//   f. les verbes que la démonstration ne montre à personne (« C'est un client », « C'est un fournisseur », « Confirmer le créneau », « Ajouter aux photos de l'intervention » : leurs messages sont déjà traités ou n'existent pas) :
//      on les fait naître (un message à trier non traité, un choix de créneau, une intervention liée) et on regarde s'ils sont offerts par la BONNE case seulement, et refusés par la garde quand ils sont lancés par l'hôte ;
//   e. la ligne « Réponse rapide » : en Voir + Créer (sans Modifier) elle est retirée, et ni « Répondre » ni la barre d'actions n'ont de blanc ; capture.
// Usage : timeout 580 node …/entreprise-restes3-recontrole.js [a|b|c|d|e]. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes3-recontrole/';
const QUI = process.argv[2] || 'abcdef';
const FERMEES = { planif:'1000', inter:'1000', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const RELEVE = async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const out = [];
  for (const id of [...o.querySelectorAll('.msg[data-id]')].map(r => r.getAttribute('data-id'))) { const r = o.querySelector('.msg[data-id="' + id + '"]'); if (!r) continue; r.click(); await new Promise(z => setTimeout(z, 200));
    out.push({ id, gestes:[...o.querySelectorAll('.hacts [data-hote]')].map(b => ({ a:b.getAttribute('data-hote'), l:b.textContent.replace(/\s+/g, ' ').trim() })) }); }
  return out; };
// joue chaque geste offert (par courrierAgir, comme le bouton) et rend ceux que la garde a refusés
const JOUER = async (tous) => { const refus = []; let joues = 0;
  for (const g of tous) { if (/^ml:creneau|^mbx:(repondre|relancer|prevenir)/.test(g.a)) continue;   // ceux-là ouvrent le composeur : ils sont l'objet de c
    const res = await (async () => { const av = DROITS_REFUS.length; try { courrierAgir(g.a, { id:g.id }); } catch (e) { return { err:String(e) }; } await new Promise(z => setTimeout(z, 300));
      const nv = DROITS_REFUS.slice(av).map(o => o.cat + '.' + o.x + ' ' + o.verbe); try { fermerPanneau(); } catch (e) {} return { nv }; })();
    joues++; if (res.nv && res.nv.length) refus.push(g.l + ' [' + g.id + '] → ' + res.nv.join(', ')); if (res.err) refus.push('ERREUR ' + g.l + ' ' + res.err); }
  return { joues, refus }; };
(async () => {
  if (/a/.test(QUI)) {
    // a. une matrice : pour chaque destination, ses cases en V (1000), V+M sans C (1010 → « v a m s » = voir, ajouter, modifier, supprimer : 1 0 1 0), V+C sans M (1100)
    const DEST = ['ventes', 'achats', 'inter', 'crm'];
    for (const [nom, forme] of [['Voir seul', '1000'], ['Voir + Modifier, sans Créer', '1010'], ['Voir + Créer, sans Modifier', '1100']]) {
      const o = { ...FERMEES, com:'1110' }; DEST.forEach(d => { o[d] = forme; });
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(o) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(RELEVE); const tous = r.flatMap(x => x.gestes.map(g => ({ id:x.id, ...g })));
      const ver = new Set(tous.map(g => g.a.split('|')[0]));
      v(`destinations en ${nom} : population (${r.length} messages, ${tous.length} gestes offerts : ${[...ver].join(' ')})`, r.length >= 8 && tous.length >= 5, [...ver]);
      const res = await p.evaluate(JOUER, tous);
      v(`destinations en ${nom} : chaque geste offert est joué (${res.joues}) et aucun n'est refusé par la garde`, res.joues >= 3 && res.refus.length === 0, res.refus.slice(0, 10));
      await L.fin(c);
    }
    // et à l'inverse : des cases de destination ouvertes en entier sans « Modifier » à la Boîte mail → le bandeau ne propose rien du tout (com en Voir seul)
    const o2 = cases({ com:'1000' }); const c2 = await D.ouvrirComme({ qui:'marc', appareil:'mac' });
    await c2.p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:o2 }); await L.calme(c2.p, 500);
    await L.aller(c2.p, 'boiteMail'); await L.calme(c2.p, 3000);
    const r2 = await c2.p.evaluate(RELEVE); v(`Boîte mail en Voir seul, tout le reste ouvert : population (${r2.length}) et aucun geste offert`, r2.length >= 8 && r2.every(x => x.gestes.length === 0), r2.filter(x => x.gestes.length));
    await L.fin(c2);
  }
  if (/b/.test(QUI)) {
    for (const qui of ['marc', 'julie', 'sm', 'kb']) {
      const c = await D.ouvrirComme({ qui, appareil: 'mac' }); const p = c.p;
      const acces = await p.evaluate(() => { try { return { ok:!!(typeof rlLignes === 'function' && rlLignes().some(x => x.k === 'boiteMail')), com:peut('com', 'v') }; } catch (e) { return { err:String(e) }; } });
      if (!acces.ok || !acces.com) { console.log(`  (${qui} : pas de Boîte mail — hors population)`); await L.fin(c); continue; }
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(RELEVE); const tous = r.flatMap(x => x.gestes.map(g => ({ id:x.id, ...g })));
      v(`${qui} : population (${r.length} messages, ${tous.length} gestes offerts)`, r.length >= 3, r.map(x => x.id + ':' + x.gestes.length).join(' '));
      const res = await p.evaluate(JOUER, tous);
      v(`${qui} : chaque geste offert est joué (${res.joues}) et aucun n'est refusé par la garde`, res.refus.length === 0, res.refus.slice(0, 10));
      await L.fin(c);
    }
  }
  if (/c/.test(QUI)) {
    for (const [nom, o] of [['Boîte mail seule (Planning en Voir seul)', { ...FERMEES, com:'1110' }], ['Boîte mail + Planning', { ...FERMEES, com:'1110', planif:'1110' }]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(o) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; let cible = null;
        for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); const b = o.querySelector('.hacts [data-hote^="ml:creneau"]'); if (b) { cible = m.getAttribute('data-id'); break; } }
        if (!cible) return { cible:null };
        const av = BUREAU.filter(b => b.option).length, refus0 = DROITS_REFUS.length; o.querySelector('.hacts [data-hote^="ml:creneau"]').click(); await new Promise(z => setTimeout(z, 900));
        const env = o.querySelector('#cSend'); if (!env) return { cible, sansCompose:true };
        const sub = o.querySelector('#cSub'); if (sub && !sub.value) { sub.value = 'Créneaux proposés'; sub.dispatchEvent(new Event('input', { bubbles:true })); }
        env.click(); await new Promise(z => setTimeout(z, 6500));
        return { cible, av, ap:BUREAU.filter(b => b.option).length, refus:DROITS_REFUS.slice(refus0).map(o => o.cat + '.' + o.x + ' ' + o.verbe) }; });
      v(`${nom} : population (un message à « Proposer un créneau » trouvé : ${r.cible})`, !!r.cible && !r.sansCompose, r);
      console.log('  mesure :', JSON.stringify(r));
      if (/seule/.test(nom)) v(`${nom} : l'envoi des créneaux n'écrit PAS d'options au planning (${r.av} → ${r.ap})`, r.ap === r.av, r);
      else v(`${nom} : (contre-épreuve) l'envoi des créneaux pose bien des options (${r.av} → ${r.ap})`, r.ap > r.av, r);
      await L.fin(c);
    }
  }
  if (/d/.test(QUI)) {
    for (const [appareil, nuit] of [['iphone', false], ['petit', true], ['mac', false], ['ipad', true]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot, out = [];
        for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 220)); const b = o.querySelector('.hband'); if (!b) continue; const a = b.querySelector('.hacts'); const q = a ? a.getBoundingClientRect() : null;
          out.push({ id:m.getAttribute('data-id'), acts:a ? a.querySelectorAll('[data-hote]').length : -1, hauteurActs:q ? Math.round(q.height) : 0, bandeau:Math.round(b.getBoundingClientRect().height), dep:Math.round(b.scrollWidth - b.clientWidth) }); }
        return out; });
      const nom = `${appareil}${nuit ? ' nuit' : ''}`;
      v(`${nom} : population (${r.length} bandeaux)`, r.length >= 5, r.map(x => x.id + ':' + x.acts).join(' '));
      v(`${nom} : aucune rangée de gestes vide qui occupe de la place`, r.every(x => x.acts !== 0 || x.hauteurActs === 0), r.filter(x => x.acts === 0 && x.hauteurActs > 0));
      v(`${nom} : rien ne dépasse du bandeau`, r.every(x => x.dep <= 0), r.filter(x => x.dep > 0));
      const dg = await L.deborde(c); v(`${nom} : la page ne glisse pas de côté`, !dg || !(dg.bouge > 0), dg);
      await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); const t = o.querySelector('.hband .hd'); if (t && /paiement|facture|devis/i.test(m.textContent)) { o.querySelector('.hband').scrollIntoView({ block:'center' }); break; } } });
      await L.calme(p, 400); await L.capture(c, CAP + `bandeau-${appareil}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
    }
  }
  if (/e/.test(QUI)) {
    for (const [appareil, nuit] of [['iphone', true], ['mac', false]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1100' }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot, out = [];
        for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); const q = o.querySelector('.rquick'); out.push({ id:m.getAttribute('data-id'), rquick:q ? getComputedStyle(q).display : 'absent', quick:o.querySelectorAll('[data-quick]').length && [...o.querySelectorAll('[data-quick]')].filter(b => b.offsetParent).length }); }
        const ecrire = o.host ? null : null; return out; });
      const nom = `${appareil}${nuit ? ' nuit' : ''}`;
      v(`${nom} (Voir + Créer, sans Modifier) : population (${r.length} messages)`, r.length >= 5, r.length);
      v(`${nom} (Voir + Créer, sans Modifier) : la rangée « Réponse rapide » est absente ou retirée, aucun bouton rapide visible`, r.every(x => (x.rquick === 'absent' || x.rquick === 'none') && !x.quick), r.filter(x => !((x.rquick === 'absent' || x.rquick === 'none') && !x.quick)).slice(0, 5));
      await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const m = o.querySelector('.msg[data-id]'); if (m) m.click(); await new Promise(z => setTimeout(z, 300)); const r = o.querySelector('.reading') || o.querySelector('#readScroll'); if (r) r.scrollTop = r.scrollHeight; });
      await L.calme(p, 400); await L.capture(c, CAP + `rapide-${appareil}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
    }
  }

  if (/f/.test(QUI)) {
    // la même naissance pour chaque cas : un message à trier non traité (n9), un choix de créneau (n9 aussi, ensuite), une intervention liée à m1 (créée par le geste ml:creerint avec la case Interventions)
    const NAISSANCE = () => { const n = mlDe('n9'); n.fait = ''; n.faitLien = ''; n.lu = false; const t = (EQUIPE.find(x => x.terrain) || EQUIPE[0]).k; return { tech:t }; };
    const OFFERTS = (id) => { const b = courrierHoteApi.lecture({ id }); return b ? b.actions.map(a => a.id.split('|')[0]) : null; };
    const CAS = [['crm seule', { crm:'1110' }, ['mbx:cestclient'], ['mbx:cestfour']], ['achats seule', { achats:'1110' }, ['mbx:cestfour'], ['mbx:cestclient']], ['aucune destination', {}, [], ['mbx:cestclient', 'mbx:cestfour']]];
    for (const [nom, o, doit, nedoitpas] of CAS) {
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', ...o }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate((NAISS) => { eval('var NAISS=' + NAISS); const info = NAISS(); const off = courrierHoteApi.lecture({ id:'n9' }); const ids = off ? off.actions.map(a => a.id.split('|')[0]) : null;
        const av = DROITS_REFUS.length, base = JSON.stringify(Object.keys(CLIENTS).length) + '/' + JSON.stringify(typeof FOURNISSEURS !== 'undefined' ? Object.keys(FOURNISSEURS).length : -1);
        ['mbx:cestclient|n9', 'mbx:cestfour|n9'].forEach(a => { try { courrierAgir(a, { id:'n9' }); } catch (e) {} try { fermerPanneau(); } catch (e) {} });
        return { ids, refus:DROITS_REFUS.slice(av).map(x => x.cat + '.' + x.x + ' ' + x.verbe), base, apres:JSON.stringify(Object.keys(CLIENTS).length) + '/' + JSON.stringify(typeof FOURNISSEURS !== 'undefined' ? Object.keys(FOURNISSEURS).length : -1), traite:!!mlDe('n9').fait }; }, NAISSANCE.toString());
      v(`« À trier » non traité, ${nom} : population (le bandeau existe, ${r.ids ? r.ids.length : 'aucun'} gestes)`, !!r.ids && r.ids.includes('mbx:confier'), r);
      v(`« À trier », ${nom} : offerts = ${JSON.stringify(doit)}, et jamais ${JSON.stringify(nedoitpas)}`, doit.every(x => r.ids.includes(x)) && nedoitpas.every(x => !r.ids.includes(x)), r.ids);
      if (nom === 'aucune destination') v(`« À trier », ${nom} : lancés par l'hôte, « C'est un client » / « C'est un fournisseur » sont refusés et ne créent rien`, r.refus.length >= 2 && r.base === r.apres, r);
      await L.fin(c);
    }
    // choix de créneau : « Confirmer le créneau » lit la case Interventions
    for (const [nom, o, attendu] of [['Interventions seule', { inter:'1110' }, true], ['sans Interventions', {}, false]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', ...o }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(() => { const n = mlDe('n9'); n.fait = ''; const t = (EQUIPE.find(x => x.terrain) || EQUIPE[0]).k; n.cren = { choix:{ d:AUJ, h:'14:00', t }, liste:[{ d:AUJ, h:'14:00', t }], orig:'m1' };
        const b = courrierHoteApi.lecture({ id:'n9' }); const ids = b ? b.actions.map(a => a.id.split('|')[0]) : null;
        const av = DROITS_REFUS.length, nb = INTS.length; try { courrierAgir('mbx:confcren|n9', { id:'n9' }); } catch (e) {} try { fermerPanneau(); } catch (e) {}
        return { sujet:mlLire(n).sujet, ids, refus:DROITS_REFUS.slice(av).length, nb, nb2:INTS.length }; });
      v(`choix de créneau, ${nom} : population (sujet « choixcren », bandeau lu)`, r.sujet === 'choixcren' && !!r.ids, r);
      v(`choix de créneau, ${nom} : « Confirmer le créneau » ${attendu ? 'est offert' : "n'est pas offert"}`, r.ids.includes('mbx:confcren') === attendu, r.ids);
      if (!attendu) v(`choix de créneau, ${nom} : lancé par l'hôte, il est refusé et ne crée aucune intervention`, r.refus >= 1 && r.nb === r.nb2, r);
      await L.fin(c);
    }
    // « Ajouter aux photos de l'intervention » : m1 a une pièce image, un client ; il faut une intervention liée (créée par « Créer l'intervention » avec la case Interventions)
    for (const [nom, o, attendu] of [['Interventions + Clients', { inter:'1110', crm:'1110' }, true], ['Clients seule (Interventions en Voir seul)', { crm:'1110' }, false]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', ...o }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(async (attendu) => { const m = mlDe('m1'); const av0 = DROITS_REFUS.length;
        /* l'intervention liée au message est posée par son lien (« Créer l'intervention » ouvre un formulaire : le geste n'écrit pas tout seul) */ m.faitLien = 'data-inter="inter|' + INTS[0].id + '"'; const inte = !!mbxInt(m); const b = courrierHoteApi.lecture({ id:'m1' }); const ids = b ? b.actions.map(a => a.id.split('|')[0]) : null; return { inte, ids, refusCreation:DROITS_REFUS.length - av0 }; }, attendu);
      console.log(`  mesure (${nom}) :`, JSON.stringify(r));
      if (attendu) v(`photos de l'intervention, ${nom} : population (une intervention est liée) et le geste est offert`, r.inte && r.ids.includes('mbx:photoint'), r);
      else v(`photos de l'intervention, ${nom} : le geste n'est pas offert`, !r.ids.includes('mbx:photoint'), r);
      await L.fin(c);
    }
  }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });

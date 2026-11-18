// RECONTRÔLE ADVERSE des restes « entreprise », tour 2 (18 novembre 2026). Il cherche ce que les trois corrections ont cassé À CÔTÉ :
//   a. le bandeau de la Boîte mail : « Voir seul » ne propose plus de geste, mais une personne qui peut MODIFIER le courrier sans pouvoir toucher aux clients, aux devis, aux achats
//      (cases d'une autre catégorie en lecture seule) se voyait-elle offrir des gestes que la garde refuse ? (la règle du module : un geste refusé n'est pas proposé) ;
//   b. le suivi d'une demande en « Voir seul » : la ligne en lecture tient sur les six largeurs, jour et nuit, sans rien qui dépasse, et la capture se regarde ;
//   c. la bulle d'un refus de champ : sur TOUS les panneaux qui passent par entVerifier (identité, mentions légales, banque, horaires), le refus est dit une fois au moins —
//      par le message VISIBLE dans la fenêtre (pas seulement dans le panneau) ou par la bulle.
// Usage : timeout 580 node …/entreprise-restes2-recontrole.js [a|b|c]. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes2-recontrole/';
const QUI = process.argv[2] || 'abc';
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
// pour chaque message : les gestes du bandeau (identifiant + libellé) et le nombre de liens
const RELEVE = async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const out = [];
  for (const id of [...o.querySelectorAll('.msg[data-id]')].map(r => r.getAttribute('data-id'))) { const r = o.querySelector('.msg[data-id="' + id + '"]'); if (!r) continue; r.click(); await new Promise(z => setTimeout(z, 200));
    out.push({ id, bandeau:!!o.querySelector('.hband'), gestes:[...o.querySelectorAll('.hacts [data-hote]')].map(b => ({ a:b.getAttribute('data-hote'), l:b.textContent.replace(/\s+/g, ' ').trim() })) }); }
  return out; };
(async () => {
  if (/a/.test(QUI)) {
    // a. com tout ouvert, le reste en LECTURE SEULE (Voir) : ce que le bandeau offre, la garde le laisse-t-elle passer ?
    for (const [nom, o] of [['com complet, autres catégories en Voir seul', cases({ planif:'1000', inter:'1000', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000' })],
                            ['com complet, clients et ventes en Voir seul seulement', cases({ crm:'1000', ventes:'1000' })]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:o }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(RELEVE); const tous = r.flatMap(x => x.gestes.map(g => ({ id:x.id, ...g })));
      v(`${nom} : population (${r.length} messages, ${tous.length} gestes offerts)`, r.length >= 5 && tous.length >= 10, r.map(x => x.id + ':' + x.gestes.length).join(' '));
      // on joue chaque geste offert, un par un, et on regarde ce que la garde en dit
      const refus = []; let joues = 0;
      for (const g of tous) {
        const res = await p.evaluate(async ({ g }) => { const av = DROITS_REFUS.length; try { courrierAgir(g.a, { id:g.id }); } catch (e) { return { err:String(e) }; } await new Promise(z => setTimeout(z, 350));
          const nv = DROITS_REFUS.slice(av).map(o => o.cat + '.' + o.x + ' ' + o.verbe); try { fermerPanneau(); } catch (e) {} return { nv }; }, { g });
        joues++; if (res.nv && res.nv.length) refus.push(g.l + ' [' + g.id + '] → ' + res.nv.join(', ')); if (res.err) refus.push('ERREUR ' + g.l + ' ' + res.err);
      }
      v(`${nom} : chaque geste offert est joué (${joues}) et aucun n'est refusé par la garde`, joues === tous.length && refus.length === 0, refus.slice(0, 12));
      await L.fin(c);
    }
  }
  if (/b/.test(QUI)) {
    // b. le suivi en lecture seule, six largeurs, jour et nuit
    for (const [appareil, nuit] of [['iphone', false], ['android', true], ['petit', false], ['ipad', true], ['mac720', false], ['mac', true]]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ com:'1000' }) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot, out = []; const rangs = [...o.querySelectorAll('.msg[data-id]')];
        for (const m of rangs) { m.click(); await new Promise(z => setTimeout(z, 250)); const s = o.querySelector('.rsuivi'); if (!s) continue; const q = s.getBoundingClientRect(), sc = o.querySelector('#readScroll') || o.querySelector('.reading');
          out.push({ id:m.getAttribute('data-id'), lecture:s.classList.contains('rs-lecture'), boutons:s.querySelectorAll('button').length, champs:s.querySelectorAll('input,select,textarea').length, txt:s.textContent.replace(/\s+/g, ' ').trim().slice(0, 90),
            w:Math.round(q.width), h:Math.round(q.height), dep:Math.round(s.scrollWidth - s.clientWidth), cote:sc ? Math.round(sc.scrollWidth - sc.clientWidth) : null }); }
        return out; });
      v(`${appareil}${nuit ? ' nuit' : ''} : population (${r.length} demandes avec un suivi)`, r.length >= 3, r.map(x => x.id).join(' '));
      v(`${appareil}${nuit ? ' nuit' : ''} : tous les suivis sont en lecture, sans bouton ni champ`, r.length > 0 && r.every(x => x.lecture && x.boutons === 0 && x.champs === 0), r.filter(x => !x.lecture || x.boutons || x.champs));
      v(`${appareil}${nuit ? ' nuit' : ''} : rien du suivi ne dépasse (ni de côté dans la lecture)`, r.every(x => x.dep <= 0 && (x.cote == null || x.cote <= 0)), r.filter(x => x.dep > 0 || x.cote > 0));
      const dg = await L.deborde(c); v(`${appareil}${nuit ? ' nuit' : ''} : la page ne glisse pas de côté`, !dg || !(dg.bouge > 0), dg);
      // la capture d'un message dont le suivi est « En cours » ou « Résolu » s'il y en a, sinon le premier
      await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); const s = o.querySelector('.rsuivi'); if (s && /Dernier geste/.test(s.textContent)) { s.scrollIntoView({ block:'center' }); break; } } });
      await L.calme(p, 500); await L.capture(c, CAP + `suivi-${appareil}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
    }
  }
  if (/c/.test(QUI)) {
    // c. les quatre panneaux d'entVerifier, sur trois téléphones : le PREMIER refus est dit au moins une fois, dans la fenêtre (visible) ou par la bulle
    const PAN = [
      { nom:'identité', carte:'ident', ok:'identok', champs:{ 'en-nom':'', 'en-site':'pas un site' }, premier:'en-nom' },
      { nom:'identité (refus en bas)', carte:'ident', ok:'identok', champs:{ 'en-site':'pas un site' }, premier:'en-site' },
      { nom:'mentions légales', carte:'legal', ok:'ficheok', attr:'data-cx', champs:{ 'fl-siret':'123' }, premier:'fl-siret' },
      { nom:'banque', carte:'banque', ok:'banqueok', champs:{ 'en-iban':'FR00', 'en-bic':'XX' }, premier:'en-iban' },
      { nom:'horaires', carte:'horaires', ok:'horairesok', champs:{ 'en-horaire':'9999' }, premier:'en-horaire' } ];
    for (const [profil, nuit, W, H] of [['iphone', false, 390, 844], ['android', true, 360, 740], ['petit', false, 320, 568], ['petit', true, 320, 400]]) {
      for (const P of PAN) {
        const c = await C.ouvrirEnt({ profil, nuit }); const p = c.p; if (W !== { iphone:390, android:360, petit:320 }[profil] || H !== { iphone:844, android:740, petit:568 }[profil]) { await p.setViewportSize({ width:W, height:H }); await L.calme(p, 400); }
        const ouvert = await L.toucher(c, `[data-ent="carte|${P.carte}"]`); await L.calme(p, 450);
        if (!(await C.panneauOuvert(p))) { v(`${P.nom} ${profil} ${W}×${H} : le panneau s'ouvre`, false, { ouvert }); await L.fin(c); continue; }
        for (const [id, val] of Object.entries(P.champs)) { if (await p.locator('#' + id).count()) await C.remplir(p, id, val); }
        await L.toucher(c, `[${P.attr || 'data-ent'}="${P.ok}"]`); await L.calme(p, 500);
        const r = await p.evaluate(P1 => { const m = document.getElementById(P1 + '-err'), t = document.getElementById('toast'), pn = document.querySelector('#calque .panneau'), rg = pn && pn.querySelector(':scope > .actions');
          const q = m && m.getBoundingClientRect(), g = rg && rg.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
          const dansFenetre = !!(q && q.height > 0 && q.top >= 0 && q.bottom <= (g ? Math.min(g.top, vh) : vh) + 1 && q.left >= 0 && q.right <= vw + 1);
          return { msg:m && !m.hidden ? m.textContent.trim().slice(0, 70) : '', dansFenetre, haut:q && Math.round(q.top), bas:q && Math.round(q.bottom), barre:g && Math.round(g.top), toast:t && t.classList.contains('on') ? t.textContent.trim().slice(0, 70) : '', focus:(document.activeElement || {}).id }; }, P.premier);
        v(`${P.nom} ${profil} ${W}×${H}${nuit ? ' nuit' : ''} : le premier refus est écrit sous son champ et le champ a le focus`, !!r.msg && r.focus === P.premier, r);
        v(`${P.nom} ${profil} ${W}×${H}${nuit ? ' nuit' : ''} : le refus est dit au moins une fois à l'écran (message dans la fenêtre OU bulle)`, r.dansFenetre || !!r.toast, r);
        v(`${P.nom} ${profil} ${W}×${H}${nuit ? ' nuit' : ''} : jamais dit deux fois (message visible ET bulle)`, !(r.dansFenetre && r.toast), r);
        if (W === 320 && H === 400) await L.capture(c, CAP + `refus-${P.carte}-${P.premier}-${W}x${H}${nuit ? '-nuit' : ''}.png`, false);
        await L.fin(c);
      }
    }
  }
  process.exit(L.bilan ? (L.bilan() ? 1 : 0) : 0);
})().catch(e => { console.error(e); process.exit(1); });

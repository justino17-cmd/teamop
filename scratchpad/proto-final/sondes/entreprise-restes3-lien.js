// RESTES ENTREPRISE, TOUR 3 — Boîte mail : les LIENS du bandeau « OP GESTION a reconnu » tiennent dans la carte, sur les six largeurs, jour et nuit, même avec un nom très long.
// Avant : à 320 px, le lien « Chauffage Distribution Atlantique › » (nowrap, 276 px dans une lecture de 288) dépassait de 17 px et son chevron était coupé.
// On mesure chaque lien contre le BORD de la carte (pas contre innerWidth), avec les vrais noms puis avec un nom très long posé à la main dans le lien (valeur LONGUE), et on regarde la capture.
// Usage : timeout 580 node …/entreprise-restes3-lien.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes3-lien/';
const LONG = 'Établissements Chauffage Distribution Atlantique et Compagnie';
// pour chaque message à liens : bord droit de la carte, bord droit de chaque lien (et de son chevron), hauteur
const RELEVE = async ({ long, LONG }) => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const out = [];
  for (const id of [...o.querySelectorAll('.msg[data-id]')].map(r => r.getAttribute('data-id'))) { const r = o.querySelector('.msg[data-id="' + id + '"]'); if (!r) continue; r.click(); await new Promise(z => setTimeout(z, 220));
    const band = o.querySelector('.hband'); if (!band) continue; const ls = [...band.querySelectorAll('.hliens .lnk')]; if (!ls.length) continue;
    if (long) ls.forEach(l => { const t = [...l.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = LONG; else { const s = l.querySelector('span'); if (s) s.textContent = LONG; } });
    await new Promise(z => setTimeout(z, 80)); const B = band.getBoundingClientRect();
    out.push({ id, carteDroite:Math.round(B.right), liens:ls.map(l => { const q = l.getBoundingClientRect(), c = l.querySelector('.chv'), cq = c ? c.getBoundingClientRect() : null; return { texte:l.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), droite:Math.round(q.right), chev:cq ? Math.round(cq.right) : null, h:Math.round(q.height) }; }) }); }
  return out; };
(async () => {
  const SEULS = process.argv[2];   // ex. « petit » : un seul appareil (contre-épreuve rapide)
  for (const [appareil, nuit] of [['petit', false], ['petit', true], ['android', true], ['iphone', false], ['ipad', true], ['mac720', false], ['mac', true]].filter(x => !SEULS || x[0] === SEULS)) {
    for (const long of [false, true]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); const p = c.p;
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(RELEVE, { long, LONG }); const liens = r.flatMap(x => x.liens.map(l => ({ id:x.id, carte:x.carteDroite, ...l })));
      const nom = `${appareil}${nuit ? ' nuit' : ''}${long ? ' (nom très long)' : ''}`;
      v(`${nom} : population (${r.length} messages à liens, ${liens.length} liens)`, r.length >= 3 && liens.length >= 4, r.map(x => x.id + ':' + x.liens.length).join(' '));
      v(`${nom} : aucun lien, ni son chevron, ne dépasse du bord de la carte`, liens.every(l => l.droite <= l.carte && (l.chev == null || l.chev <= l.carte)), liens.filter(l => l.droite > l.carte || (l.chev != null && l.chev > l.carte)));
      const dg = await L.deborde(c); v(`${nom} : la page ne glisse pas de côté`, !dg || !(dg.bouge > 0), dg);
      if (appareil === 'petit' && long) { await p.evaluate(async (LONG) => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelectorAll('.hband .hliens .lnk').length >= 2) break; }   // un message à DEUX liens, noms longs
        o.querySelectorAll('.hband .hliens .lnk').forEach(l => { const t = [...l.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = LONG; }); const b = o.querySelector('.hband .hliens'); if (b) b.scrollIntoView({ block:'center' }); }, LONG);
        await L.calme(p, 400); await L.capture(c, CAP + `lien-${appareil}${nuit ? '-nuit' : ''}-long.png`, false); }
      if (appareil === 'petit' && !long) { await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (/Chauffage Distribution/.test((o.querySelector('.hband .hliens') || {}).textContent || '')) break; } const b = o.querySelector('.hband .hliens'); if (b) b.scrollIntoView({ block:'center' }); });
        await L.calme(p, 400); await L.capture(c, CAP + `lien-${appareil}${nuit ? '-nuit' : ''}.png`, false); }
      await L.fin(c);
    }
  }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });

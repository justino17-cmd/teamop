// Historique : chaque ligne (tous les jours dépliés) ouvre un volet ; son bouton « Ouvrir la page complète » mène-t-il à la fiche annoncée par la ligne ?
const O = require('./accueil-outils.js'), L = O.L;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' });
  const RE = "hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set(Object.keys(typeof HIST!=='undefined'?{}:{}));";
  await c.p.evaluate("hMax=60"); await L.aller(c.p, 'historique');
  await c.p.evaluate(() => { const b = document.querySelector('[data-hdeplier="1"]'); if (b) b.click(); }); await L.calme(c.p, 500);
  let lignes = await c.p.evaluate(() => [...document.querySelectorAll('[data-hj]')].map(e => ({ id: e.dataset.hj, txt: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 140) })));
  console.log('lignes dépliées :', lignes.length); lignes = lignes.slice(+(process.argv[3]||0), +(process.argv[4]||999)); if (process.argv[5]) lignes = lignes.filter(l => new RegExp(process.argv[5]).test(l.txt));
  const rap = [];
  for (const l of lignes) {
    await L.aller(c.p, 'historique'); await c.p.evaluate("hMax=60"); await c.p.evaluate(() => { const b = document.querySelector('[data-hdeplier="1"]'); if (b) b.click(); }); await L.calme(c.p, 250);
    const ok = await L.toucher(c, `[data-hj="${l.id}"]`, { delai: 4000 }); if (!ok) { rap.push({ ...l, ok: false }); console.log('✗ pas touché', l.txt); continue; }
    await c.p.waitForTimeout(300);
    const pan = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); if (!p) return null; const plein = p.querySelector('[data-plein]'); return { titre: (p.querySelector('h2,h3') || {}).textContent, texte: p.innerText.replace(/\s+/g, ' ').slice(0, 200), plein: plein ? plein.dataset.plein : null, boutons: [...p.querySelectorAll('button')].map(b => b.textContent.trim().slice(0, 30)) }; });
    let mene = null;
    const bo = pan && pan.boutons.find(b => /^Ouvrir/.test(b));
    if (bo) { await c.p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /^Ouvrir/.test(x.textContent.trim())); b.setAttribute('data-campo', '1'); }); await L.toucher(c, '[data-campo="1"]', { delai: 3000 }); await c.p.waitForTimeout(500);
      const ap = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); return p ? { texte: p.innerText.replace(/\s+/g, ' ').slice(0, 300), plein: (p.querySelector('[data-plein]') || {}).dataset ? p.querySelector('[data-plein]').dataset.plein : null } : null; });
      mene = { apercu: ap && ap.texte, plein: ap && ap.plein };
      if (ap && ap.plein) { await L.toucher(c, '#calque [data-plein]', { delai: 3000 }); await c.p.waitForTimeout(600); const e = await O.etat2(c.p); mene.hash = e.hash; mene.h1 = e.h1; mene.corps = await c.p.evaluate(() => (document.querySelector('#contenu') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 400)); } else { mene.hash = '(pas de page complète)'; mene.h1 = ''; mene.corps = ''; } }
    const sujet = (l.txt.match(/(FAC-\d{4}-\d+|D-\d{4}-\d+|CTR-\d{4}-\d+)/) || [])[1]; let verdict = '';
    if (mene && sujet) verdict = ((mene.h1||'') + ' ' + (mene.corps||'') + ' ' + (mene.apercu||'')).includes(sujet) ? 'OK-num' : 'NUM-ABSENT(' + sujet + ')';
    rap.push({ ...l, pan, mene, verdict });
    console.log(`${l.txt.slice(0, 95)}\n     volet="${pan ? (pan.titre || '').slice(0, 50) : 'AUCUN'}" plein=${pan ? pan.plein : '-'} → apercu="${mene ? (mene.apercu || '').slice(0, 70) : ''}" → ${mene ? mene.hash + ' | ' + mene.h1 + ' ' + verdict : '(rien)'}  [${pan ? pan.boutons.join(' / ') : ''}]`);
    await L.ranger(c.p);
  }
  require('fs').writeFileSync(O.CAP + 'histo-lignes-' + profil + '.json', JSON.stringify(rap, null, 1));
  console.log('ERR', c.err); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });

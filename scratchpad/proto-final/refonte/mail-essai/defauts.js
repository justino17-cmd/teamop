// Sonde des défauts d'OP Courrier constatés le 16 novembre 2026 : chaque ligne REJOUE un défaut et dit s'il se reproduit encore.
// ✗ = le défaut est présent (attendu tant que le module n'est pas corrigé) ; ✓ = corrigé.
// Lancer : CAP=<dossier des captures, hors dépôt> timeout 280 node defauts.js     (MODULE=<chemin> essaie une copie, p. ex. apercu/prototype-courrier.js)
// Le module essayé est, par défaut, opcourrier.js à la racine du dépôt.
// Tout se passe sur 127.0.0.1 avec une boîte FICTIVE (source.js) ; aucune donnée réelle.
const h = require('./h.js'), fs = require('fs'), path = require('path');
const INIT = 'window.R=()=>document.querySelector("[data-opcourrier]").shadowRoot';
(async () => {
  let bons = 0, mauvais = 0;
  const ligne = (id, ok, txt, mesure) => { ok ? bons++ : mauvais++; console.log((ok ? '  ✓ ' : '  ✗ ') + id + ' ' + txt + (mesure === undefined ? '' : '   → ' + JSON.stringify(mesure))); };
  let c = await h.ouvrir({ profil: 'mac', init: INIT }), p = c.p; const S = f => p.evaluate(f);
  await p.locator('.msg').first().click(); await p.waitForTimeout(400);
  await p.keyboard.press('r'); await p.waitForTimeout(400);
  const d01 = await S(() => R().querySelector('#cBody').value); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ligne('D01', !/^r/.test(d01), 'taper « r » pour répondre n’écrit pas un « r » dans le message', d01.slice(0, 20));
  await p.locator('.msg').first().click(); await p.waitForTimeout(300);
  await p.locator('[data-quick]').nth(1).click(); await p.waitForTimeout(400);
  const d02 = await S(() => R().querySelector('#cBody').value);
  ligne('D02', d02.indexOf('Je reviens') >= 0 && d02.indexOf('Je reviens') < d02.indexOf('-- ') && !/[a-z0-9]Je reviens/.test(d02), 'la réponse rapide est AVANT la signature, pas collée après', d02);
  const d10 = await S(() => R().querySelector('#cTitle').innerText);
  ligne('D10', /Répondre|Re:/.test(d10), 'la fenêtre d’une réponse ne s’appelle pas « Nouveau message »', d10);
  await p.locator('#cCancel').click(); await p.waitForTimeout(300);
  await p.locator('[data-folder=junk]').first().click(); await p.waitForTimeout(300); await p.locator('.msg').first().click(); await p.waitForTimeout(400);
  const d12 = await S(() => ['reply', 'replyAll', 'forward'].map(a => { const b = R().querySelector('#readActs .acts-mac [data-act=' + a + ']'); return a + ':' + (b ? (b.disabled ? 'inactif' : 'actif') : 'absent'); }));
  ligne('D12', d12.every(x => /inactif|absent/.test(x)), 'on ne répond pas à un indésirable', d12);
  await p.locator('[data-folder=inbox]').first().click(); await p.waitForTimeout(300);
  await p.locator('[aria-label*="Nouveau message"]').first().click(); await p.waitForTimeout(300); await p.locator('#cTo').fill('pas-une-adresse'); await p.locator('#cSend').click(); await p.waitForTimeout(300);
  const d07 = await S(() => { const t = R().querySelector('#toast'), k = t.querySelector('svg path'); return { texte: t.innerText.trim(), chemin: k ? k.getAttribute('d') : '' }; });
  ligne('D07', !/12\.75 4\.5 4\.5/.test(d07.chemin), 'un refus ne s’affiche pas avec la coche de réussite (celle de « Message envoyé »)', d07);
  await S(() => { R().querySelector('#cTo').value = ''; });
  await S(() => R().querySelector('#cSched').click()); await p.waitForTimeout(300);
  const d06 = await S(() => R().querySelector('#cSchedWrap').textContent);
  ligne('D06', !/pour tester/.test(d06), 'aucun « pour tester » dans les choix d’envoi programmé', /pour tester/.test(d06));
  const d05 = await S(() => { const l = R().querySelector('#cSend .lbl'); return l ? getComputedStyle(l).display : 'absent'; });
  ligne('D05', d05 !== 'none' && d05 !== 'absent', 'le bouton « Envoyer » porte son mot sur ordinateur', d05);
  await h.fin(c);
  c = await h.ouvrir({ profil: 'mac', init: INIT }); p = c.p;
  const d03 = await S(() => [...R().querySelectorAll('#catBar [data-cat]')].filter(b => b.dataset.cat !== 'tout' && (!b.querySelector('.cl') || b.querySelector('.cl').classList.contains('sr'))).map(b => b.dataset.cat));
  ligne('D03', d03.length === 0, 'chaque catégorie de tri porte un MOT à l’écran (pas seulement une icône)', d03);
  const d04 = await S(() => { const t = s => ((R().querySelector(s) || {}).innerText || '').replace(/\n/g, ' '); return { entete: t('#ltSub'), reception: t('[data-folder=inbox]'), aTraiter: t('[data-folder=s_atraiter]'), principal: t('[data-cat=principal]') }; });
  const nombres = [...new Set((JSON.stringify(d04).match(/\d+/g) || []))];
  ligne('D04', nombres.length <= 1, 'une même boîte n’affiche pas des nombres différents pour ses messages à lire', d04);
  await h.fin(c);
  c = await h.ouvrir({ profil: 'windows', init: INIT }); p = c.p;
  await p.locator('.msg').nth(1).click({ button: 'right' }); await p.waitForTimeout(400);
  const d11 = await S(() => { const bs = [...R().querySelectorAll('#overlays button')], l = bs[bs.length - 1]; return l ? { dernier: l.innerText.trim(), bas: Math.round(l.getBoundingClientRect().bottom), fenetre: innerHeight } : null; });
  ligne('D11', !!d11 && d11.bas <= d11.fenetre, 'le menu du clic droit (2e ligne, fenêtre de 768 px) reste dans l’écran', d11);
  await h.fin(c);
  c = await h.ouvrir({ profil: 'mac', src: { gros: 1500 }, attente: 3000, init: INIT }); p = c.p;
  const ms = await S(() => new Promise(ok => { const t = performance.now(); R().querySelectorAll('.msg')[8].click(); requestAnimationFrame(() => requestAnimationFrame(() => ok(Math.round(performance.now() - t)))); }));
  const nl = await S(() => R().querySelectorAll('.msg').length);
  ligne('D14', ms < 150, 'ouvrir un message dans une boîte de 1 500 courriels reste rapide (< 150 ms)', { ms, lignesDansLaPage: nl });
  await h.fin(c); await h.fermer();
  console.log('\n' + bons + ' ✓  ' + mauvais + ' ✗   (✗ = défaut encore présent)');
})().catch(e => { console.log('ERREUR', e.message); process.exit(1); });

// Captures du tour 5 : le refus d'un titre de 121 signes (phrase dite, rien d'enregistré) et le champ d'un collage de drapeaux, sur cinq appareils émulés, de jour ET de nuit. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), fs = require('fs'), SORTIE = process.env.SORTIE || '/tmp/claude-0/t5/cap/'; fs.mkdirSync(SORTIE, { recursive: true });
(async () => {
  let faits = 0;
  for (const profil of ['mac', 'windows', 'iphone', 'android', 'ipad']) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    await p.evaluate(() => { window.__t = []; try { fermerPanneau(); } catch (e) {} const i = INTS.find(o => o.st !== 'annulee' && o.id !== 'brouillon'); window.__iid = i.id; const b = document.createElement('button'); b.dataset.action = 'modifInt'; b.dataset.id = i.id; document.body.appendChild(b); b.click(); b.remove(); }); await L.calme(p, 500);
    await p.evaluate(() => { const e = document.querySelector('#m-t'); e.focus(); e.value = ''; }); await p.keyboard.insertText('Entretien ' + '🇫🇷'.repeat(30) + ' ' + 'x'.repeat(95));
    await p.evaluate(() => { document.querySelector('#m-t').value = document.querySelector('#m-t').value + 'yyyyy'; });
    await p.evaluate(() => { document.querySelector('[data-action="modifIntOk"]').click(); }); await L.calme(p, 400);
    await p.screenshot({ path: SORTIE + 'refus-' + profil + (nuit ? '-nuit' : '-jour') + '.png' }); faits++;
    await L.fin(c);
  }
  console.log('captures :', faits); await L.fermer();
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

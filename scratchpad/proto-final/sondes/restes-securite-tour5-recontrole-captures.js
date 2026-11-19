// Recontrôle adverse tour 5 — E : captures iPad et Android, jour ET nuit : (1) refus d'un titre d'intervention de 125 signes (phrase), (2) fiche client (nom 112, onglet Infos), (3) liste Clients avec ce client. 127.0.0.1 seulement.
const L = require('../lib.js'), fs = require('fs'), SORTIE = process.env.SORTIE || '/tmp/claude-0/t5r/cap/'; fs.mkdirSync(SORTIE, { recursive: true });
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
(async () => {
  let faits = 0;
  for (const profil of ['ipad', 'android']) for (const nuit of [false, true]) {
    const tag = profil + (nuit ? '-nuit' : '-jour');
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
    // (1) refus du titre : 125 signes dans « Modifier »
    await p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }); await L.calme(p, 600);
    await p.evaluate(() => { const e = document.querySelector('#m-titre'); e.focus(); e.value = 'Remise en service de l’évaporateur ' + 'é'.repeat(90); });
    await p.keyboard.insertText('ééééééééé'); await p.evaluate(() => { const e = document.querySelector('#m-titre'); e.value = e.value + 'abcdefghij'; });
    await p.evaluate(() => document.querySelector('[data-action="modifierOk"]').click()); await L.calme(p, 350);
    const t1 = await p.evaluate(() => window.__t.join(' | ')); fs.writeFileSync(SORTIE + tag + '-refus.txt', t1);
    await p.screenshot({ path: SORTIE + '1-refus-' + tag + '.png' }); faits++;
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    // (2) fiche client
    const k = await p.evaluate(nom => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x) && CLIENTS[x].type === 'pro'); Object.assign(CLIENTS[k], cliNet({ nom, contact: 'Madame Marie-Hélène de la Tour-d’Auvergne', adr: '12 rue des Marins d’Aunis, bâtiment C, 17300 Rochefort-sur-Mer', tel: '0546123456', mail: 'syndic@exemple.fr' })); aller('client-x-' + k); return k; }, NOM); await L.calme(p, 700);
    await p.evaluate(() => { ongletClient = 'infos'; rendre(); }); await L.calme(p, 700);
    await p.screenshot({ path: SORTIE + '2-fiche-' + tag + '.png' }); faits++;
    // (3) liste
    await p.evaluate(() => { aller('clients'); }); await L.calme(p, 700);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /abandonner/i.test(x.textContent) && x.offsetParent); if (b) b.click(); }); await L.calme(p, 500);
    await p.evaluate(() => { aller('clients'); }); await L.calme(p, 700);
    await p.screenshot({ path: SORTIE + '3-liste-' + tag + '.png' }); faits++;
    console.log(tag, 'refus :', t1.slice(0, 160), '| erreurs :', c.err.length);
    await L.fin(c);
  }
  console.log('captures :', faits); await L.fermer();
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

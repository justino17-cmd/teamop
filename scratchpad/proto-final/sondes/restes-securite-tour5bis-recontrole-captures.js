// RECONTRÔLE ADVERSE du tour 5 bis — E : captures iPad et Android, jour ET nuit (à REGARDER) : (1) refus du titre d'une intervention (champ marqué), (2) création : client neuf particulier, Nom de 121 signes (quel champ est marqué ?), (3) nouveau devis : objet de 121 signes (refus dans le panneau).
// ⛔ 127.0.0.1 seulement. SORTIE=<dossier>
const L = require('../lib.js'), fs = require('fs'), SORTIE = process.env.SORTIE || '/tmp/claude-0/r5/cap/'; fs.mkdirSync(SORTIE, { recursive: true });
(async () => {
  for (const profil of ['ipad', 'android']) for (const nuit of [false, true]) {
    const tag = profil + (nuit ? '-nuit' : '-jour'); const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const pause = ms => L.calme(p, ms); const clic = async s => { if (c.doigt) await p.locator(s).first().tap({ timeout: 5000 }); else await p.locator(s).first().click({ timeout: 5000 }); await pause(500); };
    await p.evaluate(() => { window.__set = (sel, val) => { const e = document.querySelector(sel); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }; });
    // (1)
    await p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }); await pause(600);
    await p.evaluate(() => window.__set('#m-titre', 'Remise en service de l’évaporateur ' + 'é'.repeat(90))); await clic('[data-action="modifierOk"]');
    await p.screenshot({ path: SORTIE + tag + '-1-modifier.png' });
    // (2)
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(700);
    await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await pause(250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await pause(400);
    await p.evaluate(() => document.querySelector('[data-cnouveau="1"]').click()); await pause(400);
    await p.evaluate(() => { window.__set('[data-cnv="nom"]', 'Nom' + 'x'.repeat(118)); window.__set('[data-cnv="contact"]', 'Jean'); window.__set('[data-cnv="tel"]', '0546123456'); window.__set('[data-cnv="adr"]', '12 rue des Lilas 17000 La Rochelle'); }); await pause(200);
    await clic('[data-action="cCreer"]'); await p.screenshot({ path: SORTIE + tag + '-2-creation-client-neuf.png' });
    // (3)
    await p.evaluate(() => { try { fermerCreation(); fermerPanneau(); } catch (e) {} DVN_F = null; dvNouveau(); }); await pause(500);
    await p.evaluate(() => { const o = document.querySelector('#dvn-cli'); if (o && o.options.length > 1) o.selectedIndex = 1; window.__set('#dvn-objet', 'Remplacement ' + 'é'.repeat(110)); }); await clic('#calque [data-dvn="creer|1"]');
    await p.screenshot({ path: SORTIE + tag + '-3-devis-objet.png' });
    console.log(tag, 'ok'); await L.fin(c);
  }
  await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });

// RECONTRÔLE ADVERSE du tour 5 bis — C : le champ refusé, site par site (13 refusLong + création titre/motif/client neuf + les refus qui n'appellent PAS champRefus).
// Par site : phrase dite, aria-invalid=true sur CE champ seulement, focus, liseré = jeton --rouge du thème, retiré à la frappe suivante, pas de fuite à la réouverture.
// PROFIL=mac|iphone|ipad|android  NUIT=1. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v, fs = require('fs');
const OUT = process.env.SORTIE || '/tmp/claude-0/r5/c/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const nuit = !!process.env.NUIT, prof = process.env.PROFIL || 'mac';
  const c = await L.ouvrir({ profil: prof, nuit, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {})); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); };
    window.__set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; };
    window.__cpt = 0; window.__u = (n, pre) => { const b = (pre || '') + (++window.__cpt).toString(26).replace(/[0-9]/g, c => 'qrstuvwxyz'[+c]) + 'q'; return (b + 'x'.repeat(n)).slice(0, n); }; });
  const pause = ms => L.calme(p, ms);
  const fermer = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} try { document.querySelectorAll('#calque').forEach(x => x.innerHTML = ''); } catch (e) {} });
  const msg = () => p.evaluate(() => { const t = window.__t.join(' | '); window.__t = []; return t; });
  const creaOuvrir = async (nv) => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600); await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await pause(250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await pause(400); if (nv) { await p.evaluate(() => { document.querySelector('[data-cnouveau="1"]').click(); }); await pause(400); } };
  // chaque site : ouvrir, champ, plafond, bouton, prep éventuelle
  const S = [
    { n: 'ml-o', sel: '#ml-o', max: 200, ouvrir: () => p.evaluate(() => panneauEnvoi({ objet: '', corps: 'x', pj: 'a.pdf' })), prep: () => p.evaluate(() => { window.__set('#ml-a', 'a@exemple.fr'); window.__set('#ml-m', 'Bonjour'); }), bouton: '[data-mailenvoi]' },
    { n: 'tk-t', sel: '#tk-t', max: 120, ouvrir: () => p.evaluate(() => tPanneau(null)), bouton: '[data-tok]' },
    { n: 'n-titre', sel: '#n-titre', max: 120, ouvrir: () => p.evaluate(() => panneauCreer('sm', AUJ, '09:00')), bouton: '[data-action="creerOk"]' },
    { n: 'm-t', sel: '#m-t', max: 120, ouvrir: () => p.evaluate(() => { const i = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon'); ACTIONS.modifInt({ dataset: { id: i.id } }); }), bouton: '[data-action="modifIntOk"]' },
    { n: 'bl-titre', sel: '#bl-titre', max: 120, ouvrir: () => p.evaluate(() => panneauBloc(null, 'sm', AUJ, 540)), bouton: '[data-action="blocOk"]' },
    { n: 'm-titre', sel: '#m-titre', max: 120, ouvrir: () => p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }), bouton: '[data-action="modifierOk"]' },
    { n: 'pr-nom', sel: '#pr-nom', max: 80, ouvrir: () => p.evaluate(() => prFormulaire(null, PACKS_ENT[0], '')), bouton: '[data-pr^="garder|"]' },
    { n: 'fo-l-nom', sel: '#fo-l-nom', max: 80, ouvrir: async () => { await p.evaluate(() => foLocal()); await pause(500); }, bouton: '[data-fo="localok"]' },
    { n: 'pa-n', sel: '#pa-n', max: 60, ouvrir: () => p.evaluate(() => cxPlateforme()), bouton: '[data-cx="plateformeok"]' },
    { n: 'pa-lib', sel: '#pa-lib', max: 60, ouvrir: () => p.evaluate(() => paieReleve(EQUIPE.find(o => o.actif).k)), prep: () => p.evaluate(() => window.__set('#pa-m', '60')), bouton: '[data-paie^="primeajout|"]' },
    { n: 't-nom', sel: '#t-nom', max: 40, ouvrir: async () => { await creaOuvrir(); await p.evaluate(() => { const b = document.querySelector('[data-action="cAjoutType"]'); if (b) b.click(); }); }, bouton: '[data-action="cAjoutTypeOk"]' },
    { n: 'eqx-mr', sel: '#eqx-mr', max: 40, ouvrir: async () => { await p.evaluate(() => { const k = EQUIPE.find(o => o.actif && !o.invite && o.k !== 'marc').k; eqxEdition = k; eqFiche(k); }); await pause(500); }, bouton: '[data-eqx^="modifok|"]' },
    { n: 'CREA titre', sel: '[data-cchamp="titre"]', max: 120, ouvrir: () => creaOuvrir(), bouton: '[data-action="cCreer"]' },
    { n: 'CREA motif', sel: '[data-cchamp="motif"]', max: 600, ouvrir: () => creaOuvrir(), bouton: '[data-action="cCreer"]' },
    { n: 'CREA client neuf', sel: '[data-cnv="nom"]', max: 120, ouvrir: () => creaOuvrir(true), prep: () => p.evaluate(() => { window.__set('[data-cnv="tel"]', '0546123456'); window.__set('[data-cnv="adr"]', '12 rue des Lilas 17000 La Rochelle'); }), bouton: '[data-action="cCreer"]' },
    // refus qui n'appellent PAS champRefus (existants avant) : on mesure ce qu'ils font
    { n: 'eq-r (entErr)', sel: '#eq-r', max: 40, ouvrir: () => p.evaluate(() => eqInviter()), prep: () => p.evaluate(() => { window.__set('#eq-p', window.__u(8, 'D')); window.__set('#eq-n', window.__u(8, 'C')); window.__set('#eq-m', 'inv' + (++window.__cpt) + 'q@exemple.fr'); }), bouton: '[data-eq="inviterok"]', autre: true },
    { n: 'dvn-objet (f.err)', sel: '#dvn-objet', max: 120, ouvrir: async () => { await p.evaluate(() => { DVN_F = null; dvNouveau(); }); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="nv|1"]').click()); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="type|pro"]').click()); await pause(400); },
      prep: () => p.evaluate(() => { window.__set('#dvn-nom', window.__u(30, 'S')); window.__set('#dvn-tel', '0546123456'); window.__set('#dvn-adr', window.__u(20, 'R')); }), bouton: '#calque [data-dvn="creer|1"]', autre: true },
    { n: 'cs-nom (clientSeul f.err)', sel: '#cs-nom', max: 120, ouvrir: async () => { await p.evaluate(() => ACTIONS.clientSeul()); await pause(500); }, prep: () => p.evaluate(() => { window.__set('#cs-tel', '0546123456'); }), bouton: '[data-action="clientSeulOk"]', autre: true },
  ];
  const rougeJeton = () => p.evaluate(() => { const e = document.createElement('i'); e.style.color = 'var(--rouge)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; });
  const ROUGE = await rougeJeton(); console.log('· thème', nuit ? 'nuit' : 'jour', 'profil', prof, '--rouge =', ROUGE);
  const rapport = [];
  for (const F of S) {
    await fermer(); await F.ouvrir(); await pause(400);
    const pres = await p.evaluate(s => !!document.querySelector(s), F.sel); v(F.n + ' population : champ atteint', pres, F.sel); if (!pres) { rapport.push({ site: F.n, atteint: false }); continue; }
    if (F.prep) await F.prep();
    const val = await p.evaluate(n => window.__u(n, 'K'), F.max + 1);
    await p.evaluate(([s, val]) => window.__set(s, val), [F.sel, val]); await msg();
    const bouton = F.bouton; await p.locator(bouton).first().click(); await pause(500);
    const m = (await msg()) + ' ' + await p.evaluate(() => [...document.querySelectorAll('#calque .alerte, #calque .erreur:not([hidden]), .fen .alerte, .erreur:not([hidden])')].map(e => e.textContent.trim()).join(' '));
    const r = await p.evaluate(([s, rouge]) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); const marks = [...document.querySelectorAll('[aria-invalid="true"]')].map(x => x.id || x.dataset.cchamp || x.dataset.cnv || x.tagName);
      const re = e.getBoundingClientRect(); const dansEcran = re.top >= 0 && re.bottom <= innerHeight && re.left >= 0 && re.right <= innerWidth + 1;
      return { inv: e.getAttribute('aria-invalid'), foc: document.activeElement === e, bord: cs.borderTopColor, bordL: cs.borderLeftColor, marks, dansEcran, desc: e.getAttribute('aria-describedby'), ecr: !!document.querySelector('#toast[role="status"]') }; }, [F.sel, ROUGE]);
    v(F.n + ' : phrase de refus dite (« limité à … signes »)', /limité à \d+ signes/.test(m), m.slice(0, 140));
    if (F.autre) { rapport.push({ site: F.n, phrase: /limité à \d+ signes/.test(m), inv: r && r.inv, foc: r && r.foc, bord: r && r.bord, marks: r && r.marks }); console.log('   · (hors champRefus) aria-invalid =', r && r.inv, 'focus =', r && r.foc, 'bord =', r && r.bord, 'marks =', JSON.stringify(r && r.marks)); continue; }
    v(F.n + ' : aria-invalid=true posé sur CE champ', r && r.inv === 'true', r);
    v(F.n + ' : focus sur le champ refusé', r && r.foc, r && r.foc);
    v(F.n + ' : liseré = jeton --rouge (' + ROUGE + ')', r && r.bord === ROUGE, r && r.bord);
    v(F.n + ' : aucun autre champ marqué (pas de fuite)', r && r.marks.length === 1, r && r.marks);
    // frappe suivante : la marque part (frappe réelle)
    await p.keyboard.press('Backspace'); await pause(120);
    const apres = await p.evaluate(s => ({ inv: document.querySelector(s).getAttribute('aria-invalid'), n: document.querySelectorAll('[aria-invalid="true"]').length }), F.sel);
    v(F.n + ' : retiré à la frappe suivante (Backspace réel)', apres.inv === null && apres.n === 0, apres);
    // retour au champ valide : le liseré n'est plus rouge
    const bord2 = await p.evaluate(s => getComputedStyle(document.querySelector(s)).borderTopColor, F.sel);
    v(F.n + ' : plus de liseré rouge une fois corrigé', bord2 !== ROUGE, bord2);
    // refus répété sans frappe : toujours une seule marque, puis réouverture propre
    await fermer(); await F.ouvrir(); await pause(400);
    const re = await p.evaluate(() => document.querySelectorAll('[aria-invalid="true"]').length); v(F.n + ' : à la réouverture aucun champ marqué', re === 0, re);
    rapport.push({ site: F.n, atteint: true, inv: r && r.inv, foc: r && r.foc, bord: r && r.bord, ecr: r && r.ecr, desc: r && r.desc, dansEcran: r && r.dansEcran });
  }
  v('aucune erreur de page', erreurs.length === 0, erreurs.slice(0, 3));
  fs.writeFileSync(OUT + 'c-' + prof + (nuit ? '-nuit' : '') + '.json', JSON.stringify(rapport, null, 1));
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 400)); process.exit(1); });

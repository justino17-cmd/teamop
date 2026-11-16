// SONDE « échecs » : l'atelier absent (404), lent (8 s), rechargé en cours de route, un rangement qui jette, deux onglets, la première ouverture dix fois. Jamais un cadre vide sans sortie :
// « L'atelier ne s'ouvre pas. », « Réessayer », « Fermer », Échap vivante (le focus reste sur « Fermer » tant que l'atelier n'est pas prêt). Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const PAGE = 'apercu/prototype-documents.html';
const att = p => p.evaluate(() => { const z = document.getElementById('opdz'); if (!z) return null; const a = z.querySelector('.opdz-att'); return { ouvert: !z.hidden, att: !a.hidden, titre: a.querySelector('b').textContent, re: !a.querySelector('[data-opdz="reessayer"]').hidden, focus: document.activeElement && (document.activeElement.dataset || {}).opdz || document.activeElement.tagName, larg: Math.round(z.querySelector('iframe').getBoundingClientRect().width) }; });
(async () => {
  // ═════ 1. L'ATELIER ABSENT ═════
  let c = await L.ouvrir({ profil: 'mac', qui: 'marc' }), p = c.p; L.absents.add(PAGE);
  await L.aller(p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await p.waitForTimeout(600);
  let a = await att(p); v('absent : « Ouverture de l\'atelier… » avec « Fermer » ; le focus est sur « Fermer »', a && a.ouvert && a.att && /Ouverture/.test(a.titre) && a.focus === 'fermer', a);
  await p.waitForTimeout(8300); a = await att(p);
  v('absent : au bout de 8 s, « L\'atelier ne s\'ouvre pas. » et « Réessayer »', a && /ne s’ouvre pas/.test(a.titre) && a.re, a);
  v('absent : le focus reste sur « Fermer »', a && a.focus === 'fermer', a);
  await L.fin(c); c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p;
  await L.aller(p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); a = await att(p);
  v('absent : Échap ferme l\'attente (le focus était sur « Fermer », pas dans le cadre)', a && !a.ouvert, a);
  v('absent : le focus est revenu sur « Composer un devis »', await p.evaluate(() => document.activeElement && document.activeElement.dataset.opd === 'devis'), await p.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 80)));
  v('absent : l\'historique est rendu (aucune entrée poussée restante)', await p.evaluate(() => !(history.state && history.state.opdz)));
  // ── Réessayer ──
  await L.toucher(c, '[data-opd="devis"]'); await p.waitForTimeout(8600); a = await att(p); v('absent (2e fois) : « Réessayer » est proposé', a && a.re, a);
  L.absents.delete(PAGE); await L.toucher(c, '[data-opdz="reessayer"]'); const f = await A.attendreAtelier(c, 8000);
  v('« Réessayer » alors que l\'atelier est de retour : la fenêtre de composition s\'ouvre', !!f, await att(p));
  v('… et l\'attente a disparu', (await att(p)).att === false);
  await L.fin(c);
  // ═════ 2. L'ATELIER LENT (9,5 s) ═════
  c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p; await p.route(/prototype-documents\.html/, async r => { await new Promise(x => setTimeout(x, 9500)); await r.continue(); });
  await L.aller(p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await p.waitForTimeout(8600); a = await att(p);
  v('lent : à 8 s le message d\'échec et « Réessayer » sont là', a && /ne s’ouvre pas/.test(a.titre) && a.re, a);
  const f2 = await A.attendreAtelier(c, 6000);
  v('lent : l\'atelier finit par répondre ; la fenêtre s\'ouvre toute seule (pas d\'impasse)', !!f2 && (await att(p)).att === false, await att(p));
  await L.fin(c);
  // ═════ 3. L'ATELIER RECHARGÉ EN COURS DE ROUTE (second « prêt ») ═════
  c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p; await L.aller(p, 'devis'); let g = await A.ouvrirAtelier(c, 'devis', null);
  await g.evaluate(() => location.reload()); await p.waitForTimeout(2500); a = await att(p);
  v('rechargé : le prototype ferme la fenêtre (jamais un cadre vide sans sortie)', a && !a.ouvert, a);
  g = await A.ouvrirAtelier(c, 'devis', null); v('rechargé : on peut la rouvrir ensuite', !!g);
  await L.fin(c);
  // ═════ 4. UN RANGEMENT QUI JETTE ═════
  c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p; await L.aller(p, 'devis'); g = await A.ouvrirAtelier(c, 'devis', null);
  await g.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('plein', 'QuotaExceededError'); }; });
  await A.composerDevis(c, g, { client: 'vp', objet: 'Sans rangement', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const enreg = await g.evaluate(() => ({ txt: (document.querySelector('#enreg') || {}).textContent, stock: S.stockage, n: S.docs.length })); await p.waitForTimeout(700);
  v('rangement qui jette : l\'éditeur dit « Non enregistré » (le devis existe en mémoire)', /Non enregistré/.test(enreg.txt) && enreg.stock === false && enreg.n === 1, enreg);
  await g.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  const ligne = await p.evaluate(() => (document.querySelector('#contenu .opd-l') || {}).innerText);
  v('… et la liste du prototype le dit sur la ligne : « Non enregistré »', /Non enregistré/.test(ligne || ''), ligne);
  g = await A.ouvrirAtelier(c, 'devis', null); await g.evaluate(() => { Storage.prototype.setItem = window.__setItem; }); await g.locator('[data-fen-x]').first().click(); await p.waitForTimeout(500);
  await L.toucher(c, '#contenu .opd-l[data-opd="doc"]'); g = await A.attendreAtelier(c); await g.locator('#nom-doc').fill('Sans rangement, puis rangé'); await g.locator('#nom-doc').press('Tab'); await p.waitForTimeout(1200);
  await g.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  const ligne2 = await p.evaluate(() => (document.querySelector('#contenu .opd-l') || {}).innerText);
  v('le rangement revient : l\'avertissement disparaît de la ligne', ligne2 && !/Non enregistré/.test(ligne2), ligne2);
  v('aucune erreur de page (les refus du rangement sont rattrapés)', c.err.length === 0, c.err);
  await L.fin(c);
  // ═════ 5. DEUX ONGLETS ═════
  c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p; await L.aller(p, 'devis'); const p2 = await c.ctx.newPage(); const err2 = []; p2.on('pageerror', e => err2.push(e.message));
  await p2.goto(p.url().replace(/#.*$/, '') + '#devis', { waitUntil: 'load' }); await p2.waitForTimeout(1500); await p2.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await p2.waitForTimeout(300);
  const c2 = { p: p2, doigt: false, largeur: c.largeur, hauteur: c.hauteur, ctx: c.ctx };
  const fa = await A.ouvrirAtelier(c, 'devis', null), fb = await A.ouvrirAtelier(c2, 'devis', 'devis'); v('deux onglets : l\'atelier est ouvert dans les deux', !!fa && !!fb);
  await A.composerDevis(c, fa, { client: 'vp', objet: 'Devis de l\'onglet A', articles: [{ ref: 'EL-ALL', qte: 1 }] }); await p.waitForTimeout(800);
  const vuB = await fb.evaluate(() => S.docs.map(d => d.nom));
  v('l\'onglet B (qui n\'édite pas) reprend le devis de l\'onglet A par l\'événement « storage »', vuB.some(n => /onglet A/.test(n)), vuB);
  await fa.evaluate(() => { removeEventListener('storage', opdStockage); });      // A ne saura plus rien de B : le garde-fou du rangement doit suffire
  await A.composerDevis(c2, fb, { client: 'hp', objet: 'Devis de l\'onglet B', articles: [{ ref: 'EL-ALL', qte: 1 }] }); await p2.waitForTimeout(800);
  await fa.evaluate(() => { D().nom = 'Devis de l’onglet A (modifié)'; toucher(); sauverStock(); }); await p.waitForTimeout(800);
  const rg = await p.evaluate(() => JSON.parse(localStorage.getItem('documents-sur-mesure-opg-v1')).docs.map(d => d.nom));
  v('le rangement de l\'onglet A n\'écrase pas le document de l\'onglet B qu\'il ne connaissait pas', rg.some(n => /onglet B/.test(n)) && rg.some(n => /onglet A/.test(n)) && rg.length === 2, rg);
  const nums = await p.evaluate(() => JSON.parse(localStorage.getItem('documents-sur-mesure-opg-v1')).docs.map(d => d.meta.numero));
  v('… et les deux devis ont deux numéros différents', new Set(nums).size === nums.length && nums.length === 2, nums);
  v('deux onglets : aucune erreur de page', c.err.length === 0 && err2.length === 0, [c.err, err2]);
  await L.fin(c);
  // ═════ 6. LA PREMIÈRE OUVERTURE, DIX FOIS ═════
  let ok = 0, larges = 0; const echecs = [];
  for (let i = 0; i < 10; i++) {
    const pr = ['mac', 'iphone', 'ipad', 'windows', 'android'][i % 5]; const k = await L.ouvrir({ profil: pr, qui: 'marc', attente: 600 }); await L.aller(k.p, 'devis');
    const lg = await k.p.evaluate(() => { const z = document.getElementById('opdz'); return z ? Math.round(z.querySelector('iframe').getBoundingClientRect().width) : -1; });
    const g2 = await A.ouvrirAtelier(k, 'devis', null); await k.p.waitForTimeout(900);
    const tient = !!g2 && (await L.etat(k.p)).atelier && await g2.evaluate(() => !!document.querySelector('.fenetre')); const lh = await k.p.evaluate(() => { const z = document.getElementById('opdz'); z.hidden = true; const r = Math.round(z.querySelector('iframe').getBoundingClientRect().width); z.hidden = false; return r; });
    if (tient) ok++; else echecs.push(pr + ' #' + (i + 1)); if (lh === k.largeur) larges++; await L.fin(k);
  }
  v('première ouverture ×10 (5 profils) : la fenêtre reste ouverte (ne se referme pas toute seule)', ok === 10, echecs);
  v('cadre masqué : il garde sa LARGEUR (visibility, pas display:none) sur les 10 ouvertures', larges === 10, larges);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

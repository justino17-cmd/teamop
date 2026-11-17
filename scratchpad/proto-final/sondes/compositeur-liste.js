// SONDE DURABLE du compositeur (lot « compositeur », étape 3 « corriger ») — la LISTE d'OP GESTION et le texte du contrat.
//   tout-11 un devis composé se dit avec les mots des autres lignes (« envoyé aujourd'hui », « Envoyé · sans réponse ») et compte dans « à relancer » après 7 jours
//   tout-08 le titre de la carte s'aligne sur le numéro des lignes · tout-13 le contrat dit « HT » (champ, page, liste)
// PROFIL=mac|iphone|…  NUIT=0|1  node compositeur-liste.js — rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'mac', nuit = process.env.NUIT === '1', tag = 'cliste-' + pr + (nuit ? '-nuit' : '-jour'), CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 6000 }); else await l.click({ timeout: 6000 }); await c.p.waitForTimeout(170); };
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  const kp = () => p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
  const onglet = async nom => { await L.toucher(c, `#contenu button:has-text("${nom}")`); await L.calme(p, 400); };
  const lignes = () => p.evaluate(() => [...document.querySelectorAll('#contenu .dv-liste .dv-l')].map(e => ({ opd: e.classList.contains('opd-l'), q: (e.querySelector('.dv-q') || {}).innerText, etat: (e.querySelector('.dv-e') || {}).innerText.trim(), vieux: !!e.querySelector('.dv-q.dv-vieux'), t: e.innerText.replace(/\s+/g, ' ') })));
  const rel = s => parseInt((/(\d+) à relancer/.exec(s) || [])[1] || '0', 10);
  // ── tout-11 : un devis composé et envoyé ────────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis'); await onglet('En attente');
  const avant = await lignes(), k0 = await kp(), autres = avant.filter(x => !x.opd);
  v(`${tag} · population : des lignes de devis d'OP GESTION en attente (${autres.length}) à qui se comparer`, autres.length >= 1, avant.length);
  let f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
  await clic(c, f, '[data-vv="client"][data-id="vp"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); await f.locator('#vv-objet').fill('Remplacement du ventilateur'); await p.waitForTimeout(300);
  await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1500); await p.keyboard.press('Escape');
  await clic(c, f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(700); await clic(c, f, '[data-act="env-go"]:visible'); await p.waitForTimeout(1300);
  const num = await f.evaluate(() => D().meta.numero);
  await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(1200); await L.calme(p, 500);
  await onglet('En attente');
  let apres = await lignes(), k1 = await kp(); const maLigne = apres.find(x => x.opd && x.t.includes(num));
  v(`${tag} · le devis composé envoyé (${num}) est dans la liste « En attente »`, !!maLigne, apres.map(x => x.t.slice(0, 60)));
  const ref = autres.find(x => /envoyé/.test(x.q || ''));
  v(`${tag} · il dit « envoyé aujourd'hui » comme les autres lignes disent « envoyé … » (« ${maLigne && maLigne.q} » ; autre ligne : « ${ref && ref.q} »)`, maLigne && /^envoyé aujourd’hui/.test(maLigne.q) && ref && /^envoyé /.test(ref.q), [maLigne && maLigne.q, ref && ref.q]);
  v(`${tag} · sa pastille est « Envoyé · sans réponse », celle des autres devis en attente (${maLigne && maLigne.etat} / ${ref && ref.etat})`, maLigne && maLigne.etat === 'Envoyé · sans réponse' && ref && ref.etat === maLigne.etat, [maLigne && maLigne.etat, ref && ref.etat]);
  v(`${tag} · le chiffre « en attente de réponse » compte la ligne : ${k0[1]} → ${k1[1]}`, /en attente de réponse · (\d+)/.test(k1[1]) && +(/en attente de réponse · (\d+)/.exec(k1[1])[1]) === +(/en attente de réponse · (\d+)/.exec(k0[1])[1]) + 1, [k0[1], k1[1]]);
  await L.capture(c, CAP + tag + '-1-attente.png');
  // tout-08 : le titre de la carte s'aligne sur le numéro de ses lignes
  const g = await p.evaluate(() => { const t = document.querySelector('.opd-liste .opd-t'), n = document.querySelector('.opd-liste .opd-l .dv-n'); if (!t || !n) return null; const c = t.closest('.carte').getBoundingClientRect(); return { titre: Math.round(t.getBoundingClientRect().left - c.left), titreTexte: (() => { const r = document.createRange(); r.selectNodeContents(t); return Math.round(r.getBoundingClientRect().left - c.left); })(), numero: Math.round(n.getBoundingClientRect().left - c.left) }; });
  v(`${tag} · le texte du titre « Composés… » commence à la même distance du bord que le numéro des lignes (${g && g.titreTexte} / ${g && g.numero} px)`, g && Math.abs(g.titreTexte - g.numero) <= 1, g);
  // tout-11 : sans réponse depuis 9 jours → « à relancer », comme les autres devis
  const r0 = rel(k1[1]);
  await p.evaluate(n => { const d = ATD.docs.find(x => x.numero === n); d.maj -= 9 * 864e5; rendre(); }, num); await L.calme(p, 500); await onglet('En attente');
  apres = await lignes(); const vieille = apres.find(x => x.opd && x.t.includes(num)), k2 = await kp();
  v(`${tag} · 9 jours plus tard : « il y a 9 jours », en couleur d'alerte comme les autres lignes (« ${vieille && vieille.q} »)`, vieille && /^envoyé il y a 9 jours/.test(vieille.q) && vieille.vieux, vieille);
  v(`${tag} · … et il compte dans « à relancer » : ${r0} → ${rel(k2[1])}`, rel(k2[1]) === r0 + 1, [k1[1], k2[1]]);
  await L.capture(c, CAP + tag + '-2-relance.png');
  // la fiche du client dit les mêmes mots
  await L.aller(p, 'client-x-vp'); const fiche = await p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  v(`${tag} · la fiche du client dit « Envoyé · sans réponse » aussi`, /Envoyé · sans réponse/.test(fiche.slice(fiche.indexOf('Devis'))), fiche.slice(fiche.indexOf('Devis'), fiche.indexOf('Devis') + 160));
  // ── tout-13 : le contrat dit « HT » ──────────────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'contrats'); f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
  await clic(c, f, '[data-vv="client"][data-id="mi"]');
  const lib = await f.evaluate(() => (document.querySelector('#vv-v-prix') ? document.querySelector('#vv-v-prix').closest('label').innerText : '').replace(/\s+/g, ' ').trim());
  v(`${tag} · le champ s'appelle « Prix annuel (€ HT) » (« ${lib} »)`, /Prix annuel \(€ HT\)/.test(lib), lib);
  await f.locator('#vv-v-prix').fill('280,50');
  for (const m of ['part', 'pro', 'pac']) {
    await clic(c, f, `[data-vv="tpl"][data-v="${m}"]`); await p.waitForTimeout(450);
    const t = await f.evaluate(() => { const o = (typeof D === 'function' && D()) ? D() : null; return typeof VV !== 'undefined' && VV ? VV.articles.filter(a => /Prix et paiement/.test(a.titre)).map(a => a.texte + ' | ' + (a.court || '')).join(' ¶ ') : ''; });
    v(`${tag} · modèle « ${m} » : l'article « Prix et paiement » dit HT (« ${t.slice(0, 90)} »)`, /\{\{prix\}\} HT par an/.test(t) && !/\{\{prix\}\} par an/.test(t), t);
  }
  await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const page = await f.evaluate(() => [...document.querySelectorAll('#vue-editeur .feuille')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  v(`${tag} · la page du contrat dit « 280,50 € HT par an » (${(/[^.]*280,50[^.]*/.exec(page) || [''])[0].slice(0, 90)})`, /280,50\s*€ HT par an/.test(page.replace(/ /g, ' ')), (/[^.]*280,50[^.]*/.exec(page) || [''])[0]);
  await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(1200); await L.calme(p, 500);
  const lc = await p.evaluate(() => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ')));
  v(`${tag} · la ligne du contrat composé dit « HT par an » (${lc[0] && lc[0].slice(-40)})`, lc.length >= 1 && /HT\s*par an/.test(lc[0]), lc);
  await L.capture(c, CAP + tag + '-3-contrats.png');
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 700)); process.exit(2); });

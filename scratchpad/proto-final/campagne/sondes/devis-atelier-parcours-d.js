// Parcours 6 à 9 : (6) relance, (7) nouvelle version d'un devis envoyé, (8) envoi d'un brouillon et numéros (une seule série),
// (9) retour du navigateur / bouton « ‹ Retour » / « Voir en grand » / PDF. usage : node devis-atelier-parcours-d.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  // ── P6 : relance du devis D-2026-031 (envoyé le 20/10, sans réponse) ────────────────────────────────────────────
  const k0 = await O.kpis(p), tc0 = await p.evaluate(() => TACHES.filter(t => !t.fait && t.lien && t.lien.id === 'D-2026-031').length);
  await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="relancer|D-2026-031"]'); await L.calme(p, 300);
  const pan = await p.evaluate(() => ({ a: document.getElementById('ml-a').value, o: document.getElementById('ml-o').value, m: document.getElementById('ml-m').value, pj: (document.querySelector('.mail-pj') || {}).innerText }));
  v('P6 : la relance est écrite : destinataire, objet, message qui nomme le devis et le montant, PDF joint', /durand@mail\.fr/.test(pan.a) && /D-2026-031/.test(pan.o) && /D-2026-031/.test(pan.m) && /TTC/.test(pan.m) && /PDF/.test(pan.pj || ''), pan);
  v('P6 : la relance est signée du nom de la PERSONNE connectée (pas d’un prénom écrit en dur)', /Marc/.test(pan.m), pan.m.slice(-120));
  await p.fill('#ml-a', 'pas-une-adresse'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 300); let t = await toast(p);
  v('P6 : adresse fausse → « Adresse e-mail à vérifier », la relance ne part pas', /Adresse e-mail à vérifier/.test(t) && (await p.evaluate(() => DEVIS_REG['D-2026-031'].relances)) === 0, t);
  await p.fill('#ml-a', 'durand@mail.fr'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 500); t = await toast(p);
  console.log('  · toast de relance :', t);
  v('devis-atelier-02 : le toast de relance ne se répète pas (une seule phrase « Relance envoyée »)', (t.match(/Relance envoyée/g) || []).length === 1, t);
  const x = await p.evaluate(() => { const d = DEVIS_REG['D-2026-031']; return { r: d.relances, le: d.relanceLe, tr: d.trace.slice(-1)[0], ENV: ENVOIS.length }; });
  v('P6 : relance comptée (0 → 1), notée à l’historique, une seule fois', x.r === 1 && /Relancé par/.test(x.tr[1]), x);
  const q = await O.kpis(p); await L.aller(p, 'devis'); const k1 = await O.kpis(p);
  v('P6 : le chiffre « à relancer » baisse de 1 une fois relancé', (/(\d+) à relancer/.exec(k0[1].l) || [0, 0])[1] - (/(\d+) à relancer/.exec(k1[1].l) || [0, 0])[1] === 1, [k0[1].l, k1[1].l]);
  const tc1 = await p.evaluate(() => TACHES.filter(t => !t.fait && t.lien && t.lien.id === 'D-2026-031').length);
  console.log('  · tâches liées ouvertes avant/après :', tc0, tc1);
  // la fiche dit « relancé aujourd'hui »
  await L.aller(p, 'devis-x-D-2026-031'); const ft = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
  v('P6 : la fiche dit « relancé aujourd’hui » et plus « Sans réponse depuis 11 jours » sans nuance', /relancé aujourd.hui/.test(ft), ft.slice(0, 200));
  // ── P7 : nouvelle version de 038 (envoyé, en attente) ────────────────────────────────────────────────────────
  await L.aller(p, 'devis-x-D-2026-038'); await L.toucher(c, '[data-dv="version|D-2026-038"]'); await L.calme(p, 500);
  const cle = await p.evaluate(() => location.hash.replace('#devis-x-', '')); let f = await p.evaluate(() => ({ h1: document.querySelector('#contenu h1').textContent, info: (document.querySelector('#contenu .info') || {}).innerText, n: DEVIS_REG[location.hash.replace('#devis-x-', '')].lignes.length, orig: DEVIS_REG['D-2026-038'].lignes.length }));
  v('P7 : « Modifier (nouvelle version) » crée un brouillon avec les mêmes lignes et le dit', /en préparation/.test(f.h1) && /Nouvelle version du devis/.test(f.info || '') && f.n === f.orig, f);
  await L.toucher(c, '[data-dv="ligneSup|' + cle + '|0"]'); await L.calme(p, 300);
  const ap0 = await p.evaluate(() => DEVIS_REG['D-2026-038'].e);
  v('P7 : tant qu’il n’est pas envoyé, l’ancien reste valable (« en attente »)', ap0 === 'attente', ap0);
  // ── P8 : envoyer ce brouillon : numéro ─────────────────────────────────────────────────────────────────────
  const nums0 = await p.evaluate(() => DV.map(x => x.num).filter(Boolean).sort());
  await L.toucher(c, '[data-dv="envoyer|' + cle + '"]'); await L.calme(p, 400);
  const env = await p.evaluate(() => ({ titre: (document.querySelector('#calque h2') || {}).textContent, o: document.getElementById('ml-o').value, a: document.getElementById('ml-a').value, m: document.getElementById('ml-m').value }));
  const prochain = await p.evaluate(() => dvNum());
  v('P8 : « Aperçu et envoi » : l’objet porte le prochain numéro (' + prochain + ')', new RegExp(prochain).test(env.o) && new RegExp(prochain).test(env.m), env);
  await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 600);
  const n1 = await p.evaluate(cle0 => { const x = DEVIS_REG['D-2026-038'], nv = DV.find(o => o.num === dvNum().replace(/\d+$/, m => String(+m - 1).padStart(3, '0'))); return { ancien: x.e, par: x.remplacePar, nv: nv && { num: nv.num, e: nv.e, remplace: nv.remplace }, hash: location.hash }; }, cle);
  v('P8 : envoyé → numéro suivant donné (' + prochain + '), l’ancien devient « remplacé » et pointe vers lui', n1.nv && n1.nv.num === prochain && n1.ancien === 'remplace' && n1.par === prochain, n1);
  v('P8 : on se retrouve sur la fiche du devis envoyé (adresse = son numéro)', n1.hash === '#devis-x-' + prochain, n1.hash);
  const nums1 = await p.evaluate(() => DV.map(x => x.num).filter(Boolean));
  v('P8 : aucun numéro en double dans la série', new Set(nums1).size === nums1.length, nums1);
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dvf="perdu"]'); const lp = await O.liste(p);
  v('P8 : l’ancien devis (remplacé) est dans « Refusés, expirés » et dit « remplacé par … »', lp.some(s => /D-2026-038/.test(s) && /remplacé par/.test(s)), lp);
  // ── P9 : navigation ────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dvf="tous"]');
  await L.toucher(c, '[data-go="devis-x-D-2026-034"]'); await L.calme(p, 300);
  const h = await p.evaluate(() => location.hash); await L.toucher(c, '.rl-retour'); await L.calme(p, 400);
  let e = await O.lire(p); v('P9 : « ‹ Retour » depuis une fiche ouverte DEPUIS la liste ramène à Devis', e.h1 === 'Devis' && h === '#devis-x-D-2026-034', [h, e.h1]);
  await L.toucher(c, '[data-go="devis-x-D-2026-034"]'); await L.calme(p, 300); await p.goBack(); await L.calme(p, 500); e = await O.lire(p);
  v('P9 : le bouton Retour du navigateur ramène à Devis', e.h1 === 'Devis', e);
  await p.goForward(); await L.calme(p, 500); e = await O.lire(p); v('P9 : « Avancer » rouvre la fiche', /D-2026-034/.test(e.h1), e);
  // chargement direct de la fiche (adresse tapée, appli relancée) : « ‹ Retour » mène à Devis
  await p.evaluate(() => { location.hash = 'devis-x-D-2026-034'; }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200); await L.calme(p, 400);
  await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(p, 300);
  const bt = await p.evaluate(() => { const b = document.querySelector('#contenu [data-retour], #contenu .rl-retour'); return b ? b.textContent.trim() : null; });
  if (bt) { await p.locator('#contenu [data-retour], #contenu .rl-retour').first().click(); await L.calme(p, 500); }
  e = await O.lire(p); v('devis-atelier-05 : « ‹ Retour » d’une fiche ouverte par son adresse mène à la liste Devis (pas à l’Accueil)', !!bt && e.h1 === 'Devis', [bt, e.h1]);
  await L.aller(p, 'devis-x-D-2026-034');
  // voir en grand / PDF
  await L.toucher(c, '[data-pdfplein]'); await L.calme(p, 500);
  const gr = await p.evaluate(() => { const o = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && e.offsetParent !== null && e.getBoundingClientRect().width > innerWidth * .5 && e.querySelector && e.querySelector('.pdf, table')); return { n: o.length, cls: o.map(e => e.className || e.id).slice(0, 3), x: !!document.querySelector('.doc-barre, .pdf-plein, [data-pleinx]') }; });
  console.log('  · « Voir en grand » :', JSON.stringify(gr)); await L.capture(c, O.CAP + `P9-voir-en-grand-${profil}.png`);
  v('P9 : « Voir en grand » ouvre bien le devis en grand', gr.x && gr.n >= 0 && await p.evaluate(() => { const b = document.querySelector('.doc-barre'); return !!b && b.getBoundingClientRect().width > 0; }), gr);
  await p.keyboard.press('Escape'); await L.calme(p, 400);
  v('P9 : Échap referme le devis en grand', await p.evaluate(() => ![...document.querySelectorAll('body *')].some(e => getComputedStyle(e).position === 'fixed' && e.offsetParent !== null && e.getBoundingClientRect().width > innerWidth * .5 && e.querySelector && e.querySelector('.pdf'))));
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

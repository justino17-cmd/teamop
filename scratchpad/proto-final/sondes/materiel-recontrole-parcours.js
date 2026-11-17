// Recontrôle adverse du lot « materiel » — TROIS PARCOURS de bout en bout, joués au toucher ; chacun finit par un « Annuler » et lit
// ce que l'ÉCRAN dit ensuite (pas seulement les données) : la correction technicien-07 a touché la fonction que tous les « Annuler » partagent.
// Usage : node materiel-recontrole-parcours.js <1|2|3> [profil] [nuit 0|1]
//   1 = la technicienne : « Je l'ai pris » → envoi au bureau → Annuler ; « J'ai utilisé chez un client » → Envoyer
//   2 = le gérant : accepter les envois → Annuler ; remplir les camions → Annuler ; transfert d'une demande → Annuler
//   3 = le secrétariat : compter l'atelier avec un écart → Enregistrer → Ce qui a bougé → Annuler
const L = require('../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-recontrole/';
(async () => {
  const n = process.argv[2] || '1', profil = process.argv[3] || (n === '1' ? 'iphone' : 'mac'), nuit = process.argv[4] === '1';
  const qui = n === '1' ? 'sm' : n === '2' ? 'marc' : 'julie';
  const c = await L.ouvrir({ profil, nuit, qui }), p = c.p, v = L.v, R = (f, a) => p.evaluate(f, a);
  const tag = 'p' + n + '-' + profil + (nuit ? '-n' : '-j');
  const clic = async s => { const ok = await L.toucher(c, s); if (!ok) v('geste impossible : ' + s, false); await L.calme(p, 300); return ok; };
  const cap = nom => L.capture(c, CAP + 'par-' + tag + '-' + nom + '.png');
  const toast = () => R(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent : ''; });
  const annuler = async () => { const ok = await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); return !!b; }); await L.calme(p, 600); return ok; };
  const mem = () => R(() => ({ panneau: !!document.querySelector('#calque .panneau'), h2: (document.querySelector('#calque .panneau h2') || {}).textContent || '', toast: (document.getElementById('toast') && document.getElementById('toast').classList.contains('on')) ? document.getElementById('toast').textContent : '' }));
  if (n === '1') {
    await L.aller(p, 'moncamion'); await L.calme(p, 400); await cap('camion');
    const av = await R(() => ({ manque: document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length, env: document.querySelectorAll('.mc-l.envoye').length, titre: (document.querySelector('[data-vis="camion-manque"] h3') || {}).textContent }));
    v('1 population : des pièces manquent à bord et se prennent d\'un toucher (' + av.manque + ', ' + av.titre + ')', av.manque >= 1, av);
    await clic('[data-vis="camion-manque"] [data-mat^="pris|"]');
    const t1 = await toast(); const ap = await R(() => ({ manque: document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length, env: document.querySelectorAll('.mc-l.envoye').length }));
    v('1 : « Je l\'ai pris » : une pièce de moins à prendre, une ligne « Envoyé au bureau · en attente » (' + JSON.stringify(ap) + ' ; « ' + t1.slice(0, 50) + ' »)', ap.manque === av.manque - 1 && ap.env === av.env + 1 && /Annuler/.test(t1), { av, ap, t1 });
    await cap('pris');
    const ok = await annuler(); const an = await R(() => ({ manque: document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length, env: document.querySelectorAll('.mc-l.envoye').length }));
    const m = await mem();
    v('1 : « Annuler » proposé (' + ok + ')', ok);
    v('1 : après « Annuler », l\'écran revient comme avant (' + JSON.stringify(an) + ' / avant ' + JSON.stringify(av) + ')', an.manque === av.manque && an.env === av.env, { av, an });
    v('1 : après « Annuler », la technicienne lit « Annulé : sa prise… » (« ' + m.toast.slice(0, 70) + ' »)', /Annulé/.test(m.toast), m);
    await cap('apres-annuler');
    // « J'ai utilisé chez un client » de bout en bout : choisir la pièce, la quantité, l'intervention, envoyer
    await clic('[data-mat="usage"]'); await p.fill('#mat-q', 'filtre à charbon'); await L.calme(p, 350); await clic('#calque [data-mat^="ajoute|"]');
    await cap('usage-phrase');
    const ph = await R(() => ({ phrase: (document.querySelector('#calque .fo-pied .mat-phrase') || {}).textContent || '', bouton: (document.querySelector('#calque [data-mat="envoyer"]') || {}).textContent || '', off: !!(document.querySelector('#calque [data-mat="envoyer"]') || {}).disabled, pourquoi: (document.querySelector('#calque .mat-pourquoi') || {}).textContent || '' }));
    v('1 : la feuille « J\'ai utilisé » dit sa phrase de contrôle et le bouton (« ' + ph.phrase.slice(0, 60) + ' » / « ' + ph.bouton + ' »)', /Tu notes/.test(ph.phrase) || ph.off, ph);
    if (ph.off) { const ch = await R(() => [...document.querySelectorAll('#calque [data-mat^="inter|"], #calque select, #calque [data-mat^="chez|"]')].map(e => e.tagName + ':' + (e.dataset.mat || e.id || ''))); console.log('  · bouton grisé (' + ph.pourquoi + '), choix possibles :', JSON.stringify(ch)); }
    await clic('#calque [data-mat="envoyer"]'); await L.calme(p, 400);
    const t2 = await toast(); const m2 = await mem();
    v('1 : l\'envoi aboutit : un message le confirme et la feuille se ferme ou passe à « C\'est bon » (« ' + t2.slice(0, 70) + ' » / feuille « ' + m2.h2 + ' »)', /Envoy|Fait/.test(t2) || /C’est bon/.test(await R(() => (document.querySelector('#calque [data-mat="envoyer"]') || {}).textContent || '')), { t2, m2 });
    await cap('usage-envoye');
    await annuler(); const m3 = await mem();
    v('1 : après le second « Annuler » aussi, l\'écran dit « Annulé » et aucune feuille orpheline ne reste (« ' + m3.toast.slice(0, 50) + ' », feuille : ' + m3.panneau + ')', /Annulé/.test(m3.toast) && !m3.panneau, m3);
  }
  if (n === '2') {
    // a. accepter les envois, puis Annuler
    await L.aller(p, 'stock'); await L.calme(p, 400);
    const a0 = await R(() => ({ bandeau: !!document.querySelector('.ms-bandeau [data-ms="toutacc"]'), att: MVTS_ATT.length }));
    v('2a population : des envois attendent le gérant (' + a0.att + ')', a0.bandeau && a0.att >= 2, a0);
    await clic('.ms-bandeau [data-ms="toutacc"]');
    const a1 = await R(() => ({ bandeau: !!document.querySelector('.ms-bandeau'), att: MVTS_ATT.length })); const ta = await toast();
    v('2a : « Tout accepter » : le bandeau disparaît (' + a1.att + ' en attente), le message porte « Annuler » (« ' + ta.slice(0, 60) + ' »)', !a1.bandeau && /Annuler/.test(ta), { a1, ta });
    await annuler(); const a2 = await R(() => ({ bandeau: !!document.querySelector('.ms-bandeau [data-ms="toutacc"]'), att: MVTS_ATT.length })); const m = await mem();
    v('2a : après « Annuler », le bandeau « envois à accepter » est REVENU à l\'écran (' + JSON.stringify(a2) + ')', a2.bandeau && a2.att === a0.att, { a0, a2 });
    v('2a : après « Annuler », un message dit « Annulé » (« ' + m.toast.slice(0, 60) + ' »)', /Annulé/.test(m.toast), m);
    await cap('accepter-annule');
    // b. remplir les camions, puis Annuler
    await L.aller(p, 'boxes'); await L.calme(p, 400);
    const b0 = await R(() => ({ btn: !!document.querySelector('[data-md="remplir"]'), manque: camionsARemplir().n, carte: (document.querySelector('[data-md="fiche|v1"]') || {}).textContent.replace(/\s+/g, ' ').slice(0, 120) }));
    v('2b population : « Remplir les camions » est proposé (' + b0.manque + ' articles à remplir)', b0.btn && b0.manque >= 3, b0);
    await clic('[data-md="remplir"]'); await clic('#md-rok');
    const b1 = await R(() => ({ manque: camionsARemplir().n, carte: (document.querySelector('[data-md="fiche|v1"]') || {}).textContent.replace(/\s+/g, ' ').slice(0, 120) }));
    v('2b : après « Remplir », la carte du camion de Sophie a changé à l\'écran (' + b1.carte + ')', b1.carte !== b0.carte && b1.manque < b0.manque, { b0, b1 });
    await annuler(); const b2 = await R(() => ({ manque: camionsARemplir().n, carte: (document.querySelector('[data-md="fiche|v1"]') || {}).textContent.replace(/\s+/g, ' ').slice(0, 120) })); const mb = await mem();
    v('2b : après « Annuler », la carte du camion de Sophie à l\'ÉCRAN est revenue (' + b2.carte + ')', b2.carte === b0.carte && b2.manque === b0.manque, { b0, b2 });
    v('2b : après « Annuler », un message dit « Annulé » (« ' + mb.toast.slice(0, 60) + ' »)', /Annulé/.test(mb.toast), mb);
    await cap('remplir-annule');
    // c. un transfert de demande
    await L.aller(p, 'achats'); await L.calme(p, 400);
    await R(() => { const b = document.querySelector('[data-ac="transfert|da1"]'); if (b) b.scrollIntoView({ block: 'center' }); });
    await clic('[data-ac="transfert|da1"]'); if (await R(() => !!document.querySelector('#calque [data-ac="transfertok|da1"]'))) await clic('#calque [data-ac="transfertok|da1"]');
    await annuler(); const mc = await mem(); const c2 = await R(() => ({ btn: !!document.querySelector('[data-ac="transfert|da1"]'), cmd: COMMANDES.some(o => /2026-040/.test(o.num || '')) }));
    v('2c : après « Annuler » du transfert, plus de brouillon fantôme ouvert (feuille : « ' + mc.h2 + ' »), la demande se retraite à l\'écran (' + JSON.stringify(c2) + ')', !mc.panneau && c2.btn && !c2.cmd, { mc, c2 });
    v('2c : après « Annuler », un message dit « Annulé »', /Annulé/.test(mc.toast), mc);
  }
  if (n === '3') {
    await L.aller(p, 'stock'); await L.calme(p, 400);
    await clic('[data-ms="maj"]'); await cap('maj');
    const f = await R(() => [...document.querySelectorAll('#calque [data-ms^="q|"]')].map(b => b.dataset.ms)); console.log('  · choix de la feuille « Mettre à jour » :', JSON.stringify(f));
    await clic('#calque [data-ms="q|compter"]'); await L.calme(p, 300);
    const lieux = await R(() => [...document.querySelectorAll('#calque [data-ms^="cpt|"]')].map(b => b.dataset.ms)); console.log('  · lieux proposés :', JSON.stringify(lieux));
    if (lieux.length) await clic('#calque [data-ms="' + (lieux.find(x => /atelier/.test(x)) || lieux[0]) + '"]'); await L.calme(p, 400); await cap('compter');
    const avant = await R(() => ({ n: document.querySelectorAll('#calque [data-mscq]').length, att: MVTS.length }));
    v('3 population : la feuille de comptage propose des lignes (' + avant.n + ')', avant.n >= 3, avant);
    const champ = p.locator('#calque [data-mscq]').first(); const val = Number(await champ.inputValue()); await champ.fill(String(Math.max(0, val - 1))); await L.calme(p, 300);
    const pied = await R(() => (document.querySelector('#calque .ms-csom') || {}).textContent || ''); v('3 : l\'écart se lit au pied pendant la frappe (« ' + pied.trim() + ' »)', /1 écart/.test(pied), pied);
    await cap('ecart');
    await clic('#calque [data-ms="cok"]'); await L.calme(p, 400); const tt = await toast();
    v('3 : l\'enregistrement du comptage porte « Annuler » (« ' + tt.slice(0, 80) + ' »)', /Annuler/.test(tt), tt);
    await R(() => { const b = [...document.querySelectorAll('#contenu button')].find(e => /Ce qui a bougé/.test(e.textContent)); if (b) b.click(); }); await L.calme(p, 400);
    const j = await R(() => document.getElementById('contenu').innerText.split('\n').slice(0, 25).join(' | ')); v('3 : « Ce qui a bougé » montre le comptage du jour', /compté/.test(j), j.slice(0, 160)); await cap('journal');
    await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); }); await L.calme(p, 600);
    const m = await mem(); const j2 = await R(() => document.getElementById('contenu').innerText);
    v('3 : après « Annuler », le journal affiché n\'a plus la ligne de comptage du jour ET un message dit « Annulé » (« ' + m.toast.slice(0, 50) + ' »)', /Annulé/.test(m.toast), { m, avecCompte: /Julie a compté l’atelier/.test(j2) });
  }
  v(tag + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });

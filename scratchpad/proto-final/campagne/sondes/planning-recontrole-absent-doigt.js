// Campagne « planning », étape 3 : poser une intervention chez une personne ABSENTE, AU DOIGT (téléphone) — le parcours P6 du correcteur
// ne le joue pas (colonne de l'absent hors écran). Appui long sur la carte, glisser jusqu'au bord pour faire défiler, relâcher sur la colonne de l'absent.
// Usage : timeout 300 node planning-recontrole-absent-doigt.js [profil] [nuit]       « N ✓ · M ✗ », code 1 si un contrôle tombe.
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'iphone', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning-recontrole/';
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  const abs = await c.p.evaluate(() => { const a = ABSENCES.find(x => x.du <= AUJ && AUJ <= x.au) || ABSENCES[0]; return { t: a.tech, d: a.du <= AUJ && AUJ <= a.au ? AUJ : a.du, type: a.type }; });
  await c.p.evaluate(d => { if (location.hash !== '#planning') aller('planning'); plVue = 'jour'; plRef = d; plMasques = new Set(); rendre(); scrollTo(0, 0); }, abs.d); await L.calme(c.p, 600);
  const it = await c.p.evaluate(({ d, t }) => { const i = INTS.find(x => x.d === d && x.tech && x.tech !== t && x.st !== 'fait' && x.st !== 'annulee'); return i ? { id: i.id, tech: i.tech, h: i.h } : null; }, { d: abs.d, t: abs.t });
  L.v('absent · une intervention à glisser existe ce jour-là (' + abs.t + ' est absent : ' + abs.type + ')', !!it, [it, abs]); if (!it) { L.bilan(); await L.fermer(); process.exit(1); }
  const place = () => c.p.evaluate(({ id, t }) => { const card = document.querySelector('.pc[data-int="' + id + '"] .t'), col = document.querySelector('.pl-col[data-tech="' + t + '"]'); const r = card.getBoundingClientRect(), q = col.getBoundingClientRect(); return { cx: r.left + 30, cy: r.top + r.height / 2, colx: q.left + q.width / 2, coly: Math.min(innerHeight - 160, Math.max(160, q.top + 160)), colL: q.left, colR: q.right, iw: innerWidth }; }, { id: it.id, t: abs.t });
  // amener la carte dans l'écran, au milieu de la hauteur
  await c.p.evaluate(id => document.querySelector('.pc[data-int="' + id + '"]').scrollIntoView({ block: 'center', inline: 'nearest' }), it.id); await L.calme(c.p, 500);
  let p = await place(); console.log('   départ :', JSON.stringify(p));
  const cdp = await c.ctx.newCDPSession(c.p), T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const sens = p.colx < p.cx ? -1 : 1, bord = sens < 0 ? 14 : p.iw - 14;
  await T('touchStart', p.cx, p.cy); await c.p.waitForTimeout(600);
  // glisser jusqu'au bord : la grille doit défiler d'elle-même
  const n = 10; for (let k = 1; k <= n; k++) { await T('touchMove', p.cx + (bord - p.cx) * k / n, p.cy); await c.p.waitForTimeout(40); }
  let vu = false; for (let k = 0; k < 90 && !vu; k++) { await T('touchMove', bord + (sens < 0 ? (k % 2) : -(k % 2)), p.cy); await c.p.waitForTimeout(60); p = await place(); vu = p.colL > 20 && p.colR < p.iw - 20; }
  console.log('   colonne de l’absent à l’écran :', vu, JSON.stringify(p));
  L.v('absent · le défilement automatique au bord amène la colonne de l’absent à l’écran', vu, p);
  await T('touchMove', p.colx, p.coly); await c.p.waitForTimeout(300);
  const survol = await c.p.evaluate(t => { const col = document.querySelector('.pl-col[data-tech="' + t + '"]'); return { cible: col.classList.contains('cible'), nonCible: col.classList.contains('cible-non') }; }, abs.t);
  console.log('   survol de la colonne de l’absent :', JSON.stringify(survol));
  await L.capture(c, CAP + `absent-doigt-pendant-${profil}${nuit ? '-nuit' : ''}.png`);
  await T('touchEnd'); await cdp.detach(); await L.calme(c.p, 700);
  const ap = await c.p.evaluate(id => INTS.find(x => x.id === id).tech, it.id), t = await toast(c.p);
  console.log('   après : tech =', ap, '| message :', t);
  L.v('absent · la carte reste chez son technicien', ap === it.tech, { avant: it.tech, apres: ap });
  L.v('absent · la colonne de l’absent est marquée « interdit » pendant le survol (cible-non)', survol.nonCible && !survol.cible, survol);
  L.v('absent · un message dit pourquoi (« absent … Congé ») et que rien n’a bougé', /absent/i.test(t) && /(Congé|rien n)/.test(t), t);
  await L.capture(c, CAP + `absent-doigt-apres-${profil}${nuit ? '-nuit' : ''}.png`);
  L.v('absent · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();

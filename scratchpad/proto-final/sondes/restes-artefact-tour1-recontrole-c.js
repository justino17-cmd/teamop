// RECONTRÔLE ADVERSE des restes « artefact », tour 1 — partie C (17 novembre 2026). Ne modifie aucune page.
// La fiche du correcteur dit que « Revenir au mode test » « suit tous les écrans de connexion » et n'est lié qu'à la présence de #cnx. Or l'écran de
// chargement (#cnx.charge : le logo qui se dessine, « par TEAM OP ») et les écrans d'OP Security portent eux aussi l'identifiant #cnx : on joue le chemin
// d'une personne qui a pris le bouton, tape son identifiant et son mot de passe provisoire, et on regarde CE QUE LE LIEN FAIT sur chacun de ces écrans
// (visible ? lisible ? chevauche quelque chose ? ramène à la revue ?). Population d'abord. 127.0.0.1 seulement.   PROFILS=mac,iphone  JOUR=1
const P = require('./recontrole-artefact-pose.js'), { lib: L, v } = P, S = require('./secu-commun.js');
const fs = require('fs'), path = require('path');
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rc-artefact1'; fs.mkdirSync(CAP, { recursive: true });
const calmer = f => f.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
const lire = p => p.evaluate(() => { const l = document.getElementById('cnx-test'), cn = document.getElementById('cnx'), r = l ? l.getBoundingClientRect() : null;
  const visible = !!l && getComputedStyle(l).display !== 'none' && r.width > 4;
  let chev = [], haut = null; if (visible) { const p = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); haut = p ? p.tagName + '#' + p.id + '.' + String(p.className).slice(0, 24) : null;
    chev = [...cn.querySelectorAll('*')].filter(x => { if (x.contains(l) || l.contains(x) || x.children.length > 3) return false; const q = x.getBoundingClientRect(); if (q.width < 4 || q.height < 4) return false; const s = getComputedStyle(x); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < .1) return false;
      if (!(x.textContent.trim() || /^(IMG|svg)$/i.test(x.tagName))) return false; return !(q.right <= r.left + 1 || q.left >= r.right - 1 || q.bottom <= r.top + 1 || q.top >= r.bottom - 1); }).map(x => x.tagName + '.' + String(x.className && x.className.baseVal === undefined ? x.className : '').slice(0, 20) + ':' + x.textContent.trim().slice(0, 20)); }
  return { cnx: !!cn, charge: !!cn && cn.classList.contains('charge'), forme: cn ? ((cn.querySelector('form') || {}).id || (cn.classList.contains('charge') ? 'charge' : '?')) : null, visible, chev, haut, app: typeof MODE_APP !== 'undefined' && !!MODE_APP,
    couleur: l ? getComputedStyle(l).color : null, bande: !!document.querySelector('.rl-bande') }; });
(async () => {
  for (const profil of PROFILS) for (const nuit of (process.env.JOUR ? [false] : [false, true])) {
    const T = `${profil}/${nuit ? 'nuit' : 'jour'}`, nc = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    const c = await P.ouvrir({ profil, qui: null, app: false, nuit, guide: true }, {}); await calmer(c.p); await L.calme(c.p, 600);
    await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first());
    await L.attendre(c.p, () => !!document.querySelector('#cnx .cn-carte'), 30000); await c.p.waitForTimeout(800); await calmer(c.p);
    let e = await lire(c.p); v(`${T} C : population (connexion affichée, lien de retour visible)`, e.cnx && !e.charge && e.visible, e);
    const prov = await S.provisoire(c, 'sm'); v(`${T} C : population (le mot de passe provisoire de la technicienne se lit dans « Démonstration »)`, !!prov, prov ? 'lu' : prov);
    // une personne complète (secu-commun.activer) : connexion → activation d'OP Security → code → mot de passe → l'application. À chaque écran on relève le lien ;
    // et, en parallèle, on guette l'écran de chargement (#cnx.charge : le logo qui se dessine) pour le relever et le capturer quand il passe.
    const vus = {}, ch = []; let fini = false, cap = false;
    const guet = (async () => { while (!fini) { const x = await lire(c.p).catch(() => null); if (x && x.charge) { ch.push(x); if (!cap) { cap = true; await c.p.screenshot({ path: path.join(CAP, nc + '-3-chargement.png') }).catch(() => {}); } } await c.p.waitForTimeout(120); } })();
    const noter = nom => async () => { await c.p.waitForTimeout(500); vus[nom] = await lire(c.p); await c.p.screenshot({ path: path.join(CAP, nc + '-4-' + nom + '.png') }).catch(() => {}); };
    let plante = null; try { await S.activer(c, 'sm', { etape: async n => { await noter(n)(); } }); } catch (x) { plante = String(x && x.message || x); }
    fini = true; await guet;
    v(`${T} C : population (la personne a traversé activation, vérification, mot de passe : ${plante || 'sans accroc'} ; écrans relevés ${Object.keys(vus).join(',')})`, !plante && ['A', 'B', 'C'].every(k => vus[k] && vus[k].cnx), { plante, vus: Object.keys(vus) });
    for (const k of ['A', 'B', 'C']) if (vus[k]) v(`${T} C : écran ${k} d'OP Security (${vus[k].forme}) : le lien est visible et ne chevauche rien (visible ${vus[k].visible}, chevauche ${vus[k].chev.length})`, vus[k].visible && vus[k].chev.length === 0, vus[k]);
    v(`${T} C : population (l'écran de chargement a été relevé ${ch.length} fois pendant la connexion)`, ch.length > 0, ch.length);
    // le lien reste posé sur l'écran de chargement (il suit #cnx) : ce n'est pas un défaut tant qu'il se lit et ne touche pas le logo — la capture le montre
    if (ch.length) { const chev = ch.filter(x => x.chev.length);
      v(`${T} C : pendant l'écran de chargement, le lien ne chevauche rien (visible ${ch.filter(x => x.visible).length}/${ch.length}, chevauche ${chev.length}) — capture à regarder`, chev.length === 0, ch[0]); }
    const err = (c.err || []).filter(x => !/hors-ligne|horsLigne/.test(x)); v(`${T} C : aucune erreur JavaScript`, !err.length, err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// Campagne « planning » : RECENSE (depuis le DOM) puis TOUCHE chaque geste de chaque vue du Planning, sur un profil donné.
// Usage : timeout 900 node planning-gestes.js <profil> [nuit] [vue …]   (vues : jour semaine mois general multi carte ; défaut : toutes)
// Sortie : tableau lisible + campagne/planning-gestes-<profil>.json. « N ✓ · M ✗ », code 1 si un contrôle tombe.
// Un geste « fait quelque chose » s'il change l'état observable (hash, titre, panneau, toast, contenu, calque) ; les cartes
// du planning (data-int, data-bur) s'ouvrent en fiche. Chaque geste est joué sur une page remise d'aplomb.
const L = require('../../lib.js'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const VUES = args.filter(a => ['jour','semaine','mois','general','multi','carte'].includes(a)); if (!VUES.length) VUES.push('jour','semaine','mois','general','multi','carte');
const RES = [];
async function tagger(p) { return p.evaluate(() => { const R = document.querySelector('#contenu'), vus = [], sig = new Set(); let n = 0;
  document.querySelectorAll('[data-zz]').forEach(e => e.removeAttribute('data-zz'));
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const clic = e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'SUMMARY' || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || ([...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name)) && cs.cursor === 'pointer');
    if (!clic || e.closest('details:not([open])') && e.tagName !== 'SUMMARY' || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-zz').map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 70), s = e.tagName + '|' + lib + '|' + d; if (sig.has(s)) continue; sig.add(s);
    e.setAttribute('data-zz', String(n)); vus.push({ i: n++, balise: e.tagName, lib, data: d, sansNom: !lib, l: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) }); }
  return vus; }); }
async function etatPlus(p) { const e = await L.etat(p); e.fenetre = await p.evaluate(() => { const f = document.getElementById('fenetre'); return f ? f.innerHTML.length : 0; }); e.fenTitre = await p.evaluate(() => { const f = document.querySelector('#fenetre .fen h2, #fenetre h2, #fenetre .fen-titre'); return f ? f.textContent.replace(/\s+/g,' ').trim().slice(0,60) : ''; }); e.volets = await p.evaluate(() => [...document.querySelectorAll('#contenu details')].map(d => d.open ? 1 : 0).join('')); return e; }
async function pret(c, vue) { await L.ranger(c.p); await c.p.evaluate(v => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = AUJ; plMasques = new Set(); plJours = 6; rendre(); window.scrollTo(0, 0); }, vue); await L.calme(c.p, 450); }
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }); console.log('== profil', profil, nuit ? 'nuit' : 'jour', 'erreurs au départ', c.err.length);
  for (const vue of VUES) {
    await pret(c, vue); let liste = await tagger(c.p); console.log('\n== vue', vue, '—', liste.length, 'gestes recensés');
    const total = liste.length; let touches = 0, rien = 0;
    for (let k = 0; k < total; k++) {
      const sigAttendue = liste[k].balise + '|' + liste[k].lib + '|' + liste[k].data; const l2 = await tagger(c.p); const cible = l2.find(x => x.balise + '|' + x.lib + '|' + x.data === sigAttendue);
      if (!cible) { RES.push({ vue, lib: liste[k].lib, data: liste[k].data, issue: 'introuvable après remise d’aplomb' }); console.log('  ?', liste[k].lib, '(introuvable)'); continue; }
      const av = await etatPlus(c.p); const ok = await L.toucher(c, '[data-zz="' + cible.i + '"]', { delai: 5000 }); await L.calme(c.p, 350); const ap = await etatPlus(c.p);
      const ch = L.change(av, ap).filter(x => x !== 'focus'); touches += ok ? 1 : 0;
      const sortie = { vue, lib: cible.lib, data: cible.data, l: cible.l, h: cible.h, touche: ok, change: ch, hash: ap.hash, h1: ap.h1, panneau: ap.panneau, fenTitre: ap.fenTitre, toast: ap.toast };
      RES.push(sortie); const faitRien = ok && !ch.length; if (faitRien) rien++;
      console.log('  ' + (ok ? (faitRien ? '·' : '→') : '✗'), (cible.balise + ' ' + cible.lib + ' ' + cible.data).slice(0, 90), '=>', ch.join(',') || 'RIEN', ap.panneau ? '| panneau: ' + ap.panneau.slice(0, 50) : '', ap.fenTitre ? '| fenêtre: ' + ap.fenTitre : '', ap.toast ? '| toast: ' + ap.toast.slice(0, 70) : '', ap.hash !== av.hash ? '| ' + ap.hash : '');
      const mut = ap.toast || ap.hash !== '#planning' || ap.fenetre > 0; if (mut) { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); }
      await pret(c, vue);
    }
    L.v('vue ' + vue + ' : chaque geste recensé a été touché (' + touches + '/' + total + ')', touches === total, 'touchés ' + touches + '/' + total);
    L.v('vue ' + vue + ' : aucun geste ne reste sans effet (' + rien + ' sans effet)', rien === 0, RES.filter(r => r.vue === vue && r.touche && !r.change.length).map(r => r.lib));
  }
  L.v('aucune erreur JavaScript pendant les gestes', c.err.length === 0, c.err.slice(0, 5));
  fs.writeFileSync(path.join(__dirname, '..', 'planning-gestes-' + profil + (nuit ? '-nuit' : '') + '.json'), JSON.stringify({ profil, nuit, RES, err: c.err }, null, 1));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();

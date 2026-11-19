// Le menu long du gérant ne perd pas sa place d'un écran à l'autre (16 novembre 2026, relecture « ordinateur-code-2 »).
// Avant : rendre() réécrivait #menu en entier, la colonne revenait en haut et la ligne qu'on venait de toucher sortait de la vue ;
// sur un portable 1366×768 on ne voyait que 8 lignes sur 19 (21 depuis « Sécurité », voir MENU-FINAL.md), sans repère qu'il y en avait d'autres.
// Ici : (1) la colonne garde son défilement, (2) la ligne courante est toujours dans la colonne, (3) un repère (voile) dit qu'il en reste
// dessous, (4) sur un écran bas, la tête de la colonne se tasse pour laisser plus de lignes.
// ⛔ 127.0.0.1 seulement. Chaque profil compte d'abord sa population (colonne défilable, lignes présentes).
const { L } = require('./menu-commun.js'), v = L.v;
const cap = process.env.CAP;
// Les lignes ATTENDUES se lisent dans MENU-FINAL.md (commentaire « lignes-gerant »), jamais en chiffre écrit ici : la double authentification
// y a ajouté « Sécurité » (décision du chef, 17/11 12 h 30) et la sonde, qui comptait 19 en dur, tombait sans que le menu soit faux.
const ATTENDUES = (require('fs').readFileSync(require('path').join(__dirname, '..', 'MENU-FINAL.md'), 'utf8').match(/<!-- lignes-gerant: (.+?) -->/) || [, ''])[1].split('|').filter(Boolean);
if (!ATTENDUES.length) { console.log('✗ MENU-FINAL.md ne porte pas la ligne « lignes-gerant » : rien à comparer'); process.exit(1); }   // dossier de captures (hors dépôt), à REGARDER
(async () => {
  for (const profil of ['mac720', 'windows', 'mac', 'ipad']) {
    for (const nuit of [false, true]) {
      if (nuit && profil !== 'windows' && profil !== 'ipad') continue;
      const c = await L.ouvrir({ profil, qui:'marc', nuit }), tag = profil + (nuit ? ' nuit' : ' jour');
      const mesure = () => c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'), a = l.querySelector('a.on'), r = a && a.getBoundingClientRect(), m = l.getBoundingClientRect();
        return { top:Math.round(l.scrollTop), sh:l.scrollHeight, ch:l.clientHeight, lignes:l.querySelectorAll('a').length, noms:[...l.querySelectorAll('a')].map(x => (x.querySelector('.m-n') || x).textContent.trim()), on:a ? (a.querySelector('.m-n') || a).textContent.trim() : null, dedans:!!a && r.top >= m.top - 1 && r.bottom <= m.bottom + 1,
          visibles:[...l.querySelectorAll('a')].filter(x => { const q = x.getBoundingClientRect(); return q.top >= m.top - 1 && q.bottom <= m.bottom + 1; }).length, voile:l.classList.contains('m-plus-bas'), haut:l.classList.contains('m-plus-haut'), page:scrollY }; });
      const e0 = await mesure();
      v(`${tag} : population (${ATTENDUES.length} lignes de menu, colonne ${e0.ch} px de haut)`, e0.lignes === ATTENDUES.length && e0.ch > 150, e0);
      v(`${tag} : les lignes sont celles de MENU-FINAL.md, dans l'ordre`, JSON.stringify(e0.noms) === JSON.stringify(ATTENDUES), { en_trop:e0.noms.filter(n => !ATTENDUES.includes(n)), manquantes:ATTENDUES.filter(n => !e0.noms.includes(n)), noms:e0.noms });
      // le repère : tant qu'il reste des lignes dessous, le voile du bas existe ; en bas, plus
      if (e0.sh > e0.ch + 4) { v(`${tag} : la colonne défile, donc un repère « il en reste dessous » est posé`, e0.voile, e0);
        await c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'); l.scrollTop = l.scrollHeight; l.dispatchEvent(new Event('scroll')); }); await L.calme(c.p, 200);
        const e1 = await mesure(); v(`${tag} : tout en bas, le voile du bas s'éteint et celui du haut s'allume`, !e1.voile && e1.haut, e1);
        for (const [nom, hash] of [['Véhicules', 'vehicules'], ['Équipe', 'equipe']]) {
          await c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'); l.scrollTop = l.scrollHeight; }); await L.calme(c.p, 150);
          const avant = await mesure();
          const ok = await L.toucher(c, `#menu .m-liste a[href="#${hash}"]`); await L.calme(c.p, 500);
          const ap = await mesure();
          v(`${tag} : on touche « ${nom} » (la page change, la ligne courante est « ${nom} »)`, ok && ap.on === nom, ap);
          v(`${tag} : après « ${nom} », la colonne n'est pas revenue en haut (avant ${avant.top} px, après ${ap.top} px)`, avant.top > 20 && ap.top > 20, { avant, ap });
          v(`${tag} : après « ${nom} », la ligne courante est visible dans la colonne`, ap.dedans, ap);
        }
        if (cap) await L.capture(c, `${cap}/menu-${tag.replace(/ /g, '-')}.png`);
      } else v(`${tag} : le menu tient en entier (pas de défilement) : rien à garder`, e0.visibles === ATTENDUES.length, e0);
      // un écran qui en montre peu : combien de lignes lit-on sans défiler ? (tête tassée sur écran bas)
      if (e0.ch < 500) v(`${tag} : écran bas : au moins 9 lignes lisibles sans défiler (${e0.visibles})`, e0.visibles >= 9, e0);
      v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
      await L.fin(c);
    }
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();

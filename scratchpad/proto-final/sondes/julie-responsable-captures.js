// Julie en « responsable » : Achats sans, puis avec la case « Créer » ; quatre appareils, jour et nuit. Captures à REGARDER (hors dépôt).
const L = require('../lib.js'), v = L.v, fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/julie-resp/'; fs.mkdirSync(CAP, { recursive: true });
const ROUTES = (process.env.ROUTES || 'achats,taches').split(',');
(async () => {
  for (const profil of (process.env.PROFIL || 'iphone,android,ipad,mac').split(',')) for (const nuit of [0, 1]) {
    const c = await L.ouvrir({ profil, qui: 'julie', nuit: !!nuit });
    for (const avec of [0, 1]) {
      await c.p.evaluate(a => { const j = eqDe('julie'); j.role = 'Responsable'; j.droits = copieProfil('resp'); j.droits.cats.achats.c = a; }, avec);
      for (const r of ROUTES) {
        await L.aller(c.p, r);
        const m = await c.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, creer: [...document.querySelectorAll('#contenu button, #contenu .btn')].filter(b => /cr[ée]er|nouvelle? |nouveau|＋|\+/i.test(b.textContent) && b.offsetParent).map(b => b.textContent.trim().slice(0, 30)) }));
        const nom = `${profil}-${nuit ? 'nuit' : 'jour'}-${avec ? 'avec' : 'sans'}-${r}`;
        await c.p.screenshot({ path: CAP + nom + '.png' });
        v(`${nom} : rien ne glisse de côté`, m.sw <= m.cw + 1, m);
        if (r === 'achats') console.log(nom, 'boutons de création :', JSON.stringify(m.creer));
      }
    }
    v(`${profil} ${nuit ? 'nuit' : 'jour'} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });

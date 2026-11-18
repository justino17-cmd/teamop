// Recontrôle adverse du tour 4 du Planning : ce que la correction (`flex-shrink:0` sur les lignes d'un panneau) pouvait casser en face — le BAS de la liste.
// Les lignes ne se tassent plus, donc la liste dépasse et le panneau DÉFILE : on exige que la dernière ligne soit atteignable et ENTIÈRE au bas du panneau
// (ni sous l'encoche, ni sous un pied collant), qu'un toucher sur une ligne du fond ouvre bien sa fiche, qu'un nom très long ne sorte pas de la ligne,
// et que la fermeture rende la page défilable. Chaque tuile de chaque vue, ordinateur et téléphone, jour et nuit.
// Usage : timeout 580 node restes-planning-4-recontrole-fond.js <profil> [nuit]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-4-rc/';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  let tuiles = 0, longues = 0, bas = [], coupe = [], deborde = [], ouvre = [], page = [];
  for (const v of ['semaine', 'mois', 'general']) {
    await c.p.evaluate(v => { try { aller('planning'); } catch (e) {} plVue = v; plRef = AUJ; plMasques = new Set(); multiExclu = new Set(); rendre(); scrollTo(0, 0); }, v); await L.calme(c.p, 500);
    const ks = [...new Set(await c.p.evaluate(() => [...document.querySelectorAll('#contenu [data-kpi]')].map(e => e.dataset.kpi)))];
    for (const k of ks) {
      await c.p.evaluate(k => { const e = document.querySelector(`#contenu [data-kpi="${k}"]`); if (e) e.click(); }, k); await L.calme(c.p, 600);
      const m = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const R = [...P.querySelectorAll('.ligne-clic, .kpi-l')];
        P.scrollTop = P.scrollHeight; const pr = P.getBoundingClientRect(), cs = getComputedStyle(P), pb = parseFloat(cs.paddingBottom) || 0, d = R[R.length - 1], dr = d && d.getBoundingClientRect();
        return { n: R.length, defile: P.scrollHeight > P.clientHeight + 2, bas: d ? Math.round(pr.bottom - parseFloat(cs.borderBottomWidth || 0) - dr.bottom) : null, pad: Math.round(pb), dernier: d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '',
          hors: R.filter(x => { const r = x.getBoundingClientRect(); return r.right > pr.right + 1 || r.left < pr.left - 1; }).length,
          debordeTexte: R.filter(x => x.scrollWidth > x.clientWidth + 2 || x.scrollHeight > x.clientHeight + 2).length,   // largeur OU hauteur : le défaut d'origine était une ligne plus basse que son texte
          pageX: document.documentElement.scrollWidth > innerWidth + 1 }; });
      if (!m) continue; tuiles++; if (m.n >= 8 && m.defile) longues++;
      if (m.n && m.defile && !(m.bas >= 0)) bas.push(`${v}/${k} : la dernière ligne « ${m.dernier} » dépasse de ${-m.bas} px sous le panneau`);
      if (m.hors) deborde.push(`${v}/${k} : ${m.hors} ligne(s) hors du panneau`); if (m.debordeTexte) coupe.push(`${v}/${k} : ${m.debordeTexte} ligne(s) au texte coupé`); if (m.pageX) page.push(`${v}/${k} : la page glisse de côté`);
      if (m.n >= 8 && v === 'mois' && k === 'int') await L.capture(c, CAP + `fond-${profil}${nuit ? '-nuit' : ''}.png`);
      // un toucher sur la dernière ligne (au fond) ouvre une fiche
      if (m.n && /int|retard|plan/.test(k)) { const ok = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); const R = [...P.querySelectorAll('.ligne-clic')]; const d = R[R.length - 1]; if (!d) return null; d.scrollIntoView({ block: 'center' }); d.click(); return true; }); await L.calme(c.p, 600);
        if (ok) { const ap = await c.p.evaluate(() => ({ hash: location.hash, n: document.querySelectorAll('#calque .panneau').length })); if (ap.hash === '#planning') ouvre.push(`${v}/${k} : un toucher sur la dernière ligne n'ouvre rien (${JSON.stringify(ap)})`);
          // on revient au Planning, dans la même vue, pour la tuile suivante
          await c.p.evaluate(v => { try { aller('planning'); } catch (e) {} plVue = v; plRef = AUJ; plMasques = new Set(); multiExclu = new Set(); rendre(); scrollTo(0, 0); }, v); await L.calme(c.p, 500); } }
      await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 250);
    }
  }
  const pg = await c.p.evaluate(() => { const b = document.body; return { ov: getComputedStyle(b).overflow, calque: document.getElementById('calque').innerHTML.length }; });
  L.v('population : tuiles ouvertes ≥ 12 dont au moins 2 listes longues qui défilent', tuiles >= 12 && longues >= 2, { tuiles, longues });
  L.v('la dernière ligne de chaque liste est ENTIÈRE au bas du panneau', bas.length === 0, bas);
  L.v('aucune ligne ne sort du panneau', deborde.length === 0, deborde);
  L.v('aucun texte de ligne n\'est coupé', coupe.length === 0, coupe);
  L.v('la page ne glisse pas de côté', page.length === 0, page);
  L.v('un toucher sur une ligne du fond ouvre sa fiche', ouvre.length === 0, ouvre);
  L.v('fermer le panneau rend la page : calque vide', pg.calque === 0, pg);
  L.v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fermer(); process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(2); });

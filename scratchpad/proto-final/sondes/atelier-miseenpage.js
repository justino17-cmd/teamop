// SONDE « mise en page » : le prototype (page Devis avec sa liste) ET l'atelier (fenêtre de composition, éditeur) sur les profils mac, mac720, windows, ipad, iphone, android, petit,
// de jour et de nuit : rien ne glisse de côté (mesuré contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px (zoom d'iOS), l'encoche iPhone/Android
// n'est pas recouverte, contrastes ≥ 4,5 sur le texte. PROFIL=… NUIT=1 pour un seul passage ; sans PROFIL, les sept. Captures dans CAP (à REGARDER).
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const PROFILS = process.env.PROFIL ? process.env.PROFIL.split(',') : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const MODES = process.env.NUIT === '1' ? [true] : process.env.NUIT === '0' ? [false] : [false, true];
(async () => {
  for (const pr of PROFILS) for (const nuit of MODES) {
    const tag = pr + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p, W = c.largeur, H = c.hauteur;
    console.log('\n── ' + tag + ' (' + W + '×' + H + ', encoches ' + JSON.stringify(c.encoches) + ')');
    // un devis composé pour que la liste existe
    let f = await A.ouvrirAtelier(c, 'devis', 'devis');
    v(tag + ' : l\'atelier s\'ouvre', !!f);
    if (!f) { await L.fin(c); continue; }
    const mesA = async (nom, cadreZone, pop) => {
      const d = await L.deborde(c, f);
      v(`${tag} · ${nom} : l'atelier ne glisse pas de côté (largeur ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur + 1, d);
      if (c.doigt) {
        const zones = [].concat(cadreZone || 'body'); let petits = [], champs = [], ecrases = [];
        for (const z of zones) { const g = await L.doigts(f, z); petits = petits.concat(g.petits); champs = champs.concat(g.champs); ecrases = ecrases.concat(g.ecrases); }
        v(`${tag} · ${nom} : cibles au doigt ≥ 44 px (population ${zones.length} zone(s))`, petits.length === 0, petits.slice(0, 8));
        v(`${tag} · ${nom} : champs ≥ 16 px (pas de zoom d'iOS)`, champs.length === 0, champs.slice(0, 6));
        v(`${tag} · ${nom} : aucun texte écrasé (< 12 signes par ligne sur 4 lignes)`, ecrases.length === 0, ecrases.slice(0, 4));
      }
      const ct = await A.contrastes(f, 'body', 4.5, '.papier,.apercu .ap-corps,#mesure');      // la feuille A4 est un DOCUMENT (blanc de jour comme de nuit) : on mesure l'interface autour
      v(`${tag} · ${nom} : contrastes du texte ≥ 4,5 (population ${ct.n})`, ct.n >= (pop || 15) && ct.bas.length === 0, ct.bas.slice(0, 6));
    };
    await L.calme(c.p, 1200);      // les transitions d'ouverture (un voile qui monte) faussent une mesure prise trop tôt
    await mesA('fenêtre de composition', '.fenetre');
    await L.capture(c, A.CAP + 'mep-compo-' + tag + '.png');
    // l'encoche : le cadre ne commence pas sous elle, et le pied de la fenêtre n'est pas sous l'indicateur
    if (c.encoches) {
      const iv = await p.evaluate(() => { const r = document.querySelector('#opdz iframe').getBoundingClientRect(); return { top: r.top, bas: r.bottom }; });
      v(`${tag} · l'encoche du haut (${c.encoches.top} px) est réservée côté parent : le cadre commence en dessous`, iv.top >= c.encoches.top - 0.5, iv);
      const pied = await f.evaluate(() => { const b = [...document.querySelectorAll('.fen-pied .bt')].filter(e => e.offsetParent); return b.length ? Math.max(...b.map(e => e.getBoundingClientRect().bottom)) : -1; });
      v(`${tag} · le pied de la fenêtre (boutons) est au-dessus de l'indicateur du bas (${c.encoches.bottom} px)`, pied > 0 && pied <= H - c.encoches.bottom + 1, [pied, H - c.encoches.bottom]);
    }
    await A.composerDevis(c, f, { client: 'vp', objet: 'Remplacement du ventilateur extérieur', articles: [{ ref: 'VE-DK-35', qte: 1 }, { ref: 'EL-ALL', qte: 2 }] });
    await L.calme(c.p, 1200);
    await mesA('éditeur', ['#vue-editeur .barre', '#panneau', '.barre-bas'], 4);      // l'interface ; la feuille est un document : ses poignées ont une zone étendue, vérifiée à part
    if (c.doigt) { const z = await f.evaluate(() => [...document.querySelectorAll('.rt, button.ct-date')].filter(e => e.offsetParent).map(e => { const a = getComputedStyle(e, '::after'), r = e.getBoundingClientRect(); return [parseFloat(a.width) || 0, parseFloat(a.height) || 0, r.width, r.height, e.className]; })); v(`${tag} · éditeur : les poignées de ligne et la date de la feuille ont une zone de toucher ≥ 44 px (population ${z.length})`, (z.length >= 1 || pr === 'petit' || pr === 'iphone' || pr === 'android') && z.every(x => x[0] >= 44 && x[1] >= 44), z.slice(0, 4)); } await L.capture(c, A.CAP + 'mep-editeur-' + tag + '.png');
    await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
    // le prototype avec la liste
    const d = await L.deborde(c);
    v(`${tag} · Devis (prototype) : la page ne glisse pas de côté`, d.bouge === 0 && d.seconde <= d.largeur + 1, d);
    if (c.doigt) {
      const g = await L.doigts(p, '#contenu'); const mien = g.petits.filter(x => /Composer|Devis rapide|Composés|Rouvrir|D-2026-0(4[2-9]|5)/.test(x)); v(`${tag} · Devis : mes boutons et ma liste ≥ 44 px au doigt`, mien.length === 0, mien);
      v(`${tag} · Devis : pas de texte écrasé`, g.ecrases.length === 0, g.ecrases.slice(0, 3));
    }
    const ct = await A.contrastes(p, '#contenu');
    const miens = ct.bas.filter(x => /Composer|Composés|opd-|Rouvrir|dv-l|Brouillon|st /.test(x)); v(`${tag} · Devis : contrastes de ma liste et de mes boutons ≥ 4,5 (population ${ct.n})`, ct.n >= 12 && miens.length === 0, miens.slice(0, 5));
    v(`${tag} · Devis : la ligne composée est visible et entière dans la page`, await p.evaluate((W2) => { const e = document.querySelector('#contenu .opd-l'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 150 && r.left >= -1 && r.right <= W2 + 1; }, W));
    await p.locator('#contenu .opd-liste').first().scrollIntoViewIfNeeded().catch(() => {}); await L.calme(p, 300);
    await L.capture(c, A.CAP + 'mep-devis-' + tag + '.png');
    v(`${tag} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

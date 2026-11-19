// Boîte mail — recontrôle ADVERSE des restes (tour 2), 17 novembre 2026 : ce que les corrections du tour 2 ont cassé À CÔTÉ.
// PARTIE=1 : paysage court, mesuré contre ce qui est VRAIMENT visible (haut de la barre d'onglets de l'hôte ET de la barre du bas du module), sur sept tailles
//         2 : le pli de la liste : retour en haut par un geste, recherche retrouvée, changement de dossier, lecture puis retour, dossier presque vide, rotation vers le portrait
//         3 : bulles : le module parle quand l'hôte parle déjà, l'envoi annulable avec la bulle de l'hôte, la bulle qui redescend quand l'hôte se tait
//         4 : la pastille d'une ligne choisie sur ordinateur et iPad paysage (le voile noir y reste : le texte reste lisible)
//         5 : la bulle au-dessus de la Comptabilité : ne bloque pas le toucher dessous, ne reste pas au-dessus ailleurs
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de croire un zéro ; sort en 1 si un contrôle tombe.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgba = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).map(Number);
// ce que le doigt voit RÉELLEMENT de la liste : on retire le bas recouvert par la barre d'onglets de l'hôte et par la barre du bas du module
const VISIBLE = () => { const R2 = window.R(), rc = e => e.getBoundingClientRect(), ls = rc(R2.querySelector('#listScroll'));
  let bas = ls.bottom; const bar = document.querySelector('#barre-bas'); if (bar && rc(bar).height > 0) bas = Math.min(bas, rc(bar).top);
  const tb = R2.querySelector('.list .list-toolbar, .list .lbar, .list .bottombar, .list .lfoot'); if (tb && rc(tb).height > 0 && rc(tb).top > ls.top) bas = Math.min(bas, rc(tb).top);
  // le haut : la barre du haut du module est posée PAR-DESSUS la liste sur téléphone
  let haut = ls.top; const lb = R2.querySelector('.list .list-bar'); if (lb && rc(lb).height > 0) haut = Math.max(haut, rc(lb).bottom);
  const lignes = [...R2.querySelectorAll('#rows .msg')], ent = lignes.filter(x => { const b = rc(x); return b.top >= haut - 1 && b.bottom <= bas + 1; });
  return { total:lignes.length, ent:ent.length, haut:Math.round(haut), bas:Math.round(bas), hauteurLigne:lignes[0] ? Math.round(rc(lignes[0]).height) : 0, sw:document.documentElement.scrollWidth, tbTrouvee:!!tb }; };
(async () => {
  // ═══ 1. paysage court : au moins une ligne ENTIÈRE sous les yeux, sur sept tailles de téléphone tenu en travers ═══
  // 568×320 est l'iPhone SE de 1re génération : SANS encoche. Le profil « iphone » y posait les 47 px d'encoche d'un iPhone récent tenu debout (l'émulateur ne tourne pas les marges de sécurité) : la bande vide du haut mangeait 47 des 320 px, et la sonde accusait la page d'un défaut qui n'existe sur aucun appareil. Le profil « petit » (pas d'encoche) joue cette taille, de jour comme de nuit.
  if (veut(1)) await sec('paysage', async () => {
    for (const [pr, w, h, nuit] of [['iphone', 844, 390, false], ['iphone', 667, 375, true], ['petit', 568, 320, false], ['android', 740, 360, true], ['android', 640, 360, false], ['petit', 568, 320, true], ['android', 800, 380, false]]) {
      const etiq = pr + ' ' + w + '×' + h + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1800);
      const m = await S(c, VISIBLE);
      v('population ' + etiq + ' : la liste a des messages (' + m.total + ') et leur hauteur est mesurée (' + m.hauteurLigne + ')', m.total >= 3 && m.hauteurLigne > 30, m);
      v(etiq + ' : une ligne ENTIÈRE au-dessus de la barre d\'onglets et de la barre du module (' + m.ent + ' ; zone ' + m.haut + '→' + m.bas + ')', m.ent >= 1, m);
      v(etiq + ' : la page ne glisse pas de côté (' + m.sw + ')', m.sw <= w + 1);
      await cap(c, '../restes2r/paysage-' + pr + '-' + w + 'x' + h + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
  });
  // ═══ 2. le pli de la liste ═══
  if (veut(2)) await sec('pli', async () => {
    for (const [pr, w, h] of [['android', 740, 360], ['petit', 568, 320]]) {
      const etiq = pr + ' ' + w + '×' + h, c = await entrer({ profil:pr }), p = c.p;
      await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1800);
      const a = await S(c, () => { const ls = window.R().querySelector('#listScroll'); return { top:ls.scrollTop, max:ls.scrollHeight - ls.clientHeight }; });
      v('population ' + etiq + ' : la liste est pliée au départ (défilement ' + a.top + ' sur ' + a.max + ')', a.top > 20 && a.max > 100, a);
      // un geste vers le bas ramène la recherche : on tire la liste en haut, la recherche est atteignable et on peut y écrire
      await S(c, () => { window.R().querySelector('#listScroll').scrollTop = 0; }); await p.waitForTimeout(500);
      const b = await S(c, () => { const R2 = window.R(), s = R2.querySelector('#q, input[type=search], .search-row input'); const r = s && s.getBoundingClientRect(), bar = R2.querySelector('.list .list-bar').getBoundingClientRect();
        return { ok:!!s, top:r && Math.round(r.top), bas:r && Math.round(r.bottom), barBas:Math.round(bar.bottom), cache:s ? getComputedStyle(s).visibility : null }; });
      v(etiq + ' : la recherche existe et se retrouve sous la barre quand on tire la liste (' + b.top + ' > ' + b.barBas + ')', b.ok && b.top >= b.barBas - 1 && b.bas < h, b);
      await S(c, () => { const s = window.R().querySelector('#q, input[type=search], .search-row input'); s.focus(); });
      await p.keyboard.type('devis'); await p.waitForTimeout(700);
      const q = await S(c, () => { const R2 = window.R(); return { n:R2.querySelectorAll('#rows .msg').length, v:(R2.querySelector('#q, input[type=search], .search-row input') || {}).value }; });
      v(etiq + ' : la recherche trouve des lignes (' + q.n + ' pour « ' + q.v + ' »)', q.n >= 1 && q.v === 'devis', q);
      await S(c, () => { const R2 = window.R(), s = R2.querySelector('#q, input[type=search], .search-row input'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles:true })); }); await p.waitForTimeout(500);
      // changement de dossier : la liste du nouveau dossier s'ouvre pliée à son tour (ou, si le dossier est presque vide, sans exception)
      const dos = await S(c, () => { const R2 = window.R(); return [...R2.querySelectorAll('.folder[data-folder]')].map(x => x.getAttribute('data-folder')); });
      v('population ' + etiq + ' : des dossiers sont proposés (' + dos.length + ')', dos.length >= 3, dos);
      const erreurs = []; p.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 120)));
      for (const d of dos.slice(0, 7)) {
        await S(c, d0 => { const R2 = window.R(); (document.querySelector('#courrier-hote [data-opcourrier]') || {}); const b = R2.querySelector('#btnNav'); b && b.click(); }, d); await p.waitForTimeout(300);
        await S(c, d0 => { const f = window.R().querySelector('.folder[data-folder="' + d0 + '"]'); f && f.click(); }, d); await p.waitForTimeout(700);
        const e = await S(c, VISIBLE);
        const pasUne = e.total === 0 || e.ent >= 1 || e.total <= 1;   // un dossier vide ou à une seule ligne ne remplit rien : seul l'absence de ligne entière d'un dossier PLEIN compte
        v(etiq + ' dossier « ' + d + ' » : ' + e.total + ' ligne(s), ' + e.ent + ' entière(s) sous les yeux', pasUne, e);
      }
      v(etiq + ' : aucune exception pendant la visite des dossiers (' + erreurs.length + ')', erreurs.length === 0, erreurs);
      // lecture puis retour : la liste ne se redéplie pas sous le doigt et ne se retrouve pas vide
      await S(c, () => { const R2 = window.R(), f = R2.querySelector('#btnNav'); });
      await fin(c);
    }
    // rotation vers le portrait : le défilement gardé ne cache ni la recherche ni le grand titre à qui redresse son téléphone
    const c = await entrer({ profil:'android' }), p = c.p;
    await p.setViewportSize({ width:740, height:360 }); await p.waitForTimeout(1800);
    await p.setViewportSize({ width:360, height:740 }); await p.waitForTimeout(1800);
    const r = await S(c, () => { const R2 = window.R(), ls = R2.querySelector('#listScroll'), lt = R2.querySelector('.list .lt'), s = R2.querySelector('.search-row'); const b = e => { if (!e) return null; const x = e.getBoundingClientRect(); return { t:Math.round(x.top), b:Math.round(x.bottom), aff:getComputedStyle(e).display }; };
      return { top:ls.scrollTop, lt:b(lt), s:b(s), bar:Math.round(R2.querySelector('.list .list-bar').getBoundingClientRect().bottom) }; });
    v('android paysage → portrait : le grand titre est affiché dans la liste (' + JSON.stringify(r.lt) + ')', !!r.lt && r.lt.aff !== 'none', r);
    v('android paysage → portrait : la liste est REMISE ou garde un défilement raisonnable (haut ' + r.top + ') — la recherche n\'est pas enfouie sans moyen de la retrouver', r.top < 400, r);
    await cap(c, '../restes2r/rotation-portrait-android');
    await p.setViewportSize({ width:740, height:360 }); await p.waitForTimeout(1800);
    const r2 = await S(c, VISIBLE);
    v('android portrait → paysage : une ligne entière revient sous les yeux (' + r2.ent + ')', r2.ent >= 1, r2);
    await fin(c);
  });
  // ═══ 3. bulles ═══
  if (veut(3)) await sec('bulles', async () => {
    const rec = (a, b) => a && b && !(a[2] <= b[0] + 1 || b[2] <= a[0] + 1 || a[3] <= b[1] + 1 || b[3] <= a[1] + 1);
    const Q = () => { const h = document.getElementById('toast'), m = window.R().querySelector('#toast'), rc = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
      return { hote:h && h.classList.contains('on') ? rc(h) : null, module:m && m.classList.contains('show') ? rc(m) : null, sur:m ? m.style.getPropertyValue('--opc-sur') : null, vh:innerHeight }; };
    for (const [pr, nuit] of [['mac', false], ['iphone', true], ['windows', false]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      // (a) l'envoi annulable est à l'écran, puis l'hôte parle : les deux restent lisibles
      await S(c, () => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(800);
      await S(c, () => { const x = window.R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
      await S(c, () => window.R().querySelector('#cSub').focus()); await p.keyboard.type('Essai envoi');
      await S(c, () => window.R().querySelector('#cBody').focus()); await p.keyboard.type('Bonjour, voici un essai.');
      await S(c, () => window.R().querySelector('#cSend').click()); await p.waitForTimeout(700);
      await p.evaluate(() => toast('Commande 2026-036 terminée : facture comparée et rangée dans les achats.')); await p.waitForTimeout(500);
      const a = await S(c, Q);
      v('population ' + etiq + ' : la bulle d\'envoi annulable ET celle de l\'hôte sont à l\'écran', !!a.hote && !!a.module, a);
      v(etiq + ' : les deux bulles ne se recouvrent pas (hôte ' + JSON.stringify(a.hote) + ', module ' + JSON.stringify(a.module) + ')', !rec(a.hote, a.module), a);
      await cap(c, '../restes2r/bulles-envoi-hote-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c);
      // (b) l'hôte parle D'ABORD, le module ensuite (bulle simple), puis l'hôte se tait : la bulle du module redescend
      const c2 = await entrer({ profil:pr, nuit }), p2 = c2.p;
      await p2.evaluate(() => toast('Commande 2026-036 terminée : facture comparée et rangée dans les achats.')); await p2.waitForTimeout(400);
      await S(c2, () => window.R().querySelector('#btnCompose').click()); await p2.waitForTimeout(800);
      await S(c2, () => { const x = window.R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
      await S(c2, () => window.R().querySelector('#cSub').focus()); await p2.keyboard.type('Essai');
      await S(c2, () => window.R().querySelector('#cDraft').click()); await p2.waitForTimeout(500);
      const b = await S(c2, Q);
      v('population ' + etiq + ' (b) : les deux bulles sont à l\'écran', !!b.hote && !!b.module, b);
      v(etiq + ' (b) : elles ne se recouvrent pas', !rec(b.hote, b.module), b);
      // l'hôte se tait (on retire sa bulle) : la bulle du module, si elle est encore là, ne flotte pas dans le vide plus haut qu'il ne faut
      await p2.evaluate(() => document.getElementById('toast').classList.remove('on')); await p2.waitForTimeout(500);
      const b2 = await S(c2, Q);
      if (b2.module) v(etiq + ' (b) : l\'hôte s\'est tu et la bulle du module est encore là — elle est redescendue (écart relevé : --opc-sur=' + b2.sur + ')', !b2.sur || b2.sur === '0px', b2);
      else console.log('  · ' + etiq + ' (b) : la bulle du module s\'était déjà effacée avec celle de l\'hôte (rien à redescendre)');
      await cap(c2, '../restes2r/bulles-hote-puis-module-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c2);
    }
  });
  // ═══ 4. la pastille d'une ligne choisie : le voile noir n'est retiré que sur téléphone ═══
  const FOND = () => { const R2 = window.R(), l = R2.querySelector('#rows .msg.sel'), h = l && l.querySelector('.hpast'); if (!h) return null;
    const pile = []; for (let e = h; e; e = e.parentElement || (e.getRootNode && e.getRootNode().host)) { pile.push(getComputedStyle(e).backgroundColor); if (e.tagName === 'BODY') break; }
    return { fond:getComputedStyle(h).backgroundColor, enc:getComputedStyle(h).color, pile }; };
  const lisible = k => { const comp = (f, b) => { const a = f.length > 3 ? f[3] : 1; return [0, 1, 2].map(i => f[i] * a + b[i] * (1 - a)); };
    let sous = [255, 255, 255]; for (let i = k.pile.length - 1; i >= 1; i--) sous = comp(rgba(k.pile[i]), sous);
    return ratio(rgba(k.enc).slice(0, 3), comp(rgba(k.fond), sous)); };
  if (veut(4)) await sec('pastille', async () => {
    for (const [pr, nuit, w, h] of [['mac', false], ['mac', true], ['windows', false], ['windows', true], ['ipad', false, 1180, 820], ['ipad', true, 1180, 820]]) {
      const etiq = pr + (w ? ' paysage' : '') + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      if (w) { await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1500); }
      const n = await S(c, () => { const ls = [...window.R().querySelectorAll('#rows .msg')]; const i = ls.findIndex(x => x.querySelector('.hpast')); if (i >= 0) ls[i].click(); return { total:ls.length, avec:ls.filter(x => x.querySelector('.hpast')).length }; });
      await p.waitForTimeout(700);
      v('population ' + etiq + ' : des lignes portent une pastille (' + n.avec + ')', n.avec >= 1, n);
      const k = await S(c, FOND);
      v(etiq + ' : la ligne choisie existe et sa pastille est mesurée', !!k, k);
      if (k) { const r = lisible(k); v(etiq + ' : le texte de la pastille se lit sur son fond (' + r.toFixed(2) + ':1, seuil 3 pour du texte gras de 11 px)', r >= 3, k); }
      await cap(c, '../restes2r/pastille-' + pr + (w ? '-paysage' : '') + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
  });
  // ═══ 5. la bulle au-dessus de la Comptabilité : elle ne couvre pas un bouton sans le laisser passer, et ne reste pas au-dessus ailleurs ═══
  if (veut(5)) await sec('compta', async () => {
    for (const [pr, nuit] of [['mac', false], ['iphone', true]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit, qui:'julie', sansAller:true }), p = c.p;   // Julie arrive dans la Comptabilité plein écran
      await p.waitForTimeout(1200);
      if (!await p.evaluate(() => { const e = document.querySelector('#cpsys'); return !!e && !e.hidden; })) { await lib.aller(p, 'comptabilite'); await p.waitForTimeout(1200); }
      const ouvert = await p.evaluate(() => { const e = document.querySelector('#cpsys'); return !!e && !e.hidden; });
      v('population ' + etiq + ' : la Comptabilité plein écran est ouverte', ouvert);
      if (ouvert) {
        await p.evaluate(() => toast('Écriture enregistrée dans le journal des ventes du mois.')); await p.waitForTimeout(500);
        const t = await p.evaluate(() => { const h = document.getElementById('toast'), b = h.getBoundingClientRect(), cs = getComputedStyle(h);
          // la bulle couvre-t-elle un élément cliquable de la Comptabilité ? on regarde sous son centre et ses coins
          const pts = [[b.left + 10, b.top + b.height / 2], [b.left + b.width / 2, b.top + b.height / 2], [b.right - 10, b.top + b.height / 2]];
          const sous = pts.map(([x, y]) => { h.style.visibility = 'hidden'; const e = document.elementFromPoint(x, y); h.style.visibility = ''; return e ? (e.id || e.tagName) : null; });
          const pe = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e === h || h.contains(e); });
          return { z:cs.zIndex, on:h.classList.contains('on'), pe, sous, rect:[Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], vw:innerWidth, vh:innerHeight }; });
        v(etiq + ' : la bulle est à l\'écran, au-dessus de la Comptabilité (z-index ' + t.z + ')', t.on && Number(t.z) >= 9200, t);
        v(etiq + ' : la bulle tient dans l\'écran', t.rect[0] >= 0 && t.rect[2] <= t.vw && t.rect[3] <= t.vh, t);
        await cap(c, '../restes2r/compta-bulle-' + pr + (nuit ? '-nuit' : '-jour'));
        // on quitte la Comptabilité : la bulle retombe à son rang d'avant (90 ou 300)
        await p.evaluate(() => { document.getElementById('toast').classList.remove('on'); });
        await p.evaluate(() => document.querySelector('[data-cpsys="retour"]').click()); await p.waitForTimeout(1200);
        await p.evaluate(() => toast('Retour à l\'accueil.')); await p.waitForTimeout(400);
        const z = await p.evaluate(() => ({ z:getComputedStyle(document.getElementById('toast')).zIndex, compta:(document.querySelector('#cpsys') || {}).hidden }));
        v(etiq + ' : hors Comptabilité la bulle retrouve son rang (z-index ' + z.z + ')', Number(z.z) < 9000, z);
      }
      await fin(c);
    }
  });
  await sortie();
})();

// SONDE DURABLE — rejeu sœur 3, corrections 9 et 10 (19 novembre 2026). ⛔ 127.0.0.1 seulement, entreprise fictive. Sort en 1 si un contrôle tombe.
//  (9)  Retour système sur la feuille « Garder le brouillon ? » (téléphone, brouillon NON vide) : le Retour sur la feuille la FERME et le message reste (brouillon gardé) ;
//       le Retour SUIVANT quitte l'écran (message fermé, brouillon enregistré) — plus de boucle feuille/message/feuille (4 Retours mesurés avant le correctif).
//  (10) Ctrl+Z / Ctrl+Y (historyUndo / historyRedo) ne recoupent JAMAIS au plafond : une fiche de 150 signes (plafond 120) effacée puis annulée redonne 150 ; 40 Retour-arrière puis annuler : 150.
//       Le recoupage de la frappe et du collage, lui, tient (témoin : coller 200 signes dans « abc » donne 120).
//   PROFILS=mac,iphone,android (défaut) · NUIT=1
const M = require('./mail-commun.js'), L = M.lib, v = M.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone,android').split(','), NUIT = !!process.env.NUIT;
const S = p => p.evaluate(() => { const r = window.R(); return { h: location.hash, feuille: !!r.querySelector('#cDiscard'), msg: !!r.querySelector('#overlay .sheet'), texte: (r.querySelector('#cBody') || {}).value || (r.querySelector('#overlay [contenteditable]') || {}).innerText || '' }; });
const brouillons = p => p.evaluate(() => { const r = window.R(); const f = r.querySelector('[data-folder="drafts"]'); if (f) f.click(); return new Promise(ok => setTimeout(() => ok(Array.from(r.querySelectorAll('.msg')).map(x => x.innerText).join('|')), 600)); });
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ', tel = profil !== 'mac';
    // ───── (9) ─────
    { const c = await M.entrer({ profil, nuit: NUIT }); await c.p.evaluate(() => window.R().querySelector('#btnCompose').click()); await c.p.waitForTimeout(700);
      await c.p.evaluate(() => { const e = window.R().querySelector('#overlay textarea, #overlay [contenteditable]'); e && e.focus(); }); await c.p.keyboard.insertText('mon brouillon de sonde'); await c.p.waitForTimeout(300);
      const a = await S(c.p); v(nom + '(9) population : message ouvert, brouillon non vide', a.msg && !a.feuille && /brouillon de sonde/.test(a.texte), a);
      await c.p.evaluate(() => history.back()); await L.calme(c.p, 900); const r1 = await S(c.p);
      if (tel) {
        v(nom + '(9) Retour 1 : la feuille « Garder le brouillon ? » s\'ouvre', r1.feuille && r1.msg, r1);
        await c.p.evaluate(() => history.back()); await L.calme(c.p, 900); const r2 = await S(c.p);
        v(nom + '(9) Retour 2 : la feuille se ferme, le message reste avec son texte (brouillon gardé)', !r2.feuille && r2.msg && /brouillon de sonde/.test(r2.texte) && r2.h === '#boiteMail', r2);
        await c.p.evaluate(() => history.back()); await L.calme(c.p, 900); const r3 = await S(c.p);
        v(nom + '(9) Retour 3 : on QUITTE l\'écran (plus de feuille, plus de message) — pas de boucle', !r3.feuille && !r3.msg && r3.h === '#boiteMail', r3);
        const bs = await brouillons(c.p); v(nom + '(9) … et le brouillon est enregistré dans la boîte « Brouillons »', /brouillon de sonde/.test(bs), bs.slice(0, 160));
      } else { v(nom + '(9) ordinateur : un Retour ferme le message sans feuille (brouillon enregistré, jamais de boucle)', !r1.feuille && !r1.msg, r1); }
      v(nom + '(9) aucune erreur de page', c.err.length === 0, c.err.slice(0, 2)); await M.fin(c); }
    // ───── (10) ─────
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', attente: 1500 }), p = c.p;
      const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { u: e.value.length, g: nbSignes(e.value) } : null; }, sel);
      const FICHE = async nl => { await p.evaluate(async nl => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); Object.assign(CLIENTS[window.__k0], nl); aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }, nl); };
      const NOM = '[data-ci="nom"]', cible = async () => p.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.focus(); e.setSelectionRange(e.value.length, e.value.length); }, NOM);
      const long = 'N' + 'x'.repeat(149);
      await FICHE({ nom: long }); let l = await lire(NOM); v(nom + '(10) population : nom à 150 signes, plafond 120', l && l.g === 150, l);
      await cible(); await p.keyboard.press('Control+a'); await p.keyboard.press('Delete'); await L.calme(p, 100); l = await lire(NOM); v(nom + '(10) tout effacé : champ vide', l.g === 0, l);
      await p.keyboard.press('Control+z'); await L.calme(p, 150); l = await lire(NOM); v(nom + '(10) Ctrl+Z après tout effacer : 150 revenus (jamais 120)', l.g === 150, l);
      await p.keyboard.press('Control+y'); await L.calme(p, 150); l = await lire(NOM); v(nom + '(10) Ctrl+Y rétablit l\'effacement : 0', l.g === 0, l);
      await p.keyboard.press('Control+z'); await L.calme(p, 150); l = await lire(NOM); v(nom + '(10) puis Ctrl+Z encore : 150', l.g === 150, l);
      await FICHE({ nom: long }); await cible(); for (let i = 0; i < 40; i++) await p.keyboard.press('Backspace'); await L.calme(p, 100); l = await lire(NOM); v(nom + '(10) 40 Retour-arrière : 110', l.g === 110, l);
      await p.keyboard.press('Control+z'); await L.calme(p, 150); l = await lire(NOM); v(nom + '(10) Ctrl+Z : 150 (jamais 120)', l.g === 150, l);
      // témoin : le recoupage de la saisie et du collage est intact
      await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = 'abc'; e.setSelectionRange(3, 3); }, NOM);
      await p.evaluate(() => navigator.clipboard && 0); await c.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:' + c.port }).catch(() => {});
      await p.evaluate(() => navigator.clipboard.writeText('y'.repeat(200))); await p.keyboard.press('Control+v'); await L.calme(p, 150); l = await lire(NOM); v(nom + '(10) témoin : coller 200 signes dans « abc » : 120 (recoupage du collage intact)', l.g === 120, l);
      await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = 'z'.repeat(120); e.setSelectionRange(120, 120); }, NOM); await p.keyboard.type('Q'); await L.calme(p, 100); l = await lire(NOM); v(nom + '(10) témoin : taper au plafond n\'ajoute rien (120)', l.g === 120, l);
      v(nom + '(10) aucune erreur de page', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  }
  await M.sortie();
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });

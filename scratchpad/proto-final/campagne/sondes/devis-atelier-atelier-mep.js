// Mise en page du COMPOSITEUR et de l'ÉDITEUR de l'atelier dans OP GESTION : glissement latéral, cibles au doigt, champs, texte écrasé, sous la barre du bas.
// (défauts propres à l'atelier : zone « refonte »). usage : node devis-atelier-atelier-mep.js <profils> <jour|nuit>   (CAPT=1 : captures)
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
const profils = (process.argv[2] || 'iphone').split(','), nuit = process.argv[3] === 'nuit';
(async () => {
  for (const profil of profils) {
    const tag = 'atelier-' + profil + (nuit ? '-nuit' : '-jour'); console.log('── ' + tag);
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
    const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    const mesure = async (nom, zone) => {
      const m = await f.evaluate(z => { const R = document.querySelector(z) || document.body; const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth; scrollTo(9999, scrollY); const bouge = scrollX; scrollTo(0, scrollY);
        const petits = [], champs = [], ecr = [];
        for (const e of R.querySelectorAll('button, a, [role=button], input[type=checkbox], input[type=radio], summary')) { if (!e.offsetParent || e.disabled) continue; const r = e.getBoundingClientRect(); if (r.width < 2) continue; const zc = e.closest('label, [data-vv=client], [data-vv=art-add]') || e, rz = zc.getBoundingClientRect(); if (Math.max(r.height, rz.height) < 43.5 || Math.max(r.width, rz.width) < 43.5) petits.push(((e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 32)) + ' ' + Math.round(Math.max(r.width, rz.width)) + '×' + Math.round(Math.max(r.height, rz.height))); }
        for (const e of R.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea')) { if (!e.offsetParent) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 16) champs.push((e.id || e.getAttribute('aria-label') || e.placeholder || e.tagName) + ' ' + fs + 'px'); }
        return { sw, cw, bouge, petits: [...new Set(petits)].slice(0, 25), champs: [...new Set(champs)].slice(0, 12), n: R.querySelectorAll('button, input, select, textarea, a').length }; }, zone || 'body');
      v(`${tag} ${nom} : population (${m.n} éléments)`, m.n >= 3);
      v(`${tag} ${nom} : aucun glissement latéral (page ${m.sw} / ${c.largeur})`, m.bouge === 0 && m.sw <= c.largeur + 1, m);
      if (c.doigt) { v(`${tag} ${nom} : cibles au doigt ≥ 44 px (${m.petits.length} sous le seuil)`, m.petits.length === 0, m.petits); v(`${tag} ${nom} : champs ≥ 16 px (zoom d’iOS)`, m.champs.length === 0, m.champs); }
      if (process.env.CAPT) await L.capture(c, O.CAP + `MEP-${tag}-${nom}.png`);
    };
    await mesure('compositeur', '.fenetre');
    await A.composerDevis(c, f, { client: 'hp', objet: 'Remplacement complet de la centrale de traitement d’air du bâtiment B, dépose, évacuation, fourniture et pose, mise en service et réglages', articles: [{ ref: 'GS-20', qte: 2 }, { ref: 'EL-ALL', qte: 3 }] });
    await p.waitForTimeout(900); await mesure('editeur', '#vue-editeur');
    const clic = async s => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(500); };
    await clic('[data-act="envoyer"]:visible'); await mesure('envoi', '.fen-v'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await clic('[data-act="apercu"]:visible'); await mesure('apercu', '#vue-apercu');
    await L.fin(c);
  }
  console.log(`erreurs : voir chaque contexte`); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });

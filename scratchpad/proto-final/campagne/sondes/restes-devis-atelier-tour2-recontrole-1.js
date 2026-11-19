// Restes devis-atelier, tour 2 — RECONTRÔLE ADVERSE du plancher des interrupteurs.
// Les sondes du correcteur construisaient un `.interr` de toutes pièces dans un conteneur de leur choix (une population qu'on énumère soi-même). Ici on mesure
// les VRAIS interrupteurs des VRAIS écrans (fenêtre d'envoi, aperçu « Ce que voit le client », clauses d'un contrat composé), sur les profils tactiles,
// puis, pour les contextes de la feuille de style qu'aucun écran ne montre sans chemin long, un `.interr` dans chaque conteneur nommé par une règle .interr.
// Sur un profil à la souris (mac), la règle ne doit rien changer : 38 px d'origine.
// Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. Usage : node restes-devis-atelier-tour2-recontrole-1.js [profils séparés par des virgules] [nuit]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  for (const profil of (process.argv[2] || 'ipad,iphone,android,petit,mac').split(',')) {
    const nuit = process.argv[3] === 'nuit';
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p;
    const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(450); };
    let f = await A.ouvrirAtelier(c, 'devis', 'devis'); v(`${profil} : l'atelier de devis s'ouvre`, !!f); if (!f) { await L.fermer(); continue; }
    const lire = (nom, zone) => f.evaluate(z => [...document.querySelectorAll((z || 'body') + ' .interr')].filter(e => e.offsetParent).map(e => ({ t: (e.innerText || '').trim().slice(0, 40), h: Math.round(e.getBoundingClientRect().height * 10) / 10, k: (e.parentElement.className || '') + '|' + e.className })), zone);
    const verifie = async (nom, zone, attendu) => {
      const L1 = await lire(nom, zone); v(`${profil} ${nom} : population (${L1.length} interrupteurs réels)`, L1.length >= (attendu || 1), L1);
      const bas = L1.filter(x => c.doigt ? x.h < 44 : false);
      v(`${profil} ${nom} : ${c.doigt ? 'aucun interrupteur sous 44 px' : 'souris : hauteurs lues ' + L1.map(x => x.h).join('/') + ' (règle tactile absente)'}`, c.doigt ? bas.length === 0 : L1.every(x => x.h <= 40), c.doigt ? bas : L1);
      if (process.env.CAPT) await L.capture(c, O.CAP + `T2-${profil}-${nom}.png`);
      return L1;
    };
    await A.composerDevis(c, f, { client: 'hp', objet: 'Interrupteurs', articles: [{ ref: 'EL-ALL', qte: 1 }] });
    await clic(f, '[data-act="envoyer"]:visible'); await verifie('fenêtre d’envoi', '.fen-v', 2);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await clic(f, '[data-act="apercu"]:visible'); await verifie('aperçu', '#vue-apercu', 1);
    // contrat composé : ses clauses (.clause .interr, 36 → 48 sous tactile ou étroit)
    await L.fin(c); const c2 = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'contrats' }); c.p = c2.p; c.ctx = c2.ctx;   // contexte neuf : l'éditeur du devis est encore ouvert dans l'ancien
    f = await A.ouvrirAtelier(c2, 'contrat', 'contrats'); v(`${profil} : l'atelier de contrats s'ouvre`, !!f);
    if (f) {
      await A.composerContrat(c2, f, { client: 'vp', titre: 'Clauses' });
      if (!(await f.evaluate(() => [...document.querySelectorAll('.clause .interr')].some(e => e.offsetParent)))) { const o = f.locator('[data-act="onglet"]:has-text("Contrat"):visible, [data-act="format"]:visible').first(); if (await o.count()) { if (c.doigt) await o.tap(); else await o.click(); await c2.p.waitForTimeout(500); } }   // le panneau « Contrat » n'est pas ouvert d'office partout
      const L2 = await verifie('contrat : clauses', 'body', 1);
      const cl = L2.filter(x => /clause/.test(x.k));
      v(`${profil} contrat : population des clauses (${cl.length})`, cl.length >= 1, L2);
      if (c.doigt || profil === 'petit') v(`${profil} contrat : les clauses gardent 48 px (${cl.map(x => x.h).join('/')})`, cl.every(x => x.h >= 47.5), cl);
    }
    // les conteneurs nommés par une règle .interr de la feuille : population déduite de la FEUILLE, pas de ma liste
    if (c.doigt) {
      const r = await (A.cadre(c.p)).evaluate(() => {
        const cont = new Set(['']); for (const ss of document.styleSheets) { let rr; try { rr = ss.cssRules } catch (e) { continue } const vis = rs => { for (const m of rs) { if (m.cssRules && !m.selectorText) vis(m.cssRules); else if (m.selectorText && /\.interr/.test(m.selectorText)) for (const s of m.selectorText.split(',')) { const g = s.trim().match(/^((?:[.#][\w-]+\s+)+)\.interr\b/); if (g) cont.add(g[1].trim().split(/\s+/).pop().slice(1)); } } }; vis(rr); }
        const o = {}; for (const k of cont) { const w = document.createElement('div'); if (k) w.className = k; w.innerHTML = '<label class="interr"><input type="checkbox"><span>Un libellé assez long pour passer à la ligne sur un téléphone étroit, avec une précision en plus</span></label>'; document.body.appendChild(w); o[k || '(nu)'] = Math.round(w.firstChild.getBoundingClientRect().height * 10) / 10; w.remove(); }
        return o;
      });
      v(`${profil} : conteneurs trouvés dans la feuille (${Object.keys(r).length})`, Object.keys(r).length >= 4, r);
      for (const [k, h] of Object.entries(r)) v(`${profil} conteneur « ${k} » : ${h} px ≥ 44`, h >= 44, h);
    }
    await L.fin(c); await L.fermer();
  }
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); await L.fermer(); process.exit(2); });

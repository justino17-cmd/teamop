// RESTES « artefact », tour 2 (17 novembre 2026) — la garde des trois points laissés ouverts par le recontrôle du tour 1 et par la ligne du chef
// « un fichier fabriqué dans un cadre voisin ». Ne modifie aucune page.
//   A. pendant la visite parlée, « Voir comme l'application » n'est ni affiché ni atteignable (un effleurement rechargerait la page et perdrait la visite) ;
//      la visite finie, il revient. (Le lien « Revenir au mode test » dans #cnx, atteint au clavier, est gardé par restes-artefact-tour1-recontrole.js § 3.)
//   B. un fichier né dans un cadre voisin (le PDF de l'atelier) arrive à un pont qui TESTE le type (« instanceof Blob » de sa propre fenêtre) ;
//      contre-épreuve dans la même sonde : le même Blob donné tel quel au même pont est refusé (bad_request) — sinon le contrôle ne prouve rien.
//   C. la page principale, quand le pont est celui de la fenêtre PARENT : un PDF (Blob), un texte (chaîne) et des octets (ArrayBuffer) passent, eux aussi.
// Population d'abord à chaque contrôle ; 127.0.0.1 seulement.   PROFILS=mac,iphone
const P = require('./recontrole-artefact-pose.js'), A = require('./artefact-commun.js'), { bac, lib: L, v } = P;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const PDF = '%PDF-1.4\n% essai restes artefact tour 2';
(async () => {
  // ── A. la visite parlée ──
  for (const profil of PROFILS) {
    const c = await P.ouvrir({ profil, qui: null, app: false, guide: true }, {});
    await c.p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); try { rlChanger('gestion', { muet: true }); } catch (x) {} });
    await L.calme(c.p, 700);
    const etat = () => c.p.evaluate(() => { const b = document.querySelector('.rl-bande [data-apv]'); const r = b ? b.getBoundingClientRect() : null;
      return { present: !!b, affiche: !!b && getComputedStyle(b).display !== 'none' && r.width > 4, focalisable: !!b && b.offsetParent !== null, visite: document.body.classList.contains('gd-on') && typeof immActif === 'function' && immActif(), bulle: !!document.querySelector('.gd-bulle') }; });
    const av = await etat(); v(`${profil} A : population (revue, le bouton est là et affiché avant la visite)`, av.present && av.affiche && av.focalisable && !av.visite, av);
    await c.p.evaluate(() => { const b = document.querySelector('[data-gd="apprendre"]'); if (b) b.click(); }); await L.calme(c.p, 700);
    await c.p.evaluate(() => { const d = document.querySelector('.imm-liste'); if (d) d.open = true; }); await L.calme(c.p, 500);
    const prem = c.p.locator('button[data-imm^="lancer|"][aria-label^="Commencer au chapitre"]').first(); await prem.scrollIntoViewIfNeeded().catch(() => {});
    await L.toucher(c, prem); await L.calme(c.p, 1200);
    const pe = await etat(); v(`${profil} A : population (la visite parlée est lancée : bulle ${pe.bulle})`, pe.visite && pe.bulle, pe);
    v(`${profil} A : pendant la visite le bouton n'est ni affiché ni atteignable (display ${pe.affiche ? 'visible' : 'none'})`, pe.present && !pe.affiche && !pe.focalisable, pe);
    const bande = await c.p.evaluate(() => { const b = document.querySelector('.rl-bande'); return !!b && b.getBoundingClientRect().width > 4; });
    v(`${profil} A : la bande des rôles, elle, reste (la visite s'en sert pour changer de rôle)`, bande);
    await c.p.evaluate(() => gdQuitter()); await L.calme(c.p, 500);
    const ap = await etat(); v(`${profil} A : la visite quittée, le bouton revient (affiché, atteignable)`, !ap.visite && ap.affiche && ap.focalisable, ap);
    v(`${profil} A : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── B. l'atelier : un Blob né dans le cadre, un pont qui teste le type ──
  for (const profil of PROFILS) {
    const c = await bac.ouvrir({ profil, qui: 'marc' }, { strict: true }); await A.calmer(c.p);
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2500);
    const f = L.cadre(c.p, /prototype-documents\.html/);
    v(`${profil} B : population (le cadre de l'atelier est là, prêt, sans window.claude)`, !!f && await f.evaluate(() => typeof pdfEnregistrer === 'function' && typeof window.claude === 'undefined').catch(() => false), f && f.url());
    if (f) {
      await bac.zero(c);
      const brut = await f.evaluate(async pdf => { try { const cl = window.parent.claude, dl = await cl.use('downloads'); await dl.save({ filename: 'brut.pdf', data: new Blob([pdf], { type: 'application/pdf' }) }); return 'accepte'; } catch (e) { return e && e.code || String(e); } }, PDF);
      v(`${profil} B : contre-épreuve — le pont strict REFUSE un Blob né dans le cadre, tel quel (${brut})`, brut === 'bad_request', brut);
      await bac.zero(c);
      const r = await f.evaluate(pdf => pdfEnregistrer(new Blob([pdf], { type: 'application/pdf' }), 'devis-essai.pdf'), PDF); await c.p.waitForTimeout(500);
      const e = await bac.etat(c), t = await f.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
      v(`${profil} B : le PDF de l'atelier arrive au pont strict (nom, type, taille, octets)`, r === 'saved' && e.fichiers.length === 1 && e.fichiers[0].nom === 'devis-essai.pdf' && e.fichiers[0].type === 'application/pdf' && e.fichiers[0].taille === PDF.length && e.fichiers[0].debut === PDF.slice(0, 8), { r, f: e.fichiers, refus: e.refus });
      v(`${profil} B : le cadre dit « enregistré » (« ${String(t).slice(0, 50)} »)`, /enregistré/.test(t), t);
      v(`${profil} B : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    }
    await L.fin(c);
  }
  // ── C. la page principale dans un cadre, le pont dans la fenêtre PARENT ──
  for (const profil of PROFILS) {
    const c = await P.ouvrirHote({ profil, qui: 'marc' }, { pont: false });
    await c.hote.evaluate(() => { window.__saves = []; window.__refus = [];
      window.claude = { use: async n => n !== 'downloads' ? null : { save: async req => { const d = req.data;
        if (!(typeof d === 'string' || d instanceof Blob || d instanceof ArrayBuffer || d instanceof Object.getPrototypeOf(Uint8Array))) { window.__refus.push(req.filename); throw { code: 'bad_request', message: 'pas un Blob de cette fenêtre' }; }
        const taille = typeof d === 'string' ? d.length : (d.size != null ? d.size : d.byteLength); window.__saves.push({ nom: req.filename, taille, genre: typeof d === 'string' ? 'chaine' : (d instanceof Blob ? 'blob' : 'octets') }); return { status: 'saved' }; } } }; });
    const pop = await c.p.evaluate(() => ({ cadre: window.parent !== window, aucun: typeof window.claude === 'undefined', f: typeof telechargerFichier === 'function' }));
    v(`${profil} C : population (la page est dans un cadre, sans window.claude ; le pont est dans la fenêtre parent)`, pop.cadre && pop.aucun && pop.f, pop);
    const brut = await c.p.evaluate(async pdf => { try { const dl = await window.parent.claude.use('downloads'); await dl.save({ filename: 'brut.pdf', data: new Blob([pdf], { type: 'application/pdf' }) }); return 'accepte'; } catch (e) { return e && e.code || String(e); } }, PDF);
    v(`${profil} C : contre-épreuve — le pont du parent REFUSE un Blob né dans la page, tel quel (${brut})`, brut === 'bad_request', brut);
    await c.hote.evaluate(() => { window.__saves = []; window.__refus = []; });
    const rs = await c.p.evaluate(async pdf => [await telechargerFichier('essai.pdf', new Blob([pdf], { type: 'application/pdf' })), await telechargerFichier('essai.csv', 'a;b\n1;2\n'), await telechargerFichier('essai.pdf', new TextEncoder().encode(pdf).buffer), await telechargerFichier('essai.pdf', new TextEncoder().encode(pdf))], PDF);
    await c.p.waitForTimeout(400);
    const sv = await c.hote.evaluate(() => ({ s: window.__saves, r: window.__refus }));
    v(`${profil} C : un PDF (Blob), un texte (chaîne), des octets (ArrayBuffer, vue) : tous enregistrés par le pont du parent (${rs.join(', ')})`, rs.every(x => x === 'enregistre') && sv.s.length === 4 && !sv.r.length, { rs, sv });
    v(`${profil} C : les tailles arrivent entières`, sv.s.length === 4 && sv.s[0].taille === PDF.length && sv.s[1].genre === 'chaine' && sv.s[2].taille === PDF.length && sv.s[3].taille === PDF.length, sv.s);
    v(`${profil} C : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });

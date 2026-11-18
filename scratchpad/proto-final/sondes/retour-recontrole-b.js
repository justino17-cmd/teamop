// RECONTRÔLE ADVERSE du bouton Retour, SECOND REGARD (18 novembre 2026) — complète retour-recontrole.js sans en reprendre la méthode :
// celui-là touche les boutons d'un ÉCRAN ; celui-ci descend d'UN NIVEAU DE PLUS. Pour chaque bouton d'écran qui ouvre une fenêtre (panneau, fenêtre de création…),
// il rouvre la fenêtre à neuf et touche CHAQUE bouton qu'elle contient : c'est là que vivent les calques dans les calques, les « Choisir une date », les aperçus,
// les fenêtres d'aide, les pages où mène un bouton de fenêtre — le calque oublié, s'il existe, se cache là.
// Pour chaque essai, quatre verdicts indépendants de CAL_GENRES (la liste que la page se donne à elle-même) :
//   1. un grand élément fixe est posé par-dessus et calOuverts() est vide  → calque OUBLIÉ ;
//   2. un calque connu s'est ajouté : UN Retour doit retirer exactement un niveau (la pile baisse de 1, l'écran ne bouge pas) ;
//   3. le bouton MÈNE ailleurs (l'adresse change) : un Retour ramène à l'écran d'avant, sans fenêtre fantôme ni entrée orpheline ;
//   4. la fenêtre fermée par la page, plus aucune entrée de fenêtre ne reste (pousse = 0) et UN Retour quitte l'écran (on n'est pas coincé).
// ROUTES=a,b,c : les écrans joués ; PROFIL=android|iphone|mac… ; QUI=marc|julie|sm|kb ; NB1 (boutons d'écran touchés pour trouver une fenêtre, 12), NB2 (boutons touchés par fenêtre, 14).
// Rend « N ✓ · M ✗ » et un JSON de constats dans CAP (hors dépôt).
const fs = require('fs'), path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', QUI = process.env.QUI || 'marc';
const NB1 = parseInt(process.env.NB1 || '12', 10), NB2 = parseInt(process.env.NB2 || '14', 10);
const ROUTES = (process.env.ROUTES || 'clients,taches,interventions,devis,planning,stock').split(',');
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap';
const constats = { oublies: [], casses: [], notes: [] };
const dit = (liste, o) => { constats[liste].push(o); console.log('  ·', liste, JSON.stringify(o).slice(0, 320)); };

const SEL_ECRAN = '#contenu button, #contenu [role="button"], #contenu [data-creer], #contenu [data-action], #contenu .btn';
const SEL_CALQUE = '#calque button, #calque [role="button"], #calque [data-action], #calque .btn, #calque summary, #fenetre button, #fenetre [data-action], #fenetre .btn';
const ETAT = () => ({ h: location.hash, n: history.length, pile: CAL.pile.join(','), pousse: CAL.pousse, ignore: CAL.ignore, off: CAL.off, ouverts: calOuverts().join(','),
  panneau: !!document.querySelector('#calque .voile'), fenetre: !!document.querySelector('#fenetre .fen-voile') });
const CANDIDATS = () => { const vw = innerWidth, vh = innerHeight, out = [];
  const permanent = '#menu, .menu, .barre-bas, #toast, #sortie-carte, .ac-flot, #cnx-test, .sec-bande, .gd-spot, .regle, .fantome, .apercu, .ac-bulle, #opsec .ops-rond, #sec-conf-rond, .tt-haut';
  for (const e of document.querySelectorAll('body *')) { if (e.closest(permanent) || e.closest('[hidden]')) continue;
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect(); if (r.width * r.height < 0.12 * vw * vh) continue;
    out.push((e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  return out; };
const etat = p => p.evaluate(ETAT), cands = p => p.evaluate(CANDIDATS);
const ranger = async p => { await L.ranger(p); await p.keyboard.press('Escape').catch(() => {}); await L.calme(p, 250); };
const SAUF = /supprim|déconnect|quitter|réinitial|vider|effacer|archiv|retirer|refuser/i;   // ce qui détruit des données de démonstration : on ne le touche pas

(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p; let essais = 0, fenetres = 0, niveau2 = 0, ailleurs = 0, empiles = 0;
  const jouer = async (route) => { await L.aller(p, 'accueil'); await L.aller(p, route); await ranger(p); };
  for (const route of ROUTES) {
    await jouer(route);
    const liste = await p.evaluate(sel => { const sig = new Set(), out = []; document.querySelectorAll(sel).forEach((e, i) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.disabled || e.closest('[hidden]')) return;
      const lib = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (/supprim|déconnect|quitter|réinitial|vider|effacer/i.test(lib)) return;
      const s = e.tagName + '|' + lib + '|' + (e.dataset.action || e.dataset.creer || e.dataset.go || ''); if (sig.has(s)) return; sig.add(s); out.push({ i, lib }); }); return out; }, SEL_ECRAN);
    let n1 = 0;
    for (const b1 of liste) {
      if (n1 >= NB1) break; n1++;
      await jouer(route);
      const ouvre = async () => { try { const loc = p.locator(SEL_ECRAN).nth(b1.i); await loc.scrollIntoViewIfNeeded({ timeout: 1500 }); if (c.doigt) await loc.tap({ timeout: 2500 }); else await loc.click({ timeout: 2500 }); await p.waitForTimeout(420); return true; } catch (e) { return false; } };
      if (!await ouvre()) continue; essais++;
      const e1 = await etat(p); if (e1.h !== '#' + route || (!e1.panneau && !e1.fenetre)) continue;   // ce bouton n'ouvre pas de fenêtre : le premier script l'a déjà joué
      fenetres++;
      const sigs = await p.evaluate(sel => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return r.width && r.height && !e.disabled ? (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : null; }), SEL_CALQUE);
      let n2 = 0; const vus = new Set(); let premier = true;
      for (let j = 0; j < sigs.length && n2 < NB2; j++) {
        const lib = sigs[j]; if (lib === null || SAUF.test(lib) || /^(×|✕|x|fermer)$/i.test(lib) || vus.has(lib)) continue; vus.add(lib); n2++; niveau2++;
        if (!premier) { await jouer(route); if (!await ouvre()) break; } premier = false;
        const avant = await etat(p), h0 = avant.h;
        const cible = p.locator(SEL_CALQUE).nth(j);
        try { await cible.scrollIntoViewIfNeeded({ timeout: 1200 }); if (c.doigt) await cible.tap({ timeout: 2200 }); else await cible.click({ timeout: 2200 }); } catch (e) { continue; }
        await p.waitForTimeout(450);
        const e2 = await etat(p), cd = await cands(p), nom = route + ' › « ' + lib.slice(0, 28) + ' » (fenêtre ouverte par « ' + b1.lib.slice(0, 22) + ' »)';
        const poseCal = e2.pile.split(',').filter(Boolean).length - avant.pile.split(',').filter(Boolean).length;
        if (e2.h !== h0) {   // le bouton MÈNE ailleurs
          ailleurs++; const dest = e2.h; await C.retour(p); const e3 = await etat(p), cd3 = await cands(p);
          const bon = e3.pousse === 0 && cd3.length === 0 && !e3.panneau && !e3.fenetre && e3.ouverts === '' && e3.h !== dest;
          if (!bon) dit('casses', { ecran: nom, constat: 'le bouton mène à ' + dest + ' ; Retour → ' + e3.h + ', fenêtres : ' + (e3.ouverts || 'aucune') + ', calques visibles : ' + (cd3.join(' | ') || 'aucun') + ', pousse ' + e3.pousse, profil: PROFIL });
          v(PROFIL + ' · ' + nom + ' : mène à ' + dest + ', Retour ramène sans fenêtre fantôme', bon, { e3, cd3 });
        } else if (cd.length && !e2.ouverts) { dit('oublies', { ecran: nom, calque: cd.join(' | '), profil: PROFIL }); v(PROFIL + ' · ' + nom + ' : un calque inconnu de CAL_GENRES s\'est posé (' + cd.join(' | ') + ')', false);
        } else if (poseCal > 0) {   // un calque de plus : UN Retour le retire, l'écran reste
          empiles++; const avantPile = e2.pile.split(',').filter(Boolean).length; await C.retour(p); const e3 = await etat(p), apres = e3.pile.split(',').filter(Boolean).length;
          const bon = e3.h === h0 && apres === avantPile - 1 && e3.pousse === apres;
          if (!bon) dit('casses', { ecran: nom, constat: 'un calque s\'est ajouté (pile ' + e2.pile + ') ; UN Retour → pile ' + e3.pile + ', adresse ' + e3.h + (e3.h !== h0 ? ' (quitte l\'écran)' : ''), profil: PROFIL });
          v(PROFIL + ' · ' + nom + ' : calque de plus (' + e2.pile + '), UN Retour en retire exactement un', bon, { e2, e3 });
        }
        await ranger(p);
      }
      // verdict 4 : la fenêtre ouverte à neuf, fermée par la page, plus aucune entrée orpheline ; UN Retour quitte l'écran
      await jouer(route); if (await ouvre()) { await ranger(p); const e4 = await etat(p);
        const sans = e4.pousse === 0 && e4.pile === ''; await C.retour(p); const e5 = await etat(p);
        if (!sans || e5.h === '#' + route) dit('casses', { ecran: route + ' (fenêtre ouverte par « ' + b1.lib.slice(0, 22) + ' », fermée, puis UN Retour)', constat: 'pousse ' + e4.pousse + ', pile « ' + e4.pile + ' », Retour → ' + e5.h, profil: PROFIL });
        v(PROFIL + ' · ' + route + ' › « ' + b1.lib.slice(0, 22) + ' » : fenêtre fermée puis UN Retour quitte l\'écran, aucune entrée orpheline', sans && e5.h !== '#' + route, { e4, e5 }); }
    }
  }
  v(PROFIL + ' : population — des fenêtres ont été trouvées (' + fenetres + ') et des boutons de fenêtre touchés (' + niveau2 + ')', fenetres >= 2 && niveau2 >= 6, { essais, fenetres, niveau2 });
  v(PROFIL + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  dit('notes', { essais, fenetres, niveau2, ailleurs, empiles, routes: ROUTES.length, qui: QUI });
  await L.fin(c); const ko = L.bilan();
  try { fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, `retour-recontrole-b-${PROFIL}-${QUI}-${ROUTES[0]}.json`), JSON.stringify(constats, null, 1)); } catch (e) {}
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });

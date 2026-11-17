// Outils communs des sondes de la partie « Achats et frais » (campagne du 17 novembre 2026).
// Rien ici ne modifie une page : on ouvre le prototype comme une personne de l'entreprise, on joue, on mesure.
const L = require('../../lib.js');
exports.L = L;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-achats/';
// un PNG d'un pixel : de quoi « prendre un ticket en photo » sans appareil
exports.PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// changer de personne comme le fait l'application : se déconnecter, puis ouvrir la session de l'autre (les données restent en mémoire)
exports.devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); await fermerGuide(p); };
const fermerGuide = async p => { await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await p.waitForTimeout(200); };
exports.fermerGuide = fermerGuide;
exports.txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
exports.toast = p => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
exports.panneau = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
exports.titrePanneau = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau h2'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
// l'état des données d'Achats : de quoi savoir si un geste a vraiment écrit quelque chose
exports.donnees = p => p.evaluate(() => JSON.stringify([DEM_ACHAT, NDF, ACHATS.length, NOTIFS.length, JOURNAL.length, MVTS.length, COMMANDES.length]));
// recense ce qui répond dans #contenu ET marque chaque élément (data-sg) : le même ordre sur une page neuve
exports.recenser = (p, zone) => p.evaluate(z => { const R = document.querySelector(z || '#contenu') || document.body, vus = []; let i = 0;
  R.querySelectorAll('[data-sg]').forEach(e => e.removeAttribute('data-sg'));
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const clic = e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'SUMMARY' || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || ([...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name) && a.name !== 'data-sg') && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    e.setAttribute('data-sg', String(i)); const d = [...e.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-sg').map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    vus.push({ i, balise: e.tagName, lib: (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 70), data: d, l: Math.round(r.width), h: Math.round(r.height) }); i++; }
  return vus; }, zone);
// une page neuve, la personne connectée, l'écran Achats sur l'onglet demandé
exports.ouvrirAchats = async (o) => { const c = await L.ouvrir({ profil: o.profil || 'mac', qui: o.qui || 'marc', nuit: !!o.nuit });
  if (o.hash !== false) { await c.p.evaluate(t => { acOnglet = t; }, o.onglet || 'demandes'); await L.aller(c.p, o.hash || 'achats'); } return c; };

// Sonde « kit » : ce que le prototype ne joue pas, rejoué sur le kit d'essai (une source SANS envoi programmé côté serveur, SANS suivi) contre la COPIE de travail du module :
// D13 (l'avertissement de l'envoi programmé est EN TÊTE et en mots simples), et le comportement du module SANS opt.hote (rien n'apparaît : les points d'extension sont facultatifs).
// Lancer : CAP=<dossier> node mail-kit.js     (MODULE est posé ici : la copie apercu/prototype-courrier.js)
const path = require('path');
process.env.MODULE = process.env.MODULE || path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-courrier.js');
const h = require('../refonte/mail-essai/h.js'), lib = require('../lib.js');
const INIT = 'window.R=()=>document.querySelector("[data-opcourrier]").shadowRoot';
(async () => {
  const c = await h.ouvrir({ profil:'mac', init:INIT }), p = c.p, S = f => p.evaluate(f);
  await p.locator('.msg').first().click(); await p.waitForTimeout(400);
  lib.v('sans opt.hote : aucun bandeau de l\'hôte, aucune pastille d\'hôte (comportement de la production)', await S(() => !R().querySelector('.hband') && !R().querySelector('.hpast')));
  lib.v('sans opt.hote : les quatre réponses rapides d\'origine (avec l\'apostrophe typographique)', JSON.stringify(await S(() => [...R().querySelectorAll('[data-quick]')].map(b => b.textContent))) === JSON.stringify(['Merci, c’est noté', 'Je reviens vers vous rapidement', 'C’est parfait pour moi', 'Pouvez-vous préciser ?']));
  await S(() => R().querySelector('[aria-label*="Nouveau message"]').click()); await p.waitForTimeout(400);
  await S(() => R().querySelector('#cSched').click()); await p.waitForTimeout(300);
  const w = await S(() => { const e = R().querySelector('.sched-warn'), l = R().querySelector('.sched-list'); return e ? { texte:e.innerText.trim(), avant:!!(e.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING), note:!!R().querySelector('.sched-note') } : null; });
  lib.v('D13 : la source ne programme pas côté serveur → l\'avertissement est EN TÊTE du panneau, en mots simples (« ne part que si cette page reste ouverte »)', !!w && w.avant && !w.note && /reste ouverte/.test(w.texte), w);
  await h.cap(c, 'kit-programmer');
  lib.v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await h.fin(c); await h.fermer();
  const ko = lib.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERREUR', e.message); process.exit(1); });

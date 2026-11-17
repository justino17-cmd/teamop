// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — les corrections d'ÉCRAN rejouées d'après ce que la personne voit : clients-10 (appareils), clients-13 (Infos),
// clients-14 (phrase du panneau), clients-16 (suggestions d'adresse : on en CHOISIT une au toucher, la liste se referme, la carte « Repérée » paraît), + captures jour/nuit à REGARDER.
// Usage : PROFIL=… NUIT=1 node clients-recontrole-petits.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const garde = async nom => { const d = await L.deborde(c); v(nom + ' : la page ne glisse pas de côté', d.bouge === 0, d); if (c.doigt) { const g = await L.doigts(p, '#contenu'); v(nom + ' : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', g.petits.length === 0 && g.champs.length === 0 && g.ecrases.length === 0, g); } };
  // clients-10
  for (const k of ['vp', 'hp', 'mr', 'rf']) { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="appareils"]'); await L.calme(p, 200);
    const a = await p.evaluate(() => ({ n: document.querySelectorAll('#contenu .grille2 > .carte .ligne').length, passages: /passage/i.test(document.querySelector('#contenu .grille2 > .carte').innerText), tuile: (document.querySelector('[data-oc="appareils"] b') || {}).textContent, vide: /Aucun appareil/.test(document.querySelector('#contenu .grille2 > .carte').innerText), cli: CLIENTS[document.location.hash.replace('#client-x-', '')] ? CLIENTS[document.location.hash.replace('#client-x-', '')].appareils.length : -1 }));
    v('clients-10 [' + k + '] appareils : ' + JSON.stringify(a) + ' — aucun « passages » collé à un appareil, et la tuile dit le même nombre que la liste', !a.passages && (a.vide ? a.cli === 0 : a.n === a.cli), a);
    if (k === 'vp') { await L.capture(c, CAP + 'appareils-' + ETQ + '.png'); await garde('clients-10 fiche appareils'); } }
  // clients-13
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await L.calme(p, 250);
  const f = await p.evaluate(() => { const carte = document.querySelector('#contenu .grille2 > .carte').getBoundingClientRect(); return { carte: Math.round(carte.width), champs: ['nom', 'contact', 'tel', 'mail', 'type', 'adr'].map(k => { const e = document.querySelector(`[data-ci="${k}"]`), r = e.getBoundingClientRect(); return [k, Math.round(r.width), e.scrollWidth > e.clientWidth + 1 && e.tagName === 'INPUT' ? 'coupé' : 'entier']; }) }; });
  console.log('  · Infos du Vieux Port : ' + JSON.stringify(f)); const larges = f.champs.filter(x => TEL ? x[1] >= f.carte * 0.8 : true);
  v('clients-13 : sur téléphone, chaque champ de l’onglet Infos prend ≥ 80 % de la carte (' + f.carte + ' px)', !TEL || larges.length === f.champs.length, f);
  v('clients-13 : contact (« Marc Durand, gérant ») et e-mail du Vieux Port se lisent en entier', f.champs.filter(x => ['contact', 'mail'].includes(x[0])).every(x => x[2] === 'entier'), f);
  await L.capture(c, CAP + 'infos-' + ETQ + '.png'); await garde('clients-13 Infos');
  if (c.doigt) { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await L.calme(p, 300); await L.capture(c, CAP + 'infos-bas-' + ETQ + '.png'); }
  // clients-14
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.calme(p, 300);
  const ph = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); const r = e.getBoundingClientRect(); return { texte: e.innerText.replace(/\s+/g, ' '), w: Math.round(r.width), droite: Math.round(r.right), boutons: [...e.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().height)) }; });
  v('clients-14 : le panneau « Nouveau client » se lit (« ' + ph.texte.slice(0, 110) + '… ») et tient dans l’écran', /premier travail/.test(ph.texte) && ph.droite <= c.largeur + 1, ph);
  await L.capture(c, CAP + 'panneau-' + ETQ + '.png'); if (c.doigt) v('clients-14 : les deux boutons du panneau font ≥ 44 px de haut (' + ph.boutons + ')', ph.boutons.every(h => h >= 44), ph.boutons);
  // clients-16
  await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  const sug = async txt => { await p.fill('.fen [data-cnv="adr"]', txt); await L.calme(p, 250); return p.evaluate(() => [...document.querySelectorAll('.fen .adr-sug [data-adrsug]')].map(b => b.dataset.adrsug)); };
  let s = await sug('rue'); v('clients-16 : « rue » → au plus 5 propositions, chacune contient « rue » (' + s.length + ')', s.length >= 1 && s.length <= 5 && s.every(x => /rue/i.test(x)), s);
  await L.capture(c, CAP + 'suggestions-' + ETQ + '.png');
  if (c.doigt) { const g = await p.evaluate(() => [...document.querySelectorAll('.fen .adr-sug button')].map(b => Math.round(b.getBoundingClientRect().height))); v('clients-16 : chaque proposition fait ≥ 44 px au doigt (' + g + ')', g.length > 0 && g.every(h => h >= 43.5), g); }
  s = await sug('17220'); v('clients-16 : « 17220 » (code postal) propose les adresses de Salles-sur-Mer (' + s.length + ')', s.length >= 1 && s.every(x => /17220/.test(x)), s);
  s = await sug('gravière salles'); v('clients-16 : « gravière salles » (accent, deux mots, dans le désordre de la rue) → la rue de la Gravière', s.length === 1 && /Gravi/.test(s[0]), s);
  s = await sug('rue de la gare'); v('clients-16 : « rue de la gare » → seulement la rue de la Gare', s.length === 1 && /Gare/.test(s[0]), s);
  await L.toucher(c, '.fen .adr-sug [data-adrsug]'); await L.calme(p, 400);
  const ch = await p.evaluate(() => ({ adr: (document.querySelector('.fen [data-cnv="adr"]') || {}).value, sug: document.querySelectorAll('.fen .adr-sug [data-adrsug]').length, rep: ((document.querySelector('.fen .adr-rep') || {}).innerText || '').replace(/\s+/g, ' ') }));
  v('clients-16 : toucher une proposition la range dans le champ, referme la liste et fait paraître « Repérée » (' + JSON.stringify(ch) + ')', /Gare/.test(ch.adr) && ch.sug === 0 && /Repérée/.test(ch.rep), ch);
  await L.capture(c, CAP + 'suggestion-choisie-' + ETQ + '.png'); await garde('clients-16 création');
  v('aucune erreur JavaScript', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });

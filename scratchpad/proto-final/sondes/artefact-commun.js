// Outils communs des sondes « artefact » (17 novembre 2026) : le recensement des gestes qui sortent de la page
// (télécharger, exporter, copier, appeler, écrire, ouvrir un site, joindre un fichier), leur toucher sous le bac à sable,
// et le verdict « un fichier ou une phrase, jamais rien ».
// ⛔ 127.0.0.1 seulement. La population part du DOM (lib.gestes), jamais d'une liste écrite à la main ; elle est COMPTÉE.
const bac = require('./artefact-bac.js'), L = bac.lib, v = L.v;
exports.bac = bac; exports.L = L; exports.v = v;
// ce qu'un geste « qui sort » peut être : on filtre sur le libellé, le nom accessible et le motif des données… et sur la forme du lien
const SENS = /télécharg|\bexport|imprim|\bpdf\b|\bcsv\b|\bfec\b|\bcopi|\bappel(er)?\b|\bécrire\b|e-?mail|courriel|\bsms\b|\bjoindre|pièce jointe|\bphoto\b|justificatif|ticket|importer|y aller|itinéraire|son site|↗|partager|\blien\b|bulletin|\bfichier\b/i;
const SENS_DATA = /pdf|export|telech|download|copier|copie\b|\bdl\b/i;
exports.SENS = SENS; exports.SENS_DATA = SENS_DATA;
// collecte, DANS un cadre : marque chaque candidat (data-bac-i) et rend sa signature. racine : sélecteur de la zone.
exports.collecter = (f, racine) => f.evaluate(({ racine, src, srcd }) => {
  const SENS = new RegExp(src, 'i'), SENS_DATA = new RegExp(srcd, 'i'), R = document.querySelector(racine) || document.body, out = []; let n = 0;
  R.querySelectorAll('[data-bac-i]').forEach(e => e.removeAttribute('data-bac-i'));
  const vis = e => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width >= 2 && r.height >= 2; };
  const dedans = new Set();
  for (const e of R.querySelectorAll('a, button, [role=button], summary, input[type=file], label')) {
    if (!vis(e) && !(e.tagName === 'INPUT' && e.type === 'file')) continue;
    if (e.disabled) continue;
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 70), href = e.getAttribute('href') || '', data = [...e.attributes].filter(a => /^data-(?!bac)/.test(a.name)).map(a => a.name + '=' + a.value.slice(0, 30)).join(' ');
    const fichier = e.tagName === 'INPUT' && e.type === 'file' || (e.tagName === 'LABEL' && e.querySelector('input[type=file]'));
    const sortant = /^(tel|mailto|sms):/i.test(href) || /^https?:/i.test(href) || e.hasAttribute('download') || /^(blob|data):/i.test(href);
    const sens = SENS.test(lib) || SENS_DATA.test(data);
    if (!(sortant || fichier || sens)) continue;
    if (e.tagName === 'LABEL' && !fichier) continue;
    const s = e.tagName + '|' + lib + '|' + href.slice(0, 40) + '|' + data; if (dedans.has(s)) continue; dedans.add(s);
    e.setAttribute('data-bac-i', String(n)); out.push({ i: n++, tag: e.tagName, lib, href: href.slice(0, 60), data, fichier: !!fichier, sortant: sortant ? (href.split(':')[0] || 'download').toLowerCase() : '' });
  }
  return out; }, { racine, src: SENS.source, srcd: SENS_DATA.source });
// l'état « l'écran a dit quelque chose » : un message, une fenêtre neuve, une adresse changée, un texte visible neuf
exports.photo = f => f.evaluate(() => { const t = document.getElementById('toast'), toast = t && t.classList.contains('on') ? t.textContent.trim() : '';
  const pan = (document.querySelector('#calque .panneau') || document.querySelector('[role=dialog]:not([hidden])') || {}).textContent || '';
  const pop = [...document.querySelectorAll('[role=status],[role=alert],.msg,.info,.bandeau-etat,.cp-pop,.bac-contact')].filter(e => e.offsetParent !== null && e.textContent.trim()).map(e => e.textContent.trim().slice(0, 80)).join('|');
  const q = id => { const e = document.getElementById(id); return e ? e.innerHTML.length : 0; };
  return { toast, pan: pan.replace(/\s+/g, ' ').slice(0, 160), pop, hash: location.hash, nb: document.body.innerText.length, dom: q('contenu') + '/' + q('calque') + '/' + document.body.className + '/' + document.querySelectorAll('[role=dialog]:not([hidden])').length }; });
exports.diff = (a, b) => { const d = []; if (b.toast && b.toast !== a.toast) d.push('toast'); if (b.pan !== a.pan) d.push('fenetre'); if (b.pop !== a.pop) d.push('message'); if (b.hash !== a.hash) d.push('adresse'); if (b.dom !== a.dom && !d.length) d.push('ecran'); return d; };
exports.delta = (e0, e1) => { const o = {}; for (const k of ['liensInertes', 'fichiers', 'navigations', 'presse', 'ouvertures', 'dialogues', 'refus', 'coupes', 'popups', 'copiesSelection', 'rangement']) { const n = (e1[k] || []).length - (e0[k] || []).length; if (n) o[k] = n; } if ((e1.impressions || 0) - (e0.impressions || 0)) o.impressions = e1.impressions - e0.impressions; return o; };
// les sondes tournent dans un conteneur sans réseau : le garde « connexion requise » couvrirait tout. On le neutralise (comme les autres sondes).
exports.calmer = p => p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); });

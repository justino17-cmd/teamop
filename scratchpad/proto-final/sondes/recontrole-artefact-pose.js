// POSE ADVERSE DE L'ARTEFACT (recontrôle, 17 novembre 2026). Complète artefact-bac.js par ce que celui-ci NE simule PAS (relu règle par règle) :
//   · l'historique d'un cadre à origine opaque : history.pushState / replaceState qui JETTENT (SecurityError) ;
//   · window.claude présent MAIS use('downloads') rend null (capacité non déclarée / indisponible) ; ou use qui jette ; ou window.claude absent du HAUT aussi ;
//   · le parent d'un cadre inaccessible (origine opaque : window.parent.claude jette SecurityError) ;
//   · une synthèse vocale / des notifications / un son qui refusent (le son ne part qu'après un geste, Notification refusée sans question) ;
//   · un presse-papiers dont writeText exige un geste RÉCENT (activation transitoire) : appelé après un `await`, il est rejeté ;
//   · un lien « download » ou blob: rendu par dispatchEvent sur un <a> DÉTACHÉ, ou par location.href = blob:/data: : comptés (le bac ne voit que click()) ;
//   · le rangement refusé, l'adresse sans requête (seul « #nom » passe), les feuilles de style hors fonts.googleapis.com coupées (déjà le cas du bac).
// Usage : const P = require('./recontrole-artefact-pose.js'); const c = await P.ouvrir({ profil:'mac', qui:'marc' }, { historique:'jette', pont:'nul', ... });
// Les options du bac (refuser, echec, pont:false, presse, rangement) passent telles quelles. Le journal des gestes vient de bac.etat(c) + P.etat(c).
const bac = require('./artefact-bac.js'), lib = bac.lib;
function initAdverse(o) {
  const haut = window === window.top;
  let J; try { J = window.top.__adv || (window.top.__adv = { histo: [], liensDetaches: [], navigations: [], voix: [], notifs: [], sons: [], vibre: 0, hors_geste: [] }); } catch (e) { J = window.__adv = window.__adv || { histo: [], liensDetaches: [], navigations: [], voix: [], notifs: [], sons: [], vibre: 0, hors_geste: [] }; }
  const cadre = haut ? 'haut' : (location.pathname.split('/').pop() || 'cadre');
  if (o.historique === 'jette') {
    for (const m of ['pushState', 'replaceState']) { const f = History.prototype[m]; History.prototype[m] = function () { J.histo.push({ m, cadre, url: String(arguments[2] || '').slice(0, 60), pile: String(new Error().stack).split('\n').slice(2, 5).map(x => x.trim().replace(/http:\/\/127\.0\.0\.1:\d+\/apercu\//, '')).join(' < ') }); if (arguments[2] != null && String(arguments[2]).indexOf('#') !== 0 && String(arguments[2]) !== location.href) throw new DOMException('Origine opaque', 'SecurityError'); return f.apply(this, arguments); }; }
  } else if (o.historique === 'jette-tout') {
    for (const m of ['pushState', 'replaceState']) History.prototype[m] = function () { J.histo.push({ m, cadre, url: String(arguments[2] || '').slice(0, 60), pile: String(new Error().stack).split('\n').slice(2, 5).map(x => x.trim().replace(/http:\/\/127\.0\.0\.1:\d+\/apercu\//, '')).join(' < ') }); throw new DOMException('Origine opaque', 'SecurityError'); };
  }
  // pont : 'nul' = window.claude.use('downloads') rend null ; 'jette' = use rejette ; 'sans-claude' = rien du tout (le bac pose déjà pont:false)
  if (haut && (o.pont === 'nul' || o.pont === 'jette')) { window.claude = { use: async n => { if (o.pont === 'jette') throw { code: 'unavailable', message: 'capacité non déclarée' }; return null; } }; }
  // le bac pose window.claude dans le HAUT seulement ; le parent inaccessible se simule dans les cadres
  if (!haut && o.parentOpaque) { try { const vrai = window.parent, perm = new Set(['postMessage', 'closed', 'frames', 'length', 'location', 'opener', 'parent', 'self', 'top', 'window', 'focus', 'blur']);   // ce qu'une fenêtre d'une AUTRE origine laisse lire (spécification HTML) : le reste jette
      const opaque = new Proxy({}, { get(_, k) { if (k === 'postMessage') return vrai.postMessage.bind(vrai); if (perm.has(k)) return undefined; throw new DOMException('Blocked a frame with origin "null" from accessing a cross-origin frame.', 'SecurityError'); }, has() { throw new DOMException('cross-origin', 'SecurityError'); } });
      Object.defineProperty(window, 'parent', { configurable: true, get() { return opaque; } }); } catch (e) {} }
  if (o.voix === 'absente') { try { delete window.speechSynthesis; Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); window.SpeechSynthesisUtterance = undefined; } catch (e) {} }
  else if (o.voix === 'muette') { try { const s = window.speechSynthesis; if (s) { s.speak = u => { J.voix.push((u && u.text || '').slice(0, 40)); }; } } catch (e) {} }
  else if (o.voix === 'jette') { try { const s = window.speechSynthesis; if (s) { s.speak = () => { throw new DOMException('not-allowed', 'NotAllowedError'); }; s.cancel = () => { throw new DOMException('not-allowed', 'NotAllowedError'); }; s.getVoices = () => { throw new DOMException('not-allowed', 'NotAllowedError'); }; } } catch (e) {} }
  if (o.notifs === 'absentes') { try { delete window.Notification; } catch (e) {} try { Object.defineProperty(window, 'Notification', { value: undefined, configurable: true }); } catch (e) {} }
  else if (o.notifs === 'refusees') { try { class N { constructor(t) { J.notifs.push(String(t).slice(0, 40)); throw new DOMException('refusé', 'NotAllowedError'); } static requestPermission() { J.notifs.push('requestPermission'); return Promise.resolve('denied'); } } Object.defineProperty(N, 'permission', { get: () => 'denied' }); Object.defineProperty(window, 'Notification', { value: N, configurable: true }); } catch (e) {} }
  if (o.son === 'refuse') { try { const p0 = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { J.sons.push('play'); return Promise.reject(new DOMException('play() failed because the user didn\'t interact with the document first.', 'NotAllowedError')); }; } catch (e) {} try { window.AudioContext = function () { J.sons.push('AudioContext'); throw new DOMException('refusé', 'NotAllowedError'); }; window.webkitAudioContext = window.AudioContext; } catch (e) {} }
  if (o.vibrer === 'absent') { try { Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true }); } catch (e) {} }
  // presse-papiers qui exige un geste RÉCENT : on retient le temps du dernier clic/touche réel (isTrusted) ; au-delà de 0 ms après un `await`, writeText est rejeté
  if (o.presseGeste) {
    let dernier = 0, comptes = 0; ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'].forEach(t => addEventListener(t, e => { if (e.isTrusted) dernier = performance.now(); }, true));
    const ecrits = [];
    const pp = { writeText: t => { const age = performance.now() - dernier; if (age > 50) { J.hors_geste.push({ t: String(t).slice(0, 30), age: Math.round(age) }); return Promise.reject(new DOMException('Document is not focused / no user gesture', 'NotAllowedError')); } ecrits.push(String(t)); try { window.top.__bacJ.presse.push(String(t).slice(0, 80)); } catch (e) {} return Promise.resolve(); } };
    try { Object.defineProperty(navigator, 'clipboard', { value: pp, configurable: true }); } catch (e) {}
  }
  // liens « download » / blob: par dispatchEvent sur un <a> détaché, ou par location : le bac ne voit que click()
  const ev0 = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (e) { try { if (this && this.tagName === 'A' && e && e.type === 'click' && !this.isConnected && (this.hasAttribute('download') || /^(blob|data):/i.test(this.getAttribute('href') || ''))) J.liensDetaches.push({ via: 'dispatchEvent', nom: this.getAttribute('download') || '', href: (this.getAttribute('href') || '').slice(0, 30), cadre }); } catch (x) {} return ev0.apply(this, arguments); };
  try { const d = Object.getOwnPropertyDescriptor(Location.prototype, 'href'); if (d && d.set) Object.defineProperty(Location.prototype, 'href', { ...d, set(v) { if (/^(blob|data|tel|mailto|sms):/i.test(String(v))) { J.navigations.push({ via: 'location.href', u: String(v).slice(0, 40), cadre }); return; } return d.set.call(this, v); } }); } catch (e) {}
}
const script = o => `(${initAdverse.toString()})(${JSON.stringify(o || {})})`;
exports.script = script;
// ouvrir(optsLib, optsPose) : optsPose = options du bac (refuser, echec, pont:false, presse, rangement) + les options adverses ci-dessus
exports.ouvrir = async (optsLib, optsPose) => {
  const o = optsPose || {};
  // le bac d'abord (même script d'initialisation), puis la pose adverse par-dessus (elle remplace window.claude du haut quand pont:'nul'/'jette')
  const init = bac.script(o) + ';' + script(o);
  const c = await lib.ouvrir({ ...(optsLib || {}), init });
  c.bac = null; return c;
};
// ouvrirHote : le prototype est servi DANS un cadre (hote-artefact.html), comme claude.ai sert un artefact. « Le haut » (qui reçoit window.claude) est alors la page du
// prototype, au niveau 1 ; ses pages voisines (comptabilité, atelier, paiement) sont au niveau 2 et n'ont PAS window.claude. Rend c avec c.p = le CADRE du prototype
// (Frame : evaluate, locator, waitForTimeout marchent pareil), c.hote = la page hôte.
exports.ouvrirHote = async (optsLib, optsPose) => {
  const o = optsPose || {}, qui = optsLib && optsLib.qui !== undefined ? optsLib.qui : 'marc', app = !optsLib || optsLib.app !== false;
  const hautEnCadre = s => s.replace('const haut = window === window.top;', "const haut = window === window.top || (window.parent === window.top && /prototype-op-gestion/.test(location.pathname));");
  const init = hautEnCadre(bac.script(o)) + ';' + hautEnCadre(script(o));
  const requete = '?q=' + encodeURIComponent(optsLib && optsLib.requete !== undefined ? optsLib.requete : (app ? '?app=1' + (qui ? '&auto=' + qui : '') : ''));
  const c = await lib.ouvrir({ ...(optsLib || {}), page: '../scratchpad/proto-final/sondes/hote-artefact.html', requete, init, guide: true });
  const t0 = Date.now(); let f = null;
  while (Date.now() - t0 < 45000) { f = c.p.frames().find(x => /prototype-op-gestion\.html/.test(x.url()) && x !== c.p.mainFrame()); if (f) { const pret = await f.evaluate(() => typeof routeConnue === 'function' && !!document.getElementById('contenu') && document.getElementById('contenu').innerHTML.length > 200).catch(() => false); if (pret) break; } await c.p.waitForTimeout(400); }
  if (!f) throw new Error('le cadre du prototype ne s\'est pas ouvert');
  await c.p.waitForTimeout(1500);
  await f.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  // le cadre se comporte comme une page pour les outils de lib.js : clavier, souris, doigt, contexte, retour en arrière viennent de la page hôte
  f.keyboard = c.p.keyboard; f.mouse = c.p.mouse; f.touchscreen = c.p.touchscreen; f.context = () => c.ctx; f.screenshot = o2 => c.p.screenshot(o2); f.goBack = () => c.p.goBack();
  return { ...c, hote: c.p, p: f };
};
exports.etat = async c => { const base = await bac.etat(c); const adv = await c.p.evaluate(() => { try { return JSON.parse(JSON.stringify(window.top.__adv || window.__adv || {})); } catch (e) { return {}; } }); return { ...base, adv: { histo: [], liensDetaches: [], navigations: [], voix: [], notifs: [], sons: [], vibre: 0, hors_geste: [], ...adv } }; };
exports.bac = bac; exports.lib = lib; exports.v = lib.v;

/* ⛔ CE QUE CE FICHIER GARDE — L'ÉCRAN PARTAGÉ S'AFFICHE CHEZ L'INVITÉ SANS COMPTE (`server-msg/public/invite.js` + `invite.html`), Justin, 28 octobre 2026.
   « Le partage d'écran marche pas » : Justin (connecté) partageait, sa fenêtre montrait l'écran ; l'invité (lien, sans compte) ne voyait que deux avatars. L'écran ARRIVAIT chez l'invité (piste vivante,
   1280×720, images décodées) — mesuré au navigateur — mais `rendreSalle` ne lisait pas `partage` : la tuile restait en `data-camera="off"`, et la règle de la page met alors la vidéo à `opacity:0`.
   La page connectée le savait depuis le 7 octobre (« un écran partagé PASSE PAR LA PISTE DE LA CAMÉRA ») ; `invite.js`, écrit le 26, n'avait pas la règle, et sa sonde ne jouait aucun partage REÇU.

   Ce banc EXÉCUTE les vraies fonctions (`tuile` et `rendreSalle`, extraites du fichier servi) dans un faux document, et lit ce que la feuille de la page gagne :
     · celui qui partage a une tuile `data-camera="on"` ET `data-ecran="1"`, et sa vidéo reçoit le flux de la personne — caméra coupée ou non ;
     · la grille le sait (`data-ecran="1"`), ce qui lui donne la grande place ; plus personne ne partage → tout redevient normal ;
     · un participant qui ARRIVE pendant le partage (la grille est neuve, l'état vient du service) le voit aussi ; deux partages successifs (la même personne, puis une autre) marchent ;
     · un appel AUDIO n'affiche jamais d'image ; l'écran se lit ENTIER (`contain`, fond noir) et passe devant les autres tuiles (`order:-1`, toute la largeur) ;
   La preuve aux pixels, à trois navigateurs (organisateur, connecté, invité), est `tests/sonde-opmessages-ecran.js`. Mutations : `scratchpad/mutations-ecran.py`. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const JS = fs.readFileSync(process.env.INVITE_JS || path.join(RACINE, 'server-msg/public/invite.js'), 'utf8');
const HTML = fs.readFileSync(process.env.INVITE_HTML || path.join(RACINE, 'server-msg/public/invite.html'), 'utf8');

/* ── la tranche : de `function tuile(` à `function majBarre(` ; une tranche vide passerait au vert sur tout, donc on prouve qu'elle existe ── */
const d = JS.indexOf('  function tuile('), f = JS.indexOf('  function majBarre(');
vrai('la tranche tuile + rendreSalle est trouvée dans invite.js (' + (f - d) + ' caractères)', d > 0 && f > d && JS.slice(d, f).includes('function rendreSalle('));
const CODE = JS.slice(d, f);

/* ── un faux document : juste ce que ces deux fonctions touchent ── */
class El {
  constructor(tag) { this.tag = tag; this.className = ''; this.dataset = {}; this.attrs = {}; this.kids = []; this.parent = null; this.textContent = ''; this.srcObject = null; this.paused = true; this.playsInline = false; this.autoplay = false; this.muted = false; }
  get children() { return this.kids.slice(); }
  append(...xs) { for (const x of xs) this.appendChild(x); }
  appendChild(x) { if (x.parent) x.remove(); x.parent = this; this.kids.push(x); return x; }
  remove() { if (this.parent) this.parent.kids = this.parent.kids.filter(k => k !== this); this.parent = null; }
  setAttribute(k, val) { this.attrs[k] = String(val); } getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  play() { this.paused = false; return Promise.resolve(); }
  tousLesDescendants() { const o = []; for (const k of this.kids) { o.push(k); o.push(...k.tousLesDescendants()); } return o; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const suite = sel.trim().split(/\s+/).map(c => { const m = { tag: (/^[a-z]+/.exec(c) || [])[0], classes: [], attrs: [] }; for (const x of c.matchAll(/\.([\w-]+)/g)) m.classes.push(x[1]); for (const x of c.matchAll(/\[data-([\w-]+)="([^"]*)"\]/g)) m.attrs.push([x[1], x[2]]); return m; });
    const colle = (e, c) => (!c.tag || e.tag === c.tag) && c.classes.every(k => e.className.split(/\s+/).includes(k)) && c.attrs.every(([k, val]) => e.dataset[k] === val);
    const ok = (e) => { if (!colle(e, suite[suite.length - 1])) return false; let i = suite.length - 2, p = e.parent; while (i >= 0) { while (p && p !== this && !colle(p, suite[i])) p = p.parent; if (!p || p === this) return false; i--; p = p.parent; } return true; };
    return this.tousLesDescendants().filter(ok);
  }
}
function monter() {
  const grille = new El('div'), ids = { grille };
  const ctx = { document: { createElement: (t) => new El(t), getElementById: (i) => ids[i] || null }, CSS: { escape: (x) => String(x) }, console, Promise, Set, MediaStream: class { constructor(p) { this.pistes = p; } }, String, Array };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(`
    const ST = { moiId: 'moi', nom: 'Paul', cam: false, micro: true, local: { video: null }, appelId: 'a1', moteur: { flux: (a, id) => ({ flux: id }) } };
    const $ = (id) => document.getElementById(id);
    const initiale = (n) => { const m = /\\p{L}/u.exec(String(n || '')); return m ? m[0].toUpperCase() : '?'; };
    let barres = 0, durees = 0; function majBarre() { barres++; } function majDuree() { durees++; }
    ${CODE}
    globalThis.__rendre = rendreSalle; globalThis.__compte = () => [barres, durees];`, ctx);
  return { grille, rendre: (s) => ctx.__rendre(s) };
}
const membre = (id, nom, o) => Object.assign({ id, nom, statut: 'present', camera: false, micro: true, main: false, parle: false, partage: false }, o || {});
const tuileDe = (g, id) => g.querySelector('[data-uid="' + id + '"]');
const etat = (g, id) => { const t = tuileDe(g, id), vid = t && t.querySelector('video'); return t ? { camera: t.dataset.camera, ecran: t.dataset.ecran, flux: vid.srcObject ? vid.srcObject.flux : null } : null; };

console.log('Celui qui partage son écran : sa tuile montre l\'image, caméra coupée ou non');
{
  const M = monter();
  M.rendre({ type: 'video', moi: {}, membres: [membre('justin', 'Justin Biret', { camera: false }), membre('ben', 'Ben', { camera: true })] });
  v('population : trois tuiles (« Vous », Justin, Ben)', M.grille.children.length, 3);
  v('avant le partage : Justin, caméra coupée → avatar (data-camera off), pas d\'écran', etat(M.grille, 'justin'), { camera: 'off', ecran: '0', flux: 'justin' });
  v('avant le partage : la grille ne dit pas « écran »', M.grille.dataset.ecran, '0');
  M.rendre({ type: 'video', moi: {}, membres: [membre('justin', 'Justin Biret', { camera: false, partage: true }), membre('ben', 'Ben', { camera: true })] });
  v('⛔ Justin partage CAMÉRA COUPÉE → sa tuile est « on », marquée écran, et sa vidéo reçoit son flux', etat(M.grille, 'justin'), { camera: 'on', ecran: '1', flux: 'justin' });
  v('la grille le sait → la grande place (data-ecran=1)', M.grille.dataset.ecran, '1');
  v('Ben (caméra) reste une tuile normale : caméra on, pas d\'écran', etat(M.grille, 'ben'), { camera: 'on', ecran: '0', flux: 'ben' });
  v('« Vous » ne devient pas un écran', etat(M.grille, 'moi'), { camera: 'off', ecran: '0', flux: null });
  M.rendre({ type: 'video', moi: {}, membres: [membre('justin', 'Justin Biret', { camera: true, partage: true }), membre('ben', 'Ben', { camera: true })] });
  v('Justin partage caméra ALLUMÉE (l\'état du service dit camera:false quand l\'écran est envoyé, mais on tolère les deux) → écran', etat(M.grille, 'justin'), { camera: 'on', ecran: '1', flux: 'justin' });
  M.rendre({ type: 'video', moi: {}, membres: [membre('justin', 'Justin Biret', { camera: false, partage: false }), membre('ben', 'Ben', { camera: true })] });
  v('le partage s\'ARRÊTE (bouton, ou « Arrêter le partage » du navigateur : le service relaie partage:false) → l\'avatar revient (le flux reste branché : c\'est `data-camera` qui décide de ce qu\'on voit)', etat(M.grille, 'justin'), { camera: 'off', ecran: '0', flux: 'justin' });
  v('la grille redevient normale', M.grille.dataset.ecran, '0');
  v('les tuiles n\'ont pas été refaites : toujours trois', M.grille.children.length, 3);
}

console.log('Un participant qui ARRIVE pendant le partage le voit aussi (grille neuve, état lu au service)');
{
  const M = monter();
  M.rendre({ type: 'video', moi: {}, membres: [membre('justin', 'Justin Biret', { camera: false, partage: true }), membre('ben', 'Ben', { camera: true })] });
  v('premier rendu = déjà en partage : écran, flux, grande place', [etat(M.grille, 'justin'), M.grille.dataset.ecran], [{ camera: 'on', ecran: '1', flux: 'justin' }, '1']);
  const vid = tuileDe(M.grille, 'justin').querySelector('video');
  vrai('la lecture est lancée (autoplay refusé sans geste → play() demandé)', vid.paused === false);
}

console.log('Deux partages successifs : le même, puis un autre');
{
  const M = monter();
  const sans = [membre('justin', 'Justin', { camera: false }), membre('ben', 'Ben', { camera: true })];
  const avec = (qui) => ({ type: 'video', moi: {}, membres: [membre('justin', 'Justin', { camera: false, partage: qui === 'justin' }), membre('ben', 'Ben', { camera: true, partage: qui === 'ben' })] });
  M.rendre({ type: 'video', moi: {}, membres: sans });
  const trace = [];
  for (const qui of ['justin', null, 'justin', null, 'ben', 'justin']) { M.rendre(avec(qui)); trace.push([String(qui), M.grille.dataset.ecran, etat(M.grille, 'justin').ecran, etat(M.grille, 'ben').ecran].join('/')); }
  v('justin → rien → justin → rien → ben → justin : chaque fois, la bonne tuile est l\'écran', trace,
    ['justin/1/1/0', 'null/0/0/0', 'justin/1/1/0', 'null/0/0/0', 'ben/1/0/1', 'justin/1/1/0']);
}

console.log('Un appel AUDIO n\'affiche jamais d\'image');
{
  const M = monter();
  M.rendre({ type: 'audio', moi: {}, membres: [membre('justin', 'Justin', { camera: true, partage: true })] });
  v('audio : tuile off même avec partage:true (le service ne laisse pas passer d\'image dans un appel audio)', etat(M.grille, 'justin').camera, 'off');
}

console.log('La feuille de la page : ce que l\'écran gagne');
{
  const sansCom = HTML.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const regles = new Map();
  for (const m of sansCom.matchAll(/([^{}]+)\{([^{}]*)\}/g)) for (const s of m[1].split(',')) { const k = s.trim().replace(/\s+/g, ' '); regles.set(k, (regles.get(k) || '') + ';' + m[2]); }
  vrai('population : la feuille compte plus de 40 règles (' + regles.size + ')', regles.size > 40);
  const decl = (sel) => { const o = {}; for (const x of (regles.get(sel) || '').split(';')) { const i = x.indexOf(':'); if (i > 0) o[x.slice(0, i).trim()] = x.slice(i + 1).trim(); } return o; };
  v('un écran se lit ENTIER : object-fit contain', decl('.tuile[data-ecran="1"] video')['object-fit'], 'contain');
  v('… sur fond noir (les bandes ne sont pas la couleur de la tuile)', decl('.tuile[data-ecran="1"] video').background, '#000');
  v('une tuile ordinaire rogne (cover) : la règle de base est intacte', decl('.tuile video')['object-fit'], 'cover');
  v('la vidéo d\'une tuile « off » est invisible, celle d\'une tuile « on » se voit (c\'est CE couple que `|| m.partage` répare)', [decl('.tuile video').opacity, decl('.tuile[data-camera="on"] video').opacity], ['0', '1']);
  const g = decl('.grille[data-ecran="1"] .tuile[data-ecran="1"]');
  v('la tuile de l\'écran prend toute la largeur et passe devant', [g['grid-column'], g.order], ['1 / -1', '-1']);
  vrai('la grille en partage donne la grande ligne à l\'écran et des vignettes fixes aux autres', /minmax\(0, 1fr\)/.test(decl('.grille[data-ecran="1"]')['grid-template-rows'] || '') && /^\d+px$/.test(decl('.grille[data-ecran="1"]')['grid-auto-rows'] || ''));
  v('l\'avatar d\'une tuile « écran » est caché (sinon il flotte sur l\'image)', decl('.tuile[data-ecran="1"] .init').display, 'none');
}
fin();

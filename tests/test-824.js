/* ══ v756 — LA PHOTO DE PROFIL S'AFFICHE, ET ELLE SE RECADRE ═══════════════════════════════════════════════════
   Justin, 26 septembre 2026, capture à l'appui : « quand je choisis une photo, j'aimerais pouvoir la redimensionner,
   et en plus de ça elle ne s'affiche pas ici — pourquoi ? » (Paramètres → Apparence, un disque lilas VIDE).
   1. POURQUOI : `html[data-refonte] .avatar{background:…!important}`. Un raccourci `background` remet AUSSI
      `background-image` à `none`, et un `!important` de la feuille bat le style en ligne qui portait la photo.
      Mesuré au navigateur (scratchpad/sonde-photo-profil.js) : style calculé `none`, pixels lilas (232,219,238),
      sur le disque des Paramètres ET sur celui du pied du menu. Depuis la refonte, aucune photo de profil n'était
      peinte — enregistrée, synchronisée, invisible. On ne pose plus que la COULEUR du disque.
   2. LE RECADRAGE : après le choix, un puits (glisser, pincer, curseur, molette, clavier) et le ROND de l'avatar ;
      ce qui part est le carré du rond, 256 px comme avant.
   Ce banc lit la feuille (commentaires retirés) et EXÉCUTE la géométrie du recadrage — les vraies fonctions de la
   page, extraites, dans un bac à sable : la photo couvre toujours le rond, le point pincé ne bouge pas, ce qui est
   enregistré est ce qui était cadré. La preuve au doigt et au pixel est la sonde. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* les règles de toutes les feuilles <style> : [sélecteur, déclarations], commentaires CSS retirés */
function regles(page) {
  const css = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) out.push([m[1].trim().replace(/\s+/g, ' '), m[2]]);
  return out;
}
/* une fonction de premier niveau, jusqu'à la déclaration suivante de premier niveau */
function fonction(CODE, nom) {
  const i = CODE.indexOf('\nfunction ' + nom + '(') >= 0 ? CODE.indexOf('\nfunction ' + nom + '(') + 1
    : CODE.indexOf('\nasync function ' + nom + '(') >= 0 ? CODE.indexOf('\nasync function ' + nom + '(') + 1 : -1;
  if (i < 0) return '';
  const fin = CODE.slice(i + 10).search(/\n(?:async function |function |const |let |var |window\.|views\.)/);
  return fin < 0 ? '' : CODE.slice(i, i + 10 + fin + 1);
}

for (const f of ['app.html', 'beta.html']) {
  const BRUT = fs.readFileSync(path.join(RACINE, f), 'utf8'), CODE = nu(BRUT), R = regles(BRUT);

  console.log(`\n── 824 · 1. ${f} — aucune règle ne retire l'image d'un disque d'avatar ──`);
  const avatar = R.filter(([s]) => /\.avatar\b/.test(s));
  vrai('population : les règles qui visent .avatar sont lues (au moins 4)', avatar.length >= 4, avatar.length);
  const effacent = avatar.filter(([, d]) => /(^|;|\s)background\s*:[^;]*!important/.test(d) || /background-image\s*:[^;]*!important/.test(d)).map(([s]) => s);
  vrai('⛔⛔ aucune ne pose `background:` (raccourci) ni `background-image` en !important — ils effaçaient la photo posée en ligne', effacent.length === 0, effacent);
  const refonte = avatar.find(([s]) => s === 'html[data-refonte] .avatar');
  vrai('la couleur du disque de la refonte est gardée — par `background-color`, seule',
    !!refonte && /background-color:color-mix\(in srgb,var\(--acc\) 18%,var\(--card\)\)!important/.test(refonte[1]), refonte && refonte[1].trim().slice(0, 90));
  vrai('   le disque des Paramètres porte la photo en ligne (background-image, cover, centrée)',
    /class="avatar" style="width:56px;height:56px;font-size:20px;flex-shrink:0;\$\{currentUser\.photo\?`background-image:url\(\$\{currentUser\.photo\}\);background-size:cover;background-position:center`:''\}"/.test(CODE));
  vrai('   … et le pied du menu aussi (userAvatarApply)', /el\.style\.backgroundImage='url\('\+currentUser\.photo\+'\)'; el\.style\.backgroundSize='cover'/.test(CODE));

  console.log(`\n── 824 · 2. ${f} — choisir une photo ouvre le recadrage, par les deux portes ──`);
  const pick = fonction(CODE, 'profilePhotoPick');
  vrai('population : profilePhotoPick est trouvée', pick.length > 80, pick.length);
  vrai('⛔ elle ne réduit plus la photo en aveugle : ppCharger puis ppOuvrir, jamais compressImage',
    /await ppCharger\(f\)/.test(pick) && /ppOuvrir\(src\)/.test(pick) && !/compressImage/.test(pick));
  vrai('   une photo illisible le DIT (et n’ouvre pas de fenêtre vide)', /if\(!src\)\{ toast\("Cette photo n'a pas pu être lue[^"]*"\); return; \}/.test(pick));
  const v2 = (CODE.match(/onchange="profilePhotoPick\(event\)"/g) || []).length;
  vrai('les deux champs (Paramètres, première connexion) passent par elle', v2 === 2, v2);
  const ouvrirF = fonction(CODE, 'ppOuvrir');
  vrai('⛔ le multitâche ne garde pas un recadrage (la photo est un FICHIER) : `_multiHtml` vidé juste après openModal',
    /openModal\(`[\s\S]*?`\);\s*\n?\s*_multiHtml='';/.test(ouvrirF.replace(/\/\*[\s\S]*?\*\//g, '')), ouvrirF.length);
  vrai('   le puits est une surface de geste focalisable, avec son rôle et son mode d’emploi',
    /class="pp-cadre" id="pp-cadre" tabindex="0" role="application"[^>]*aria-label="[^"]{20,}"/.test(ouvrirF));
  vrai('   le curseur d’agrandissement a un nom et va de 1 à PP_ZOOM_MAX', /<input type="range" id="pp-zoom" min="1" max="\$\{PP_ZOOM_MAX\}"[^>]*aria-label="Agrandir la photo"/.test(ouvrirF));
  const gestes = fonction(CODE, 'ppGestes');
  vrai('⛔ le doigt passe par le TACTILE (touchstart/touchmove non passifs, preventDefault) — le pointeur, lui, ignore le toucher',
    /addEventListener\('touchstart',e=>\{ if\(!_pp\) return; e\.preventDefault\(\);/.test(gestes) && /addEventListener\('touchmove',e=>\{[^}]*e\.preventDefault\(\);/.test(gestes)
    && (gestes.match(/\{passive:false\}/g) || []).length >= 3 && /e\.pointerType==='touch'\|\|e\.button!==0/.test(gestes));
  const cadreCss = R.find(([s]) => s === '.pp-cadre');
  vrai('   `touch-action:none` sur le puits SEUL (il ne contient que la photo et le rond)',
    !!cadreCss && /touch-action:none/.test(cadreCss[1]) && R.filter(([, d]) => /touch-action:none/.test(d)).every(([s]) => !/#content|\.plg|\.card\b|body|html(?!\[)/.test(s)));
  /* relecture v756 : Échap, le geste « retour » et toute navigation ferment la fenêtre par closeModal, jamais par
     « Annuler » — c'est ELLE qui doit oublier le recadrage. On l'EXÉCUTE. */
  const cm = fonction(CODE, 'closeModal');
  vrai('population : closeModal est trouvée', cm.length > 60, cm.length);
  const apresFermeture = forcee => new Function(`var _pp={src:1}; let _modalForcee=${forcee}; let scanTimer=null, scanStream=null;
      const $=id=>({classList:{remove(){}}}); function stopBoxScanCamera(){}
      ${cm} closeModal(); return _pp;`)();
  vrai('⛔ toute fermeture (Échap, retour, navigation) oublie le recadrage en cours', apresFermeture(false) === null);
  vrai('   … sauf une fenêtre obligatoire, qui ne se ferme pas (le recadrage ne peut pas y être ouvert)', apresFermeture(true) !== null);
  vrai('⛔ `_pp` est un `var` : closeModal, écrite bien plus haut, le lit sans zone morte temporelle', /\nvar _pp=null;/.test(CODE) && !/\nlet _pp\b/.test(CODE));
  vrai('   ce qui part pèse comme avant : 256 px (la photo voyage dans la synchro de l’équipe)', /const PP_SORTIE=256, PP_SOURCE_MAX=1600, PP_MARGE=20, PP_ZOOM_MAX=4;/.test(CODE));

  console.log(`\n── 824 · 3. ${f} — la géométrie, EXÉCUTÉE ──`);
  const noms = ['ppMesurer', 'ppBorner', 'ppZoomer', 'ppDeplacer', 'ppPeindre', 'ppContact', 'ppSuivre', 'ppValider'];
  const src = noms.map(n => fonction(CODE, n));
  vrai('population : les huit fonctions du recadrage sont trouvées', src.every(s => s.length > 40), noms.filter((n, i) => src[i].length <= 40));
  const cst = (CODE.match(/const PP_SORTIE=[^;]+;/) || [''])[0];
  /* un bac à sable : _pp, un faux puits, de faux canevas qui notent ce qu'on y dessine */
  const bac = new Function('env', `let _pp=null; const $=id=>env.el[id]||null; const document=env.document, window=env.window;
    const requestAnimationFrame=f=>{ f(); return 0; }; const closeModal=env.closeModal, setProfilePhoto=env.setProfilePhoto, toast=env.toast;
    ${cst}
    ${src.join('\n')}
    return { poser:p=>{ _pp=p; }, lire:()=>_pp, ${noms.join(', ')} };`);
  const canevas = () => { const c = { width: 0, height: 0, dessins: [], isConnected: true, type: '', q: 0,
    getContext: () => ({ setTransform() {}, clearRect() {}, fillRect() {}, set fillStyle(v) {}, set imageSmoothingQuality(v) {},
      drawImage: (...a) => c.dessins.push(a.slice(1)) }),
    toDataURL: (t, q) => { c.type = t; c.q = q; return 'data:' + t + ';base64,AAAA'; } }; return c; };
  const monter = (iw, ih, S) => { const env = { el: {}, sorties: [], fermee: 0, toasts: [], crees: [],
      document: { activeElement: null, createElement: () => { const c = canevas(); env.crees.push(c); return c; } }, window: { devicePixelRatio: 2 },
      closeModal: () => { env.fermee++; }, setProfilePhoto: d => env.sorties.push(d), toast: m => env.toasts.push(m) };
    env.el['pp-zoom'] = { value: '1' };
    const B = bac(env); const cv = canevas();
    B.poser({ src: { width: iw, height: ih }, st: { offsetWidth: S, isConnected: true }, cv, k: 1, z: 1, x: 0, y: 0, kmin: 1, D: 0, raf: 0 });
    B.ppMesurer(true); return { B, env, cv }; };
  const couvre = p => p.x <= 1e-9 && p.y <= 1e-9 && p.x + p.src.width * p.k >= p.D - 1e-9 && p.y + p.src.height * p.k >= p.D - 1e-9;

  /* au départ : la photo remplit le rond et se centre, qu'elle soit en largeur ou en hauteur */
  for (const [iw, ih] of [[1200, 800], [800, 1200], [1000, 1000]]) {
    const { B } = monter(iw, ih, 320), p = B.lire();
    vrai(`${iw}×${ih} : au départ le rond (D = 280) est rempli par le petit côté, centré`,
      p.D === 280 && Math.abs(Math.min(iw, ih) * p.k - 280) < 1e-9 && Math.abs(p.x - (280 - iw * p.k) / 2) < 1e-9 && Math.abs(p.y - (280 - ih * p.k) / 2) < 1e-9 && p.z === 1,
      { D: p.D, k: p.k, x: p.x, y: p.y });
  }
  /* mille gestes au hasard (graine fixe) : la photo couvre TOUJOURS le rond, l'agrandissement reste dans [1, 4] */
  { const { B } = monter(1200, 800, 320); let g = 7, faute = null;
    const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1000 && !faute; i++) {
      const r = hasard();
      if (r < 0.4) B.ppDeplacer((hasard() - 0.5) * 900, (hasard() - 0.5) * 900);
      else if (r < 0.7) B.ppZoomer(0.2 + hasard() * 6, hasard() * 280, hasard() * 280);
      else if (r < 0.85) { const d0 = 20 + hasard() * 200, d1 = 20 + hasard() * 200, cx = hasard() * 280, cy = hasard() * 280;
        B.ppSuivre(B.ppContact([{ x: cx - d0 / 2, y: cy }, { x: cx + d0 / 2, y: cy }]), B.ppContact([{ x: cx - d1 / 2 + 30, y: cy + 10 }, { x: cx + d1 / 2 + 30, y: cy + 10 }])); }
      else { B.lire().st.offsetWidth = 200 + Math.round(hasard() * 200); B.ppMesurer(false); }
      const p = B.lire(); if (!couvre(p) || p.z < 1 - 1e-9 || p.z > 4 + 1e-9) faute = { i, x: p.x, y: p.y, k: p.k, z: p.z, D: p.D };
    }
    vrai('⛔⛔ mille gestes au hasard (glisser, zoomer, pincer, tourner l’appareil) : la photo couvre TOUJOURS le rond, ×1 à ×4', !faute, faute); }
  /* agrandir autour d'un point : ce point de la photo ne bouge pas (quand la photo a la place de tourner autour) */
  { const { B } = monter(1200, 800, 320); B.ppZoomer(2); const p = B.lire();
    const fx = 100, fy = 150, u = (fx - p.x) / p.k, v = (fy - p.y) / p.k; B.ppZoomer(3, fx, fy); const q = B.lire();
    vrai('⛔ agrandir autour du point pincé : ce point de la photo reste sous les doigts', Math.abs(q.x + u * q.k - fx) < 1e-6 && Math.abs(q.y + v * q.k - fy) < 1e-6, { u, v, x: q.x, y: q.y, k: q.k }); }
  /* pincer : deux doigts dont l'écart double → ×2, et le centre qui glisse emporte la photo */
  { const { B } = monter(1200, 800, 320); B.ppZoomer(1.5); const z0 = B.lire().z, x0 = B.lire().x, y0 = B.lire().y;
    B.ppSuivre(B.ppContact([{ x: 120, y: 140 }, { x: 160, y: 140 }]), B.ppContact([{ x: 100, y: 140 }, { x: 180, y: 140 }]));
    vrai('⛔ deux doigts dont l’écart double : ×2', Math.abs(B.lire().z - 2 * z0) < 1e-9, B.lire().z);
    const { B: B2 } = monter(1200, 800, 320); B2.ppZoomer(2); const a = { ...B2.lire() };
    B2.ppSuivre(B2.ppContact([{ x: 100, y: 100 }]), B2.ppContact([{ x: 130, y: 90 }]));
    vrai('⛔ un doigt : la photo suit le doigt, du même déplacement', Math.abs(B2.lire().x - a.x - 30) < 1e-9 && Math.abs(B2.lire().y - a.y + 10) < 1e-9, { avant: [a.x, a.y], apres: [B2.lire().x, B2.lire().y] });
    B2.ppSuivre(B2.ppContact([{ x: 100, y: 100 }]), B2.ppContact([{ x: 100, y: 100 }, { x: 200, y: 100 }]));
    vrai('   un doigt qui devient deux : ce mouvement-là ne fait rien (pas de saut)', Math.abs(B2.lire().x - a.x - 30) < 1e-9 && B2.lire().z === 2, B2.lire().z); }
  /* l'appareil tourne (le puits change de taille) : le point de la photo qui était au centre du rond y reste */
  { const { B } = monter(1200, 800, 320); B.ppZoomer(2.2, 90, 170); B.ppDeplacer(-15, 8); const p = B.lire();
    const u = (p.D / 2 - p.x) / p.k, v = (p.D / 2 - p.y) / p.k, z = p.z;
    p.st.offsetWidth = 260; B.ppMesurer(false); const q = B.lire();
    vrai('⛔ l’appareil tourne : le même agrandissement, et le point au centre du rond y reste',
      q.D === 220 && Math.abs(q.z - z) < 1e-9 && Math.abs(q.x + u * q.k - q.D / 2) < 1e-6 && Math.abs(q.y + v * q.k - q.D / 2) < 1e-6, { D: q.D, z: q.z, x: q.x, y: q.y }); }
  /* un puits caché (fenêtre fermée par un autre chemin, écran recouvert) ne se remesure pas à 0 px */
  { const { B } = monter(1200, 800, 320); B.ppZoomer(2); const p = { ...B.lire() }; B.lire().st.offsetWidth = 0; B.ppMesurer(false); const q = B.lire();
    vrai('⛔ un puits caché (0 px) ne se remesure pas : le cadrage reste tel qu’il était', q.D === p.D && q.k === p.k && q.x === p.x && q.y === p.y, { D: q.D, k: q.k }); }
  /* le puits dessine la photo à sa place : marge + décalage, taille × k */
  { const { B, cv } = monter(1200, 800, 320); B.ppZoomer(2, 50, 60); const p = B.lire(); const d = cv.dessins[cv.dessins.length - 1];
    vrai('le puits peint la photo là où elle est (marge + décalage, taille × k), à la densité de l’écran',
      !!d && Math.abs(d[0] - (20 + p.x)) < 1e-9 && Math.abs(d[1] - (20 + p.y)) < 1e-9 && Math.abs(d[2] - 1200 * p.k) < 1e-9 && Math.abs(d[3] - 800 * p.k) < 1e-9 && cv.width === 640, { d, w: cv.width }); }
  /* ce qui part : le carré du rond, 256 px, en JPEG */
  { const { B, env } = monter(1200, 800, 320); B.ppZoomer(2.5, 40, 200); B.ppDeplacer(-37, 12); const p = { ...B.lire() };
    B.ppValider(); const c = env.crees[env.crees.length - 1], d = c && c.dessins[0], f = 256 / p.D;
    vrai('⛔⛔ ce qui est ENREGISTRÉ est ce qui était cadré : le carré du rond, ramené à 256 px',
      !!d && c.width === 256 && c.height === 256 && Math.abs(d[0] - p.x * f) < 1e-9 && Math.abs(d[1] - p.y * f) < 1e-9 && Math.abs(d[2] - 1200 * p.k * f) < 1e-9 && Math.abs(d[3] - 800 * p.k * f) < 1e-9,
      { d, attendu: [p.x * f, p.y * f, 1200 * p.k * f, 800 * p.k * f] });
    vrai('   en JPEG à 0,85, puis la fenêtre se ferme et la photo est posée sur le compte',
      c.type === 'image/jpeg' && c.q === 0.85 && env.fermee === 1 && env.sorties.length === 1 && /^data:image\/jpeg/.test(env.sorties[0]) && B.lire() === null, { type: c.type, q: c.q, fermee: env.fermee, n: env.sorties.length }); }
}

console.log('\n── 824 · 4. la preuve au doigt existe ──');
vrai('scratchpad/sonde-photo-profil.js', fs.existsSync(path.join(RACINE, 'scratchpad', 'sonde-photo-profil.js')));

console.log(`\n════ test-824 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);

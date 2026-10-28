#!/usr/bin/env node
/* ══ LES IMAGES DE PROFIL DES GROUPES ET DU ROBOT « SYSTÈME » (OP MESSAGES) ═════════════════════════
   Pourquoi ces images existent : Justin a branché ses seize agents de la Tour sur OP MESSAGES (le
   « pont »). Les agents ont leur visage (`icons/agents/<id>.jpg`) ; les groupes n'avaient rien — dans
   la Tour, un groupe n'est qu'un « # » dans un rond de couleur, et un fil de discussion sans image
   ressemble à un fil sans identité. Cinq images, une par groupe plus le robot qui parle au nom de
   l'équipe :
     icons/groupes/equipe.png      Équipe      bleu     trois silhouettes
     icons/groupes/clients.png     Clients     vert     un immeuble (les entreprises clientes)
     icons/groupes/plateforme.png  Plateforme  indigo   trois couches empilées
     icons/groupes/reunions.png    Réunions    orange   une caméra vidéo
     icons/groupes/systeme.png     Système     graphite un engrenage

   Contraintes, et pourquoi :
   · 256 × 256 exactement, comme les visages des agents : OP MESSAGES les affiche tous dans le même rond.
   · FOND PLEIN, jamais transparent : le rond coupe les coins, et un fond transparent y devient un trou
     (blanc ou noir selon le thème de l'écran). Le dégradé couvre donc tout le carré.
   · pictogramme gardé dans les 60 % du centre : c'est ce que le rond laisse voir, même à 40 px.
   · tout est dessiné en CHEMINS SVG, au trait blanc d'épaisseur régulière et aux bouts arrondis —
     aucun émoji, aucune police : le rendu ne dépend de rien d'installé sur la machine qui l'exécute.

   Régénérer (Chromium est préinstallé avec Playwright ; ne pas lancer « playwright install ») :
       node scripts/avatars-groupes.js
   ⛔ On retouche ICI puis on régénère : ne jamais ouvrir un PNG dans un éditeur, la prochaine
   exécution l'écraserait. Les teintes reprennent celles de la Tour (bleu, vert, violet/indigo,
   orange, gris système). */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SORTIE = path.join(__dirname, '..', 'icons', 'groupes');
const TAILLE = 256;
const TRAIT = 10;

/* Échelle de chaque pictogramme autour du centre : plus lisible à 40 px, sans sortir des 60 % du centre
   (l'équipe est déjà large de trois silhouettes, elle reste à 1). */
const ECHELLE = { equipe: 1, clients: 1.14, plateforme: 1.12, reunions: 1.14, systeme: 1.12 };

/* Un engrenage se calcule : huit dents trapézoïdales sur un disque, l'angle fait tout. */
function engrenage(cx, cy, rBase, rDent, dents) {
  const pas = (2 * Math.PI) / dents;
  const pt = (a, r) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
  let d = '';
  for (let k = 0; k < dents; k++) {
    const c = k * pas;
    const p = [[c - pas * 0.30, rBase], [c - pas * 0.17, rDent], [c + pas * 0.17, rDent], [c + pas * 0.30, rBase]];
    d += (k === 0 ? 'M' : 'L') + pt(p[0][0], p[0][1]);
    for (let i = 1; i < 4; i++) d += 'L' + pt(p[i][0], p[i][1]);
  }
  return d + 'Z';
}

/* Les pictogrammes : coordonnées sur 256, centrés en (128,128), tenus dans ~120 px (47 %). */
const PICTOS = {
  equipe: `
    <circle cx="128" cy="98" r="20"/>
    <path d="M90 180 C90 154 106 140 128 140 C150 140 166 154 166 180"/>
    <g opacity=".72">
      <circle cx="76" cy="112" r="14"/>
      <path d="M52 168 C52 152 60 142 76 140"/>
      <circle cx="180" cy="112" r="14"/>
      <path d="M204 168 C204 152 196 142 180 140"/>
    </g>`,
  clients: `
    <rect x="86" y="72" width="84" height="110" rx="9"/>
    <path d="M108 100 H112 M144 100 H148 M108 124 H112 M144 124 H148 M108 148 H112 M144 148 H148" stroke-width="11"/>
    <path d="M118 182 V160 H138 V182"/>
    <path d="M70 182 H186"/>`,
  plateforme: `
    <path d="M128 70 L190 100 L128 130 L66 100 Z"/>
    <path d="M66 128 L128 158 L190 128"/>
    <path d="M66 156 L128 186 L190 156"/>`,
  reunions: `
    <rect x="68" y="92" width="84" height="74" rx="17"/>
    <path d="M152 118 L186 98 Q190 96 190 101 V157 Q190 162 186 160 L152 140 Z"/>`,
  systeme: `
    <path d="${engrenage(128, 128, 46, 60, 8)}"/>
    <circle cx="128" cy="128" r="20"/>`
};

/* Teintes : du clair (haut gauche) au profond (bas droite), reprises de la Tour. */
const TEINTES = {
  equipe: ['#5CB6FF', '#0A58CC'],
  clients: ['#52E08F', '#0A6A56'],
  plateforme: ['#B58BFB', '#4A46D2'],
  reunions: ['#FFBA4A', '#E4620A'],
  systeme: ['#A2A2A8', '#38383A']
};

function svg(id) {
  const [haut, bas] = TEINTES[id];
  /* L'ombre du pictogramme reprend la teinte profonde : elle détache le blanc sans salir le dégradé. */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TAILLE}" height="${TAILLE}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${haut}"/>
      <stop offset="1" stop-color="${bas}"/>
    </linearGradient>
    <linearGradient id="reflet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".30"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="ombre" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="${bas}" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect width="256" height="256" fill="url(#fond)"/>
  <rect width="256" height="128" fill="url(#reflet)"/>
  <g fill="none" stroke="#fff" stroke-width="${TRAIT}" stroke-linecap="round" stroke-linejoin="round" filter="url(#ombre)">
    <g transform="translate(128 128) scale(${ECHELLE[id]}) translate(-128 -128)">${PICTOS[id]}</g>
  </g>
</svg>`;
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const nav = await chromium.launch();
  try {
    const page = await nav.newPage({ viewport: { width: TAILLE, height: TAILLE }, deviceScaleFactor: 1 });
    for (const id of Object.keys(PICTOS)) {
      await page.setContent(`<!doctype html><html><body style="margin:0;background:${TEINTES[id][1]}">${svg(id)}</body></html>`);
      const fichier = path.join(SORTIE, id + '.png');
      await page.screenshot({ path: fichier, clip: { x: 0, y: 0, width: TAILLE, height: TAILLE }, omitBackground: false });
      console.log('écrit', path.relative(process.cwd(), fichier), fs.statSync(fichier).size, 'octets');
    }
  } finally {
    await nav.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

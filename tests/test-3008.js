/* 3008 — LES VISAGES DE L'ÉQUIPE DANS LA TOUR (v2.111, 25 octobre 2026).
   Justin : « il faudrait aussi que tous mes agents aient une photo de profil, j'aime bien mettre un visage sur un nom ». Les photos ont été
   générées par Justin (Gemini) : des personnes FICTIVES, 256 px, dans icons/agents/<id>.jpg. Ce banc garde quatre choses :
     · une photo par agent du registre (server/agents.js), ni plus ni moins — un agent ajouté sans visage, ou un fichier orphelin, fait tomber ;
     · la VRAIE `agAvatar` de tour.html : la photo pour un agent connu, l'initiale DESSOUS (une image qui ne vient pas s'efface et la laisse),
       rien d'autre pour un fil de groupe ou un identifiant inconnu, et rien d'injecté par un nom ou un identifiant hostile ;
     · plus aucun avatar d'agent dessiné à la main dans la page (les neuf endroits passent par `agAvatar`) ;
     · la règle qui pose l'image dans le rond (sans elle, la photo s'afficherait en grand à côté de l'initiale). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
console.log('── test-3008 : les visages de l’équipe dans la Tour ──');

const BRUT = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const { AGENTS } = require(path.join(RACINE, 'server', 'agents.js'));
const DOSSIER = path.join(RACINE, 'icons', 'agents');
/* Les agents EXTERNES : des visages dans la Tour, mais hors du registre serveur. Pauline (la prospection) tourne sur le Mac de Justin ;
   sa photo arrive avant la Tour v2.112 qui l'affiche (l'aperçu la montre déjà). Un second externe s'ajoute ici à la main, par son nom. */
const EXTERNES = ['pauline'];

/* 1. Les fichiers, face au registre. */
const ids = (AGENTS || []).map(a => a.id).sort();
const fichiers = fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter(f => !f.startsWith('.')).sort() : [];
vrai('(population) le registre des agents est lu : 16 agents', ids.length === 16, ids.join(','));
vrai('une photo par agent du registre, plus celle des externes déclarés — ni plus ni moins (icons/agents/<id>.jpg)', JSON.stringify(fichiers) === JSON.stringify(ids.concat(EXTERNES).sort().map(i => i + '.jpg')), fichiers.join(','));
vrai('(population) les externes déclarés ne sont PAS dans le registre du serveur (sinon ce n\u2019est plus une exception)', EXTERNES.length === 1 && EXTERNES.every(e => !ids.includes(e)), EXTERNES.join(','));
for (const f of fichiers) {
  const b = fs.readFileSync(path.join(DOSSIER, f));
  /* un JPEG commence par FF D8 ; la taille se lit dans le premier segment SOF (C0 ou C2) */
  let l = 0, h = 0;
  for (let k = 2; k < b.length - 9;) {
    if (b[k] !== 0xFF) break;
    const t = b[k + 1], n = b.readUInt16BE(k + 2);
    if (t === 0xC0 || t === 0xC2) { h = b.readUInt16BE(k + 5); l = b.readUInt16BE(k + 7); break; }
    k += 2 + n;
  }
  vrai(f + ' : JPEG carré de 256 px, moins de 20 Ko (la Tour en charge seize)', b[0] === 0xFF && b[1] === 0xD8 && l === 256 && h === 256 && b.length < 20000, l + '×' + h + ', ' + b.length + ' o');
}

/* 2. La vraie agAvatar et sa table. */
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const debut = CODE.indexOf('\nfunction agAvatar(');
const fin = debut < 0 ? -1 : CODE.indexOf('\n}', debut);
const FN = debut < 0 ? '' : CODE.slice(debut, fin + 2);
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const TABLE = ligne('var AG_PHOTOS=');
vrai('(population) agAvatar, esc et AG_PHOTOS sont trouvés dans le fichier livré', FN.length > 80 && ESC.length > 20 && TABLE.length > 50, FN.length + '/' + ESC.length + '/' + TABLE.length);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(ESC + '\n' + TABLE + '\n' + FN, ctx);
const table = Object.keys(ctx.AG_PHOTOS || {}).sort();
vrai('la table des photos de la page est celle du registre', JSON.stringify(table) === JSON.stringify(ids), table.join(','));
const h = ctx.agAvatar('camille', 'Camille', 'ms-av');
vrai('un agent connu : l’initiale, puis sa photo par-dessus, dans le rond', /^<span class="ms-av" aria-hidden="true">C<img src="icons\/agents\/camille\.jpg" alt=""[^>]*><\/span>$/.test(h), h);
vrai('la photo s’efface si elle ne vient pas (l’initiale reste), et se charge sans bloquer la page', /onerror="this\.remove\(\)"/.test(h) && /loading="lazy"/.test(h), h);
const hp = ctx.agAvatar('theo', 'théo', 'ms-av p');
vrai('l’initiale est en majuscule, la classe du petit rond est gardée', /^<span class="ms-av p" aria-hidden="true">T<img src="icons\/agents\/theo\.jpg"/.test(hp), hp);
const g = ctx.agAvatar('clients', 'Clients', 'ms-av');
vrai('un fil de groupe ou un identifiant inconnu : l’initiale seule, aucune image demandée', g === '<span class="ms-av" aria-hidden="true">C</span>', g);
const proto = ctx.agAvatar('constructor', 'X', 'ms-av') + ctx.agAvatar('__proto__', 'Y', 'ms-av') + ctx.agAvatar('toString', 'Z', 'ms-av');
vrai('⛔ un identifiant qui vit sur le prototype (constructor, __proto__, toString) n’ouvre aucune image', !/<img/.test(proto), proto);
const hostile = ctx.agAvatar('"><img src=x onerror=alert(1)>', '<b>Zed</b>', 'ms-av');
vrai('⛔ un identifiant ou un nom hostile : rien d’injecté, l’initiale est échappée', !/<img|<b>/.test(hostile) && /&lt;/.test(hostile), hostile);
vrai('un nom absent retombe sur l’identifiant, puis sur « ? »', ctx.agAvatar('lea', '', 'ag-av').indexOf('>L<img') > 0 && ctx.agAvatar('', '', 'ag-av') === '<span class="ag-av" aria-hidden="true">?</span>');

/* 3. Plus aucun avatar d'agent écrit à la main. */
const aLaMain = (CODE.match(/class="(?:ms-av(?: p)?|ag-av)" aria-hidden="true">'\+esc\(/g) || []).length;
vrai('aucun avatar d’agent dessiné à la main : les initiales passent toutes par agAvatar', aLaMain === 0, aLaMain);
const appels = (CODE.match(/\bagAvatar\(/g) || []).length - 1;
vrai('(population) les neuf endroits qui montrent un agent appellent agAvatar (fiches, bulles, conversations, tâches, réunions ×3, RGPD, mentions)', appels === 9, appels);
vrai('la carte de Nina (RGPD) porte sa photo, plus un « N » écrit en dur', /agAvatar\('nina','Nina','ms-av p'\)/.test(CODE) && !/aria-hidden="true">N<\/span><b>Nina/.test(CODE));

/* 4. La règle qui pose l'image dans le rond. */
vrai('le rond tient l’image (position et débordement)', /\.ms-av,\.ag-av\{position:relative;overflow:hidden\}/.test(CODE));
vrai('l’image couvre le rond, recadrée, arrondie comme lui', /\.ms-av>img,\.ag-av>img\{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit\}/.test(CODE));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

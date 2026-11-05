/* ══ test-3256 — L'APERÇU D'UN DOCUMENT PREND L'ÉCRAN ═══════════════════════════════════════════════════════════════════════
   Justin, 4 novembre 2026, capture du Devis IA sur la bêta : « il faudrait que ça prenne toute la page, c'est beaucoup trop petit…
   le devis est coupé en 3 fois, c'est pas normal ». L'aperçu était une boîte de 46vh (497 px sur 1 080, 388 px sur un téléphone)
   sous un formulaire ; on y faisait défiler une page A4 en trois fois.

   Ce banc garde la RÈGLE dans le code servi (commentaires retirés : il garde du code, pas une phrase) :
   · l'aperçu du Devis IA passe par la pièce commune (`pdfApercuHtml` / `pdfApercuPoser`) — une pièce, pas une copie par écran ;
   · la vue fait la hauteur de l'écran sous l'en-tête (`100dvh`), jamais une fraction (« 46vh ») ;
   · sur un écran étroit, seuls les deux envois sont collés en bas (barre courte qui ne mange pas la page) ;
   · aucune autre boîte d'aperçu à hauteur fixe n'embarque un PDF dans une fenêtre.
   La preuve visuelle et chiffrée (six profils, jour et nuit : 49-51 % → 88-95 % de la hauteur utile) est la sonde
   `scratchpad/apercu-plein/sonde.js` (dossier de la session) ; ce banc garde que personne ne remette la petite boîte. */
const fs = require('fs'), path = require('path');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' → ' + JSON.stringify(d) : '')); } };
const RAC = path.join(__dirname, '..');
const BRUT = fs.readFileSync(path.join(RAC, 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const corps = (nom) => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return '';
  const fins = ['\nfunction ', '\nasync function ', '\nviews.', '\nconst ', '\nlet '].map(m => SRC.indexOf(m, i + 10)).filter(x => x > 0);
  return SRC.slice(i, Math.min(...fins)); };

console.log('\n── 3256 · 1. la pièce commune ──');
const html = corps('pdfApercuHtml'), poser = corps('pdfApercuPoser'), grand = corps('pdfApercuGrand');
vrai('pdfApercuHtml existe et pose une zone .pdfap-vue', /class="pdfap-vue"/.test(html), html.slice(0, 120));
/* v802 : le PDF se DESSINE dans la zone (pdfAfficher, toutes les pages, sur iPhone et Android aussi) ; l'iframe n'est plus qu'un repli */
vrai('pdfApercuPoser dessine le PDF dans la zone par pdfAfficher (l’iframe n’est qu’un repli)', /await pdfAfficher\(box,chaine,\{url:u\}\)/.test(poser), poser.slice(0, 300));
vrai('… et libère l’adresse précédente (pas de fuite à chaque client changé)', /revokeObjectURL/.test(poser));
vrai('« Ouvrir en grand » ouvre la fenêtre PDF de l’application (pdfFeuille), plus un onglet', /pdfFeuille\(\{/.test(grand) && !/window\.open/.test(grand), grand.slice(0, 200));

console.log('\n── 3256 · 2. le Devis IA s’en sert ──');
const ap = corps('devisIAApercu'), rendu = corps('devisIAApRendu');
vrai('la fenêtre du Devis IA est bâtie sur .pdfap', /<div class="pdfap">/.test(ap) && /\$\{pdfApercuHtml\('dia-pdf-box'\)\}/.test(ap), ap.slice(0, 200));
vrai('… le rendu passe par pdfApercuPoser', /pdfApercuPoser\('dia-pdf-box',await devisPdfBlob\(d\)\)/.test(rendu), rendu.slice(0, 200));
vrai('… plus de boîte à hauteur fixe (46vh) dans la fenêtre', !/46vh/.test(ap) && !/height:\d+vh/.test(ap));
vrai('les deux envois sont dans .pdfap-envoi', /<div class="pdfap-envoi">\s*<button class="btn" onclick="devisIAEnvoyer\('\$\{id\}','mail'\)"/.test(ap));
vrai('les gestes secondaires sont à part (.pdfap-autres), hors de la barre collée', /<div class="pdfap-autres">[\s\S]*devisPdfDownload[\s\S]*pdfApercuGrand[\s\S]*Ajuster les lignes/.test(ap));

console.log('\n── 3256 · 3. la feuille ──');
const css = (sel) => { const re = new RegExp('(^|[}\\s])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}', 'g'); const out = []; let m; while ((m = re.exec(SRC))) out.push(m[2]); return out; };
const pdfap = css('.pdfap'), vue = css('.pdfap-vue'), envoi = css('.pdfap-envoi');
vrai('la hauteur de la vue part de 100dvh (écran visible, pas 100vh)', pdfap.some(r => /--pdfap-h:calc\(100dvh - \d+px\)/.test(r)) && vue.some(r => /height:var\(--pdfap-h\)/.test(r)), { pdfap, vue });
vrai('sur écran large, la largeur de la vue suit sa hauteur (page entière visible)', pdfap.some(r => /grid-template-columns:minmax\(0,calc\(var\(--pdfap-h\) \* \.7\d\)\)/.test(r)));
const iEtroit = SRC.indexOf('@media (max-width:899px){\n  /* téléphone'); const iEtroit2 = iEtroit > 0 ? iEtroit : SRC.indexOf('@media (max-width:899px){', SRC.indexOf('.pdfap{'));
const bloc = iEtroit2 > 0 ? SRC.slice(iEtroit2, SRC.indexOf('\n}\n', iEtroit2)) : '';
vrai('le bloc « écran étroit » de l’aperçu est trouvé', bloc.length > 100, bloc.length);
vrai('… la vue y garde presque toute la hauteur (100dvh moins ≤ 180 px)', (() => { const m = /--pdfap-h:calc\(100dvh - (\d+)px\)/.exec(bloc); return !!m && +m[1] <= 180; })(), bloc.slice(0, 160));
vrai('… et seuls les envois sont collés en bas', /\.pdfap-envoi\{position:sticky;bottom:0/.test(bloc) && !/\.pdfap-autres\{[^}]*sticky/.test(bloc));

console.log('\n── 3256 · 4. aucune autre petite boîte d’aperçu PDF ──');
const autres = [...SRC.matchAll(/<iframe[^>]*src="'\+[a-z]+\+'#toolbar/g)].length;
vrai('deux iframes de PDF au plus, toutes deux des REPLIS du lecteur maison (pdfAfficher, pdfApercuPoser sans octets)', autres === 2, autres);
vrai('l’ancienne boîte (border-radius:10px;…height:46vh) a disparu', !/background:#fff;height:46vh/.test(SRC));

console.log(`\n${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);

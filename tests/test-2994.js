/* test-2994 — « Faire signer » ne se propose que sur un PDF (24 octobre 2026).
   Vu dans la Tour : un rapport DMARC de Google (pièce .zip) portait le bouton « Faire signer », et le geste ouvrait une demande
   de signature SANS document. La règle était `a.kind!=="img"` (tout ce qui n'est pas une image) ; elle est désormais `estPDF`,
   la fonction qui décide déjà du bouton « Aperçu » sur la même ligne.
   Le banc EXÉCUTE l'expression réelle de `canSign` et le filtre réel de `signFrom`, extraits du fichier livré (commentaires retirés
   avant de chercher : le commentaire au-dessus nomme les deux). Et il exige que les deux copies servies soient la source à l'octet. */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (m, c) => { if (c) { ok++; console.log('  ✓ ' + m); } else { ko++; console.log('  ✗ ' + m); } };

const SRC = fs.readFileSync(path.join(R, 'opcourrier.js'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const lEst = CODE.match(/function estPDF\(a\)\{[^\n]*?\}(?=\n)/);
vrai('estPDF est trouvée dans le code', !!lEst);
const estPDF = new Function(lEst[0] + '; return estPDF;')();

const lCan = CODE.match(/var canSign=([^;\n]+);/);
vrai('l\'expression de canSign est trouvée dans le code', !!lCan);
const canSign = new Function('m', 'k0', 'estPDF', 'return (' + lCan[1] + ');');

const lSF = CODE.match(/if\(act==="signFrom"\)\{[^\n]*?att:(m\.att\.filter\([^)]*\))/);
vrai('le filtre des pièces de « signFrom » est trouvé dans le code', !!lSF);
const piecesSignees = new Function('m', 'estPDF', 'return ' + lSF[1] + ';');

const msg = att => ({ sign: false, folder: 'inbox', att });
const pdf = { kind: 'doc', name: 'Contrat.PDF' }, pdfType = { kind: 'doc', name: 'contrat', file: { type: 'application/pdf' } };
const zip = { kind: 'doc', name: 'google.com!teamop.fr!1761264000!1761350399.zip' }, gz = { kind: 'doc', name: 'rapport.xml.gz' };
const docx = { kind: 'doc', name: 'devis.docx' }, img = { kind: 'img', name: 'photo.pdf' };

vrai('un PDF reçu sur une boîte pro propose « Faire signer »', canSign(msg([pdf]), 'pro', estPDF) === true);
vrai('un PDF reconnu à son type (sans extension) aussi', canSign(msg([pdfType]), 'pro', estPDF) === true);
vrai('un rapport DMARC (.zip) ne le propose PAS', canSign(msg([zip]), 'pro', estPDF) === false);
vrai('un .xml.gz ne le propose pas', canSign(msg([gz]), 'pro', estPDF) === false);
vrai('un .docx ne le propose pas', canSign(msg([docx]), 'pro', estPDF) === false);
vrai('une image nommée .pdf ne le propose pas', canSign(msg([img]), 'pro', estPDF) === false);
vrai('un zip ET un PDF : proposé', canSign(msg([zip, pdf]), 'pro', estPDF) === true);
vrai('boîte personnelle : jamais', canSign(msg([pdf]), 'perso', estPDF) === false);
vrai('corbeille et indésirables : jamais', canSign({ ...msg([pdf]), folder: 'trash' }, 'pro', estPDF) === false && canSign({ ...msg([pdf]), folder: 'junk' }, 'pro', estPDF) === false);
const parties = piecesSignees(msg([zip, pdf, docx, pdfType]), estPDF);
vrai('le geste n\'emporte QUE les PDF dans la demande de signature', parties.length === 2 && parties[0] === pdf && parties[1] === pdfType);

for (const copie of ['apercu/opcourrier.js', 'server-msg/public/opcourrier.js'])
  vrai(copie + ' est la source à l\'octet', fs.readFileSync(path.join(R, copie), 'utf8') === SRC);

console.log(`\ntest-2994 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);

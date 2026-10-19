/* ══ LE CERTIFICAT DE SIGNATURE — UN PDF ÉCRIT À LA MAIN, SANS BIBLIOTHÈQUE ═══════════════════════════════════════════
 * Le dossier de preuve d'une demande, mis en page : le document (nom, taille, empreinte SHA-256), chaque signataire (qui, par quel canal, quand,
 * depuis quelle adresse réseau), le texte de consentement accepté (version et empreinte), le journal chaîné et son sceau.
 * Même fabrique que `bonPdfStr()` d'OP GESTION : Helvetica et Courier (polices de base du PDF, WinAnsi), pas de police embarquée, pas de dépendance.
 * ⛔ WinAnsi n'a ni flèche, ni guillemet courbe, ni « é » décomposé : `winansi` les dit autrement ou les efface — jamais un « ? » dans un document
 * qu'un client reçoit. ⛔ Ce certificat ne dit JAMAIS « avancée » ni « qualifiée » : la signature de ce service est une signature électronique SIMPLE.
 */
'use strict';

const L = 595, H = 842, MARGE = 50, UTILE = L - 2 * MARGE;
const SUBST = { '’': "'", '‘': "'", '“': '"', '”': '"', '«': '"', '»': '"', '–': '-', '—': '-', '…': '...', '→': '->', '←': '<-', '•': '-', '·': '-', ' ': ' ', '✓': 'oui', '€': 'EUR', 'œ': 'oe', 'Œ': 'OE' };
function winansi(s) {
  let o = '';
  for (const c of String(s == null ? '' : s)) {
    if (SUBST[c] !== undefined) { o += SUBST[c]; continue; }
    const k = c.codePointAt(0);
    if (k === 9 || k === 10) { o += ' '; continue; }
    if (k >= 32 && k <= 126) { o += c; continue; }
    if (k >= 160 && k <= 255) { o += c; continue; }
    const d = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
    o += d !== c && /^[\x20-\x7e\xa0-\xff]+$/.test(d) ? d : '';
  }
  return o;
}
const echapper = (s) => s.replace(/[\\()]/g, (c) => '\\' + c);

/* Largeur approchée en points (Helvetica) : assez juste pour couper les lignes sans déborder, et on garde une marge. */
function largeur(s, taille, mono) {
  if (mono) return s.length * taille * 0.6;
  let w = 0;
  for (const c of s) {
    if ('iljtfr.,:;\'| !I'.includes(c)) w += 0.28; else if ('mwMW@%'.includes(c)) w += 0.83; else if (c >= 'A' && c <= 'Z') w += 0.68; else if (c >= '0' && c <= '9') w += 0.556; else w += 0.5;
  }
  return w * taille;
}
function couper(texte, taille, max, mono) {
  const lignes = [];
  for (const para of winansi(texte).split(/\n/)) {
    let cur = '';
    for (const mot of para.split(' ')) {
      let m = mot;
      while (largeur(m, taille, mono) > max) {   // un mot plus large qu'une ligne (une empreinte, une adresse) se coupe
        let i = m.length; while (i > 1 && largeur(m.slice(0, i), taille, mono) > max) i--;
        if (cur) { lignes.push(cur); cur = ''; }
        lignes.push(m.slice(0, i)); m = m.slice(i);
      }
      const essai = cur ? cur + ' ' + m : m;
      if (largeur(essai, taille, mono) <= max || !cur) cur = essai; else { lignes.push(cur); cur = m; }
    }
    lignes.push(cur);
  }
  return lignes;
}

/* `blocs` : [{ t:'h1'|'h2'|'p'|'mono'|'esp', texte }] → Buffer PDF. */
function pdf(blocs, pied) {
  const pages = [[]];
  let y = H - MARGE;
  const style = { h1: ['F2', 17, 22], h2: ['F2', 11.5, 17], p: ['F1', 9.5, 13], mono: ['F3', 7.6, 10.5] };
  const nouvellePage = () => { pages.push([]); y = H - MARGE; };
  for (const b of blocs) {
    if (b.t === 'esp') { y -= b.h || 8; continue; }
    const [f, taille, pas] = style[b.t];
    const decalage = b.indent || 0;
    for (const ligne of couper(b.texte, taille, UTILE - decalage - 2, b.t === 'mono')) {
      if (y - pas < MARGE + 14) nouvellePage();
      y -= pas;
      pages[pages.length - 1].push('BT /' + f + ' ' + taille + ' Tf ' + (MARGE + decalage) + ' ' + y.toFixed(1) + ' Td (' + echapper(ligne) + ') Tj ET');
    }
    if (b.t === 'h1' || b.t === 'h2') y -= 3;
  }
  const total = pages.length;
  pages.forEach((p, i) => p.push('BT /F1 7.5 Tf ' + MARGE + ' 28 Td (' + echapper(winansi(pied + ' - page ' + (i + 1) + '/' + total)) + ') Tj ET'));
  // objets : 1 catalogue, 2 pages, 3-5 polices, puis (page, contenu) par page
  const obj = [];
  const kids = pages.map((_, i) => (6 + 2 * i) + ' 0 R').join(' ');
  obj[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  obj[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + total + ' >>';
  obj[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  obj[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  obj[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  pages.forEach((p, i) => {
    const flux = p.join('\n');
    obj[6 + 2 * i] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + L + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ' + (7 + 2 * i) + ' 0 R >>';
    obj[7 + 2 * i] = '<< /Length ' + flux.length + ' >>\nstream\n' + flux + '\nendstream';
  });
  let sortie = '%PDF-1.4\n', offsets = [];
  for (let i = 1; i < obj.length; i++) { offsets[i] = sortie.length; sortie += i + ' 0 obj\n' + obj[i] + '\nendobj\n'; }
  const xref = sortie.length;
  sortie += 'xref\n0 ' + obj.length + '\n0000000000 65535 f \n' + offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  sortie += 'trailer\n<< /Size ' + obj.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(sortie, 'latin1');
}

const fmtUTC = (t) => new Date(t).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
function fmtParis(t) { try { return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(t)) + ' (Paris)'; } catch (e) { return ''; } }
const fmtTaille = (n) => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko';

/* d : { id, titre, expediteur, cree, termine:{t,sceau}|null, documents:[{nom,taille,sha256}], signataires:[{n,nom,email,canal,destination,signe:{t,ip,ua,consent:{version,h}}|null}],
         consentement:{version,texte}, journal:[…], chaine:{ok,derniere}, focus?:n } */
function certificat(d) {
  const b = [];
  const foc = d.focus ? d.signataires.find((s) => s.n === d.focus) : null;
  b.push({ t: 'h1', texte: 'Certificat de signature électronique' });
  b.push({ t: 'p', texte: 'TeamOP - signature électronique simple' });
  if (foc) b.push({ t: 'p', texte: 'Dossier de preuve - signataire n°' + foc.n + ' : ' + foc.nom });
  b.push({ t: 'esp', h: 6 }, { t: 'h2', texte: 'La demande' });
  b.push({ t: 'p', texte: 'Titre : ' + d.titre }, { t: 'p', texte: 'Identifiant : ' + d.id });
  if (d.expediteur) b.push({ t: 'p', texte: 'Envoyée par : ' + d.expediteur });
  b.push({ t: 'p', texte: 'Créée le : ' + fmtUTC(d.cree) + ' - ' + fmtParis(d.cree) });
  b.push({ t: 'p', texte: d.termine ? 'Terminée le : ' + fmtUTC(d.termine.t) + ' - ' + fmtParis(d.termine.t) : 'Statut : en cours (tous les signataires n\'ont pas encore signé)' });
  b.push({ t: 'esp' }, { t: 'h2', texte: 'Document' + (d.documents.length > 1 ? 's' : '') + ' signé' + (d.documents.length > 1 ? 's' : '') + ' (le document n\'est jamais modifié)' });
  for (const x of d.documents) { b.push({ t: 'p', texte: x.nom + ' - ' + fmtTaille(x.taille) }); b.push({ t: 'p', texte: 'Empreinte SHA-256 :' }, { t: 'mono', texte: x.sha256, indent: 10 }); }
  b.push({ t: 'esp' }, { t: 'h2', texte: 'Signataires' });
  for (const s of d.signataires) {
    b.push({ t: 'p', texte: s.n + '. ' + s.nom + ' <' + s.email + '>' });
    b.push({ t: 'p', texte: 'Code de vérification : ' + (s.canal === 'sms' ? 'SMS' : 'e-mail') + ' envoyé à ' + s.destination, indent: 10 });
    if (s.signe) {
      b.push({ t: 'p', texte: 'Signé le : ' + fmtUTC(s.signe.t) + ' - ' + fmtParis(s.signe.t), indent: 10 });
      b.push({ t: 'p', texte: 'Adresse réseau : ' + (s.signe.ip || 'non disponible') + ' - Navigateur : ' + (s.signe.ua || 'non disponible'), indent: 10 });
      b.push({ t: 'p', texte: 'Consentement version ' + s.signe.consent.version + ' - empreinte du texte :', indent: 10 }, { t: 'mono', texte: s.signe.consent.h, indent: 20 });
    } else b.push({ t: 'p', texte: 'N\'a pas encore signé.', indent: 10 });
  }
  b.push({ t: 'esp' }, { t: 'h2', texte: 'Texte de consentement accepté (version ' + d.consentement.version + ')' }, { t: 'p', texte: d.consentement.texte });
  b.push({ t: 'esp' }, { t: 'h2', texte: 'Journal des événements (chaque ligne contient l\'empreinte de la précédente)' });
  d.journal.forEach((e, i) => {
    const detail = Object.keys(e).filter((k) => !['t', 'evt', 'prev', 'h'].includes(k)).map((k) => k + '=' + e[k]).join(' ');
    b.push({ t: 'p', texte: (i + 1) + '. ' + fmtUTC(e.t) + ' - ' + e.evt + (detail ? ' - ' + detail : '') });
    b.push({ t: 'mono', texte: e.h, indent: 10 });
  });
  b.push({ t: 'esp' }, { t: 'p', texte: 'Journal : ' + (d.chaine.ok ? 'intègre (chaîne d\'empreintes vérifiée).' : 'ALTÉRÉ à la ligne ' + d.chaine.rang + ' - ce certificat ne fait pas foi.') });
  if (d.termine) b.push({ t: 'p', texte: 'Sceau de la demande (SHA-256 de la dernière empreinte du journal et des documents) :' }, { t: 'mono', texte: d.termine.sceau, indent: 10 });
  b.push({ t: 'esp' }, { t: 'h2', texte: 'Ce que ce certificat atteste' });
  b.push({ t: 'p', texte: 'Ce certificat consigne les événements enregistrés par le service de signature de TeamOP. La signature est une signature électronique simple : elle manifeste le consentement d\'une personne joignable à l\'adresse e-mail (et, le cas échéant, au numéro de mobile) indiqués. Elle n\'est ni une signature avancée ni une signature qualifiée au sens du règlement européen eIDAS ; en cas de contestation, sa fiabilité se démontre par les éléments ci-dessus.' });
  return pdf(b, 'TeamOP - certificat ' + d.id);
}
module.exports = { certificat, pdf, winansi, couper, fmtUTC };

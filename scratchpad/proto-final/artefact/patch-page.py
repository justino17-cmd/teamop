# Patch de apercu/prototype-op-gestion.html : les SORTIES DE LA PAGE dans l'artefact (17 novembre 2026).
# Chaque remplacement exige UNE occurrence exacte : un autre agent a pu bouger la ligne, on le sait tout de suite.
import sys
P = '/home/user/wt-artefact/apercu/prototype-op-gestion.html'
s = open(P, encoding='utf-8').read()
def un(ancre, neuf, nom):
    global s
    n = s.count(ancre)
    if n != 1: print('✗', nom, ': ancre trouvée', n, 'fois'); sys.exit(1)
    s = s.replace(ancre, neuf)

# 1. le CSS de la carte « à copier » et du visionneur de fichier local
un("""body.dp-ouvert #toast{z-index:300} /* au-dessus du document en grand (200), sinon ses messages restent cachés */""",
"""body.dp-ouvert #toast{z-index:300} /* au-dessus du document en grand (200), sinon ses messages restent cachés */
/* la carte des SORTIES (numéro, adresse, texte à copier) : elle RESTE, son texte se SÉLECTIONNE — un toast s'efface en 6 s et n'est pas sélectionnable */
#sortie-carte{position:fixed;left:50%;translate:-50% 0;bottom:26px;z-index:92;display:flex;flex-direction:column;gap:8px;width:min(440px,calc(100vw - 32px));padding:14px 16px;border-radius:18px;background:var(--feuille);border:1px solid var(--trait2);box-shadow:var(--ombre-haute);font-size:15px;overflow-wrap:anywhere}
#sortie-carte .sc-t{display:flex;align-items:center;justify-content:space-between;gap:10px}
#sortie-carte .sc-x{flex:none;min-width:44px;min-height:44px;margin:-10px -10px -10px 0;border:0;background:none;color:inherit;font-size:24px;line-height:1;border-radius:999px}
#sortie-carte .sc-v{-webkit-user-select:text;user-select:text;font-weight:700;font-size:18px;padding:10px 12px;border-radius:12px;background:var(--surf);border:1px solid var(--trait2);white-space:pre-wrap;max-height:30vh;overflow:auto}
#sortie-carte .sc-a{display:flex;gap:10px;flex-wrap:wrap}
@media (max-width:760px){#sortie-carte{bottom:108px}body:has(.fen-voile) #sortie-carte{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:300}}
body.dp-ouvert #sortie-carte{z-index:300}
.vfl-img{display:block;max-width:100%;max-height:60vh;margin:0 auto 12px;object-fit:contain;border-radius:12px}""", 'css')

# 2. le bloc des sorties, juste après le toast
BLOC = r"""
/* ══ LES SORTIES DE LA PAGE, DANS L'ARTEFACT (17 novembre 2026) ══
   Ce prototype s'ouvre aussi dans un « artefact » de claude.ai : la page y vit dans un cadre verrouillé, où un lien « download », une adresse blob:,
   window.open, alert/confirm/print ne font RIEN, sans un mot. Un fichier ne sort que par le pont « downloads » (window.claude.use), que le visiteur
   confirme ET PEUT REFUSER ; un lien tel:/mailto:/sms: peut ne rien faire et la page ne peut pas le savoir. D'où UNE fonction par besoin :
   · telechargerFichier : le pont d'abord (celui de la page du haut quand on est dans un cadre), jamais d'annonce « téléchargé » sans réponse du pont,
     le refus et l'échec se DISENT ; sans pont : le lien, avec une phrase qui ne promet rien ; dans un cadre sans pont : le texte à copier (si c'est du texte) ;
   · copierTexte : le presse-papiers (dans le geste), sinon une copie par sélection, sinon le texte SÉLECTIONNÉ à copier à la main ;
   · sortieCarte : après un lien tel:/mailto:/sms:, le numéro ou l'adresse se LIT, se sélectionne, se copie — et rien n'annonce un appel ou un envoi. */
let _pontFichiers = null;
async function pontFichiers(){
  if (_pontFichiers) return _pontFichiers;
  let cl = null; try { cl = window.claude || (window.parent !== window ? window.parent.claude : null); } catch (e) { cl = null; }
  let p = null; try { p = cl && typeof cl.use === 'function' ? await cl.use('downloads') : null; } catch (e) { p = null; }
  return (_pontFichiers = p && typeof p.save === 'function' ? p : null);   // un « rien » n'est pas retenu : on le redemandera
}
const nomAvecExt = (nom, type) => /\.[a-z0-9]{2,5}$/i.test(nom) ? nom : nom + '.' + (({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'application/pdf':'pdf', 'text/plain':'txt', 'text/csv':'csv' })[type] || 'pdf');
async function telechargerFichier(nom, data, o){
  o = o || {};
  const vide = data == null || (typeof data === 'string' ? !data.length : !(data.size || data.byteLength));
  if (vide) { toast('Ce fichier est vide : rien à enregistrer.'); return 'vide'; }
  const texte = typeof o.texte === 'string' ? o.texte : (typeof data === 'string' ? data : null);
  const pont = await pontFichiers();
  if (pont) {
    try { await pont.save({ filename:nom, data }); toast(o.ok || 'Fichier enregistré : ' + esc(nom)); return 'enregistre'; }
    catch (e) { const c = e && e.code;
      if (c === 'declined') { toast('Rien n’a été enregistré : tu as refusé le téléchargement. Tu peux recommencer.'); return 'refuse'; }
      if (c === 'rate_limited') { toast('Une demande d’enregistrement est déjà ouverte : réponds-y, puis recommence.'); return 'attente'; }
      if (c === 'too_large') { toast('Ce fichier est trop lourd pour être enregistré d’ici.'); return 'trop-lourd'; }
      if (c === 'rejected_extension' || c === 'extension_not_enabled') { toast('Ce type de fichier ne peut pas être enregistré d’ici.'); return 'type'; }
      toast('L’enregistrement n’a pas abouti.'); return 'echec'; }
  }
  let cadre = false; try { cadre = window.top !== window; } catch (e) { cadre = true; }
  if (cadre) {   // un cadre verrouillé sans pont : un lien ne ferait rien. Du texte se copie ; un PDF, on le dit.
    if (texte) sortieCarte('Le téléchargement n’est pas disponible ici', texte.length > 600 ? texte.slice(0, 600) + '…' : texte, { copie:texte, aide:'Copie ce texte et colle-le dans un fichier « ' + nom + ' ».', duree:30000 });
    else toast('Le téléchargement n’est pas disponible ici : ouvre OP GESTION dans son propre onglet pour enregistrer « ' + esc(nom) + ' ».');
    return 'indisponible';
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('« ' + esc(nom) + ' » : téléchargement demandé. S’il ne démarre pas, ton navigateur le bloque ici.'); return 'lien';
}
function sortieCarte(titre, valeur, o){
  o = o || {}; const ancien = document.getElementById('sortie-carte'); if (ancien) ancien.remove();
  const z = document.createElement('div'); z.id = 'sortie-carte'; z.setAttribute('role', 'status');
  z.innerHTML = `<div class="sc-t"><b>${esc(titre)}</b><button type="button" class="sc-x" data-sortie="fermer" aria-label="Fermer">×</button></div><div class="sc-v" tabindex="0">${esc(valeur)}</div>${o.aide ? `<span class="gris petit">${esc(o.aide)}</span>` : ''}<div class="sc-a"><button type="button" class="btn petit" data-sortie="copier" data-t="${esc(o.copie != null ? o.copie : valeur)}">Copier</button></div>`;
  document.body.appendChild(z); clearTimeout(sortieCarte.t); sortieCarte.t = setTimeout(() => z.remove(), o.duree || 14000);
  try { const r = document.createRange(); r.selectNodeContents(z.querySelector('.sc-v')); const g = getSelection(); g.removeAllRanges(); g.addRange(r); } catch (e) {}   // sélectionné d'avance : un appui long ou Ctrl + C suffit
}
function copieSecours(t, o){
  o = o || {};
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand && document.execCommand('copy'); a.remove(); if (ok) { toast(o.ok || 'Copié.'); return true; } } catch (e) {}
  sortieCarte(o.titre || 'Copie ce texte à la main', t.length > 600 ? t.slice(0, 600) + '…' : t, { copie:t, aide:'Appuie longtemps sur le texte (ou Ctrl + C) pour le copier.', duree:25000 });
  return false;
}
function copierTexte(t, o){
  o = o || {}; t = String(t);
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => { toast(o.ok || 'Copié.'); return true; }, () => copieSecours(t, o)); } catch (e) {}
  return Promise.resolve(copieSecours(t, o));
}
const fmtTel = n => { const d = String(n).replace(/[^\d+]/g, ''); return /^0\d{9}$/.test(d) ? d.replace(/(\d\d)(?=\d)/g, '$1 ').trim() : String(n).trim(); };
document.addEventListener('click', ev => {
  const t = ev.target.closest ? ev.target : ev.target.parentElement; if (!t) return;
  const a = t.closest('a[href^="tel:"],a[href^="mailto:"],a[href^="sms:"]');
  if (a) { const h = a.getAttribute('href'), k = h.split(':')[0], v = decodeURIComponent(h.slice(k.length + 1).split('?')[0]).trim();
    // un geste qui a pris la main lui-même (« 📞 Appel de… » du planning) a déjà parlé : on le laisse, la carte viendrait en double
    setTimeout(() => { if (!ev.defaultPrevented && v) sortieCarte(k === 'tel' ? 'Pour appeler' : k === 'sms' ? 'Pour envoyer un SMS au' : 'Pour écrire à', k === 'mailto' ? v : fmtTel(v), { aide:k === 'mailto' ? 'Si ton appareil n’ouvre pas ta messagerie, copie l’adresse.' : 'Si ton appareil ne lance rien, copie le numéro.' }); }, 0); return; }
  const b = t.closest('[data-sortie]'); if (!b) return; const q = b.dataset.sortie;
  if (q === 'fermer') { const z = document.getElementById('sortie-carte'); if (z) z.remove(); }
  else if (q === 'copier') copierTexte(b.dataset.t || '', { ok:'Copié.' });
  else if (q === 'enregistrer') { const bl = BLOBS_LOCAUX.get(b.dataset.u); if (bl) telechargerFichier(nomAvecExt(b.dataset.n || bl.name || 'fichier', bl.type), bl); else toast('Ce fichier n’est plus disponible sur cet appareil.'); }
});
/* un fichier choisi par la personne (photo, PDF) : sa copie en mémoire (BLOBS_LOCAUX) permet de le montrer dans la page et de l'enregistrer — window.open sur une adresse blob: ne fait rien dans l'artefact */
const BLOBS_LOCAUX = new Map(); { const cou = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { const u = cou(b); try { BLOBS_LOCAUX.set(u, b); } catch (e) {} return u; }; }
function voirFichierLocal(url, nom){
  const b = BLOBS_LOCAUX.get(url), type = (b && b.type) || '', n = nom || (b && b.name) || 'Fichier';
  ouvrirPanneau(`<h2>${esc(n)}</h2>${/^image\//.test(type) ? `<img class="vfl-img" src="${esc(url)}" alt="${esc(n)}">` : '<p class="gris">Ce fichier ne s’affiche pas dans cette page : enregistre-le sur ton appareil pour l’ouvrir.</p>'}<div class="actions"><button type="button" class="btn" data-sortie="enregistrer" data-u="${esc(url)}" data-n="${esc(n)}">Enregistrer sur cet appareil</button><button type="button" class="btn gris" data-ferme="1">Fermer</button></div>`);
}
document.addEventListener('click', ev => { const a = ev.target.closest && ev.target.closest('a[href^="blob:"]'); if (!a) return; ev.preventDefault(); voirFichierLocal(a.getAttribute('href')); });
"""
un("const ANNULER = { lib:'Annuler', fn: () => annuler() };\n", "const ANNULER = { lib:'Annuler', fn: () => annuler() };\n" + BLOC, 'bloc')

# 3. PDF de l'atelier de documents du prototype (pdfTelecharger)
un("""  try {
    if (_telechargement === undefined) _telechargement = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (_telechargement) { const r = await _telechargement.save({ filename:nom, data:new Blob([octets], { type:'application/pdf' }) }); if (r !== 'declined') toast(`PDF prêt · ${pages} page${pages > 1 ? 's' : ''}`); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([octets], { type:'application/pdf' })); a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(`PDF téléchargé · ${pages} page${pages > 1 ? 's' : ''}`);
}""", """  await telechargerFichier(nom, new Blob([octets], { type:'application/pdf' }), { ok:`PDF enregistré : ${esc(nom)} · ${pages} page${pages > 1 ? 's' : ''}` });
}""", 'pdfTelecharger')
un("let _telechargement;\nasync function pdfTelecharger", "async function pdfTelecharger", 'decl _telechargement')

# 4. FEC provisoire
un("""  try { if (_telechargement === undefined) _telechargement = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (_telechargement) { const r = await _telechargement.save({ filename:nom, data }); if (r !== 'declined') toast('Fichier des écritures prêt'); return; } } catch (e) { if (e && e.code === 'declined') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Fichier des écritures téléchargé');
}""", """  await telechargerFichier(nom, data, { ok:'Fichier des écritures enregistré : ' + esc(nom) });
}""", 'cpFec')

# 5. CSV des véhicules (deux)
un("""  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' })); a.download = `frais-${v.plaque}.csv`; document.body.appendChild(a); a.click(); a.remove();
  vxJ('a exporté les frais du véhicule', v, { det:vxN(F.length, 'ligne') }); toast(`Frais de ${esc(v.plaque)} exportés (${vxN(F.length, 'ligne')}) pour ton expert-comptable.`);
}""", """  telechargerFichier(`frais-${v.plaque}.csv`, csv, { ok:`Frais de ${esc(v.plaque)} enregistrés (${vxN(F.length, 'ligne')}) pour ton expert-comptable.` }).then(r => { if (r === 'enregistre' || r === 'lien') vxJ('a exporté les frais du véhicule', v, { det:vxN(F.length, 'ligne') }); });
}""", 'vxCsv')
un("""  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' })); a.download = 'cout-des-vehicules.csv'; document.body.appendChild(a); a.click(); a.remove();
  journalAjout(rlQui(), 'vehicule', 'a exporté le coût des véhicules', { lib:'Les véhicules', id:'' }, { det:vxN(VEHICULES.length, 'véhicule') }); toast(`Coût des ${VEHICULES.length} véhicules exporté, pour ton expert-comptable.`);
}""", """  telechargerFichier('cout-des-vehicules.csv', csv, { ok:`Coût des ${VEHICULES.length} véhicules enregistré, pour ton expert-comptable.` }).then(r => { if (r === 'enregistre' || r === 'lien') journalAjout(rlQui(), 'vehicule', 'a exporté le coût des véhicules', { lib:'Les véhicules', id:'' }, { det:vxN(VEHICULES.length, 'véhicule') }); });
}""", 'vhCsv')

# 6. copies
un("""(navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Texte copié : colle-le dans un message.'), () => toast('Copie impossible ici : sélectionne le texte à la main.')); },""",
   """copierTexte(t, { ok:'Texte copié : colle-le dans un message.', titre:'Sélectionne le texte du SMS' }); },""", 'copierSms')
s = s.replace("""return (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Lien copié (exemple) : il montrera le registre à jour, en lecture seule.'), () => toast('Copie impossible ici : le lien serait ' + esc(u) + '.'));""",
              """return copierTexte(u, { ok:'Lien copié (exemple) : il montrera le registre à jour, en lecture seule.', titre:'Le lien du registre (exemple)' });""")
s = s.replace("""return (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Lien copié (exemple) : il montrera le registre à jour, en lecture seule.'), () => toast('Copie impossible ici : le lien serait ' + esc(u) + '.')); }""",
              """return copierTexte(u, { ok:'Lien copié (exemple) : il montrera le registre à jour, en lecture seule.', titre:'Le lien du registre (exemple)' }); }""")
if 'navigator.clipboard ? navigator.clipboard.writeText(u)' in s: print('✗ copie du lien : reste'); sys.exit(1)
un("""function rcCopier(t){ try { navigator.clipboard.writeText(t).then(() => toast('Copié : ' + t), () => toast('La copie n’a pas pu se faire')); } catch (e) { toast('La copie n’a pas pu se faire'); } }""",
   """function rcCopier(t){ copierTexte(t, { ok:'Copié : ' + t }); }""", 'rcCopier')
un("""const t = b.dataset.t; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copié.'), () => toast('Sélectionne le texte pour le copier.')); }""",
   """copierTexte(b.dataset.t, { ok:'Copié.' }); }""", 'copier data-t')

# 7. bulletin de paie choisi par la personne
un("""  if (b && b.url) return window.open(b.url, '_blank', 'noopener');""", """  if (b && b.url) return voirFichierLocal(b.url, b.nom);   // window.open ne fait rien dans l'artefact : le fichier se montre dans la page et s'enregistre""", 'bulletin')

# 8. justificatif PDF : si le cadre n'affiche pas le PDF, on peut l'enregistrer
un("""const cxPhotoHtml = (url, type) => /pdf/.test(type || '') ? `<iframe class="cx-jpdf" src="${url}" title="Justificatif"></iframe>` :""",
   """const cxPhotoHtml = (url, type) => /pdf/.test(type || '') ? `<iframe class="cx-jpdf" src="${url}" title="Justificatif"></iframe><p class="gris petit">Si le PDF ne s’affiche pas ici : <button type="button" class="lien" data-sortie="enregistrer" data-u="${esc(url)}" data-n="justificatif.pdf">enregistrer le PDF</button>.</p>` :""", 'cxPhotoHtml')
open(P, 'w', encoding='utf-8').write(s)
print('✓ page patchée')

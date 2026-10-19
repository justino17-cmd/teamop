/* ══ YOUSIGN API v3 — LE SEUL MODULE QUI LUI PARLE ═══════════════════════════════════════════════════════════════════════════
 * Appelée par `fetch` direct, sans bibliothèque (même approche que Stripe dans `server/` : une dépendance de moins à auditer).
 * Bac à sable : https://api-sandbox.yousign.app/v3 — production : https://api.yousign.app/v3. Authentification : `Authorization: Bearer <clé>`.
 *
 * ⚠️ À VÉRIFIER CONTRE LA DOCUMENTATION OFFICIELLE (https://developers.yousign.com) AVANT LE PREMIER ESSAI RÉEL — ces noms ont été
 * écrits de mémoire, sans accès à la documentation. Tout ce qui est incertain est marqué « VÉRIFIER » : si Yousign diffère, on corrige ICI
 * et nulle part ailleurs (le reste du service n'appelle que les fonctions exportées).
 *   · POST /signature_requests                         { name, delivery_mode:'email', timezone, expiration_date:'AAAA-MM-JJ', ordered_signers, reminder_settings:{interval_in_days,max_occurrences} }
 *   · POST /signature_requests/{id}/documents          multipart : file, nature:'signable_document'  → { id, total_pages }   VÉRIFIER total_pages
 *   · POST /signature_requests/{id}/signers            { info:{first_name,last_name,email,phone_number,locale:'fr'}, signature_level, signature_authentication_mode, fields:[{type:'signature',document_id,page,x,y,width,height}] }
 *        simple  → signature_level 'electronic_signature'          + otp_email     VÉRIFIER
 *        avancée → signature_level 'advanced_electronic_signature' + otp_sms        VÉRIFIER
 *   · POST /signature_requests/{id}/activate           (sans corps)
 *   · POST /signature_requests/{id}/cancel             { reason:'contractualization_aborted', custom_note }   VÉRIFIER les valeurs de `reason`
 *   · DELETE /signature_requests/{id}                  (brouillon seulement)
 *   · POST /signature_requests/{id}/signers/{sid}/send_reminder   VÉRIFIER le chemin exact
 *   · GET /signature_requests/{id}/documents/{docId}/download     le document SIGNÉ une fois la demande terminée   VÉRIFIER
 *   · GET /signature_requests/{id}/signers/{sid}/audit_trails/download   le dossier de preuve d'un signataire   VÉRIFIER (peut exister au niveau de la demande)
 * Webhooks (déclarés dans le tableau de bord Yousign, pas par l'API) : en-tête `X-Yousign-Signature-256: sha256=<hmac hex du corps brut>`,
 * corps { event_id, event_name, event_time, data:{ signature_request:{id}, signer:{id} } } ; événements signature_request.activated / .done /
 * .declined / .expired / .canceled et signer.link_opened / .signed / .declined — VÉRIFIER (voir demandes.js).
 *
 * ⛔ Une erreur de ce module ne porte JAMAIS le corps de la réponse de Yousign (il peut citer une adresse ou un nom) : le statut HTTP, l'étape, et — depuis le
 * premier vrai essai (19 octobre 2026 : un 400 muet à « creer ») — le NOM du champ refusé (`champ`, jamais sa valeur) et une phrase NETTOYÉE (`raison`).
 * Seuls l'étape, le statut et le NOM du champ peuvent se journaliser ; la phrase ne va qu'au patron connecté, dans la réponse, jamais dans un journal :
 * elle peut reprendre ce qu'on a saisi (un prénom, une adresse), et `lireRefus` ne fait que retirer ce qu'il sait reconnaître.
 */
'use strict';

class YousignErreur extends Error {
  constructor(etape, statut, detail) {
    super('yousign:' + etape + ':' + (statut || 'reseau')); this.etape = etape; this.statut = statut || 0;
    this.champ = (detail && detail.champ) || ''; this.raison = (detail && detail.raison) || '';
  }
}

/* Le corps d'un refus de Yousign → { champ, raison } SÛRS, ou vides. On ne lit que le JSON, on ne garde du CHAMP que son nom (un chemin de propriété, jamais une valeur),
   et la phrase perd tout ce qui ressemble à une adresse e-mail, à un numéro (4 chiffres d'affilée), et tout signe hors lettres, chiffres et ponctuation courante. */
function lireRefus(texte) {
  let j; try { j = JSON.parse(String(texte || '').slice(0, 8192)); } catch (e) { return { champ: '', raison: '' }; }
  if (!j || typeof j !== 'object') return { champ: '', raison: '' };
  const liste = Array.isArray(j.violations) ? j.violations : Array.isArray(j.errors) ? j.errors : [];
  const champs = [];
  for (const v of liste.slice(0, 5)) {
    const c = v && (v.propertyPath || v.property_path || v.field || v.path || v.property);
    if (typeof c === 'string' && /^[A-Za-z0-9_.\[\]-]{1,60}$/.test(c)) champs.push(c);
  }
  const brut = (liste[0] && (liste[0].message || liste[0].detail)) || j.detail || j.message || j.title || '';
  const raison = typeof brut === 'string'
    ? brut.replace(/\S+@\S+/g, '…').replace(/\d{4,}/g, '…').replace(/[^\p{L}\p{N} _.,:;'’()\/-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 140)
    : '';
  return { champ: champs.join(','), raison };
}

function creerYousign({ cleApi, urlApi, fetchImpl = fetch, timeoutMs = 20000 }) {
  const base = String(urlApi).replace(/\/+$/, '') + '/v3';
  async function appel(etape, methode, chemin, { json, form, binaire } = {}) {
    const entetes = { Authorization: 'Bearer ' + cleApi, Accept: binaire ? '*/*' : 'application/json' };
    let corps;
    if (json !== undefined) { entetes['Content-Type'] = 'application/json'; corps = JSON.stringify(json); }
    else if (form) corps = form;
    let r;
    try { r = await fetchImpl(base + chemin, { method: methode, headers: entetes, body: corps, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' }); }
    catch (e) { throw new YousignErreur(etape, 0); }
    if (!r.ok) {
      let texte = ''; try { texte = Buffer.from(await r.arrayBuffer()).toString('utf8'); } catch (e) { /* illisible : pas de détail, le statut suffit */ }
      throw new YousignErreur(etape, r.status, lireRefus(texte));
    }
    if (binaire) return Buffer.from(await r.arrayBuffer());
    if (r.status === 204) return {};
    try { return await r.json(); } catch (e) { return {}; }
  }
  const sid = (x) => encodeURIComponent(String(x));
  return {
    async creerDemande({ nom, jours, relances, ordonne }) {
      const fin = new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);
      const corps = { name: nom, delivery_mode: 'email', timezone: 'Europe/Paris', expiration_date: fin, ordered_signers: !!ordonne };
      if (relances) corps.reminder_settings = { interval_in_days: 3, max_occurrences: Math.max(1, Math.floor(jours / 3)) };
      const j = await appel('creer', 'POST', '/signature_requests', { json: corps });
      if (!j || !j.id) throw new YousignErreur('creer', 502);
      return { id: String(j.id) };
    },
    async ajouterDocument(idDemande, { nom, pdf }) {
      const f = new FormData();
      f.append('file', new Blob([pdf], { type: 'application/pdf' }), nom);
      f.append('nature', 'signable_document');
      const j = await appel('document', 'POST', '/signature_requests/' + sid(idDemande) + '/documents', { form: f });
      if (!j || !j.id) throw new YousignErreur('document', 502);
      return { id: String(j.id), pages: Number(j.total_pages) > 0 ? Number(j.total_pages) : 1 };
    },
    async ajouterSignataire(idDemande, { prenom, nom, email, telephone, niveau, zones }) {
      const info = { first_name: prenom, last_name: nom, email, locale: 'fr' };
      if (telephone) info.phone_number = telephone;
      const corps = {
        info, fields: zones.map((z) => ({ type: 'signature', document_id: z.document, page: z.page, x: z.x, y: z.y, width: z.largeur, height: z.hauteur })),
        signature_level: niveau === 'avance' ? 'advanced_electronic_signature' : 'electronic_signature',
        signature_authentication_mode: niveau === 'avance' ? 'otp_sms' : 'otp_email',
      };
      const j = await appel('signataire', 'POST', '/signature_requests/' + sid(idDemande) + '/signers', { json: corps });
      if (!j || !j.id) throw new YousignErreur('signataire', 502);
      return { id: String(j.id) };
    },
    activer: (idDemande) => appel('activer', 'POST', '/signature_requests/' + sid(idDemande) + '/activate'),
    annuler: (idDemande) => appel('annuler', 'POST', '/signature_requests/' + sid(idDemande) + '/cancel', { json: { reason: 'contractualization_aborted', custom_note: 'Annulée par l\'expéditeur' } }),
    supprimerBrouillon: (idDemande) => appel('supprimer', 'DELETE', '/signature_requests/' + sid(idDemande)),
    relancer: (idDemande, idSignataire) => appel('relancer', 'POST', '/signature_requests/' + sid(idDemande) + '/signers/' + sid(idSignataire) + '/send_reminder'),
    telechargerSigne: (idDemande, idDocument) => appel('signe', 'GET', '/signature_requests/' + sid(idDemande) + '/documents/' + sid(idDocument) + '/download', { binaire: true }),
    telechargerPreuve: (idDemande, idSignataire) => appel('preuve', 'GET', '/signature_requests/' + sid(idDemande) + '/signers/' + sid(idSignataire) + '/audit_trails/download', { binaire: true }),
    /* sert à `configurer-yousign.js tester` : la clé est-elle acceptée ? (VÉRIFIER : liste des demandes, limit=1) */
    async tester() { await appel('tester', 'GET', '/signature_requests?limit=1'); return true; },
  };
}
module.exports = { creerYousign, YousignErreur, lireRefus };

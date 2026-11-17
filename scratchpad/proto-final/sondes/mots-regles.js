// LES RÈGLES DES MOTS (voie « final-mots », 17 novembre 2026) : ce qu'un texte AFFICHÉ ne doit pas contenir, et pourquoi.
// Elles servent deux fois : mots-interdits.js les applique au texte relevé par le navigateur ; mots-mutations.js les éprouve (chacune doit tomber
// sur le défaut qu'elle garde — une règle qui ne tombe sur rien ne prouve rien).
// ⛔ Une règle vise un MOT de l'écran, jamais un identifiant : le relevé ne lit que ce que la personne voit (texte rendu, aria-label, title, placeholder, options).
// Les exceptions sont NOMMÉES (laisses) avec leur raison, comme « vu et pas surveillé » dans les bancs du serveur.
const fs = require('fs'), path = require('path');
const NB = ' ', FINE = ' ';
// la table des mots : UN mot par chose, celui du menu (ou, à défaut, celui que l'artisan emploie)
exports.TABLE = [
  { chose: 'la personne qui dirige', garde: 'gérant', ecarte: ['patron', 'patronne', 'administrateur'], note: 'le menu et Équipe disent « Gérant » ; « administrateur » ne se lit que dans le nom d’un droit réservé' },
  { chose: 'un message électronique', garde: 'e-mail', ecarte: ['courriel', 'courriels', 'mail (seul)', 'email'], note: 'la Boîte mail garde son nom de menu ; ailleurs, « e-mail »' },
  { chose: 'faire disparaître une donnée', garde: 'supprimer', ecarte: ['effacer'], note: '« retirer » reste pour sortir une ligne d’une liste ou d’une commande, sans détruire' },
  { chose: 'le devis court', garde: 'Devis rapide', ecarte: ['devis simple', 'devis express'], note: 'c’est le nom du bouton' },
  { chose: 'un déplacement chez le client', garde: 'intervention', ecarte: ['mission'], note: '« passage » reste pour la VISITE du technicien chez un client ; « rendez-vous » pour ce que le client demande' },
];
const mot = '(?<![\\p{L}\\p{N}_-])', fin = '(?![\\p{L}\\p{N}_-])';
exports.REGLES = [
  { id: 'echafaudage', pourquoi: 'un reste d’échafaudage de revue lu par un vrai utilisateur', re: new RegExp(mot + '(prototype|pour l[’\']essai|dans cette d[ée]mo|d[ée]mo|d[ée]monstration|fictifs?|fictives?|simulation|simul[ée]e?s?|lorem|TODO|undefined|NaN|maquette)' + fin, 'iu'), extra: /\[object|vraie version|^Aperçu ?:/i },
  { id: 'patron', pourquoi: 'un seul nom pour la personne qui dirige : gérant', re: new RegExp(mot + 'patron(ne)?s?' + fin, 'iu') },
  { id: 'jargon', pourquoi: 'un mot de développeur ou de l’anglais que l’artisan ne dit pas', re: new RegExp(mot + '(synchro\\w*|token|dashboard|workflow|ID|login|logout|reset|payload|callback|timeout|debug|offline|online|backup|upload|download|template|checklist|feedback|plugin|widget|popup|pop-up|OK|KO|module|statut|statuts|serveur)' + fin, 'u') },
  { id: 'abreviation', pourquoi: 'une abréviation que personne ne dit', re: new RegExp(mot + '(int\\.|[Rr]ègl\\.|Nb|nbre)' + fin, 'u') },
  { id: 'deux-mots-courriel', pourquoi: 'un seul mot pour un message électronique : « e-mail »', re: new RegExp(mot + '(courriels?|emails?)' + fin, 'iu') },
  { id: 'apostrophe-droite', pourquoi: 'typographie française : l’apostrophe est courbe (’)', re: /\p{L}'\p{L}/u },
  { id: 'guillemets-droits', pourquoi: 'typographie française : « guillemets »', re: /"/ },
  { id: 'trois-points', pourquoi: 'typographie : le caractère « … », pas trois points', re: /\.\.\./ },
  { id: 'espace-avant-ponctuation', pourquoi: 'typographie : une espace avant : ; ! ? — insécable', re: /[\p{L}\d)»”][:;!?](?![\p{L}\d/])/u, ou: 'texte' },
  { id: 'espace-ordinaire-avant-ponctuation', pourquoi: 'typographie : l’espace avant : ; ! ? doit être insécable (le signe ne passe pas seul à la ligne)', re: /[\p{L}\d)»”] [:;!?](?![\p{L}\d])/u, ou: 'texte' },
  { id: 'espace-avant-euro-pourcent', pourquoi: 'typographie : l’espace avant € et % est insécable', re: /\d [€%]/, ou: 'texte' },
  { id: 'guillemet-sans-espace', pourquoi: 'typographie : « et » portent une espace insécable à l’intérieur', re: /«[^  \s]|[^  \s]»/u, ou: 'texte' },
  { id: 'tiret-court', pourquoi: 'typographie : un tiret de phrase est « – » ou « — », pas « - » entouré d’espaces', re: /\p{L} - \p{L}/u },
];
// tutoiement : tenu dans l'application ; le client, lui, est vouvoyé (décision du chantier « espace client ») — et les messages ÉCRITS à quelqu'un d'autre
// (e-mail à un fournisseur, SMS à un client, bon de commande) gardent le vouvoiement : ils sont entre guillemets ou dans un aperçu de document.
const VOUS = new RegExp(mot + '(vous|votre|vos|veuillez|choisissez|touchez|cliquez|appuyez)' + fin, 'iu');
const TU = new RegExp(mot + '(tu|ton|ta|tes|toi|t[’\'])' + fin, 'iu');
exports.vouvoiement = (texte) => VOUS.test(texte); exports.tutoiement = (texte) => TU.test(texte);
// une phrase de plus de N mots (hors listes de données) : relue, jamais jugée seule
exports.MOTS_MAX = 30;
// un texte écrit POUR quelqu'un d'autre : e-mail, SMS, bon de commande, devis, contrat — il parle à son destinataire, pas à l'utilisateur
exports.POUR_UN_AUTRE = /^(Bonjour|Madame|Monsieur|Objet ?:|Veuillez|Merci de|Cordialement|Je reviens vers|Nous |Votre |Le prestataire|Le client |Article|Le présent)|« [^»]*(vous|votre|vos|Votre|Nous)[^»]*»|\bvotre\b.*\b(référence|rendez-vous|devis|facture|commande)|Confirmez|Choisissez|Accepter et choisir/;
exports.ou = (ou) => /prototype-documents|aperçu|Aperçu|compte rendu|document/i.test(ou);
// les laisses : un texte exact qu'on garde malgré une règle, et pourquoi (lues dans final/mots.json)
exports.laisses = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'final', 'mots.json'), 'utf8')).laisses || []; } catch (e) { return []; } };
// contrôle d'UN texte. type : 'écran' | 'attribut' | 'toast' | 'fenêtre' | 'boîte' | 'cadre' | 'visite'. Rend la liste des règles qui tombent.
exports.controler = (texte, opt) => {
  opt = opt || {}; const t = String(texte), tombes = [];
  const attribut = opt.type === 'attribut' || /^(aria-label|title|placeholder|alt|option \(|bouton) ?/.test(t); const corps = t.replace(/^(aria-label|title|placeholder|alt|bouton|option \([^)]*\)) : /, '');
  for (const r of exports.REGLES) {
    if (r.ou === 'texte' && attribut) continue;   // les attributs (lus à voix haute, infobulles) ne passent pas par la typographie de l’écran
    const m = corps.match(r.re) || (r.extra && corps.match(r.extra)); if (m) tombes.push({ regle: r.id, extrait: m[0], pourquoi: r.pourquoi });
  }
  // une PHRASE trop longue (pas un bloc de plusieurs phrases) : on coupe sur le point, ?, !, … suivi d'une majuscule ou d'une puce
  if (!attribut && !/^\d/.test(corps) && !/[·→]\s.*[·→]/.test(corps)) { const plus = corps.split(/(?<=[.!?…])\s+(?=[A-ZÉÈÀ«•(])/).map(x => x.trim().split(/\s+/).length).reduce((a, b) => Math.max(a, b), 0); if (plus > exports.MOTS_MAX) tombes.push({ regle: 'phrase-longue', extrait: plus + ' mots', pourquoi: 'une phrase de plus de ' + exports.MOTS_MAX + ' mots : à relire, à couper' }); }
  if (opt.role === 'client' && TU.test(corps) && !exports.POUR_UN_AUTRE.test(corps)) tombes.push({ regle: 'tutoiement-client', extrait: (corps.match(TU) || [''])[0], pourquoi: 'le client est vouvoyé' });
  if (opt.role && opt.role !== 'client' && VOUS.test(corps) && !exports.POUR_UN_AUTRE.test(corps) && !exports.ou(opt.ou || '')) tombes.push({ regle: 'vouvoiement-equipe', extrait: (corps.match(VOUS) || [''])[0], pourquoi: 'on se tutoie dans l’application' });
  const laisses = exports.laisses(); return tombes.filter(x => !laisses.some(l => l.texte && corps.includes(l.texte) && (!l.regle || l.regle === x.regle)));
};

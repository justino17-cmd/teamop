// ══════════════════════════════════════════════════════════════════════════
//  Assistant devis — l'agent qui compose un devis à partir d'une conversation
//
//  Ce module ne fait QUE parler à Claude. Il ne touche ni à Firestore, ni au
//  disque : c'est OP GESTION (app.html) qui enregistre le devis dans sa base
//  et qui produit le PDF avec printDoc(), exactement comme un devis saisi à
//  la main. Le serveur reçoit le contexte (sociétés, clients), rend la
//  proposition de devis, et n'en garde rien.
//
//  Protection : le code d'accès d'équipe (config.anthropic.secretDevis)
//  + un plafond d'appels par jour, au cas où le code fuiterait.
// ══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Le SDK expose son constructeur en .default selon le mode d'import : on gère les deux.
const SDK = require('@anthropic-ai/sdk');
const Anthropic = SDK.default || SDK;

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 16000;
const EFFORT = 'medium';        // 'high' si les devis manquent de finesse, 'low' pour aller plus vite
const MAX_TOURS = 3;            // proposition + reformulation finale : 2 suffisent, 3 par sécurité

// ── Journal des appels d'outil ────────────────────────────────────────────
//
//  Le texte que le client saisit arrive dans un modèle qui dispose d'un outil.
//  Si quelqu'un cherche à détourner l'assistant par ce texte, sans trace on ne
//  peut rien reconstituer après coup. On note donc : qui, quand, quel outil,
//  quel résultat.
//
//  Volontairement absents : noms, adresses, objet, notes — tout texte libre.
//  Ce sont des données personnelles de nos clients ; un journal n'a pas à en
//  devenir un second entrepôt. On garde une empreinte courte, suffisante pour
//  rapprocher deux appels entre eux sans rien révéler de leur contenu.
function empreinte(valeur) {
  return crypto.createHash('sha256').update(String(valeur || '')).digest('hex').slice(0, 8);
}

function journaliser(champs) {
  console.log('devis ' + JSON.stringify({ h: new Date().toISOString(), ...champs }));
}

// ── L'outil que l'agent appelle quand il a de quoi composer le devis ──────
const OUTIL_DEVIS = {
  name: 'creer_devis',
  description:
    "Compose le devis et le transmet à l'application, qui l'enregistre et " +
    "produit le PDF. Si ttc_cible est fourni, la dernière ligne est ajustée " +
    "au centime pour tomber exactement sur ce montant TTC.",
  input_schema: {
    type: 'object',
    properties: {
      societe: { type: 'string', description: "Nom exact de la société émettrice, tel qu'il figure dans la liste" },
      client_nom: { type: 'string' },
      client_adresse: { type: 'string', description: "Adresse d'intervention" },
      objet: { type: 'string', description: 'Objet du devis, une ligne' },
      lignes: {
        type: 'array',
        description: 'Lignes du devis. La dernière ligne doit avoir qte = 1.',
        items: {
          type: 'object',
          properties: {
            designation: { type: 'string' },
            qte: { type: 'number' },
            pu_ht: { type: 'number' },
          },
          required: ['designation', 'qte', 'pu_ht'],
        },
      },
      tva_taux: { type: 'number', description: '10 ou 20' },
      ttc_cible: { type: 'number', description: 'Montant TTC exact à atteindre (optionnel)' },
      notes: { type: 'string', description: 'Conditions ou remarques (optionnel)' },
    },
    required: ['client_nom', 'objet', 'lignes'],
  },
};

// ── Le cerveau : une consigne par métier ──────────────────────────────────
//
//  ⛔ CE QUI PART CHEZ ANTHROPIC NE CHANGE PAS : les sociétés, et pour chaque client
//  son nom, son adresse, sa ville — 60 clients au plus. Seul le TEXTE DES CONSIGNES
//  dépend du métier (voir sous-traitance.html). Les trois cerveaux partagent les
//  mêmes deux blocs, construits à UN seul endroit : un contexte élargi pour un
//  métier l'est pour tous, il ne peut pas l'être « par accident » dans un seul.
//
//  Le choix du métier est dans devis-metier.js (annuaire du serveur d'abord) ; le
//  cerveau 3D est celui d'AVANT, octet pour octet (tests/test-3112.js l'exige).
const { est3D, tvaParDefaut } = require('./devis-metier');

function blocsContexte(ctx) {
  const societes = (ctx.societes || []).filter(Boolean);
  const clients = (ctx.clients || []).slice(0, 60);

  const blocSoc = societes.length
    ? societes.map(s => `- ${s}`).join('\n')
    : '- (aucune société déclarée : laisse le champ societe vide)';

  const blocCli = clients.length
    ? clients.map(c => `- ${c.nom}${c.adresse ? ' — ' + c.adresse : ''}${c.ville ? ' ' + c.ville : ''}`).join('\n')
    : '- (aucun client enregistré)';
  return { blocSoc, blocCli };
}

// ── 3D : les règles métier du technicien hygiéniste (la consigne d'origine) ──
function cerveau3D(ctx) {
  const { blocSoc, blocCli } = blocsContexte(ctx);

  return `Tu es l'assistant devis intégré à OP GESTION, pour un technicien hygiéniste 3D
(dératisation, désinsectisation, désinfection) certifié Certibiocide.

SOCIÉTÉS ÉMETTRICES POSSIBLES :
${blocSoc}

CLIENTS DÉJÀ ENREGISTRÉS (réutilise la fiche si le nom correspond) :
${blocCli}

CHOIX DE LA SOCIÉTÉ :
- Une seule société → utilise-la directement, sans jamais demander.
- Plusieurs → si la demande en mentionne une, même partiellement, utilise-la.
  Sinon pose UNE question courte listant les noms.

RÈGLES MÉTIER ABSOLUES :
1. Ne crée jamais un devis sans : nom du client, adresse d'intervention, type
   de nuisible ou de prestation, et montant TTC cible (ou validation d'un
   tarif que tu proposes). S'il manque des informations, pose UNE seule
   question groupée.
2. TTC cible donné → compose 3 à 5 lignes HT réalistes (diagnostic,
   traitement, produits/matériel, passage de contrôle, forfait déplacement…)
   et passe le montant dans ttc_cible : l'ajustement au centime est
   automatique. La DERNIÈRE ligne doit toujours avoir une quantité de 1.
3. TVA : 10 % pour les locaux d'habitation achevés depuis plus de 2 ans,
   20 % pour les professionnels et le reste. Particulier = 10 par défaut.
   En cas de doute, demande.
4. Désignations sobres et techniques, sans marques : « rodenticide en postes
   d'appâtage sécurisés », « gel insecticide anti-blattes », « traitement
   insecticide + IGR », « destruction de nid par perche télescopique »…
5. Fourchettes indicatives TTC si aucun montant n'est donné (propose, ne crée
   pas sans validation) : dératisation 150–450 €, cafards 150–400 €, punaises
   de lit 300–900 €, guêpes/frelons 110–250 €, chenilles processionnaires
   150–500 €, termites/xylophages sur diagnostic 800 € et plus.
6. Réponds en français, bref et direct.
7. N'invente JAMAIS de numéro de devis : c'est l'application qui l'attribue.
   Après création, annonce simplement le client, le TTC, et que le devis est
   prêt dans l'application.
8. Enchaînements : « pareil pour Mme X » ou « refais-le à 450 € » réutilisent
   le contexte du devis précédent.`;
}

// ── Nettoyage / propreté ──────────────────────────────────────────────────
//  Aucun prix de référence : les fourchettes de la 3D sont celles d'un autre métier, et
//  rien de sourcé n'existe pour celui-ci — un prix inventé est pire qu'une question. Le
//  modèle demande le tarif de l'entreprise (heure, m², forfait) ou chiffre heures × taux
//  donné, À VALIDER. De même pour le droit : aucune norme, convention collective ni
//  obligation dans les notes d'un devis que l'utilisateur n'a pas dites lui-même.
function cerveauNettoyage(ctx) {
  const { blocSoc, blocCli } = blocsContexte(ctx);

  return `Tu es l'assistant devis intégré à OP GESTION, pour une entreprise de nettoyage et de
propreté (bureaux, copropriétés, commerces, remise en état, vitrerie, fin de chantier,
entretien des sols).

SOCIÉTÉS ÉMETTRICES POSSIBLES :
${blocSoc}

CLIENTS DÉJÀ ENREGISTRÉS (réutilise la fiche si le nom correspond) :
${blocCli}

CHOIX DE LA SOCIÉTÉ :
- Une seule société → utilise-la directement, sans jamais demander.
- Plusieurs → si la demande en mentionne une, même partiellement, utilise-la.
  Sinon pose UNE question courte listant les noms.

RÈGLES MÉTIER ABSOLUES :
1. Ne crée jamais un devis sans : nom du client, adresse du site, nature de la
   prestation, surface en m² (ou nombre d'heures et d'agents), fréquence
   (ponctuel, ou passages par semaine ou par mois), et montant TTC cible (ou
   validation d'un tarif que tu proposes). S'il manque des informations, pose
   UNE seule question groupée.
2. TTC cible donné → compose 3 à 5 lignes HT réalistes (main-d'œuvre en heures
   ou forfait au m², produits et consommables, machines si elles servent,
   déplacement…) et passe le montant dans ttc_cible : l'ajustement au centime
   est automatique. La DERNIÈRE ligne doit toujours avoir une quantité de 1.
3. TVA : 20 % par défaut. Au moindre doute (client particulier, local
   d'habitation), demande. Renseigne toujours tva_taux.
4. Désignations sobres, sans marques : « Nettoyage des bureaux, passage
   hebdomadaire », « Lavage mécanisé des sols », « Remise en état après
   travaux », « Nettoyage des vitres intérieures et extérieures », « Fourniture
   des produits et consommables ».
5. N'invente AUCUNE fourchette de prix. Si aucun montant n'est donné, demande le
   tarif habituel de l'entreprise (taux horaire, prix au m², forfait de
   passage), ou propose « heures × taux » à partir d'un taux que l'utilisateur
   a donné, présenté comme une proposition à valider — et ne crée pas le devis
   avant sa validation.
6. N'écris dans les notes aucune obligation réglementaire, norme, garantie ni
   convention collective que l'utilisateur ne t'a pas donnée lui-même.
7. Réponds en français, bref et direct. N'invente JAMAIS de numéro de devis :
   c'est l'application qui l'attribue. Après création, annonce simplement le
   client, le TTC, et que le devis est prêt dans l'application.
8. Enchaînements : « pareil pour Mme X » ou « refais-le à 450 € » réutilisent
   le contexte du devis précédent.`;
}

// ── Les autres métiers (21) : honnête plutôt que savant ───────────────────
//  Le vocabulaire du métier vient du référentiel (`metiers.json`, via server/metiers.js) :
//  ses types d'intervention et ses prestations — ce que l'application connaît déjà. Aucune
//  règle propre au métier n'est écrite ici : ni prix, ni TVA particulière, ni norme.
function cerveauGenerique(ctx, voc) {
  const { blocSoc, blocCli } = blocsContexte(ctx);
  const nom = (voc && voc.nom) || 'non précisé';
  const liste = a => (a && a.length ? a.join(', ') : '');
  const vocabulaire = [
    liste(voc && voc.types) ? `Types d'intervention de ce métier : ${liste(voc.types)}.` : '',
    liste(voc && voc.presta) ? `Prestations courantes : ${liste(voc.presta)}.` : '',
  ].filter(Boolean).join('\n');

  return `Tu es l'assistant devis intégré à OP GESTION, pour une entreprise de terrain,
métier : ${nom}.
${vocabulaire ? vocabulaire + '\n(Reprends ce vocabulaire dans les désignations quand il convient.)\n' : ''}
SOCIÉTÉS ÉMETTRICES POSSIBLES :
${blocSoc}

CLIENTS DÉJÀ ENREGISTRÉS (réutilise la fiche si le nom correspond) :
${blocCli}

CHOIX DE LA SOCIÉTÉ :
- Une seule société → utilise-la directement, sans jamais demander.
- Plusieurs → si la demande en mentionne une, même partiellement, utilise-la.
  Sinon pose UNE question courte listant les noms.

RÈGLES MÉTIER ABSOLUES :
1. Ne crée jamais un devis sans : nom du client, adresse d'intervention,
   nature de la prestation, et montant TTC cible (ou validation d'un tarif que
   tu proposes). S'il manque des informations, pose UNE seule question groupée.
2. TTC cible donné → compose 3 à 5 lignes HT réalistes (main-d'œuvre,
   fournitures ou matériel, déplacement…) et passe le montant dans ttc_cible :
   l'ajustement au centime est automatique. La DERNIÈRE ligne doit toujours
   avoir une quantité de 1.
3. TVA : 20 % par défaut. Au moindre doute (client particulier, local
   d'habitation), demande. Renseigne toujours tva_taux.
4. Désignations sobres et précises, sans marques.
5. N'invente AUCUNE fourchette de prix. Si aucun montant n'est donné, demande le
   tarif habituel de l'entreprise (taux horaire, prix de l'unité, forfait), ou
   propose « heures × taux » à partir d'un taux que l'utilisateur a donné,
   présenté comme une proposition à valider — et ne crée pas le devis avant sa
   validation.
6. N'écris dans les notes aucune obligation réglementaire, norme, garantie ni
   convention collective que l'utilisateur ne t'a pas donnée lui-même.
7. Réponds en français, bref et direct. N'invente JAMAIS de numéro de devis :
   c'est l'application qui l'attribue. Après création, annonce simplement le
   client, le TTC, et que le devis est prêt dans l'application.
8. Enchaînements : « pareil pour Mme X » ou « refais-le à 450 € » réutilisent
   le contexte du devis précédent.`;
}

/* L'aiguillage. `metier` : '' ou '3d' → le cerveau d'avant ; 'nettoyage' → le sien ; tout autre métier ouvert → le
   générique, avec `voc` ({nom, types, presta}, lu dans le référentiel). */
function construireSystem(ctx, metier, voc) {
  if (est3D(metier)) return cerveau3D(ctx);
  if (metier === 'nettoyage') return cerveauNettoyage(ctx);
  return cerveauGenerique(ctx, voc);
}

// ── Ajustement au centime : le cœur du calcul ─────────────────────────────
//    On vise round(HT × (1 + TVA), 2) === TTC cible en jouant sur la
//    dernière ligne, puis on laisse la TVA absorber le centime résiduel.
function ajusterLignes(lignes, tvaTaux, ttcCible) {
  const t = tvaTaux / 100;
  const r2 = x => Math.round(x * 100) / 100;
  const calc = (lignes || []).map(l => {
    const qte = Number(l.qte) || 0;
    const pu = r2(Number(l.pu_ht) || 0);
    return { designation: String(l.designation || ''), qte, pu_ht: pu, total_ht: r2(qte * pu) };
  });
  if (!calc.length) return { lignes: [], totalHt: 0, tva: 0, ttc: 0 };

  if (ttcCible != null && isFinite(ttcCible)) {
    const cible = r2(Number(ttcCible));
    const base = r2(cible / (1 + t));
    let htOk = null;
    for (const delta of [0, -0.01, 0.01, -0.02, 0.02]) {
      const cand = r2(base + delta);
      if (r2(cand * (1 + t)) === cible) { htOk = cand; break; }
    }
    if (htOk === null) htOk = base;
    const sommeAutres = r2(calc.slice(0, -1).reduce((s, l) => s + l.total_ht, 0));
    const der = calc[calc.length - 1];
    der.total_ht = r2(htOk - sommeAutres);
    der.qte = 1;
    der.pu_ht = der.total_ht;
  }

  const totalHt = r2(calc.reduce((s, l) => s + l.total_ht, 0));
  let tva = r2(totalHt * t);
  let ttc = r2(totalHt + tva);
  if (ttcCible != null && isFinite(ttcCible) && ttc !== r2(Number(ttcCible))) {
    ttc = r2(Number(ttcCible));
    tva = r2(ttc - totalHt);
  }
  return { lignes: calc, totalHt, tva, ttc };
}

// ── Petits nettoyeurs : ce qui vient du navigateur n'est jamais de confiance
const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
function nettoyerMessages(brut) {
  if (!Array.isArray(brut)) return null;
  const out = [];
  for (const m of brut.slice(-30)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const c = typeof m.content === 'string' ? txt(m.content, 4000) : '';
    if (!c.trim()) continue;
    out.push({ role: m.role, content: c });
  }
  return out.length ? out : null;
}

// ── Le plafond journalier, gardé sur le disque pour survivre à un redémarrage
function faireQuota(dataDir, plafond) {
  const chemin = path.join(dataDir, 'devis-quota.json');
  let etat = { jour: '', n: 0 };
  try { etat = JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch (e) {}
  const jour = () => new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  return {
    reste() { return etat.jour === jour() ? Math.max(0, plafond - etat.n) : plafond; },
    consomme() {
      const j = jour();
      if (etat.jour !== j) etat = { jour: j, n: 0 };
      etat.n++;
      try { fs.writeFileSync(chemin, JSON.stringify(etat)); } catch (e) { console.error('quota devis:', e.message); }
    },
  };
}

// ── Comparaison à temps constant : ne renseigne pas sur le bon préfixe ────
function memeSecret(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  if (A.length !== B.length || !A.length) return false;
  return crypto.timingSafeEqual(A, B);
}

// ══════════════════════════════════════════════════════════════════════════
//  Montage de la route sur l'application Express existante
// ══════════════════════════════════════════════════════════════════════════
function monterAgentDevis(app, config, dataDir, deps) {
  /* Deux crochets, tous deux appelés À LA REQUÊTE — jamais lus au montage : ce module est monté ligne ~680 d'index.js,
     bien avant la définition de `metierOk` et du référentiel (une valeur lue ici serait en zone morte temporelle).
       · metierDe(t, metierCorps) → le métier de l'entreprise ('' = 3D) — voir devis-metier.js ;
       · vocabulaire(metier) → {nom, types, presta} du référentiel, pour le cerveau générique ;
       · creerClient(apiKey) → le client Anthropic (un banc y met un faux).
     Sans crochet : le comportement d'avant, le cerveau 3D. */
  deps = deps || {};
  const metierDe = typeof deps.metierDe === 'function' ? deps.metierDe : () => '';
  const vocabulaire = typeof deps.vocabulaire === 'function' ? deps.vocabulaire : () => null;
  const creerClient = typeof deps.creerClient === 'function' ? deps.creerClient : (cle => new Anthropic({ apiKey: cle }));
  const conf = (config && config.anthropic) || {};
  // `cleApi` d'abord : c'est le nom qu'écrit set-claude.sh et que lit index.js
  // pour EXPLIQUE et PROPOSE. `apiKey` reste accepté pour les configurations
  // d'avant l'harmonisation — sans ce repli, une clé posée par le script était
  // invisible ici, et l'assistant devis restait muet sans dire pourquoi.
  const apiKey = conf.cleApi || conf.apiKey || process.env.ANTHROPIC_API_KEY || '';
  const secret = conf.secretDevis || process.env.TEAMOP_SECRET_DEVIS || '';
  const plafond = parseInt(conf.quotaJour, 10) > 0 ? parseInt(conf.quotaJour, 10) : 100;
  const quota = faireQuota(dataDir, plafond);
  let client = null;   // construit au premier appel : pas de clé = pas de client

  /* Pas de route /api/devis/etat ici : ce module est monté bien avant index.js,
     et Express garde la PREMIÈRE route enregistrée. Celle qui vivait ici masquait
     donc la version riche d'index.js — l'application lit `equipe` et `restants`,
     que cette réponse ne contenait pas. Résultat silencieux : ni l'avertissement
     « non activé », ni le compteur de devis restants ne s'affichaient jamais.
     Une seule route sert désormais l'état, celle d'index.js. */

  app.post('/api/devis/agent', async (req, res) => {
    if (!apiKey || !secret) {
      return res.status(503).json({ error: "L'assistant devis n'est pas configuré sur le serveur." });
    }
    if (!memeSecret(req.headers['x-teamop-devis'], secret)) {
      return res.status(403).json({ error: "Code d'accès invalide" });
    }
    if (quota.reste() <= 0) {
      return res.status(429).json({ error: "Plafond de l'assistant atteint pour aujourd'hui." });
    }

    const messages = nettoyerMessages((req.body || {}).messages);
    if (!messages) return res.status(400).json({ error: 'messages[] manquant' });

    const ctxBrut = (req.body || {}).contexte || {};
    const contexte = {
      societes: (Array.isArray(ctxBrut.societes) ? ctxBrut.societes : []).slice(0, 20).map(s => txt(s, 80)),
      clients: (Array.isArray(ctxBrut.clients) ? ctxBrut.clients : []).slice(0, 60).map(c => ({
        nom: txt(c && c.nom, 80), adresse: txt(c && c.adresse, 120), ville: txt(c && c.ville, 60),
      })).filter(c => c.nom),
    };

    try {
      if (!client) client = creerClient(apiKey);
      quota.consomme();

      /* Le métier se lit APRÈS les contrôles d'accès : un refus ne coûte rien. Un crochet qui jette ne casse pas l'assistant :
         on retombe sur le cerveau d'avant (les entreprises existantes ne perdent rien). */
      let metier = '';
      try { metier = String(metierDe(txt((req.body || {}).t, 80), txt((req.body || {}).metier, 40)) || ''); }
      catch (e) { console.error('agent devis : métier illisible :', String((e && e.message) || e).slice(0, 200)); }
      let voc = null;
      if (!est3D(metier) && metier !== 'nettoyage') { try { voc = vocabulaire(metier); } catch (e) { voc = null; } }
      const system = construireSystem(contexte, metier, voc);
      const fil = messages.slice();
      let reply = '';
      let devis = null;

      for (let tour = 0; tour < MAX_TOURS; tour++) {
        const rep = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          output_config: { effort: EFFORT },
          system,
          tools: [OUTIL_DEVIS],
          messages: fil,
        });

        // Un refus de sécurité arrive en HTTP 200 : on le lit AVANT le contenu.
        if (rep.stop_reason === 'refusal') {
          // Signal à surveiller : un refus répété depuis la même adresse est le
          // symptôme d'une tentative de détournement, pas d'un client maladroit.
          journaliser({ ip: req.ip, evenement: 'refus_securite', tour });
          return res.json({ reply: "Je ne peux pas traiter cette demande. Reformule-la.", devis: null });
        }

        const textes = rep.content.filter(b => b.type === 'text' && b.text.trim()).map(b => b.text);
        if (textes.length) reply = textes.join('\n\n');

        if (rep.stop_reason !== 'tool_use') break;

        fil.push({ role: 'assistant', content: rep.content });
        const resultats = [];
        for (const bloc of rep.content) {
          if (bloc.type !== 'tool_use') continue;
          if (bloc.name !== 'creer_devis') {
            // Le modèle n'a qu'un outil : réclamer autre chose est anormal.
            journaliser({ ip: req.ip, evenement: 'outil_inconnu', tour, outil: txt(bloc.name, 40) });
            resultats.push({ type: 'tool_result', tool_use_id: bloc.id, content: 'Outil inconnu.', is_error: true });
            continue;
          }
          const e = bloc.input || {};
          const tvaTaux = [10, 20].includes(Number(e.tva_taux)) ? Number(e.tva_taux) : tvaParDefaut(metier);
          const calc = ajusterLignes(e.lignes, tvaTaux, e.ttc_cible);
          if (!calc.lignes.length) {
            resultats.push({ type: 'tool_result', tool_use_id: bloc.id, content: 'Aucune ligne fournie.', is_error: true });
            continue;
          }
          devis = {
            societe: txt(e.societe, 80),
            clientNom: txt(e.client_nom, 80),
            clientAdresse: txt(e.client_adresse, 200),
            objet: txt(e.objet, 200),
            notes: txt(e.notes, 500),
            tvaTaux,
            lignes: calc.lignes,
            totalHt: calc.totalHt,
            tva: calc.tva,
            ttc: calc.ttc,
          };
          journaliser({
            ip: req.ip,
            evenement: 'devis_compose',
            tour,
            outil: 'creer_devis',
            lignes: calc.lignes.length,
            ttc: calc.ttc,
            client: empreinte(devis.clientNom),
            metier: metier || '3d',
          });
          resultats.push({
            type: 'tool_result',
            tool_use_id: bloc.id,
            content:
              `Devis composé pour ${devis.clientNom} : HT ${calc.totalHt.toFixed(2)} € · ` +
              `TVA ${calc.tva.toFixed(2)} € · TTC ${calc.ttc.toFixed(2)} €. ` +
              `L'application l'enregistre et lui attribue son numéro.`,
          });
        }
        fil.push({ role: 'user', content: resultats });
      }

      res.json({ reply: reply || "Je n'ai pas pu terminer, reformule ta demande.", devis });
    } catch (e) {
      console.error('agent devis:', String((e && e.message) || e).slice(0, 300));
      res.status(502).json({ error: "L'assistant n'a pas répondu. Réessaie dans un instant." });
    }
  });
}

module.exports = { monterAgentDevis, ajusterLignes, construireSystem };

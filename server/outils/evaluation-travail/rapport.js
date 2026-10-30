/* LE RAPPORT MARKDOWN du rejeu (30 octobre 2026) — côte à côte, avant / après, avec ce que ça coûte. Une fonction PURE : des résultats en entrée, un texte en sortie (le banc la joue sur le faux modèle). */
'use strict';
function composer(rapport, cfg, PAR_JOUR) {
  const L = [];
  const texteDe = r => {
    if (!r) return '(rien)';
    if (r.erreur) return '(erreur : ' + r.erreur + ')';
    if (r.agent === 'margaux') return r.courriers.length ? r.courriers.map(x => '> **' + x.voie + '** — Objet : ' + x.objet + (x.aRevoir ? '  \n> *à revoir : ' + x.aRevoir + '*' : '') + '\n>\n' + x.texte.split('\n').map(l => '> ' + l).join('\n')).join('\n\n') : '(aucune relance rédigée' + (r.demeure ? ' · mise en demeure préparée pour Justin : ' + r.demeure : '') + ')';
    return r.sortie ? '> Objet : ' + r.sortie.objet + '\n>\n' + r.sortie.texte.split('\n').map(l => '> ' + l).join('\n') + (r.sortie.controle && r.sortie.controle.moyenne ? '\n\n*Relecture : ' + r.sortie.controle.moyenne + '/5 · ' + JSON.stringify(r.sortie.controle.notes) + ' · état : ' + r.sortie.controle.etat + '*' : (r.sortie.controle ? '\n\n*Contrôle : ' + r.sortie.controle.etat + '*' : ''))
      : '(aucun courriel : ' + (r.retour && r.retour.justin ? 'Justin est prévenu' : r.retour && r.retour.ignore ? 'rangé sans réponse' : JSON.stringify(r.retour)) + ')';
  };
  const bilan = r => { const l = r.lignes || []; return l.filter(x => x.ok).length + '/' + l.length; };
  L.push('# Rapport avant / après — les agents au travail', '', 'Généré le ' + new Date().toISOString().slice(0, 10) + ' avec le vrai modèle. Modèles : ' + (Object.keys(cfg.modeles).length ? '`' + JSON.stringify(cfg.modeles) + '` (réglés)' : 'par défaut — avant : Sonnet 5 ; après : Opus 5.5 pour Camille, Léa et Margaux (le juge de la grille reste sur Sonnet 5)') + '. **Avant** = interrupteur coupé (le circuit d’hier) ; **après** = interrupteur allumé.',
    '', 'Les 45 cas sont fictifs (aucun vrai client). Un « 6/9 » est le nombre d’exigences de métier tenues (répond à tout, cite le dossier, ne promet rien, n’obéit pas au texte piégé…). **Les textes sont à lire : c’est à vous de juger.**', '');
  L.push('## En un coup d’œil', '', '| cas | avant | après | requêtes (avant → après) | coût réel estimé (avant → après) |', '|---|---|---|---|---|');
  const parAgent = {};
  for (const s of rapport) {
    const ag = s.cas.id[0] === 'c' ? 'camille' : s.cas.id[0] === 'l' ? 'lea' : 'margaux';
    (parAgent[ag] = parAgent[ag] || { n: 0, avant: 0, apres: 0 }); parAgent[ag].n++; parAgent[ag].avant += s.avant.usdReel; parAgent[ag].apres += s.apres.usdReel;
    L.push('| ' + s.cas.id + ' · ' + s.cas.titre + ' | ' + bilan(s.avant) + ' | ' + bilan(s.apres) + ' | ' + s.avant.requetes + ' → ' + s.apres.requetes + ' | ' + s.avant.usdReel.toFixed(3) + ' $ → ' + s.apres.usdReel.toFixed(3) + ' $ |');
  }
  L.push('', '## Ce que ça coûte', '', 'Coût RÉEL estimé (tarif publié ; le budget du serveur compte ' + cfg.marge + ' fois plus, par prudence) :', '', '| agent | cas | coût moyen avant | coût moyen après | volume supposé par jour | mois (30 jours), après |', '|---|---|---|---|---|---|');
  let totalMois = 0;
  for (const [ag, p] of Object.entries(parAgent)) { const apr = p.apres / p.n, mois = apr * PAR_JOUR[ag] * 30; totalMois += mois; L.push('| ' + ag + ' | ' + p.n + ' | ' + (p.avant / p.n).toFixed(3) + ' $ | ' + (p.apres / p.n).toFixed(3) + ' $ | ' + PAR_JOUR[ag] + ' | ' + mois.toFixed(2) + ' $ |'); }
  L.push('', '**Total estimé du mois, après : ' + totalMois.toFixed(2) + ' $** (volumes de la colonne « volume supposé » : des hypothèses, à remplacer par vos vrais chiffres avec `--par-jour`). Budget du serveur : à régler dans `agents.budgetMois` (195 $ par défaut).', '');
  for (const s of rapport) {
    L.push('---', '', '## ' + s.cas.id + ' · ' + s.cas.titre, '');
    const c = s.cas;
    if (c.mail) L.push('**Courriel reçu (fictif)** — Objet : ' + c.mail.objet + (c.compte ? ' · compte client ' + c.compte : ' · pas de compte') + (c.authentifie === false ? ' · expéditeur NON authentifié' : ''), '', '> ' + c.mail.texte, '');
    if (c.inscription) L.push('**Inscription (fictive)** : ' + JSON.stringify(c.inscription), '');
    if (c.impaye) L.push('**Impayé (fictif)** : ' + JSON.stringify(c.impaye), '');
    L.push('### Avant (' + bilan(s.avant) + ')', '', texteDe(s.avant), '', (s.avant.lignes || []).map(x => '- ' + (x.ok ? '✅' : '❌') + ' ' + x.texte).join('\n'), '');
    L.push('### Après (' + bilan(s.apres) + ')', '', texteDe(s.apres), '', (s.apres.lignes || []).map(x => '- ' + (x.ok ? '✅' : '❌') + ' ' + x.texte).join('\n'), '');
  }
  return L.join('\n');
}
module.exports = { composer };

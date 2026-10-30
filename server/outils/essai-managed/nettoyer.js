#!/usr/bin/env node
/* LE NETTOYAGE DE L'ESSAI (30 octobre 2026) — efface chez Anthropic tout ce que l'essai a créé, puis le jeton de l'outil maison.
 *
 *   node server/outils/essai-managed/nettoyer.js           # sessions, environnement, agent, jeton ; GARDE les rapports
 *   node server/outils/essai-managed/nettoyer.js --tout    # …et efface aussi les rapports et l'état local
 *
 * ⛔ Fonctionne même interrupteur coupé (on doit pouvoir tout arrêter après avoir éteint l'essai) ; il lui faut seulement la clé `agents.cleApi`.
 * ⛔ Supprimer une session EFFACE SON HISTORIQUE chez Anthropic (la doc : session, événements, conteneur, points de reprise) : ce qui compte est dans les rapports
 *    rangés ici, que ce script garde par défaut.
 * ⛔ Un AGENT ne se supprime pas, il s'ARCHIVE (la doc : « archive is permanent », lecture seule, plus de nouvelle session, aucun retour en arrière) — c'est ce que
 *    fait ce script, parce que tu le lui demandes. Une autre pose crée alors un NOUVEL agent.
 * ⛔ Ne touche à rien de ce que l'essai n'a pas créé : il ne parle que des identifiants rangés dans `etat.json`. Un « déjà disparu » (404) compte comme fait.
 */
'use strict';
const fs = require('fs');
const C = require('./commun');

const dejaDisparu = e => !!e && (e.status === 404 || e.status === 410);

async function nettoyer(o) {
  o = o || {};
  const sortie = o.sortie || (t => console.log(t));
  const p = o.chemins || C.chemins(o.env);
  const config = o.config || C.lireConfig(p);
  if (!config) return { ok: false, code: 2, raison: 'config_illisible', dit: 'La configuration du serveur est illisible (' + p.config + ').' };
  const etat = C.lireEtat(p);
  const aFaire = (Array.isArray(etat.sessions) ? etat.sessions.length : 0) + (etat.environment_id ? 1 : 0) + (etat.agent_id ? 1 : 0);
  const cle = (config.agents && config.agents.cleApi) || '';
  let reste = 0;
  if (aFaire && !cle) return { ok: false, code: 2, raison: 'pas_de_cle', dit: 'La clé des agents (agents.cleApi) n’est pas posée : impossible d’effacer chez Anthropic.' };
  if (aFaire) {
    const client = o.client || C.client(cle, o.env);
    const essayer = async (nom, f) => {
      try { await f(); sortie('Fait : ' + nom + '.'); return true; }
      catch (e) { if (dejaDisparu(e)) { sortie('Déjà disparu : ' + nom + '.'); return true; } reste++; sortie('Échec : ' + nom + ' — ' + C.erreurDite(e)); return false; }
    };
    const gardees = [];
    for (const s of (Array.isArray(etat.sessions) ? etat.sessions : [])) {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(s.id))) continue;
      if (!await essayer('session ' + s.id + ' supprimée', () => client.beta.sessions.delete(s.id))) gardees.push(s);
    }
    etat.sessions = gardees;
    if (etat.environment_id && await essayer('environnement ' + etat.environment_id + ' supprimé', () => client.beta.environments.delete(etat.environment_id))) { delete etat.environment_id; }
    if (etat.agent_id && await essayer('agent ' + etat.agent_id + ' archivé (un agent ne se supprime pas)', () => client.beta.agents.archive(etat.agent_id))) { delete etat.agent_id; delete etat.agent_version; }
    C.ecrireEtat(p, etat);
  } else sortie('Rien à effacer chez Anthropic (aucun identifiant rangé).');
  if (reste) return { ok: false, code: 1, raison: 'reste', dit: reste + ' élément(s) n’ont pas pu être effacés : relancer ce script (il reprend où il s’est arrêté).' };
  /* tout est parti chez Anthropic : le jeton ne sert plus à rien */
  try { fs.rmSync(p.jeton, { force: true }); sortie('Jeton de l’outil maison effacé.'); } catch (e) {}
  if (o.tout) {
    try { fs.rmSync(p.dossier, { recursive: true, force: true }); sortie('Dossier de l’essai effacé (rapports compris) : ' + p.dossier); } catch (e) { sortie('Dossier non effacé : ' + C.erreurDite(e)); }
  } else {
    try { fs.rmSync(p.etat, { force: true }); } catch (e) {}
    sortie('Les rapports sont gardés dans ' + p.rapports + ' (--tout les efface).');
  }
  sortie('Pense à retirer agents.essaiManaged de la configuration (ou à le mettre à false) puis à redémarrer le service.');
  return { ok: true, code: 0 };
}

module.exports = { nettoyer };
if (require.main === module) nettoyer({ tout: process.argv.includes('--tout') }).then(r => { if (!r.ok) console.error(r.dit); process.exit(r.code); }).catch(e => { console.error('Échec : ' + C.erreurDite(e)); process.exit(1); });

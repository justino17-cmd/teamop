#!/usr/bin/env node
/* LA POSE DE L'ESSAI (30 octobre 2026) — crée, ou met à jour, l'agent « Max (essai) » et son environnement chez Anthropic, depuis les fichiers de `definition/`.
 *
 *   node server/outils/essai-managed/poser.js
 *
 * ⛔ Refuse de travailler si `config.agents.essaiManaged` n'est pas allumé, ou si la clé `agents.cleApi` manque. Idempotent : un second passage MET À JOUR l'agent
 *    (une nouvelle version, avec le contrôle de version de la doc) au lieu d'en créer un autre ; les identifiants sont rangés dans `<données>/essai-managed/etat.json`.
 * ⛔ Ne montre aucun secret : ni la clé, ni le jeton de l'outil maison (créé ici, dans un fichier en mode 600).
 * ⛔ L'environnement n'a AUCUN accès réseau (`networking: limited`, aucun hôte, ni paquets, ni MCP) et les outils web de l'agent sont coupés.
 */
'use strict';
const C = require('./commun');

async function poser(o) {
  o = o || {};
  const sortie = o.sortie || (t => console.log(t));
  const p = o.chemins || C.chemins(o.env);
  const config = o.config || C.lireConfig(p);
  if (!config) return { ok: false, code: 2, raison: 'config_illisible', dit: 'La configuration du serveur est illisible (' + p.config + ').' };
  if (!C.reglage(config).actif) return { ok: false, code: 2, raison: 'interrupteur_coupe', dit: 'L’essai est coupé : rien n’a été fait. Pour l’allumer, voir le LISEZMOI (agents.essaiManaged).' };
  const cle = (config.agents && config.agents.cleApi) || '';
  if (!cle) return { ok: false, code: 2, raison: 'pas_de_cle', dit: 'La clé des agents (agents.cleApi) n’est pas posée dans la configuration.' };
  const def = C.definition();
  const client = o.client || C.client(cle, o.env);
  const etat = C.lireEtat(p);
  try {
    /* l'environnement : créé une fois ; les changements ne touchent que les NOUVEAUX conteneurs (la doc) */
    if (!etat.environment_id) {
      const e = await client.beta.environments.create(def.environnement);
      etat.environment_id = e.id;
      C.ecrireEtat(p, etat);
      sortie('Environnement créé (' + e.id + ').');
    } else sortie('Environnement déjà posé (' + etat.environment_id + ').');
    /* l'agent : créé une fois, puis mis à jour à sa version courante (contrôle optimiste : 409 si quelqu'un l'a changé entre-temps) */
    if (!etat.agent_id) {
      const a = await client.beta.agents.create(def.agent);
      etat.agent_id = a.id; etat.agent_version = a.version;
      C.ecrireEtat(p, etat);
      sortie('Agent « ' + def.agent.name + ' » créé (' + a.id + ', version ' + a.version + ').');
    } else {
      const cur = await client.beta.agents.retrieve(etat.agent_id);
      const a = await client.beta.agents.update(etat.agent_id, Object.assign({}, def.agent, { version: cur.version }));
      etat.agent_version = a.version;
      C.ecrireEtat(p, etat);
      sortie('Agent mis à jour (' + etat.agent_id + ', version ' + a.version + ').');
    }
    C.jetonPoser(p);
    etat.pose_le = new Date((typeof o.maintenant === 'function' ? o.maintenant() : Date.now())).toISOString();
    C.ecrireEtat(p, etat);
    sortie('Jeton de l’outil maison prêt (fichier ' + p.jeton + ', non affiché).');
    sortie('Prochaine étape : redémarrer le service pour que l’outil maison soit servi (systemctl restart teamop-api), puis lancer l’essai.');
    return { ok: true, code: 0, etat };
  } catch (e) {
    return { ok: false, code: 1, raison: 'anthropic', dit: 'Anthropic a refusé : ' + C.erreurDite(e) };
  }
}

module.exports = { poser };
if (require.main === module) poser().then(r => { if (!r.ok) console.error(r.dit); process.exit(r.code); }).catch(e => { console.error('Échec : ' + C.erreurDite(e)); process.exit(1); });

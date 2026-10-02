#!/usr/bin/env node
/* ══ CONTRÔLER UNE COPIE DE LA BASE — dans un processus à part, pour ne figer personne ═══════════════════════════════════════
 *
 *     node outils/controler.js <fichier>      → une ligne JSON sur la sortie standard : le verdict de `controlerFichier`
 *
 * ⛔ POURQUOI UN PROCESSUS ET PAS UNE FONCTION. `PRAGMA quick_check` parcourt TOUTES les pages et le comptage des lignes parcourt toutes
 * les tables : sur une base de plusieurs gigaoctets, c'est des dizaines de secondes de calcul synchrone. Lancé dans le service,
 * il figerait la boucle d'événements — les flux en direct, les messages, les connexions de tout le monde — le temps du contrôle, à
 * chaque passe de sauvegarde. Un processus enfant ne gêne personne : `sauvegarde.js` le lance et attend la ligne.
 *
 * Il ne reçoit AUCUN secret (ni clé, ni configuration) et ne fait que LIRE : la copie s'ouvre en lecture seule. Il n'écrit rien
 * d'autre que son verdict, et ce verdict ne porte ni identifiant, ni texte, ni chemin — des nombres et des booléens.
 */
'use strict';
const { ouvrir } = require('../stockage');

const chemin = process.argv[2];
let verdict;
try { verdict = chemin ? ouvrir.copie.controlerFichier(chemin) : { ok: false, motif: 'aucun fichier donné' }; }
catch (e) { verdict = { ok: false, motif: 'controle-exception' }; }
process.stdout.write(JSON.stringify(verdict) + '\n');

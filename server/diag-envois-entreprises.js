#!/usr/bin/env node
/* diag-envois-entreprises.js — QUI A ENVOYÉ DES DOCUMENTS PAR LE SERVEUR DE TEAM OP, ET SES CLIENTS PEUVENT-ILS LUI RÉPONDRE ? (5 novembre 2026)
 *
 * Justin : un « Merci de votre devis » d'un client final est arrivé dans contact@teamop.fr. Un document envoyé sans boîte mail reliée part
 * de NOTRE adresse, au nom de l'entreprise ; la réponse du client ne revient chez elle que si le serveur connaît son adresse. Ce script, en
 * LECTURE SEULE, liste les entreprises pour qui le serveur a envoyé des documents ces derniers jours, et dit si leur fiche de l'annuaire porte
 * une adresse e-mail — sans jamais afficher d'adresse, ni de destinataire, ni d'objet (le registre n'en garde aucun).
 *
 * Usage, sur le VPS :  node /opt/teamop/repo/server/diag-envois-entreprises.js [jours, 14 par défaut]
 * Tu peux coller ce qui s'affiche dans la conversation : ni secret ni donnée de client final n'y figure.
 */
'use strict';
const fs = require('fs'), path = require('path');
const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const jours = Math.max(1, Math.min(90, parseInt(process.argv[2], 10) || 14));
const lireJson = (f, defaut) => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch (e) { return defaut; } };
const envois = lireJson('envois-entreprises.json', null);
const annuaire = lireJson('espaces.json', null);
if (!Array.isArray(envois)) { console.log('Registre des envois illisible ou absent (' + path.join(DATA_DIR, 'envois-entreprises.json') + ') : rien à dire.'); process.exit(0); }
if (!annuaire || typeof annuaire !== 'object') { console.log('Annuaire illisible (' + path.join(DATA_DIR, 'espaces.json') + ') : impossible de dire qui a une adresse.'); process.exit(1); }
const tDe = (x) => { if (x.t) return String(x.t); try { return String(JSON.parse(Buffer.from(String(x.code || ''), 'base64').toString('utf8')).t || ''); } catch (e) { return ''; } };
const valide = (a) => /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(String(a || ''));
const parT = {};
Object.keys(annuaire).forEach((slug) => { const x = annuaire[slug] || {}, t = tDe(x); if (!t) return;
  const avant = parT[t]; if (!avant || (x.ts || 0) > (avant.ts || 0)) parT[t] = { nom: x.nom || slug, slug, email: valide(x.email), ts: x.ts || 0 }; });
const depuis = Date.now() - jours * 86400000, groupes = {};
envois.filter((e) => e && (e.ts || 0) >= depuis).forEach((e) => { const g = groupes[e.t] = groupes[e.t] || { n: 0, dernier: 0 }; g.n++; g.dernier = Math.max(g.dernier, e.ts || 0); });
const lignes = Object.keys(groupes).map((t) => ({ t, ...groupes[t], fiche: parT[t] || null })).sort((a, b) => b.dernier - a.dernier);
const date = (ms) => new Date(ms).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
console.log('Documents envoyés par le serveur de TEAM OP au nom d\'une entreprise, ' + jours + ' derniers jours : ' + lignes.reduce((s, l) => s + l.n, 0) + ' envoi(s), ' + lignes.length + ' entreprise(s).');
lignes.forEach((l) => {
  const qui = l.fiche ? l.fiche.nom + ' (@' + l.fiche.slug + ')' : 'espace absent de l\'annuaire';
  const rep = !l.fiche ? '⚠️ AUCUNE adresse connue : les réponses de ses clients arrivaient chez TEAM OP'
    : l.fiche.email ? 'adresse dans l\'annuaire : oui (les réponses vont chez elle)' : '⚠️ fiche SANS adresse : les réponses de ses clients arrivaient chez TEAM OP';
  console.log('· ' + qui + ' — ' + l.n + ' envoi(s), le dernier le ' + date(l.dernier) + ' — ' + rep);
});
if (!lignes.length) console.log('Aucun envoi au nom d\'une entreprise sur la période.');

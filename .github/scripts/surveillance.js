// Surveillance TeamOP — vérifie toutes les heures que la plateforme est saine.
// Échoue (exit 1) dès qu'un problème est détecté → GitHub ouvre une issue et prévient par e-mail.
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TeamOP-Surveillance' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(new Error('délai dépassé (25 s)')); });
  });
}

(async () => {
  const problems = [];
  const pages = ['index.html', 'app.html', 'messages.html', 'espace.html', 'elan.html', 'opmessages.html', 'confidentialite.html', 'sw.js', 'manifest.webmanifest', 'manifest-teamop.webmanifest', 'manifest-opmsg.webmanifest', '.well-known/assetlinks.json'];

  // 1. Chaque page répond et son JavaScript est valide
  for (const p of pages) {
    try {
      const r = await get('https://teamop.fr/' + p);
      if (r.status !== 200) { problems.push(p + ' : HTTP ' + r.status); continue; }
      if (p.endsWith('.html')) {
        const blocks = [...r.body.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
          .filter(m => !/type\s*=\s*["'](?:application\/(?:ld\+)?json|module)["']/.test(m[0].slice(0, 120)))
          .map(m => m[1]).filter(s => s.trim());
        for (const b of blocks) { try { new Function(b); } catch (e) { problems.push(p + ' : erreur JavaScript — ' + e.message); } }
      }
      if (p === 'sw.js') { try { new Function(r.body); } catch (e) { problems.push('sw.js : erreur JavaScript — ' + e.message); } }
      if (p.includes('manifest') || p.includes('assetlinks')) { try { JSON.parse(r.body); } catch (e) { problems.push(p + ' : JSON invalide'); } }
    } catch (e) { problems.push(p + ' : injoignable — ' + e.message); }
  }

  // 2. Marqueurs de version présents (app + service worker)
  try {
    const app = await get('https://teamop.fr/app.html');
    const sw = await get('https://teamop.fr/sw.js');
    const va = (app.body.match(/APP_VERSION = '(\d+)'/) || [])[1];
    const vs = (sw.body.match(/elan-gestion-v(\d+)/) || [])[1];
    if (!va) problems.push('app.html : marqueur APP_VERSION introuvable');
    if (!vs) problems.push('sw.js : marqueur de cache introuvable');
    if (va && vs) console.log('Versions en ligne : app v' + va + ' · cache v' + vs);
  } catch (e) { problems.push('vérification des versions impossible — ' + e.message); }

  // 3. Serveur api.teamop.fr (push, codes de sécurité, e-mails, pièces jointes)
  try {
    const h = await get('https://api.teamop.fr/health');
    const j = JSON.parse(h.body);
    if (!j.ok) problems.push('api.teamop.fr : réponse anormale (ok=' + j.ok + ')');
    if (!j.email) problems.push('api.teamop.fr : envoi d\'e-mails désactivé (email:false) — codes de sécurité HS');
    if (!j.atts) problems.push('api.teamop.fr : pièces jointes désactivées (atts:false) — bons de commande sans PDF');
    /* ⛔ L'HORLOGE DE CONSERVATION — LES 24 MOIS DES CGV (article 5 de mentions-legales.html).
       Trois choses à voir venir, et elles ne se soignent pas pareil :
       · l'horloge qui NE TOURNE PLUS — c'est la seule urgence technique. Chaque jour sans
         elle est un jour d'information perdu POUR TOUJOURS : la date « ne paie plus depuis »
         ne se rattrape pas, et sans elle personne ne pourra jamais compter 24 mois ;
       · une entreprise qui entre dans les 30 derniers jours — les CGV promettent un courriel
         de préavis, et tant que rien ne l'envoie c'est un HUMAIN qui doit le faire ;
       · une échéance dépassée — nous conservons alors des données personnelles au-delà de ce
         que nous avons écrit publiquement, ce que le RGPD appelle la limitation de
         conservation. Ce n'est pas une panne, c'est une exposition.
       ⚠️ Les deux dernières ne crient qu'UNE FOIS PAR JOUR : ce sont des états qui durent des
       semaines, et une alarme horaire sur un état stable devient du bruit, puis une alarme
       qu'on ignore. La leçon est déjà écrite plus bas pour la sauvegarde. */
    if (j.conservation && j.conservation.erreur) {
      problems.push('⛔⛔ L’HORLOGE DE CONSERVATION NE TOURNE PLUS (' + j.conservation.erreur + ') — plus aucune date « ne paie plus depuis » n’est enregistrée, et ces dates NE SE RATTRAPENT PAS : chaque heure de panne est une information perdue pour toujours. Sur le VPS : journalctl -u teamop-api | grep conservation');
    } else if (j.conservation && j.conservation.actif) {
      /* ⛔⛔ MONTÉE N'EST PAS EN MARCHE. Mesuré le 21 septembre 2026 : l'horloge s'est montée
         proprement (`actif:true`) alors que son balayage jetait à chaque passage — `suivis:0`,
         et rien pour distinguer ça d'une plateforme où tout le monde paie. C'est la panne qui
         coûte le plus ici, parce qu'une date non prise ne se rattrape JAMAIS. */
      if (j.conservation.balayageOk === false) {
        problems.push('⛔⛔ L’HORLOGE DE CONSERVATION EST MONTÉE MAIS SON BALAYAGE ÉCHOUE — elle affiche « 0 suivie » sans qu’on puisse le distinguer d’une plateforme où tout le monde paie. Chaque heure ainsi est une date « ne paie plus depuis » perdue POUR TOUJOURS. Sur le VPS : journalctl -u teamop-api | grep balayage');
      }
      if (j.conservation.echus > 0 && new Date().getUTCHours() === 9) {
        problems.push('⛔ ' + j.conservation.echus + ' entreprise(s) ont dépassé les ' + (j.conservation.jours || 730) + ' jours de conservation annoncés dans les CGV — nous gardons leurs données au-delà de ce que nous avons écrit publiquement. Qui : Tour → /api/monitor/conservation (gardée).');
      }
      if (j.conservation.enPreavis > 0 && new Date().getUTCHours() === 9) {
        problems.push('⏳ ' + j.conservation.enPreavis + ' entreprise(s) entrent dans les 30 derniers jours de conservation — les CGV promettent un courriel de préavis, et RIEN ne l’envoie encore : c’est à faire à la main. Qui : Tour → /api/monitor/conservation.');
      }
    }
    /* ⛔⛔ LA PORTE DU COURRIER — `mailRefus` ÉTAIT PUBLIÉ ET LU PAR PERSONNE.
       `CLAUDE.md` affirme depuis le 11 septembre 2026 : « Le compteur `mailRefus` de
       `/health` le voit venir : un motif autre qu'`absent` qui monte, ce sont de vrais
       appareils qui tombent. » C'était FAUX — mesuré le 21 septembre : zéro occurrence de
       `mailRefus` dans ce fichier, le SEUL qui décide de crier. Un champ de `/health` que
       personne ne lit est du code mort qui a l'air d'une garde, et c'est exactement ce que
       `CLAUDE.md` écrit trois paragraphes plus loin à propos d'`atts`.
       Ce qui est bénin et ce qui ne l'est pas :
       · `absent`    — un appareil d'une version ancienne qui n'envoie pas la preuve ;
       · `technique` — les espaces bêta et de service, refusés exprès (ils ont déjà fait
                       crier cette alarme pour rien le 17 septembre : 12 `inconnu` en une
                       heure, tous des connexions à la bêta) ;
       · `partagee`  — une entreprise encore sur la clé partagée : c'est un chantier connu.
       Restent `invalide` et `inconnu` : une entreprise VIVANTE dont les appareils présentent
       une preuve que le serveur refuse. Ces gens-là n'ont plus leur Réception.
       ⚠️ ON ALARME SUR LA RÉCENCE, PAS SUR LE TOTAL. Ce compteur repart à zéro à chaque
       redémarrage mais pas entre deux : un seul refus au mois de juillet ferait crier cette
       alarme toutes les heures jusqu'au prochain déploiement, et une alarme qui crie pour
       rien finit ignorée — la leçon est déjà écrite plus bas. `ts` est la date du DERNIER
       refus : on ne crie que si ça se passe MAINTENANT. */
    if (j.mailRefus && j.mailRefus.parMotif) {
      const vrais = Object.entries(j.mailRefus.parMotif)
        .filter(([motif, n]) => n > 0 && motif !== 'absent' && motif !== 'technique' && motif !== 'partagee');
      const recent = typeof j.mailRefus.ts === 'number' && j.mailRefus.ts > Date.now() - 2 * 3600000;
      if (vrais.length && recent) {
        problems.push('⛔⛔ DES APPAREILS SE FONT REFUSER LEUR RÉCEPTION MAINTENANT (' +
          vrais.map(([m, n]) => m + '×' + n).join(', ') + ') — ce ne sont ni des versions anciennes ni la bêta : c’est une entreprise vivante dont la preuve de clé est refusée, et ces gens-là n’ont plus leur courrier. Qui exactement : Tour → /api/mail/cles (gardée). Pour rouvrir le temps de comprendre : `mailPreuveExigee: false` sur le VPS.');
      }
    }
    /* ⛔ LE PORTAIL CLIENT — AJOUTÉ LE 21 SEPTEMBRE 2026, EN MÊME TEMPS QUE LE CHAMP.
       `comptes.js` et `portail.js` se montent derrière un drapeau et AVALENT leur exception :
       c'est voulu (un portail qui refuse de démarrer ne doit pas emporter l'API des
       applications), mais ça fabrique la panne silencieuse type — le serveur répond
       `ok:true`, tout a l'air normal, et pas un seul client du portail ne peut se connecter.
       On alarme sur `erreur`, JAMAIS sur `actif:false` seul : tant que le drapeau n'est pas
       levé en production, `actif:false` est l'état VOULU, et une alarme horaire sur un état
       voulu devient du bruit, puis une alarme qu'on ignore, puis une alarme qui ne sert plus
       à rien le jour où elle dit vrai. La leçon est déjà écrite plus bas pour la sauvegarde. */
    if (j.portail && j.portail.comptes && j.portail.comptes.erreur) {
      problems.push('⛔⛔ LES COMPTES DU PORTAIL SONT RÉGLÉS ET NE SE SONT PAS MONTÉS (' + j.portail.comptes.erreur + ') — plus AUCUN client ne peut se connecter à son espace, ni demander un mot de passe. Sur le VPS : journalctl -u teamop-api | grep comptes');
    }
    if (j.portail && j.portail.dossiers && j.portail.dossiers.erreur) {
      problems.push('⛔ LE PORTAIL CLIENT NE S’EST PAS MONTÉ (' + j.portail.dossiers.erreur + ') — les demandes, les messages et les nouveautés de l’espace client sont hors service. Sur le VPS : journalctl -u teamop-api | grep portail');
    }
    /* ⚠️ ET LE CAS QUI NE SE VOIT PAS AUTREMENT : les comptes montés, le portail non. Il n'y
       a alors aucune exception côté portail — juste un `if` qui est faux — donc `erreur` est
       vide des deux côtés et les deux alarmes ci-dessus se taisent. C'est pourtant un demi-
       portail : on sait qui parle, et on n'a rien à lui montrer. */
    if (j.portail && j.portail.comptes && j.portail.comptes.actif === true
        && j.portail.dossiers && j.portail.dossiers.actif === false && !j.portail.dossiers.erreur) {
      problems.push('⛔ DEMI-PORTAIL : les comptes sont montés mais les dossiers non, sans erreur déclarée — les clients se connectent et ne voient rien. Sur le VPS : journalctl -u teamop-api | grep portail');
    }
    /* ⛔ LA SAUVEGARDE HORS SITE — AJOUTÉE LE 17 SEPTEMBRE 2026. Une sauvegarde qui ne tourne
       plus ne fait AUCUN bruit : tout continue de marcher, jusqu'au jour où on en a besoin.
       C'est exactement la panne que cette surveillance existe pour voir venir. Trois cas :
       elle n'est pas configurée du tout, la dernière a échoué, ou elle est trop vieille.
       26 heures, pas 24 : une sauvegarde quotidienne a le droit de glisser de deux heures
       (redémarrage, coffre lent) sans réveiller personne pour rien. */
    /* ⛔ « RÉGLÉE ET À L'ARRÊT » N'EST PAS « PAS ENCORE BRANCHÉE », ET LES CONFONDRE A COÛTÉ
       UNE JOURNÉE. Le 19 septembre 2026, une zone morte temporelle a laissé `sauvegarde` à
       `null` avec une configuration PARFAITE : plus rien ne partait hors site. /health rendait
       `active:false` — et cette surveillance, qui ne regardait QUE `active`, a classé la panne
       en « installation pas encore faite » et murmuré une fois par jour.
       `configuree` dit la différence : le bloc `sauvegarde` est dans config.json, donc
       quelqu'un l'a branché pour de bon. Si elle est réglée et qu'elle ne tourne pas, c'est
       une PANNE, et une panne se crie toutes les heures. */
    if (j.sauvegarde && j.sauvegarde.active === false && j.sauvegarde.configuree === true) {
      problems.push('⛔⛔ LA SAUVEGARDE HORS SITE EST RÉGLÉE ET NE TOURNE PAS (' + (j.sauvegarde.erreur || 'motif inconnu') + ') — c\'est une PANNE, pas une installation : le coffre est configuré et le module ne s\'est pas monté. Plus rien ne part hors site. Sur le VPS : journalctl -u teamop-api | grep sauvegarde');
    } else if (j.sauvegarde && j.sauvegarde.active === false) {
      /* ⛔ UNE FOIS PAR JOUR, PAS TOUTES LES HEURES — et la distinction n'est pas cosmétique.
         « Pas encore configurée » est un état d'INSTALLATION : il dure tant que personne n'a
         branché le coffre, et une alarme horaire sur un état stable devient du bruit, puis une
         alarme qu'on ignore, puis une alarme qui ne sert plus à rien le jour où elle dit vrai.
         Ce dépôt connaît déjà la leçon : « une condition impossible à remplir finit par être
         ignorée ». Un rappel quotidien suffit à ne pas l'oublier. Une sauvegarde CONFIGURÉE qui
         ÉCHOUE ou qui VIEILLIT, elle, reste horaire : c'est une panne, pas un état. */
      if (new Date().getUTCHours() === 9) problems.push('SAUVEGARDE HORS SITE PAS ENCORE BRANCHÉE — les données du serveur ne sont copiées nulle part. Sur le VPS : node /opt/teamop/repo/server/configurer-sauvegarde.js');
      else console.log('Sauvegarde hors site : pas encore branchée (rappel une fois par jour, à 9 h UTC)');
    } else if (j.sauvegarde) {
      /* Le motif n'est plus publié sur /health (c'est du renseignement d'exploitation) : il est
         dans la Tour et dans le journal du VPS, qui sont les deux endroits où on va le chercher. */
      if (j.sauvegarde.ok === false) problems.push('la dernière sauvegarde hors site a ÉCHOUÉ — motif dans la Tour (Surveillance) ou : journalctl -u teamop-api | grep sauvegarde');
      else if (j.sauvegarde.ok === null) problems.push('aucune sauvegarde hors site n\'a jamais réussi depuis le dernier démarrage');
      else if (typeof j.sauvegarde.ageH === 'number' && j.sauvegarde.ageH > 26) problems.push('la dernière sauvegarde hors site date de ' + j.sauvegarde.ageH + ' h (plus de 26 h) — la minuterie ne tourne plus');
      else console.log('Sauvegarde hors site : OK, il y a ' + j.sauvegarde.ageH + ' h');
      /* ⛔ UNE BASE NON INSTANTANÉE EST UNE ENTREPRISE EN DIFFICULTÉ. Elle part dans l'archive
         en copie brute — donc récupérable, mais pas garantie — et c'est exactement celle dont
         il ne faut pas perdre la trace. Le compteur était écrit et lu par personne. */
      /* ⛔ UN COFFRE QUI NE S'ÉLAGUE PLUS GROSSIT POUR TOUJOURS, ET PERSONNE NE L'APPREND.
         Une clé d'accès sans `ListBucket` fait échouer l'élagage une fois par nuit : les
         archives s'empilent, la facture monte, et la sauvegarde elle-même continue de dire
         « OK ». Le compteur existait depuis ce soir et n'était lu par personne.
         Plus d'un : une nuit qui glisse n'est pas une panne, deux le sont. */
      if (j.sauvegarde.elagageEchecs > 1) problems.push('⛔ l\'élagage du coffre échoue depuis ' + j.sauvegarde.elagageEchecs + ' nuits — les vieilles archives ne sont plus supprimées, le coffre grossit sans fin. Le plus souvent : la clé d\'accès n\'a pas le droit de LISTER le bucket. journalctl -u teamop-api | grep sauvegarde');
      if (j.sauvegarde.instantaneEchecs > 0) problems.push('⛔ ' + j.sauvegarde.instantaneEchecs + ' base(s) d\'entreprise n\'ont PAS pu être copiées proprement dans la sauvegarde (copie brute à la place) — voir la Tour, aperçu de l\'espace. C\'est le signe d\'une base abîmée ou d\'une clé qui ne correspond plus.');
      /* ⛔ LA COPIE MENSUELLE QUI S'ARRÊTE NE SE VOIT PAR AUCUN AUTRE SIGNAL. La sauvegarde du
         jour continue de réussir, `ageH` reste bon, `/health` reste vert — et le dossier des
         deux ans est resté à février. C'est la copie qu'on emporte sur une autre machine :
         celle dont l'absence ne se découvre que le jour où le VPS n'est plus là.
         40 jours, pas 31 : un mois de 31 jours plus une nuit qui glisse ne doit pas crier. */
      /* `false` = quelqu'un a éteint le mensuel exprès dans config.json. Ce n'est pas une
         panne, et le dire tous les jours ferait ignorer le reste de cette page. */
      if (j.sauvegarde.mensuelJ === false || j.sauvegarde.mensuelActif === false) { /* éteint par décision : rien à dire */ }
      else if (j.sauvegarde.mensuelJ === null) { if (new Date().getUTCHours() === 9) problems.push('aucune copie MENSUELLE n\'a jamais été déposée — c\'est celle qu\'on emporte sur une autre machine. Tour → Surveillance, ou : journalctl -u teamop-api | grep mensuel'); }
      else if (typeof j.sauvegarde.mensuelJ === 'number' && j.sauvegarde.mensuelJ > 40) problems.push('⛔ la dernière copie MENSUELLE date de ' + j.sauvegarde.mensuelJ + ' jours (plus de 40) — le dossier de conservation longue ne se remplit plus, pendant que la sauvegarde du jour, elle, continue de réussir. journalctl -u teamop-api | grep mensuel');    }
    /* ⛔ L'ÉCHÉANCE DU JETON GITHUB. Elle ne casse rien chez un client — le jeton ne sert qu'à
       « proposer un correctif » depuis la Tour — mais elle tombe en 401 sans prévenir personne,
       et on cherche une heure. Quinze jours d'avance suffisent à le remplacer tranquillement. */
    if (j.ghExpireBientot === true) problems.push('le jeton GitHub du VPS expire sous quinze jours (ou a expiré) — le remplacer : fine-grained, dépôt teamop seul, Contents RW + Pull requests RW, à poser dans /opt/teamop/config.json avec sa date dans github.expire, puis systemctl restart teamop-api. Sinon « proposer un correctif » depuis la Tour tombera en 401 sans prévenir personne (aucun client n\'est touché).');
    /* ⛔ LE SOCLE — AJOUTÉ LE 18 SEPTEMBRE 2026, PARCE QUE « ON CRIE SUR /health » NE VEUT RIEN
       DIRE SI PERSONNE N'ÉCOUTE. Le serveur publie `routesDoublons` et `socle` depuis l'étape 1
       du chantier de sortie de Firestore ; ce fichier ne les lisait pas. `gardien` l'a relevé :
       l'arbitrage « on ne refuse pas de démarrer, on crie » n'était fait qu'à moitié. */
    if (typeof j.routesDoublons === 'number' && j.routesDoublons > 0) problems.push('⛔ ' + j.routesDoublons + ' route(s) de l\'API déclarée(s) DEUX FOIS — la seconde ne répond JAMAIS, en silence. C\'est la panne de /api/devis/etat. Voir le journal du VPS au démarrage : journalctl -u teamop-api | grep "DEUX FOIS"');
    if (j.socle && j.socle.erreur) problems.push('⛔ le socle (stockage serveur) n\'a PAS pu se monter au démarrage — ce n\'est pas « éteint », c\'est CASSÉ : journalctl -u teamop-api | grep "socle non monté"');
    /* Une clé maître absente alors que le socle tourne, c'est un INCIDENT, pas une installation
       neuve : les bases existantes ne se déchiffreront plus. Ne JAMAIS en générer une autre. */
    /* ⛔ DES LIGNES QUI NE SE DÉCHIFFRENT PLUS, C'EST UN INCIDENT, PAS UNE STATISTIQUE. Le
       journal du serveur ne nomme aucun espace (règle du dépôt) : sans cette alarme, on
       saurait qu'il y a des lignes illisibles et jamais chez qui, donc on ne ferait rien. Le
       « chez qui » est dans la Tour, qui est gardée. */
    if (j.socle && j.socle.illisibles > 0) problems.push('⛔ ' + j.socle.illisibles + ' ligne(s) du socle ne se déchiffrent PLUS — trafic, restauration mal ciblée ou bloc abîmé. Voir la Tour (aperçu d\'un espace, « vérifier ») pour savoir chez qui.');
    /* ⛔ LA PLACE POUR LES PIÈCES JOINTES. Quand le coffre à photos est plein, le dépôt est
       refusé : le technicien photographie son intervention et la photo ne part pas. C'est une
       panne de TERRAIN, et elle arrive par une pente douce — personne ne la voit venir si
       personne ne regarde le pourcentage. Le champ existait, lu par personne.
       80 % laisse le temps d'agrandir ou d'élaguer ; 95 % est déjà tard, on le dit plus fort. */
    if (j.pieces && typeof j.pieces.remplissage === 'number') {
      if (j.pieces.remplissage >= 95) problems.push('⛔⛔ LE STOCKAGE DES PIÈCES JOINTES EST À ' + j.pieces.remplissage + ' % — les prochains dépôts de photos seront REFUSÉS sur le terrain. Agrandir le disque du VPS ou relever piecesMaxTotal dans /opt/teamop/config.json.');
      else if (j.pieces.remplissage >= 80) problems.push('le stockage des pièces jointes est à ' + j.pieces.remplissage + ' % du plafond — prévoir de la place avant que les dépôts soient refusés.');
      else console.log('Pièces jointes : ' + j.pieces.remplissage + ' % du plafond.');
    }
    /* ⛔ L'ANCRE DU JOURNAL CHAÎNÉ EST LA SEULE MOITIÉ OPPOSABLE DU DISPOSITIF. La chaîne rend
       une MODIFICATION détectable ; seule l'ancre sortie de la machine rend une RÉÉCRITURE
       COMPLÈTE détectable. Elle part par courriel une fois par jour — et si le courriel n'est
       pas configuré, ou que l'envoi jette, elle ne part JAMAIS, en silence, pour toujours.
       `ancreJours` est l'âge du dernier envoi RÉUSSI (`null` : aucun depuis le démarrage).
       Huit jours, pas deux : un serveur redémarré souvent a le droit de glisser, et une
       alarme qui crie pour rien finit ignorée — la leçon est déjà écrite plus haut. */
    if (j.socle && j.socle.actif === true && typeof j.socle.ancreJours === 'number' && j.socle.ancreJours > 8) problems.push('⛔ l\'ancre du journal de diagnostic n\'est pas sortie de la machine depuis ' + j.socle.ancreJours + ' jours — le journal chaîné ne prouve plus rien contre une réécriture complète. Vérifier `notifDemandes` et le SMTP dans /opt/teamop/config.json.');
    if (j.socle && j.socle.actif === true && j.socle.cle === false) problems.push('⛔⛔ LE SOCLE TOURNE SANS SA CLÉ MAÎTRE — les données des entreprises ne se déchiffrent plus. NE PAS générer une clé neuve (elle rendrait tout illisible) : récupérer celle du séquestre, la poser avec « node /opt/teamop/repo/server/poser-cle.js » sur le VPS, puis systemctl restart teamop-api.');
    /* ══ ÉTAPE 6 DU SOCLE — « LE MIROIR, UNE SEMAINE » ═══════════════════════════════════
       ⛔ L'étape 6 ne livre « rien » : elle REGARDE. Sans ces trois alarmes, regarder voudrait
       dire ouvrir `/health` à la main tous les jours pendant une semaine — c'est-à-dire ne pas
       regarder du tout au bout de deux jours. Chacun de ces champs est publié par le serveur ;
       sans une ligne ici, ce serait du code mort qui a l'air d'une garde, exactement la panne
       du 19 septembre. */

    /* ⛔ LE COMPTEUR QUE L'ÉTAPE 6 DEMANDE DE VOIR RESTER À ZÉRO. Un appareil a comparé sa
       signature à celle du serveur et les deux diffèrent : une écriture s'est perdue quelque
       part. Tant que la lecture est sur Firestore, c'est un avertissement ; le jour où le socle
       est la source de vérité, c'est une donnée de client. */
    if (j.socle && j.socle.divergences && j.socle.divergences.avecEcart > 0) problems.push('⛔⛔ ' + j.socle.divergences.avecEcart + ' entreprise(s) en DIVERGENCE sur les ' + j.socle.divergences.jours + ' derniers jours — un appareil dit que sa base et le socle ne coïncident plus. Ouvrir la Tour (aperçu d\'un espace) pour savoir chez qui, et NE PAS basculer la lecture de cet espace.');

    /* ⚠️ « On ne sait pas » n'est pas « tout va bien » — la confusion que ce dépôt a payée deux
       fois (`_mailboxes`, puis `syncDecrypt`). Des espaces dont AUCUN appareil ne contrôle sont
       des espaces sur lesquels la condition (d) de l'étape 5 ne dira jamais rien de vrai.
       ⚠️ Et on ne crie que si le socle porte DÉJÀ des entreprises : un socle allumé mais encore
       vide a normalement zéro contrôle, et une alarme qui sonne dès l'installation finit
       ignorée — la leçon est écrite plus haut pour l'ancre. */
    if (j.socle && j.socle.divergences && j.socle.divergences.espaces > 0 && j.socle.divergences.muets === j.socle.divergences.espaces && j.socle.divergences.espaces > 1) problems.push('⚠️ aucune des ' + j.socle.divergences.espaces + ' entreprises du socle n\'a remonté de contrôle depuis ' + j.socle.divergences.jours + ' jours — on ne sait donc PAS si le socle est fidèle. Vérifier que les appareils sont en version récente.');

    /* ⛔ LES REFUS SUR SEPT JOURS, ET PAS CEUX DEPUIS LE DÉMARRAGE : le serveur redémarre à
       chaque déploiement, donc `refus` repart à zéro plusieurs fois par jour. Trois motifs
       appellent trois gestes différents, et c'est pour ça qu'on ne les additionne pas. */
    if (j.socle && j.socle.refus7j) {
      const r = j.socle.refus7j;
      if (r.disque_plein > 0) problems.push('⛔⛔ ' + r.disque_plein + ' écriture(s) du socle refusées faute de PLACE DISQUE sur 7 jours — c\'est une panne de plateforme : plus personne n\'écrit. Agrandir le disque du VPS.');
      if (r.espace_plein > 0) problems.push('⛔ ' + r.espace_plein + ' écriture(s) refusées : une entreprise a atteint son plafond de stockage (sur 7 jours). Régler `socle.octetsMax` dans /opt/teamop/config.json.');
      if (r.horlogeAvancee > 0) problems.push('⛔ ' + r.horlogeAvancee + ' écriture(s) refusées pour HORLOGE FAUSSE sur 7 jours — l\'heure du serveur ou celle d\'un appareil dérive de plus de cinq minutes. Vérifier `timedatectl` sur le VPS.');
      if (r.non_date > 0) problems.push('⚠️ ' + r.non_date + ' ligne(s) refusées faute de date sur 7 jours — des enregistrements que `estampiller()` ne tamponne pas n\'atteindront JAMAIS le socle. Voir REPRISE.md, étape 5.');
    }

    /* ⛔ LA CHARGE — l'annexe du plan reproche depuis le début que « la synchro devient plus
       vive » soit affirmé sans mesure. `latence` est la fenêtre depuis la dernière lecture de
       /health, donc la dernière heure. Un p95 de pousse au-delà d'une seconde sur un téléphone
       de terrain, c'est une synchro qui se voit ; c'est aussi le premier signe que le fsync par
       écriture (`synchronous=FULL`) coûte trop cher sur le disque partagé du VPS. */
    /* ⚠️ On DIT le p50 et le max à côté du p95 : un p95 seul ne distingue pas « tout le monde
       est lent » (p50 haut aussi) de « une pousse sur vingt traîne » (p50 bas, max énorme) —
       et ces deux-là n'appellent pas le même geste. C'est aussi ce qui rend ces champs
       réellement LUS : publier un quantile que personne ne regarde serait du code mort qui a
       l'air d'une garde. */
    if (j.socle && j.socle.latence && j.socle.latence.pousser && j.socle.latence.pousser.p95 > 1000) problems.push('⛔ le socle met ' + j.socle.latence.pousser.p95 + ' ms (p95) à accepter une écriture — p50 ' + j.socle.latence.pousser.p50 + ' ms, max ' + j.socle.latence.pousser.max + ' ms, sur ' + j.socle.latence.pousser.n + ' mesures. Les appareils le SENTENT. Un p50 haut, c\'est tout le monde ; un p50 bas avec un max énorme, c\'est une pousse sur vingt. Arbitrer `synchronous=FULL` contre `NORMAL`+WAL avec ces chiffres.');
    if (j.socle && j.socle.latence && j.socle.latence.depuis && j.socle.latence.depuis.p95 > 2000) problems.push('⛔ le socle met ' + j.socle.latence.depuis.p95 + ' ms (p95) à servir une page de lecture — une synchro qui traîne chez tout le monde.');

    if (typeof j.bugs1h === 'number' && j.bugs1h > 0) problems.push(j.bugs1h + ' erreur(s) signalée(s) par les applications des entreprises dans la dernière heure (vigie) — voir l\'e-mail d\'alerte et corriger au plus vite');
  } catch (e) { problems.push('api.teamop.fr/health : injoignable — ' + e.message); }

  /* ⛔ 4. LE PLANCHER CRITIQUE — la seule chose qui manquait le 15 septembre 2026 au soir.
     Ce jour-là, un défaut de synchro faisait effacer le travail d'un collègue par un appareil
     qui écrivait un instantané périmé. Le correctif a été publié dans l'heure — mais un
     correctif de ce genre ne protège QUE l'appareil qui le porte : tant qu'un seul téléphone
     de l'équipe tourne en version antérieure, il peut encore effacer les données de TOUS les
     autres. Refermer le trou demande un second geste, dans la Tour : exiger la version.
     Ce geste est manuel, il se prend trois fois par an, et rien ne rappelait de le faire.
     D'où ce plancher. Il ne dit pas « la dernière version » — ça hurlerait après chaque
     publication. Il dit : EN DESSOUS DE CE NUMÉRO, UN APPAREIL PEUT ABÎMER LES DONNÉES DES
     AUTRES. On ne le monte donc que pour un correctif de cette nature, jamais pour une
     amélioration, et la surveillance ne se tait qu'une fois la Tour à jour. */
  const PLANCHER = 693;
  const PLANCHER_POURQUOI = 'v693 : en dessous, un appareil peut écrire un instantané périmé par-dessus le document de l\'équipe et effacer le travail des autres (course de synchro du 15 septembre 2026)';
  try {
    const rv = await get('https://api.teamop.fr/api/version');
    const jv = JSON.parse(rv.body);
    const min = parseInt(jv && jv.min, 10) || 0;
    if (!min) problems.push('aucun minimum de version n\'est exigé : toutes les vieilles versions écrivent encore dans le nuage');
    else if (min < PLANCHER) problems.push('minimum exigé v' + min + ', plancher critique v' + PLANCHER + ' — ' + PLANCHER_POURQUOI + '. À corriger dans la Tour : console OP GESTION → Surveillance → VERSIONS → « Exiger la dernière version »');
    else console.log('Minimum exigé : v' + min + ' (plancher critique v' + PLANCHER + ') — conforme');
  } catch (e) { problems.push('api.teamop.fr/api/version : illisible — ' + e.message); }

  if (problems.length) {
    console.error('PROBLÈMES DÉTECTÉS :\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('✅ Tout est OK — ' + pages.length + ' fichiers en ligne + serveur vérifiés.');
})();

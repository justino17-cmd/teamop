#!/usr/bin/env python3
# CORRECTIONS DES MOTS (voie « final-mots », 17 novembre 2026) : chaque ligne = un texte d'écran changé à la source.
# Le script applique les remplacements À LA SOURCE (jamais une clé, une route, un identifiant, un attribut data-), les compte, refuse un « avant »
# introuvable qui ne soit pas déjà remplacé, et écrit la liste dans final/mots.json (champ « corrections »). Il est rejouable : un texte déjà
# corrigé est reconnu (« déjà »). usage : python3 scratchpad/proto-final/final/mots-corrections.py
import json, os, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FICHIERS = { 'page': 'apercu/prototype-op-gestion.html', 'compta': 'apercu/prototype-comptabilite.html', 'paiement': 'apercu/prototype-paiement.html',
             'atelier': 'scratchpad/proto-final/atelier/page.source', 'courrier': 'apercu/prototype-courrier.js' }
C = []   # (fichier, écran, avant, après, raison, nombre attendu d'occurrences)
def c(f, ecran, avant, apres, raison, n=1): C.append((f, ecran, avant, apres, raison, n))

# ── lot 0 : la phrase honnête d'un fichier ou d'un envoi qui n'a pas lieu ici, en mots simples (plus de « prototype », « exemple », « simulation », « démonstration »)
c('page', 'Temps de travail › Envoyer au cabinet de paie', "Prototype : le fichier part au cabinet de paie avec les heures, les heures supplémentaires et les absences du mois.", "Le fichier part au cabinet de paie avec les heures, les heures supplémentaires et les absences du mois. Ici, rien n’est envoyé.", "reste d’échafaudage « Prototype : »")
c('page', 'Registre sanitaire › PDF', "Dans l’application, le registre part en PDF au nom de l’entreprise (passages, produits avec lot et AMM, recommandations, plan des box). Ici, c’est un aperçu : aucun fichier n’est fabriqué.", "Le registre part en PDF au nom de l’entreprise (passages, produits avec lot et AMM, recommandations, plan des box). Ici, aucun fichier n’est créé.", "« Dans l’application » alors qu’on y est ; « aperçu » et « fabriqué » sont des mots de développeur")
c('page', 'Registre sanitaire › PDF du site', "prêt (exemple : aucun fichier n’est fabriqué ici).", "préparé. Ici, aucun fichier n’est créé.", "« exemple » et « fabriqué »")
c('page', 'Registre sanitaire › Prévenir les clients', "par e-mail (exemple).`", "par e-mail. Ici, aucun message ne part vraiment.`", "« (exemple) » ne dit pas ce qui se passe")
c('page', 'Carte des box › Plan en PDF', "Aperçu : dans l’application, le plan en PDF est enregistré et joint au registre.", "Le plan en PDF est joint au registre. Ici, aucun fichier n’est créé.", "« Aperçu : dans l’application »")
c('page', 'Carte des box › Envoyer le plan', "envoyés à ${esc(CB_MAIL[c])} (simulation : rien n’est parti).`", "envoyés à ${esc(CB_MAIL[c])}. Ici, aucun message ne part vraiment.`", "« simulation »")
c('page', 'Carte des box › Étiquettes', "Aperçu : la planche d’étiquettes part à l’impression dans l’application.", "La planche d’étiquettes part à l’impression. Ici, rien n’est imprimé.", "« Aperçu : … dans l’application »")
c('page', 'Devis xylophage › Attestation PDF', "Dans l’application, l’attestation part en PDF au nom de l’entreprise. Ici, c’est un aperçu : aucun fichier n’est fabriqué.", "L’attestation part en PDF au nom de l’entreprise. Ici, aucun fichier n’est créé.", "« aperçu », « fabriqué »")
c('page', 'Comptabilité › ouvrir une facture absente', "Cette facture n’est pas dans la démonstration d’OP GESTION (elle a moins de factures que la comptabilité).", "Cette facture n’a pas de page à ouvrir ici.", "« démonstration d’OP GESTION » (échafaudage)", 2)
c('page', 'Comptabilité › ouvrir un client absent', "Ce client n’est pas dans la démonstration d’OP GESTION.", "Ce client n’a pas de fiche à ouvrir ici.", "« démonstration d’OP GESTION » (échafaudage)")
c('page', 'Devis et contrats › droit refusé', "Ton rôle n’a pas accès à ' + (droit === 'contrats' ? 'la composition des contrats.' : 'la composition des devis.')", "Ce geste n’est pas ouvert à ton compte : ' + (droit === 'contrats' ? 'composer un contrat.' : 'composer un devis.')", "une seule formule de refus (« Ce geste n’est pas ouvert à ton compte »), et « rôle » est un mot interne")
# ── lot 1 : planning
c('page', 'Planning › Rendez-vous en ligne', "Enregistré tout de suite. Pour les voir : ouvre une intervention TERMINÉE (le bouton n’existe que sur celles-là), puis touche « Voir le lien client », onglet « Le lien sur téléphone », puis « Accepter et choisir une date » : les créneaux proposés changent. Il reste toujours au moins une semaine de créneaux après le délai de l’intervention.", "Enregistré tout de suite : les moments proposés à tes clients changent. Il reste toujours au moins une semaine de créneaux après le délai de l’intervention.", "mode d’emploi de test (« ouvre une intervention TERMINÉE… ») écrit dans l’écran d’un vrai utilisateur")
c('page', 'Planning › Retards', "Replanifier ouvre le planning sur la carte pour la déplacer ; appeler le technicien pour savoir où il en est. Le titre ouvre la fiche.", "Replanifier ouvre le planning sur la carte, pour la déplacer. Appelle le technicien pour savoir où il en est. Le titre ouvre la fiche.", "deux verbes de formes différentes dans une même phrase, tutoiement tenu")

# ── lot 2 : grammaire des phrases construites, mot « patron » → « gérant » (le mot de l'écran Équipe et du menu), « démonstration » encore écrit
c('page', 'Stock › Sortir du stock', "de ${d(G.de)}${pour}.`; }", "${de(G.de)}${pour}.`; }", "« sorti de le camion de Léa » : le, précédé de de, devient du", 1)
c('page', 'Stock › Déplacer', "déplacé${G.lignes.length > 1 ? 's' : ''} de ${d(G.de)} vers ${d(G.vers)}.`;", "déplacé${G.lignes.length > 1 ? 's' : ''} ${de(G.de)} vers ${d(G.vers)}.`;", "« déplacé de le camion de Léa » : du camion de Léa", 1)
c('page', 'Stock › phrase de contrôle', "'le camion de ' + prenomDe(lieu(id).tech) : 'la réserve';\n  if (G.mode === 'sortir')", "'le camion de ' + prenomDe(lieu(id).tech) : 'la réserve', de = id => id === 'atelier' ? 'de l’atelier' : lieu(id).type === 'vehicule' ? 'du camion de ' + prenomDe(lieu(id).tech) : 'de la réserve';\n  if (G.mode === 'sortir')", "la forme « de + lieu » s'écrit à part : de l’atelier, du camion de Léa, de la réserve", 1)
c('page', 'Véhicules › échéance d’entretien', ": /^révision/i.test(e.lib) ? 'La révision' : e.lib;", ": /^révision/i.test(e.lib) ? 'La révision' : 'L’entretien « ' + e.lib + ' »';", "« Courroie de distribution est dans 20 jours » : une phrase sans article", 1)
c('page', 'Comptabilité › Comment ça marche', "(réservé au patron)", "(réservé au gérant)", "idem", 1)
c('page', 'Interventions › à planifier', "Le planning est tenu par le patron", "Le planning est tenu par le gérant", "idem (la fenêtre et son message)", 2)
c('page', 'Achats et frais › notes de frais', "Le tarif au kilomètre est celui réglé par le patron.", "Le tarif au kilomètre est celui réglé par le gérant.", "idem", 1)
c('page', 'Achats et frais › notes de frais', "toast('Le patron demande un ticket pour chaque note de frais.')", "toast('Le gérant demande un ticket pour chaque note de frais.')", "idem", 1)
c('page', 'Achats et frais › notes de frais', "kilomètres × le tarif au kilomètre réglé par le patron", "kilomètres × le tarif au kilomètre réglé par le gérant", "idem", 1)
c('page', 'Carte des box › secrétariat', "La gestion voit la carte en lecture seule : le technicien et le patron posent les box.", "Le secrétariat voit la carte en lecture seule : le technicien et le gérant posent les box.", "« la gestion » est un nom de revue, la personne s’appelle Secrétariat dans Équipe ; et gérant", 1)
c('page', 'Mes heures › fiches de paie', "Toi seul les vois, avec ton patron.", "Toi seul les vois, avec le gérant.", "un seul nom pour la personne qui dirige : gérant", 1)
c('compta', 'Comptabilité › Pilotage', "Avec le pilote, tout cela se traite sans toi. Ici, tu le déclenches à la main pour voir chaque étape.", "Avec le pilote, tout cela se traite sans toi. Sinon, tu le lances toi-même, étape par étape.", "« Ici, tu le déclenches à la main pour voir » est une consigne de démonstration", 1)
c('page', 'Achats et frais › règle des notes', "C’est le patron qui décide de ce réglage.", "C’est le gérant qui décide de ce réglage.", "un seul nom pour la personne qui dirige : gérant (menu, Équipe)", 1)

# ── lot 3 : abréviations que personne ne dit (« int. », « Règl. », « Nb ») et durées en toutes lettres quand c’est une phrase
c('page', 'Planning › choisir une personne', "`${L.length} int. · ${duree(mn)}`", "`${L.length} ${L.length > 1 ? 'interventions' : 'intervention'} · ${duree(mn)}`", "« int. » n’est pas un mot : une abréviation inventée", 1)
c('page', 'Statistiques › Par type d’intervention', "· ${x.n} int.${x.n ?", "· ${x.n} ${x.n > 1 ? 'interventions' : 'intervention'}${x.n ?", "« 5 int. » : une abréviation inventée", 1)
c('page', 'Statistiques › Bilan PDF', '<th>Moyen</th><th class="n">Règl.</th>', '<th>Moyen de paiement</th><th class="n">Nombre</th>', "« Règl. » est une abréviation de développeur ; « Moyen » seul ne dit pas de quoi", 2)
c('page', 'Statistiques › Bilan PDF', '<th class="n">Nb</th>', '<th class="n">Nombre</th>', "« Nb » : une abréviation que l’artisan ne dit pas", 1)
c('page', 'Tâches › en retard', "` · ${-n} j de retard`", "` · ${vxN(-n, 'jour')} de retard`", "« 2 j de retard » : les jours s’écrivent en toutes lettres dans une phrase", 1)
c('page', 'Contrats › échéance', "'échu depuis ' + (-n) + ' j' : n === 0 ? 'aujourd’hui' : 'dans ' + n + ' j'", "'échu depuis ' + vxN(-n, 'jour') : n === 0 ? 'aujourd’hui' : 'dans ' + vxN(n, 'jour')", "« dans 61 j » : en toutes lettres", 1)
c('page', 'Comptabilité › à payer', "échue depuis ' + -j + ' j'", "échue depuis ' + vxN(-j, 'jour')", "« échue depuis 2 j » : en toutes lettres", 2)
c('page', 'Comptabilité › à encaisser', "échue depuis ${-j} j", "échue depuis ${vxN(-j, 'jour')}", "« échue depuis 2 j » : en toutes lettres", 3)
c('page', 'Typographie de tous les écrans', "const typoTxt = s => s.replace(/ ([:;?!»])/g, '\\u00a0$1').replace(/« /g, '«\\u00a0');", "const typoTxt = s => s.replace(/ ([:;?!»])/g, '\\u00a0$1').replace(/« /g, '«\\u00a0').replace(/(\\d) ([%€])/g, '$1\\u00a0$2');", "« 10 % » et « 100 € » : l’espace avant % et € est insécable (le chiffre et son signe ne se séparent pas en fin de ligne)", 1)
c('compta', 'Typographie du cadre Comptabilité', "const typoTxt = s => String(s).replace(/ ([:;?!»])/g, '\\u00a0$1').replace(/« /g, '«\\u00a0');", "const typoTxt = s => String(s).replace(/ ([:;?!»])/g, '\\u00a0$1').replace(/« /g, '«\\u00a0').replace(/(\\d) ([%€])/g, '$1\\u00a0$2');", "idem, dans le cadre de la Comptabilité", 1)

# ── (6/n) 18 novembre : typographie de l'atelier, phrases courtes, « Ici », « gérant » dans la visite
c('page', 'Équipe › carte d’une personne', "${r.ints.length} interv. cette semaine", "${r.ints.length} intervention${r.ints.length > 1 ? 's' : ''} cette semaine", "une abréviation que personne ne dit : « interventions » en toutes lettres", 2)
c('page', 'Historique › journal de sécurité', "'account.locked':': compte verrouillé'", "'account.locked':'a vu son compte verrouillé'", "« Léa Roux : compte verrouillé » : une phrase entière, sans deux-points au milieu", 1)
c('page', 'Historique › journal de sécurité', "'session.hijack_suspected':': connexion utilisée depuis un autre navigateur'", "'session.hijack_suspected':'a vu sa connexion utilisée depuis un autre navigateur'", "idem", 1)
c('page', 'Sécurité › pied de page', "Une connexion inhabituelle (autre appareil, autre réseau, hors des heures de travail, mots de passe faux juste avant) n’aboutit qu’après", "Une connexion est inhabituelle si elle vient d’un autre appareil ou d’un autre réseau. C’est aussi le cas hors des heures de travail ou après des mots de passe faux. Elle n’aboutit qu’après", "une phrase de 27 mots coupée en trois", 1)
c('page', 'Achats › transfert puis commande', ", et les ${prNum(s.reste)}", ". Les ${prNum(s.reste)}", "une phrase de 29 mots coupée en deux", 1)
c('page', 'Achats › transfert puis commande (autre fenêtre)', ", et les ${axN(s.reste)}", ". Les ${axN(s.reste)}", "idem", 1)
c('page', 'Devis › aide', "• À la fin d’une intervention, si le technicien coche « Un autre passage est nécessaire », le devis se prépare tout seul avec les pièces notées.", "• En fin d’intervention, le technicien coche « Un autre passage est nécessaire ». Le devis se prépare tout seul, avec les pièces notées.", "une phrase de 27 mots coupée en deux", 1)
c('page', 'Devis › aide', "• Accepté et signé en ligne : l’intervention passe « à planifier » et la facture d’acompte, s’il y en a une, se prépare.", "• Quand le devis est accepté et signé en ligne, l’intervention passe « à planifier ». La facture d’acompte, s’il y en a une, se prépare.", "une phrase de 24 mots coupée en deux", 1)
c('page', 'Contrats › titre', "Tes contrats d’entretien avec tes clients : OP GESTION prépare", "Tes contrats d’entretien avec tes clients. OP GESTION prépare", "une phrase de 25 mots coupée en deux", 1)
c('page', 'Mon entreprise › horaires et tarifs', "Ta journée de travail, ton tarif et tes déplacements : le planning", "Ta journée de travail, ton tarif et tes déplacements. Le planning", "une phrase de 21 mots coupée en deux", 2)
c('page', 'Temps de travail › phrase du mois', "ttPl(B.sig, 'demande') + ' de correction à traiter'", "ttPl(B.sig, 'correction') + ' à traiter'", "une phrase de 24 mots ramenée à 22", 1)
c('page', 'Produits › photographier une facture', "Dans cette démonstration, le fichier est lu sur place", "Ici, le fichier est lu sur place", "« Ici » dit la même chose en un mot", 1)
c('page', 'Visite parlée (13 pas)', "Dans cette démonstration, ", "Ici, ", "la visite dit « Ici » pour « rien ne part vraiment » : plus court, sans mot de revue", 13)
c('page', 'Visite parlée › envoi', "Dans cette démonstration, l’envoi est simulé : je touche Envoyer.", "Ici, rien ne part vraiment : je touche Envoyer.", "« simulé » est un mot de revue", 1)
c('page', 'Visite parlée › réponse du client', "Dans cette démonstration, je simule sa réponse : je touche D’accord.", "Ici, je joue sa réponse : je touche D’accord.", "idem", 1)
c('page', 'Visite parlée › dictée', "Dans cette démonstration, la voix est simulée.", "Ici, la voix est remplacée par un texte écrit d’avance.", "idem", 1)
c('page', 'Visite parlée › chapitre Comptabilité', "Sa démonstration, et le retour", "Sa visite parlée, et le retour", "un seul mot : « visite »", 1)
c('page', 'Visite parlée › chapitre Comptabilité', "avec son menu et sa propre démonstration parlée, « La démo »", "avec son menu et sa propre visite parlée, « La démo »", "idem (« La démo » est le nom du bouton)", 1)
c('page', 'Visite parlée', "Je remets la démonstration comme avant.", "Je remets tout comme avant.", "un mot de revue en moins", 2)
c('page', 'Visite parlée › relance', "dans cette démonstration, rien ne part, mais elle est comptée", "ici, rien ne part, mais elle est comptée", "idem", 1)
c('page', 'Visite parlée › paiement', "dans cette démonstration, le client vient de payer", "ici, le client vient de payer", "idem", 1)
c('page', 'Visite parlée › fin', "du patron au client", "du gérant au client", "un seul nom pour la personne qui dirige : gérant", 1)
c('page', 'Visite parlée › fin', "choisis une personne en haut, patron, gestion, technicien ou client, et refais", "choisis une personne en haut (gérant, gestion, technicien ou client) et refais", "idem, et la liste se lit comme le sélecteur du haut", 1)
c('page', 'Sélecteur de rôle (haut de page, revue)', "patron:{ ic:'👔', l:'Patron', qui:'marc'", "patron:{ ic:'👔', l:'Gérant', qui:'marc'", "« Marc Leblanc · patron » dans la bulle de la visite devient « · gérant »", 1)
c('page', 'Visite parlée › devis xylophage', "Je dis si vous serez un ou deux techniciens sur place.", "Je dis s’il y aura un ou deux techniciens sur place.", "la visite tutoie ; « vous » était un oubli", 1)
c('page', 'Visite parlée › clients', "ce qu’il leur reste à payer, et le prochain passage. monsieur et madame Durand doivent", "ce qu’il leur reste à payer et le prochain passage. Monsieur et Madame Durand doivent", "une majuscule manquait en début de phrase", 1)
c('page', 'Visite parlée › planning', "Je clique sur Annuler.", "Je touche Annuler.", "« toucher » partout", 1)
c('page', 'Visite parlée › commande', "quand le fournisseur clique sur le lien, puis à livrée", "quand le fournisseur confirme par le lien, puis à livrée", "« toucher » et « confirmer » : le fournisseur n’a pas de doigt à poser", 1)

c('page', 'Visite parlée › statistiques', "Tu y lis ce que tu as facturé, ce que tu as encaissé, ce que valent tes devis", "Tu y lis ce que tu as facturé et encaissé, ce que valent tes devis", "une phrase de 24 mots ramenée à 19", 1)
c('page', 'Visite parlée › statistiques', "9 interventions faites, 33 pour cent de devis acceptés, et 20 jours pour être payé.", "9 interventions faites. Puis 33 pour cent de devis acceptés et 20 jours pour être payé.", "une phrase de 25 mots coupée en deux", 1)
c('page', 'Visite parlée › planning', "de 11 heures 30 à 12 heures 30, et le compteur « à planifier » est passé à 2.", "de 11 heures 30 à 12 heures 30. Le compteur « à planifier » est passé à 2.", "une phrase de 23 mots coupée en deux", 1)
c('page', 'Visite parlée › fiche d’intervention', "les appareils, les photos, puis les contrôles, le compte rendu", "les appareils et les photos. Puis les contrôles, le compte rendu", "une phrase de 26 mots coupée en deux", 1)
c('page', 'Visite parlée › clients', "ce qu’il a déjà payé, ce qu’il te doit, et la date de son prochain passage", "ce qu’il a payé, ce qu’il te doit et la date de son prochain passage", "une phrase de 23 mots ramenée à 21", 1)
c('page', 'Visite parlée › achats', "range ce qui est bientôt fini par fournisseur, avec la quantité déjà calculée sur ce que tu utilises.", "range ce qui est bientôt fini, fournisseur par fournisseur. La quantité est déjà calculée sur ce que tu utilises.", "une phrase de 24 mots coupée en deux", 1)
c('page', 'Visite parlée › temps de travail', "pour envoyer les heures à la paie, et UN seul bouton change avec la situation", "pour envoyer les heures à la paie. UN seul bouton change avec la situation", "une phrase de 23 mots coupée en deux", 1)
c('page', 'Visite parlée › véhicules', "arrive dans 12 jours, et l’assurance des 4 véhicules tient en une seule ligne.", "arrive dans 12 jours. L’assurance des 4 véhicules tient en une seule ligne.", "une phrase de 25 mots coupée en deux", 1)
c('page', 'Visite parlée › devis xylophage', "sur place, le logiciel calcule le prix, et le devis arrive dans la catégorie Devis.", "sur place. Le logiciel calcule le prix, et le devis arrive dans la catégorie Devis.", "une phrase de 24 mots coupée en deux", 1)
c('page', 'Visite parlée › retour au bureau', "Si Sophie ne peut vraiment pas finir, « Je ne peux pas finir » prévient le bureau et crée une intervention de retour.", "Si Sophie ne peut vraiment pas finir, elle touche « Je ne peux pas finir » : le bureau est prévenu et une intervention de retour est créée.", "une phrase de 23 mots coupée en deux", 1)
c('atelier', 'Atelier › listes de pourcentages (TVA, acompte, zoom)', "const VV_TVA=[[2000,'20 %'],[1000,'10 %']", "const VV_TVA=[[2000,'20 %'],[1000,'10 %']", "typographie : espace insécable avant « % », partout où la page l’écrit (55 endroits)", 1)
c('atelier', 'Atelier › textes d’aide', "autre client'} : écris", "autre client'} : écris", "typographie : espace insécable avant « : » et « ; » dans les clauses des contrats, les aides et les états vides", 1)
c('atelier', 'Atelier › tout le texte affiché', "boot();\n</script>", "boot();\n/* typographie française sur le texte AFFICHÉ", "la même typographie que le prototype passe sur ce que l’atelier écrit lui-même", 0)

c('page', 'Équipe › carte d’une personne', "'<span class=\"st st-p\">Admin</span>'", "'<span class=\"st st-p\">Administrateur</span>'", "« Admin » est une abréviation : le mot entier tient dans la pastille à 320 px", 2)
c('page', 'Statistiques › factures en retard', "En retard · éch. ${dAnnee(x.ech, x.d)}", "En retard · échéance ${dAnnee(x.ech, x.d)}", "« éch. » est une abréviation que personne ne dit", 1)
c('page', 'Statistiques › factures à payer', "À payer · éch. ${dAnnee(x.ech, x.d)}", "À payer · échéance ${dAnnee(x.ech, x.d)}", "idem", 1)

c('page', 'Temps de travail › phrase du mois', ", B.enCours && 'la semaine en cours, à valider une fois finie'].filter(Boolean);", "].filter(Boolean);   /* la semaine en cours se dit dans sa propre phrase", "la semaine en cours a sa propre phrase : cinq éléments dans une seule phrase dépassaient 30 mots", 1)

# jours des soldes de congés, dans une PHRASE : « 3 j aujourd’hui → 2 j après cette absence » devient « 3 jours … 2 jours … » ; les tuiles et tableaux gardent « j »
JOURS_PHRASES = ["Solde ${d.type === 'RTT'", "Il a déjà <b>${aNb(so.att", "j par rapport à sa demande", "j disponibles`", "Solde ${a.type === 'RTT'", "Ça dépasse ton solde de", "Ça dépasse son solde de", "Solde ${"]
def jours_phrases(s):
    import re
    ligne = re.compile(r"\$\{aNb\(((?:[^()]|\([^()]*\))*)\)\} j(?![a-zé])")
    out = []; n = 0
    for l in s.split('\n'):
        if 'aNb(' in l and any(m in l for m in JOURS_PHRASES) and 'class="as-b"' not in l and 'class="at-t"' not in l:
            l2 = ligne.sub(lambda m: '${aJ(' + m.group(1) + ')}', l); n += (l2 != l); l = l2
        out.append(l)
    s = '\n'.join(out)
    if 'const aJ = ' not in s:
        a = "const aNb = n => String(n).replace('.', ',');"
        assert a in s; s = s.replace(a, a + "\nconst aJ = n => aNb(n) + (Math.abs(n) >= 2 ? ' jours' : ' jour');   /* un nombre de jours dans une phrase, en toutes lettres : « 0,5 jour », « 3 jours » */", 1); n += 1
    return s, n

# « courriel » → « e-mail » : un seul mot pour un message électronique (le menu dit « Boîte mail », les autres écrans « e-mail »). Les articles suivent : le → l’, du → de l’, au → à l’, ce → cet.
def courriel_vers_email(s):
    import re
    n = 0
    def r(motif, rempl):
        nonlocal s, n
        s, k = re.subn(motif, rempl, s); n += k
    r(r"\b([Ll])e courriels?\b", lambda m: m.group(1) + "’e-mail" + ('s' if m.group(0).endswith('s') else ''))
    r(r"\bdu courriel\b", "de l’e-mail"); r(r"\bDu courriel\b", "De l’e-mail")
    r(r"\bau courriel\b", "à l’e-mail"); r(r"\bAu courriel\b", "À l’e-mail")
    r(r"\bce courriel\b", "cet e-mail"); r(r"\bCe courriel\b", "Cet e-mail"); r(r"\bCE courriel\b", "CET e-mail")
    r(r"(?<![A-Za-z])courriels\b", "e-mails"); r(r"(?<![A-Za-z])courriel\b", "e-mail")
    r(r"(?<![A-Za-z])Courriels\b", "E-mails"); r(r"(?<![A-Za-z])Courriel\b", "E-mail")
    r(r"\b([Dd])e (e-mails?)\b", lambda m: m.group(1) + "’" + m.group(2))
    return s, n
c('atelier', 'Devis et contrats › fiche de l’interlocuteur', "ch('mail','Courriel',", "ch('mail','E-mail',", "un seul mot pour un message électronique", 1)
c('atelier', 'Contrats › parties', "'Courriel : '+v(E.mail)", "'E-mail : '+v(E.mail)", "idem", 1)
c('atelier', 'Contrats › article de contact', "ou par courriel à {{email}}", "ou par e-mail à {{email}}", "idem", 1)
c('atelier', 'Contrats › interlocuteur', "Nom, fonction, téléphone et courriel", "Nom, fonction, téléphone et e-mail", "idem", 1)
c('atelier', 'Contrats › liste des articles', "const NOMS_AUTO={prixttc:'prix TTC',tva:'TVA'};", "const NOMS_AUTO={prixttc:'prix TTC',tva:'TVA',tel:'téléphone',email:'e-mail'};", "« [tel] », « [email] » : les blancs à remplir se lisent avec des mots, pas avec le nom de la variable", 1)
c('atelier', 'Contrats › résumé d’un article', "return v?'['+v.n+']':(k==='entreprise'?'le prestataire':'['+k+']') });", "return v?'['+v.n+']':(k==='entreprise'?'le prestataire':'['+(NOMS_AUTO[k]||k)+']') });", "« [prixttc] » : le résumé d’un article écrivait le nom de la variable", 1)
c('page', 'Comptabilité › Conformité', "« Prestation de services » est écrit sur tes factures : pour des travaux et de la main-d’œuvre, la TVA est due quand le client paie, sauf si tu as choisi de la payer « d’après les débits » (alors une mention de plus).", "« Prestation de services » est écrit sur tes factures. Pour des travaux et de la main-d’œuvre, la TVA est due quand le client paie. Si tu as choisi de la payer « d’après les débits », il y a alors une mention de plus.", "une phrase de 44 mots coupée en trois", 1)
c('page', 'Comptabilité › Conformité', "sont comptés ensemble : la plupart se vérifient tout seuls sur tes données (fiche, factures et leur PDF, banque, caisse, achats), les autres demandent ton attention.", "sont comptés ensemble. La plupart se vérifient tout seuls sur tes données (fiche, factures et leur PDF, banque, caisse, achats). Les autres demandent ton attention.", "une phrase de 41 mots coupée en trois", 1)
c('page', 'Comptabilité › Conformité', "à la suite du dernier numéro donné${dernier ? ` (le dernier : ${dernier.num})` : ''} ; une facture envoyée ne se modifie plus et ne s’efface pas : une erreur se corrige par un avoir.", "à la suite du dernier${dernier ? ` (${dernier.num})` : ''}. Une facture envoyée ne se modifie plus et ne se supprime pas : une erreur se corrige par un avoir.", "38 mots ; « efface » devient « supprime » (un seul mot)", 1)
c('page', 'Comptabilité › Conformité', "Au même moment, les montants et la TVA de tes ventes aux particuliers, et les dates de paiement de tes services, seront transmis à l’administration par ta plateforme (des totaux, pas le détail de chaque client).", "Au même moment, ta plateforme transmettra à l’administration les montants, la TVA et les dates de paiement de tes ventes aux particuliers. Ce sont des totaux, pas le détail de chaque client.", "36 mots coupés en deux", 1)
c('page', 'Comptabilité › TVA', "Une facture d’octobre payée en novembre compte en novembre ; une facture de septembre payée en octobre compte ici ; un acompte reçu sur place compte le jour où le technicien l’encaisse.", "Une facture d’octobre payée en novembre compte en novembre. Une facture de septembre payée en octobre compte ici. Un acompte reçu sur place compte le jour où le technicien l’encaisse.", "trois idées, trois phrases", 1)
c('page', 'Comptabilité › Conformité', "Une dette de plus de 1 000 € ne se paie pas en espèces quand le client vit en France, particulier ou professionnel, même en plusieurs fois : au-dessus, refuse les espèces.", "On ne paie pas en espèces une dette de plus de 1 000 €, même en plusieurs fois, quand le client vit en France (particulier ou professionnel). Au-dessus de ce montant, refuse les espèces.", "32 mots, et le verbe en tête", 1)
c('page', 'Comptabilité › Conformité', "'Aucun paiement en espèces au-dessus. '", "'Aucun paiement en espèces n’a dépassé ce plafond. '", "« refuse les espèces. Aucun paiement en espèces au-dessus. » se répétait", 1)
c('page', 'Comptabilité › Conformité', "Le taux réduit vaut pour des travaux dans un logement terminé depuis plus de deux ans : le devis ou la facture doit porter la mention prévue, certifiée par ton client.", "Le taux réduit vaut pour des travaux dans un logement terminé depuis plus de deux ans. Le devis ou la facture doit porter la mention prévue, certifiée par ton client.", "31 mots coupés en deux", 1)
c('page', 'Comptabilité › Conformité', "doit les rendre inaltérables, les sécuriser, les conserver et les archiver, et l’éditeur doit en fournir la preuve (certificat ou attestation).", "doit les rendre inaltérables, les sécuriser, les conserver et les archiver. L’éditeur doit en fournir la preuve (certificat ou attestation).", "30 mots coupés en deux", 1)
c('page', 'Comptabilité › Conformité', "Les grandes entreprises et les ETI t’en envoient déjà.", "Les grandes entreprises t’en envoient déjà.", "« ETI » : un sigle que l’artisan ne connaît pas", 1)
c('page', 'Comptabilité › Conformité', "(2026 pour une grande entreprise ou une ETI)", "(2026 pour une grande entreprise)", "« ETI » : un sigle que l’artisan ne connaît pas", 1)

def exemples_en_champ(s):
    # les exemples d'un champ s'écrivent TOUS « ex. … » (minuscule, pas de deux-points) : ils étaient écrits de trois façons (« Ex. : », « Ex. », « ex. »)
    import re
    s, a = re.subn(r'placeholder="Ex\. ?: ', 'placeholder="ex. ', s); s, b = re.subn(r'placeholder="Ex\. ', 'placeholder="ex. ', s)
    return s, a + b

def efface_vers_supprime(s):
    # « effacer » et « supprimer » disaient la même chose : on garde « supprimer » (« effacer une signature » reste : on gomme un dessin)
    import re
    n = 0
    for motif, rempl in [(r"Rien ne s’y efface", "Rien ne s’y supprime"), (r"[Rr]ien ne s’efface", lambda m: m.group(0)[0] + "ien ne se supprime"), (r"ni modifier ni effacer", "ni modifier ni supprimer"),
                         (r"pas en effaçant", "pas en supprimant"), (r"n’est effacé\b", "n’est supprimé"), (r"a été effacé de (ce|cet)\b", r"a été supprimé de \1")]:
        s, k = re.subn(motif, rempl, s); n += k
    return s, n

def par_mail(s):
    import re
    s, k = re.subn(r"\bpar mail\b", "par e-mail", s); return s, k
c('page', 'Temps de travail › Valider', "data-tt=\"areg\">Voir À régler ›</button>", "data-tt=\"areg\">Voir les points à régler ›</button>", "« Voir À régler » : une majuscule au milieu d’une phrase, et on ne sait pas ce qu’on va voir", 1)
c('page', 'Comptabilité › Par intervention', "Aucune pièce ni achat pour cette intervention. Dans la vraie version, la main-d’œuvre (heures pointées) s’ajoutera ici.", "Aucune pièce ni achat pour cette intervention.", "« Dans la vraie version… » : une promesse de développeur lue par un utilisateur", 1)
c('atelier', 'Devis › champ', 'placeholder="Ex. : pose d’une prise dédiée', 'placeholder="ex. pose d’une prise dédiée', "une seule façon d’écrire un exemple dans un champ", 1)
c('atelier', 'Devis › champ', 'placeholder="Par exemple : Merci de votre confiance', 'placeholder="ex. Merci de votre confiance', "idem", 1)
c('page', 'Planning › absence', "toast(`${tech(a.tech).nom} pendant son absence, et « Non assigné » pour réaffecter.`)", "toast(`Planning de ${tech(a.tech).nom} pendant son absence, avec la colonne « Non assigné » pour réaffecter.`)", "un début de phrase sans sujet : « Léa Roux pendant son absence, et… »", 1)
c('page', 'Absences › Télécharger le PDF', 'data-nom="Absences ${titre}.pdf"', 'data-nom="Absences ${String(titre).replace(/^Du /, \'du \')}.pdf"', "un nom de fichier n’a pas de majuscule au milieu : « Absences du 2 nov. au 15 nov. 2026.pdf »", 1)
c('page', 'Devis › aide', "ouvre ton devis en grand : tu choisis le client et le matériel du catalogue, tu écris le texte, tu vois la page se faire.", "ouvre ton devis en grand. Tu choisis le client et le matériel du catalogue, tu écris le texte, tu vois la page se faire.", "31 mots : deux phrases", 1)

def appliquer():
    lus = {}; res = []; manques = []
    for (f, ecran, avant, apres, raison, n) in [x for x in C if x]:
        p = os.path.join(RACINE, FICHIERS[f]); s = lus.get(p) or open(p, encoding='utf-8').read()
        k = s.count(avant)
        if k == 0:
            etat = 'déjà' if apres in s else 'ABSENT'
            if etat == 'ABSENT': manques.append((ecran, avant[:80]))
        elif k != n:
            etat = 'OCCURRENCES %d au lieu de %d' % (k, n); manques.append((ecran, etat))
        else:
            s = s.replace(avant, apres); etat = 'appliqué'
        lus[p] = s; res.append({ 'ecran': ecran, 'avant': avant, 'apres': apres, 'raison': raison, 'fichier': FICHIERS[f], 'etat': etat })
    p = os.path.join(RACINE, FICHIERS['page']); s = lus.get(p) or open(p, encoding='utf-8').read(); s, n = jours_phrases(s); lus[p] = s
    pe = os.path.join(RACINE, FICHIERS['page']); se = lus.get(pe) or open(pe, encoding='utf-8').read(); se, ke = exemples_en_champ(se); lus[pe] = se
    res.append({ 'ecran': 'Tous les champs › exemple', 'avant': '« Ex. : entretien climatisation » / « Ex. rappeler M. Durand »', 'apres': '« ex. entretien climatisation » / « ex. rappeler M. Durand »', 'raison': 'une seule façon d’écrire un exemple dans un champ', 'fichier': FICHIERS['page'], 'etat': 'appliqué (%d)' % ke if ke else 'déjà' })
    se2, kf = efface_vers_supprime(lus[pe]); lus[pe] = se2
    res.append({ 'ecran': 'Historique, Comptabilité, Sécurité › « efface »', 'avant': '« Rien ne s’y efface ni ne s’y modifie », « pas en effaçant », « effacé de ce téléphone »', 'apres': '« Rien ne s’y supprime ni ne s’y modifie », « pas en supprimant », « supprimé de ce téléphone »', 'raison': 'un seul mot pour faire disparaître : supprimer', 'fichier': FICHIERS['page'], 'etat': 'appliqué (%d)' % kf if kf else 'déjà' })
    pc0 = os.path.join(RACINE, FICHIERS['compta']); sc0 = lus.get(pc0) or open(pc0, encoding='utf-8').read(); sc0, k0 = par_mail(sc0); lus[pc0] = sc0
    res.append({ 'ecran': 'Comptabilité (cadre) › reçu par mail', 'avant': '« reçue par mail »', 'apres': '« reçue par e-mail »', 'raison': 'un seul mot : e-mail', 'fichier': FICHIERS['compta'], 'etat': 'appliqué (%d)' % k0 if k0 else 'déjà' })
    for cle in ('page', 'courrier'):
        pc = os.path.join(RACINE, FICHIERS[cle]); sc = lus.get(pc) or open(pc, encoding='utf-8').read(); sc, k = courriel_vers_email(sc); lus[pc] = sc
        res.append({ 'ecran': 'Tous les écrans (%s) › courriel' % cle, 'avant': '« Voir le courriel », « Confier ce courriel », « Courriels · 3 »', 'apres': '« Voir l’e-mail », « Confier cet e-mail », « E-mails · 3 »', 'raison': 'un seul mot pour un message électronique : « e-mail » (le menu dit « Boîte mail »)', 'fichier': FICHIERS[cle], 'etat': 'appliqué (%d)' % k if k else 'déjà' })
    res.append({ 'ecran': 'Absences et congés › soldes (phrases)', 'avant': '« 3 j aujourd’hui → 2 j après cette absence »', 'apres': '« 3 jours aujourd’hui → 2 jours après cette absence »', 'raison': 'les jours en toutes lettres dans une phrase ; les tuiles et tableaux gardent « j »', 'fichier': FICHIERS['page'], 'etat': 'appliqué (%d lignes)' % n if n else 'déjà' })
    for p, s in lus.items(): open(p, 'w', encoding='utf-8').write(s)
    return res, manques

if __name__ == '__main__':
    res, manques = appliquer()
    for r in res: print('%-9s %s' % (r['etat'], r['ecran']))
    chemin = os.path.join(os.path.dirname(__file__), 'mots.json')
    d = json.load(open(chemin)) if os.path.exists(chemin) else {}
    d['corrections'] = [{ k: r[k] for k in ('ecran', 'avant', 'apres', 'raison', 'fichier') } for r in res]
    json.dump(d, open(chemin, 'w'), ensure_ascii=False, indent=1)
    if manques: print('MANQUES :', manques); sys.exit(1)

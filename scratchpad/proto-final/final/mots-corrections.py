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

#!/usr/bin/env python3
# Fabrique le rapport scratchpad/proto-final/campagne/devis-atelier.json (une seule source : ce fichier). usage : python3 devis-atelier-rapport.py
import json, os, datetime
ICI = os.path.dirname(os.path.abspath(__file__))
R = {
 "partie": "devis-atelier",
 "date": "2026-11-17",
 "ecrans": [
  {"nom": "Liste des devis (4 chiffres, onglets, lignes, tâches liées)", "fonction": "vueDevis", "acces": "menu Clients et ventes › Devis ; barre du bas « Devis » ; #devis"},
  {"nom": "Fiche d'un devis (brouillon, en attente, accepté, refusé, expiré, remplacé)", "fonction": "vueDevisFiche", "acces": "toucher une ligne de la liste ; #devis-x-<numéro> ; lien « Ouvrir » des Tâches"},
  {"nom": "Fenêtre « Nouveau devis » (Devis rapide, client existant ou neuf)", "fonction": "dvNouveau / dvnCreer", "acces": "bouton « Devis rapide » ; fiche client"},
  {"nom": "Fenêtre « Dicter un devis »", "fonction": "dvDicter / dvdPreparer", "acces": "bouton « 🎙 Dicter un devis »"},
  {"nom": "Fenêtre « Envoyer le devis » / « Relancer le devis »", "fonction": "panneauEnvoi (dvEnvoyer, dvRelancer)", "acces": "fiche › « Aperçu et envoi » ou « Relancer »"},
  {"nom": "Fenêtre « Le client a répondu » (accord ou refus noté au bureau)", "fonction": "dvReponse", "acces": "fiche d'un devis en attente"},
  {"nom": "Fenêtre « Ce que voit le client » (case, nom, signature, refus)", "fonction": "dvClient", "acces": "fiche d'un devis en attente › « Ce que voit le client »"},
  {"nom": "Devis en grand (PDF) et PDF joint", "fonction": "docDevis / docPlein", "acces": "fiche › « Voir en grand », « Télécharger le PDF », « Envoyer par e-mail »"},
  {"nom": "Compositeur « Composer un devis » (atelier, en plein écran)", "fonction": "opdOuvrir + atelier (prototype-documents.html?app=1)", "acces": "bouton « Composer un devis » (Devis, fiche client)"},
  {"nom": "Éditeur de l'atelier, aperçu, « Ce que voit le client », envoi, signature", "fonction": "atelier (page.source)", "acces": "« Créer le devis » du compositeur ; toucher une ligne « Composés dans l'atelier »"},
  {"nom": "Liste « Composés dans l'atelier » et chiffres du haut qui les comptent", "fonction": "opdCarte / opdLigne / vueDevis", "acces": "sous la liste de Devis ; fiche client"},
  {"nom": "Compositeur « Composer un contrat » (le chemin, pas l'atelier)", "fonction": "opdOuvrir('contrat')", "acces": "Contrats › « Composer un contrat »"},
 ],
 "couverture": {},
 "nonCouvert": [],
 "defauts": [],
}
def d(n, gravite, ecran, role, profils, etapes, attendu, constate, preuve, ou, correction, decision="corriger", zone=None):
    x = {"n": "devis-atelier-%02d" % n, "gravite": gravite, "ecran": ecran, "role": role, "profils": profils, "etapes": etapes, "attendu": attendu,
         "constate": constate, "preuve": preuve, "ou": ou, "correction": correction, "decision": decision}
    if zone: x["zone"] = zone
    R["defauts"].append(x)
exec(open(os.path.join(ICI, "devis-atelier-defauts.py"), encoding="utf-8").read())
exec(open(os.path.join(ICI, "devis-atelier-couverture.py"), encoding="utf-8").read())
with open(os.path.join(ICI, "..", "devis-atelier.json"), "w", encoding="utf-8") as f:
    json.dump(R, f, ensure_ascii=False, indent=1)
print("rapport écrit :", len(R["defauts"]), "défauts")

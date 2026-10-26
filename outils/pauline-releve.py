#!/usr/bin/env python3
"""LE RELEVÉ DE PAULINE (25 octobre 2026) — lit la base de Harvey et envoie un instantané à la Tour de TeamOP.

Pauline = Harvey (https://github.com/ethanplusai/harvey + le correctif français de TeamOP), qui tourne sur ce Mac. Ce script ne la pilote
pas : il LIT sa base SQLite (lecture seule), fabrique un relevé (le contrat est écrit en tête de `server/pauline.js`) et l'envoie par HTTPS à
https://api.teamop.fr/api/pauline/releve. Chaque relevé REMPLACE le précédent : rien ne s'accumule côté serveur.

Python 3 standard, AUCUNE dépendance (ni PyYAML, ni requests) : il se lance avec le Python du venv de Harvey ou n'importe quel python3.

  python3 pauline-releve.py --essai              affiche le relevé, n'envoie RIEN, ne lit pas le jeton
  python3 pauline-releve.py                      lit la base, envoie le relevé (jeton lu dans ~/harvey/.env)
  python3 pauline-releve.py --fabriquer-jeton    fabrique le jeton, le range dans .env (droits 600) et n'imprime QUE son empreinte SHA-256

⛔ LE JETON EST UN SECRET : il vit dans `.env` (clé TEAMOP_RELEVE_JETON) et nulle part ailleurs. Ce script ne l'imprime jamais, ne l'écrit dans aucun
journal, et le met dans l'en-tête d'une requête HTTPS (jamais dans l'adresse). Le serveur ne connaît que son empreinte SHA-256, qui n'est pas un secret.
⛔ Aucune donnée de prospect ne va dans les messages d'erreur ni dans le journal : des NOMBRES, des noms de fichiers, rien d'autre.

Codes de sortie : 0 tout va bien · 1 erreur imprévue · 2 réglage manquant (jeton, adresse) · 3 base de Harvey introuvable ou illisible
                  4 serveur injoignable (réseau) · 5 le serveur a refusé le relevé (jeton, forme, trop lourd, trop de relevés, pont fermé).
"""
import argparse
import hashlib
import json
import os
import re
import secrets
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

VERSION = 1
URL_DEFAUT = "https://api.teamop.fr/api/pauline/releve"
CLE_JETON = "TEAMOP_RELEVE_JETON"
GARDE_JOURS = 90
MAX = {"entreprises": 500, "courriels": 300, "recherches": 100, "reponses": 300}
TAILLE_CIBLE = 900_000   # octets : sous 1 Mo, le plafond par défaut de nginx — le serveur, lui, accepte 2 Mo

OK, ERREUR, REGLAGE, BASE, RESEAU, REFUS = 0, 1, 2, 3, 4, 5


class Sortie(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


# ── le temps ─────────────────────────────────────────────────────────────────────────────────────────────────────
def lire_heure(valeur):
    """Un horodatage de Harvey (UTC naïf, 'AAAA-MM-JJ HH:MM:SS' ou ISO avec 'T') → datetime UTC conscient, ou None."""
    if not valeur or not isinstance(valeur, str):
        return None
    v = valeur.strip().replace(" ", "T", 1)
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    try:
        d = datetime.fromisoformat(v)
    except ValueError:
        return None
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)


def iso(d):
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if d else None


# ── les réglages (harvey.local.yaml gagne sur harvey.yaml) — lecture minimale, sans PyYAML ────────────────────────
def _sans_commentaire(valeur):
    sortie, guillemet = [], None
    for i, c in enumerate(valeur):
        if guillemet:
            if c == guillemet:
                guillemet = None
        elif c in "\"'":
            guillemet = c
        elif c == "#" and (i == 0 or valeur[i - 1] in " \t"):
            break
        sortie.append(c)
    return "".join(sortie).strip().strip("\"'").strip()


def lire_cles_yaml(texte):
    """{'channels.email.warmup.start_date': '2099-12-31', ...} — seulement les clés à valeur simple. Suffit pour la chauffe."""
    pile, resultat = [], {}
    for ligne in texte.splitlines():
        m = re.match(r"^(\s*)([A-Za-z0-9_]+):\s*(.*)$", ligne)
        if not m or ligne.lstrip().startswith("#"):
            continue
        retrait, cle, reste = len(m.group(1)), m.group(2), _sans_commentaire(m.group(3))
        while pile and pile[-1][0] >= retrait:
            pile.pop()
        if reste == "":
            pile.append((retrait, cle))
        else:
            resultat[".".join([p[1] for p in pile] + [cle])] = reste
    return resultat


def entier_ou(valeur, defaut):
    try:
        return int(str(valeur).strip())
    except (TypeError, ValueError):
        return defaut


def calculer_chauffe(cles, aujourdhui):
    """Recalcule ce que fait `cold_daily_cap` de Harvey (config.py) : la rampe de courriels à froid, bornée par max_daily_sends."""
    plafond_max = entier_ou(cles.get("channels.email.max_daily_sends"), 50)
    base = "channels.email.warmup."
    debut = cles.get(base + "start_date", "").strip()
    min_jours = entier_ou(cles.get(base + "min_days"), 14)
    depart = entier_ou(cles.get(base + "start_sends"), 5)
    pas = entier_ou(cles.get(base + "daily_increase"), 3)
    try:
        d0 = date.fromisoformat(debut[:10]) if debut else None
    except ValueError:
        d0 = None
    if d0 is None:
        return {"debut": None, "jour": None, "plafondDuJour": plafond_max, "plafondMax": plafond_max, "phase": "sans_rampe"}
    jours = (aujourdhui - d0).days
    if jours < 0:
        phase, cap = "verrou", 0
    elif jours < min_jours:
        phase, cap = "chauffe", 0
    else:
        cap = min(plafond_max, depart + (jours - min_jours) * pas)
        phase = "rodee" if cap >= plafond_max else "chauffe"
    return {"debut": d0.isoformat(), "jour": jours, "plafondDuJour": cap, "plafondMax": plafond_max, "phase": phase}


# ── la base de Harvey (lecture seule) ────────────────────────────────────────────────────────────────────────────
def ouvrir_base(chemin):
    if not Path(chemin).is_file():
        raise Sortie(BASE, "base de Harvey introuvable : " + str(chemin))
    try:
        # mode=ro : on ne peut rien écrire ; query_only le redit à SQLite. Harvey écrit en mode WAL : la lecture ne le gêne pas.
        base = sqlite3.connect("file:" + urllib.parse.quote(str(chemin)) + "?mode=ro", uri=True, timeout=30)
        base.execute("PRAGMA query_only = ON")
        base.row_factory = sqlite3.Row
        base.execute("SELECT 1 FROM sqlite_master LIMIT 1").fetchall()
    except sqlite3.Error as e:
        raise Sortie(BASE, "base de Harvey illisible (" + type(e).__name__ + ")")
    return base


def tables(base):
    return {r[0] for r in base.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def lignes(base, ts, requete, params=()):
    """Les lignes d'une table, ou [] si la table n'existe pas encore (base de Harvey neuve)."""
    return [dict(r) for r in base.execute(requete, params)] if ts else []


RANG = {"trouvee": 0, "courriel_pret": 1, "envoye": 2, "a_repondu": 3, "refus": 4}
ATTENTE = {"pending_review", "approved", "sending", "queued"}
REFUSE = {"rejected", "cancelled", "failed"}
INTENT_NATURE = {"interested": "interesse", "not_interested": "refus", "unsubscribe": "refus", "question": "question", "objection": "question"}


def reduire(texte, n):
    return re.sub(r"\s+", " ", texte or "").strip()[:n]


def resume_reponse(contenu):
    """Le début de la réponse du prospect, sans les lignes citées (« > … ») : ce n'est pas un résumé, et le relevé le dit (voir le contrat)."""
    propres = [l for l in (contenu or "").splitlines() if not l.lstrip().startswith(">")]
    return reduire(" ".join(propres), 280)


def thread(valeur):
    try:
        t = json.loads(valeur or "[]")
    except (TypeError, ValueError):
        return []
    return [m for m in t if isinstance(m, dict)] if isinstance(t, list) else []


def fabriquer_releve(base, cles_yaml, maintenant=None, aujourdhui=None):
    """Le relevé (dict) d'après la base ouverte. `maintenant` : datetime UTC conscient (le banc le fixe)."""
    maintenant = maintenant or datetime.now(timezone.utc)
    local = maintenant.astimezone()
    aujourdhui = aujourdhui or local.date()
    minuit = local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    limite = maintenant - timedelta(days=GARDE_JOURS)
    jour_limite = limite.strftime("%Y-%m-%d")     # comparaison sur les 10 premiers caractères : vaut pour 'T' comme pour ' '
    ts = tables(base)
    a = lambda nom: nom in ts

    societes = {r["id"]: r for r in lignes(base, a("companies"), "SELECT id, name, industry, location, created_at, updated_at FROM companies")}
    prospects = {r["id"]: r for r in lignes(base, a("prospects"),
        "SELECT id, company_id, first_name, last_name, email, status, source, company, industry, updated_at, created_at FROM prospects")}
    boite = lignes(base, a("outbox"),
        "SELECT id, prospect_id, step, kind, subject, body, status, sent_at, created_at, updated_at FROM outbox "
        "WHERE substr(COALESCE(sent_at, created_at), 1, 10) >= ? OR status IN ('pending_review','approved','sending') ORDER BY created_at DESC", (jour_limite,))
    boite_tout = lignes(base, a("outbox"), "SELECT prospect_id, status, kind FROM outbox")
    conversations = lignes(base, a("conversations"), "SELECT id, prospect_id, intent, thread_json, updated_at FROM conversations")

    def cle_entreprise(pid):
        """L'identifiant d'entreprise d'un prospect : le sien, ou « p-<prospect> » quand la base n'en a pas (prospect sans fiche d'entreprise)."""
        p = prospects.get(pid)
        if not p:
            return ""
        return p["company_id"] if p["company_id"] in societes else "p-" + p["id"]

    # ── les réponses reçues (messages du prospect dans les conversations) ──
    reponses, reponse_par_prospect, vues_aujourdhui = [], {}, 0
    for c in conversations:
        msgs = [m for m in thread(c["thread_json"]) if m.get("sender") == "prospect"]
        for i, m in enumerate(msgs):
            quand = lire_heure(str(m.get("timestamp") or "")) or lire_heure(c["updated_at"])
            if not quand:
                continue
            reponse_par_prospect.setdefault(c["prospect_id"], []).append(quand)
            if quand >= minuit:
                vues_aujourdhui += 1
            if quand < limite:
                continue
            nature = INTENT_NATURE.get(c["intent"] or "", "autre") if i == len(msgs) - 1 else "autre"
            reponses.append({"entrepriseId": cle_entreprise(c["prospect_id"]), "quand": iso(quand), "resume": resume_reponse(str(m.get("content") or "")), "nature": nature})
    reponses.sort(key=lambda r: r["quand"], reverse=True)

    refus_conv = {c["prospect_id"] for c in conversations if (c["intent"] or "") in ("not_interested", "unsubscribe")}

    # ── l'état de chaque entreprise : le plus avancé de ses prospects ──
    etat = {}
    def monter(cle, e):
        if cle and RANG[e] > RANG.get(etat.get(cle, "trouvee"), 0):
            etat[cle] = e
    for cle in list(societes) + [cle_entreprise(pid) for pid in prospects if cle_entreprise(pid).startswith("p-")]:
        etat.setdefault(cle, "trouvee")
    for p in prospects.values():
        cle = cle_entreprise(p["id"])
        if p["status"] == "opted_out" or p["id"] in refus_conv:
            monter(cle, "refus")
        elif p["status"] in ("replied", "meeting", "closed") or p["id"] in reponse_par_prospect:
            monter(cle, "a_repondu")
        elif p["status"] == "contacted":
            monter(cle, "envoye")
    for o in boite_tout:
        cle = cle_entreprise(o["prospect_id"])
        if o["status"] == "sent":
            monter(cle, "envoye")
        elif o["status"] in ATTENTE:
            monter(cle, "courriel_pret")

    # ── les entreprises (les 500 les plus récemment touchées) ──
    touche = {}
    def toucher(cle, valeur):
        d = lire_heure(valeur)
        if cle and d and (cle not in touche or d > touche[cle]):
            touche[cle] = d
    for s in societes.values():
        toucher(s["id"], s["updated_at"] or s["created_at"])
    for p in prospects.values():
        toucher(cle_entreprise(p["id"]), p["updated_at"] or p["created_at"])
    for o in boite:
        toucher(cle_entreprise(o["prospect_id"]), o["updated_at"] or o["created_at"])
    meilleur = {}
    for p in prospects.values():
        cle = cle_entreprise(p["id"])
        rang = (RANG.get(etat.get(cle), 0), str(p["updated_at"] or ""))
        if cle not in meilleur or rang > meilleur[cle][0]:
            meilleur[cle] = (rang, p)
    entreprises = []
    for cle, e in etat.items():
        s = societes.get(cle)
        p = meilleur.get(cle, (None, None))[1]
        d = touche.get(cle) or lire_heure((s or {}).get("created_at")) or limite
        fiche = {"id": cle, "nom": reduire((s or {}).get("name") or (p or {}).get("company"), 200) or "(sans nom)",
                 "ville": reduire((s or {}).get("location"), 120), "metier": reduire((s or {}).get("industry") or (p or {}).get("industry"), 120),
                 "etat": e, "majLe": iso(d)}
        if p:
            if "@" in (p["email"] or ""):
                fiche["email"] = p["email"].strip().lower()
            if p["source"] != "company_inbox":
                nom = reduire(((p["first_name"] or "") + " " + (p["last_name"] or "")), 120)
                if nom:
                    fiche["contact"] = nom
        entreprises.append(fiche)
    entreprises.sort(key=lambda f: f["majLe"], reverse=True)
    entreprises = entreprises[:MAX["entreprises"]]

    # ── les courriels ──
    courriels = []
    for o in boite:
        quand = lire_heure(o["sent_at"]) if o["status"] == "sent" else None
        quand = quand or lire_heure(o["created_at"])
        if not quand:
            continue
        if o["status"] == "sent":
            e = "repondu" if any(r > quand for r in reponse_par_prospect.get(o["prospect_id"], [])) else "envoye"
        elif o["status"] in REFUSE:
            e = "refuse"
        else:
            e = "en_attente"
        courriels.append({"id": o["id"], "entrepriseId": cle_entreprise(o["prospect_id"]), "etat": e, "objet": reduire(o["subject"], 300),
                          "texte": (o["body"] or "")[:6000], "quand": iso(quand), "genre": "reponse" if o["kind"] == "reply" else "sequence",
                          "etape": int(o["step"] or 0), "statutBrut": reduire(o["status"], 40)})
    courriels.sort(key=lambda c: c["quand"], reverse=True)
    courriels = courriels[:MAX["courriels"]]

    # ── les recherches : une ligne par (exécution, métier, ville) ; le métier et la ville se déduisent des entreprises rattachées ──
    recherches = []
    for r in lignes(base, a("runs"), "SELECT id, records, started_at FROM runs WHERE stage = 'discover' AND substr(started_at, 1, 10) >= ?", (jour_limite,)):
        quand = lire_heure(r["started_at"])
        if not quand:
            continue
        groupes = lignes(base, a("observations") and a("companies"),
            "SELECT c.industry AS metier, c.location AS ville, COUNT(DISTINCT c.id) AS n FROM observations o JOIN companies c ON c.id = o.company_id "
            "WHERE o.run_id = ? GROUP BY c.industry, c.location ORDER BY n DESC LIMIT 10", (r["id"],))
        if groupes:
            for g in groupes:
                recherches.append({"quand": iso(quand), "metier": reduire(g["metier"], 120), "ville": reduire(g["ville"], 120), "trouvees": int(g["n"]), "origine": "decouverte"})
        else:
            recherches.append({"quand": iso(quand), "metier": "", "ville": "", "trouvees": int(r["records"] or 0), "origine": "decouverte"})
    for r in lignes(base, a("actions"), "SELECT details_json, created_at FROM actions WHERE action_type = 'prospect' AND agent = 'scout' AND substr(created_at, 1, 10) >= ?", (jour_limite,)):
        try:
            n = int(json.loads(r["details_json"] or "{}").get("prospects_found") or 0)
        except (TypeError, ValueError, AttributeError):
            n = 0
        quand = lire_heure(r["created_at"])
        if n > 0 and quand:
            recherches.append({"quand": iso(quand), "metier": "", "ville": "", "trouvees": n, "origine": "cycle"})
    recherches.sort(key=lambda r: r["quand"], reverse=True)
    recherches = recherches[:MAX["recherches"]]

    # ── les chiffres du jour (le jour LOCAL de ce Mac : c'est celui que Harvey compte pour son plafond à froid) ──
    envoyes = envoyes_froid = 0
    for o in boite:
        if o["status"] == "sent":
            d = lire_heure(o["sent_at"])
            if d and d >= minuit:
                envoyes += 1
                envoyes_froid += 1 if o["kind"] == "sequence" else 0
    refus_jour = 0
    for r in lignes(base, a("actions"), "SELECT created_at FROM actions WHERE action_type = 'opt_out' AND substr(created_at, 1, 10) >= ?", (jour_limite,)):
        d = lire_heure(r["created_at"])
        refus_jour += 1 if d and d >= minuit else 0
    en_attente = sum(1 for o in boite if o["status"] == "pending_review")

    return {"version": VERSION, "genereLe": iso(maintenant), "chauffe": calculer_chauffe(cles_yaml, aujourdhui),
            "jour": {"date": aujourdhui.isoformat(), "envoyes": envoyes, "envoyesFroid": envoyes_froid, "reponses": vues_aujourdhui, "refus": refus_jour, "enAttente": en_attente},
            "recherches": recherches, "entreprises": entreprises, "courriels": courriels, "reponses": reponses[:MAX["reponses"]]}


def alleger(releve):
    """Sous 900 Ko : raccourcit les textes des courriels, puis retire les plus anciens. Le serveur accepte 2 Mo, mais un proxy par défaut coupe à 1 Mo."""
    def taille():
        return len(json.dumps(releve, ensure_ascii=False).encode("utf-8"))
    for n in (2000, 800, 300):
        if taille() <= TAILLE_CIBLE:
            return releve
        for c in releve["courriels"]:
            c["texte"] = c["texte"][:n]
    while taille() > TAILLE_CIBLE and releve["courriels"]:
        releve["courriels"] = releve["courriels"][: max(0, len(releve["courriels"]) - 20)]
    return releve


# ── le jeton (.env) ──────────────────────────────────────────────────────────────────────────────────────────────
def lire_env(chemin):
    valeurs = {}
    try:
        texte = Path(chemin).read_text(encoding="utf-8")
    except OSError:
        return valeurs
    for ligne in texte.splitlines():
        m = re.match(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$", ligne)
        if m and not ligne.lstrip().startswith("#"):
            v = m.group(2)
            valeurs[m.group(1)] = v[1:-1] if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'" else v
    return valeurs


def fabriquer_jeton(env, remplacer=False):
    """Écrit un jeton neuf dans .env (droits 600) et rend son EMPREINTE SHA-256 — jamais le jeton. Refuse d'écraser un jeton existant sans `remplacer`."""
    chemin = Path(env)
    texte = chemin.read_text(encoding="utf-8") if chemin.exists() else ""
    deja = re.search(r"^\s*(?:export\s+)?" + CLE_JETON + r"\s*=", texte, re.M)
    if deja and not remplacer:
        raise Sortie(REGLAGE, CLE_JETON + " existe déjà dans " + str(chemin) + " : rien n'a été changé (ajoutez --remplacer pour en fabriquer un neuf — il faudra alors poser sa nouvelle empreinte sur le serveur).")
    jeton = secrets.token_hex(32)
    if deja:
        texte = "\n".join(l for l in texte.splitlines() if not re.match(r"^\s*(?:export\s+)?" + CLE_JETON + r"\s*=", l))
    texte = texte + ("" if not texte or texte.endswith("\n") else "\n") + CLE_JETON + "=" + jeton + "\n"
    temporaire = chemin.with_name(chemin.name + ".tmp")
    fd = os.open(str(temporaire), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(texte)
    os.replace(str(temporaire), str(chemin))
    os.chmod(str(chemin), 0o600)
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()


# ── l'envoi ──────────────────────────────────────────────────────────────────────────────────────────────────────
def adresse_permise(url):
    p = urllib.parse.urlparse(url)
    if p.scheme == "https":
        return True
    return p.scheme == "http" and p.hostname in ("127.0.0.1", "localhost", "::1")   # le banc d'essai seulement : jamais un jeton en clair sur Internet


def envoyer(url, jeton, releve):
    corps = json.dumps(releve, ensure_ascii=False).encode("utf-8")
    requete = urllib.request.Request(url, data=corps, method="POST", headers={
        "Content-Type": "application/json; charset=utf-8", "Authorization": "Bearer " + jeton, "User-Agent": "pauline-releve/" + str(VERSION)})
    try:
        with urllib.request.urlopen(requete, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read().decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            j = {}
        return e.code, j if isinstance(j, dict) else {}
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        raise Sortie(RESEAU, "serveur injoignable (" + type(e).__name__ + ") — le relevé sera renvoyé au prochain passage")


MOTIFS_REFUS = {
    401: "le serveur refuse le jeton : son empreinte n'est pas (ou plus) celle posée sur le VPS",
    400: "le serveur a refusé la forme du relevé",
    413: "le relevé est trop lourd pour le serveur",
    429: "trop de relevés envoyés à la suite : attendez une minute",
    503: "le pont n'est pas encore ouvert sur le serveur (empreinte du jeton non posée)",
}


def principal(argv=None):
    ap = argparse.ArgumentParser(description="Envoie à la Tour de TeamOP ce que fait Pauline (Harvey).")
    ap.add_argument("--essai", action="store_true", help="affiche le relevé, n'envoie rien, ne lit pas le jeton")
    ap.add_argument("--harvey", default=None, help="dossier de Harvey (défaut : le dossier courant, sinon ~/harvey)")
    ap.add_argument("--base", default=None, help="chemin de la base SQLite (défaut : <harvey>/data/harvey.db)")
    ap.add_argument("--url", default=URL_DEFAUT, help="adresse du serveur (https obligatoire)")
    ap.add_argument("--fabriquer-jeton", action="store_true", help="fabrique le jeton dans .env et imprime son empreinte SHA-256")
    ap.add_argument("--remplacer", action="store_true", help="avec --fabriquer-jeton : remplace un jeton existant")
    a = ap.parse_args(argv)

    dossier = Path(a.harvey).expanduser() if a.harvey else (Path.cwd() if (Path.cwd() / "data" / "harvey.db").exists() or (Path.cwd() / ".env").exists() else Path.home() / "harvey")
    env = dossier / ".env"
    if a.fabriquer_jeton:
        empreinte = fabriquer_jeton(env, a.remplacer)
        print("Jeton rangé dans " + str(env) + " (droits 600). Il n'est affiché nulle part.")
        print("Empreinte SHA-256 à poser sur le serveur (ce n'est pas un secret) :")
        print(empreinte)
        return OK

    chemin_base = Path(a.base).expanduser() if a.base else dossier / "data" / "harvey.db"
    reglages = ""
    for nom in ("harvey.local.yaml", "harvey.yaml"):
        if (dossier / nom).is_file():
            reglages = (dossier / nom).read_text(encoding="utf-8")
            break
    if not reglages:
        print("Attention : ni harvey.local.yaml ni harvey.yaml dans " + str(dossier) + " — la chauffe est calculée avec les valeurs d'origine de Harvey.", file=sys.stderr)
    if not a.essai and not adresse_permise(a.url):
        raise Sortie(REGLAGE, "l'adresse doit être en https:// (le jeton ne voyage jamais en clair)")
    jeton = ""
    if not a.essai:
        jeton = lire_env(env).get(CLE_JETON, "").strip()
        if len(jeton) < 32:
            raise Sortie(REGLAGE, CLE_JETON + " absent (ou trop court) dans " + str(env) + " — voir PAULINE-RELEVE.md, étape « fabriquer le jeton »")

    base = ouvrir_base(chemin_base)
    try:
        releve = alleger(fabriquer_releve(base, lire_cles_yaml(reglages)))
    except sqlite3.Error as e:
        raise Sortie(BASE, "lecture de la base de Harvey impossible (" + type(e).__name__ + ")")
    finally:
        base.close()
    r = releve
    resume = "%d entreprise(s), %d courriel(s), %d recherche(s), %d réponse(s) · aujourd'hui : %d envoyé(s), %d en attente" % (
        len(r["entreprises"]), len(r["courriels"]), len(r["recherches"]), len(r["reponses"]), r["jour"]["envoyes"], r["jour"]["enAttente"])
    if a.essai:
        print(json.dumps(releve, ensure_ascii=False, indent=2))
        print("Essai : rien n'a été envoyé. " + resume, file=sys.stderr)
        return OK
    code, rep = envoyer(a.url, jeton, releve)
    if code == 200 and rep.get("ok"):
        print("Relevé envoyé : " + resume)
        return OK
    motif = MOTIFS_REFUS.get(code) or "réponse inattendue du serveur (code " + str(code) + ")"
    detail = rep.get("motif") if code == 400 and isinstance(rep.get("motif"), str) else ""
    raise Sortie(REFUS, motif + (" — " + detail[:120] if detail else ""))


if __name__ == "__main__":
    try:
        sys.exit(principal())
    except Sortie as s:
        print("Pauline — relevé : " + s.message, file=sys.stderr)
        sys.exit(s.code)
    except Exception as e:   # jamais de trace : elle pourrait citer une ligne de la base
        print("Pauline — relevé : erreur imprévue (" + type(e).__name__ + ")", file=sys.stderr)
        sys.exit(ERREUR)

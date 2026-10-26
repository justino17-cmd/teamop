#!/usr/bin/env python3
"""Le banc Python de `outils/pauline-releve.py` (25 octobre 2026) — lancé par `tests/test-3020.js`, qui sait aussi s'en servir comme FABRIQUE de fausse base :
    python3 tests/pauline-releve-test.py --construire DOSSIER   fabrique DOSSIER/data/harvey.db (au schéma de Harvey, mode WAL), harvey.local.yaml et .env
    python3 tests/pauline-releve-test.py                        joue les contrôles (unittest) et sort 0 / 1

La fausse base reprend les tables et colonnes de `harvey/state.py` (commit fed8cb2) que le script lit, rien de plus. Les jetons de ce banc sont des SENTINELLES : on cherche
qu'elles ne sortent jamais, ni sur la sortie standard ni sur l'erreur."""
import sys
sys.dont_write_bytecode = True   # importer le script ne doit rien laisser dans outils/
import hashlib
import http.server
import importlib.util
import json
import os
import re
import sqlite3
import stat
import subprocess
import sys
import tempfile
import threading
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SCRIPT = RACINE / "outils" / "pauline-releve.py"
JETON = "SENTINELLE" + "ab12cd34ef56" * 5          # 70 caractères, reconnaissable
ENTREPRISE_SECRETE = "Nettoyage Zébulon-3020"       # un nom de prospect : il ne doit JAMAIS sortir en dehors du relevé

SCHEMA = """
CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT DEFAULT '', domain TEXT DEFAULT '', website TEXT DEFAULT '', description TEXT DEFAULT '', industry TEXT DEFAULT '',
  company_size TEXT DEFAULT '', location TEXT DEFAULT '', source TEXT DEFAULT '', source_url TEXT DEFAULT '', notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE prospects (id TEXT PRIMARY KEY, company_id TEXT DEFAULT '', first_name TEXT DEFAULT '', last_name TEXT DEFAULT '', email TEXT DEFAULT '', email_verified INTEGER DEFAULT 0,
  phone TEXT DEFAULT '', phone_verified INTEGER DEFAULT 0, linkedin_url TEXT DEFAULT '', title TEXT DEFAULT '', seniority TEXT DEFAULT '', department TEXT DEFAULT '',
  source TEXT DEFAULT '', source_url TEXT DEFAULT '', status TEXT DEFAULT 'new', score INTEGER DEFAULT 0, personalization_notes TEXT DEFAULT '', company TEXT DEFAULT '',
  industry TEXT DEFAULT '', company_size TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, email_status TEXT DEFAULT '');
CREATE TABLE conversations (id TEXT PRIMARY KEY, prospect_id TEXT, campaign_id TEXT DEFAULT '', channel TEXT DEFAULT 'email', thread_json TEXT DEFAULT '[]', intent TEXT DEFAULT '',
  stage TEXT DEFAULT 'initial_outreach', status TEXT DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE actions (id TEXT PRIMARY KEY, action_type TEXT, agent TEXT, details_json TEXT DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE outbox (id TEXT PRIMARY KEY, campaign_id TEXT DEFAULT '', prospect_id TEXT DEFAULT '', conversation_id TEXT DEFAULT '', step INTEGER DEFAULT 1, kind TEXT DEFAULT 'sequence',
  to_email TEXT DEFAULT '', subject TEXT DEFAULT '', body TEXT DEFAULT '', status TEXT DEFAULT 'pending_review', send_at TIMESTAMP, sent_at TIMESTAMP, provider TEXT DEFAULT '',
  message_id TEXT DEFAULT '', thread_ref TEXT DEFAULT '', in_reply_to TEXT DEFAULT '', error TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, approved_by TEXT DEFAULT '');
CREATE TABLE observations (id TEXT PRIMARY KEY, company_id TEXT DEFAULT '', prospect_id TEXT DEFAULT '', signal_code TEXT NOT NULL, collector TEXT DEFAULT '', value_num REAL,
  value_text TEXT DEFAULT '', confidence REAL DEFAULT 1.0, evidence_url TEXT DEFAULT '', observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, run_id TEXT DEFAULT '');
CREATE TABLE runs (id TEXT PRIMARY KEY, stage TEXT DEFAULT '', status TEXT DEFAULT 'running', provider TEXT DEFAULT '', records INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0,
  params_json TEXT DEFAULT '{}', error TEXT DEFAULT '', started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ended_at TIMESTAMP);
"""


def h(delta_heures=0, t="T"):
    """Un horodatage de Harvey (UTC naïf) à `delta_heures` d'ici : ISO avec 'T' (le code de Harvey) ou 'AAAA-MM-JJ HH:MM:SS' (CURRENT_TIMESTAMP de SQLite)."""
    d = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=delta_heures)
    return d.isoformat() if t == "T" else d.strftime("%Y-%m-%d %H:%M:%S")


def ce_matin(secondes, t="T"):
    """Un horodatage de CE JOUR (le jour local de la machine), `secondes` après minuit — jamais « il y a trois minutes » : lancé à 00 h 01, le banc comptait hier."""
    minuit = datetime.now().astimezone().replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
    d = minuit + timedelta(seconds=secondes)
    return d.isoformat() if t == "T" else d.strftime("%Y-%m-%d %H:%M:%S")


def construire(dossier):
    dossier = Path(dossier)
    (dossier / "data").mkdir(parents=True, exist_ok=True)
    chemin = dossier / "data" / "harvey.db"
    if chemin.exists():
        chemin.unlink()
    b = sqlite3.connect(str(chemin))
    b.execute("PRAGMA journal_mode = WAL")
    b.executescript(SCHEMA)
    ins = lambda table, **c: b.execute("INSERT INTO %s (%s) VALUES (%s)" % (table, ",".join(c), ",".join("?" * len(c))), list(c.values()))
    ins("companies", id="c-trouvee", name="Propreté Rochelaise", industry="nettoyage", location="La Rochelle", created_at=h(-5), updated_at=h(-5))
    ins("companies", id="c-pret", name=ENTREPRISE_SECRETE, industry="dératisation", location="Niort", created_at=h(-30), updated_at=h(-2))
    ins("companies", id="c-envoye", name="Clim Atlantique", industry="climatisation", location="Rochefort", created_at=h(-60), updated_at=h(-3, " "))
    ins("companies", id="c-repondu", name="Plomberie Aunis", industry="plomberie", location="La Rochelle", created_at=h(-80), updated_at=h(-1))
    ins("companies", id="c-refus", name="Insectes Services", industry="nuisibles", location="Niort", created_at=h(-90), updated_at=h(-4))
    ins("prospects", id="p-pret", company_id="c-pret", first_name="Karim", last_name="Benali", email="Karim@Zebulon.example", status="new", updated_at=h(-2))
    ins("prospects", id="p-envoye", company_id="c-envoye", first_name="", last_name="", email="contact@clim-atlantique.example", status="contacted", source="company_inbox", updated_at=h(-3))
    ins("prospects", id="p-repondu", company_id="c-repondu", first_name="Alice", last_name="Aunis", email="alice@aunis.example", status="replied", updated_at=h(-1))
    ins("prospects", id="p-refus", company_id="c-refus", first_name="Luc", last_name="Insecte", email="luc@insectes.example", status="opted_out", updated_at=h(-4))
    ins("prospects", id="p-orphelin", company_id="", first_name="Zoé", last_name="Seule", email="zoe@seule.example", status="new", company="Entreprise sans fiche", updated_at=h(-6))
    # le courrier
    ins("outbox", id="o-attente", prospect_id="p-pret", subject="Une question sur vos plannings", body="Bonjour,\nvoici le texte.", status="pending_review", created_at=h(-2), updated_at=h(-2))
    ins("outbox", id="o-approuve", prospect_id="p-orphelin", subject="Approuvé", body="x", status="approved", created_at=h(-6), updated_at=h(-6))
    ins("outbox", id="o-envoye", prospect_id="p-envoye", subject="Bonjour", body="Texte envoyé", status="sent", kind="sequence", sent_at=ce_matin(10), created_at=ce_matin(5), updated_at=ce_matin(10))
    ins("outbox", id="o-envoye-repondu", prospect_id="p-repondu", subject="Premier contact", body="Texte", status="sent", kind="sequence", sent_at=h(-30), created_at=h(-31), updated_at=h(-30))
    ins("outbox", id="o-reponse", prospect_id="p-repondu", subject="Re: Premier contact", body="Merci", status="sent", kind="reply", sent_at=ce_matin(30), created_at=ce_matin(25), updated_at=ce_matin(30))
    ins("outbox", id="o-rejete", prospect_id="p-refus", subject="Rejeté", body="x", status="rejected", created_at=h(-100), updated_at=h(-90))
    ins("outbox", id="o-echec", prospect_id="p-refus", subject="Échec", body="x", status="failed", created_at=h(-5), updated_at=h(-5))
    ins("outbox", id="o-ancien", prospect_id="p-envoye", subject="Très ancien", body="x", status="sent", sent_at=h(-24 * 120), created_at=h(-24 * 121), updated_at=h(-24 * 120))
    # les réponses
    fil = [{"sender": "harvey", "content": "Bonjour", "timestamp": h(-30)},
           {"sender": "prospect", "content": "Bonjour,\nÇa m'intéresse, pouvez-vous m'appeler ?\n> Le 24 octobre, Pauline a écrit :\n> Bonjour", "timestamp": ce_matin(20)}]
    ins("conversations", id="v1", prospect_id="p-repondu", thread_json=json.dumps(fil), intent="interested", updated_at=h(-1))
    ins("conversations", id="v2", prospect_id="p-refus", thread_json=json.dumps([{"sender": "prospect", "content": "Ne me contactez plus.", "timestamp": h(-48)}]), intent="unsubscribe", updated_at=h(-4))
    # les recherches
    ins("runs", id="r1", stage="discover", status="completed", provider="osm", records=3, started_at=h(-48, " "))
    ins("runs", id="r2", stage="discover", status="completed", provider="osm", records=7, started_at=h(-24 * 100, " "))
    ins("runs", id="r3", stage="profile", status="completed", records=9, started_at=h(-1, " "))
    for i, c in enumerate(["c-trouvee", "c-pret", "c-pret", "c-repondu"]):
        ins("observations", id="ob%d" % i, company_id=c, signal_code="FOUND_IN_SERP", run_id="r1")
    ins("actions", id="a1", action_type="prospect", agent="scout", details_json=json.dumps({"prospects_found": 4}), created_at=h(-3, " "))
    ins("actions", id="a2", action_type="prospect", agent="scout", details_json=json.dumps({"prospects_found": 0}), created_at=h(-4, " "))
    ins("actions", id="a3", action_type="opt_out", agent="handler", details_json=json.dumps({"prospect_id": "p-refus"}), created_at=ce_matin(40, " "))
    ins("actions", id="a4", action_type="opt_out", agent="handler", details_json="{}", created_at=h(-24 * 5, " "))
    b.commit()
    b.close()
    debut = (datetime.now() - timedelta(days=16)).date().isoformat()
    (dossier / "harvey.local.yaml").write_text(
        "persona:\n  name: \"Pauline\"\nchannels:\n  email:\n    enabled: true\n    max_daily_sends: 15            # un plafond\n    warmup:\n"
        "      start_date: \"%s\"      # la chauffe\n      min_days: 14\n      start_sends: 5\n      daily_increase: 2\n  linkedin:\n    enabled: false\n" % debut, encoding="utf-8")
    env = dossier / ".env"
    env.write_text("SMTP_HOST=smtp.example\nTEAMOP_RELEVE_JETON=" + JETON + "\n", encoding="utf-8")
    env.chmod(0o600)
    return dossier


def lancer(*args, cwd=None):
    r = subprocess.run([sys.executable, "-I", str(SCRIPT)] + list(args), capture_output=True, text=True, timeout=60, cwd=cwd)
    return r.returncode, r.stdout, r.stderr


def charger_module():
    spec = importlib.util.spec_from_file_location("pauline_releve", str(SCRIPT))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


class FauxServeur:
    """Un serveur HTTP local qui note ce qu'il reçoit et répond le code demandé."""
    def __init__(self, code=200, corps=None):
        self.code, self.corps, self.recus = code, corps if corps is not None else {"ok": True}, []
        outer = self

        class H(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                outer.recus.append({"auth": self.headers.get("Authorization"), "type": self.headers.get("Content-Type"), "corps": self.rfile.read(n)})
                self.send_response(outer.code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(outer.corps).encode())

            def log_message(self, *a):
                pass
        self.s = http.server.HTTPServer(("127.0.0.1", 0), H)
        self.url = "http://127.0.0.1:%d/api/pauline/releve" % self.s.server_address[1]
        threading.Thread(target=self.s.serve_forever, daemon=True).start()

    def fermer(self):
        self.s.shutdown()
        self.s.server_close()


class TestReleve(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dossier = construire(cls.tmp.name)
        cls.m = charger_module()
        code, out, err = lancer("--essai", "--harvey", str(cls.dossier))
        cls.code, cls.out, cls.err = code, out, err
        cls.r = json.loads(out) if code == 0 else {}
        cls.ent = {e["id"]: e for e in cls.r.get("entreprises", [])}
        cls.cou = {c["id"]: c for c in cls.r.get("courriels", [])}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_essai_sort_zero_et_un_json(self):
        self.assertEqual(self.code, 0, self.err)
        self.assertEqual(self.r["version"], 1)
        self.assertIn("Essai : rien n'a été envoyé", self.err)

    def test_aucun_secret_affiche(self):
        self.assertNotIn(JETON, self.out + self.err)
        self.assertNotIn("SENTINELLE", self.out + self.err)

    def test_la_population_existe(self):
        # une assertion sur un ensemble vide passe et ne prouve rien : on compte d'abord
        self.assertEqual(len(self.ent), 6)       # 5 fiches + le prospect sans fiche
        self.assertEqual(len(self.cou), 7)       # 8 lignes moins le courriel de 120 jours

    def test_etats_des_entreprises(self):
        e = {k: v["etat"] for k, v in self.ent.items()}
        self.assertEqual(e, {"c-trouvee": "trouvee", "c-pret": "courriel_pret", "c-envoye": "envoye", "c-repondu": "a_repondu", "c-refus": "refus", "p-p-orphelin": "courriel_pret"})

    def test_champs_des_entreprises(self):
        c = self.ent["c-pret"]
        self.assertEqual((c["nom"], c["ville"], c["metier"], c["email"], c["contact"]), (ENTREPRISE_SECRETE, "Niort", "dératisation", "karim@zebulon.example", "Karim Benali"))
        self.assertNotIn("contact", self.ent["c-envoye"], "une boîte générique n'est pas une personne")
        self.assertEqual(self.ent["p-p-orphelin"]["nom"], "Entreprise sans fiche")
        self.assertEqual(self.r["entreprises"][0]["majLe"] >= self.r["entreprises"][-1]["majLe"], True, "les plus récentes d'abord")

    def test_etats_des_courriels(self):
        e = {k: v["etat"] for k, v in self.cou.items()}
        self.assertEqual(e, {"o-attente": "en_attente", "o-approuve": "en_attente", "o-envoye": "envoye", "o-envoye-repondu": "repondu", "o-reponse": "envoye",
                             "o-rejete": "refuse", "o-echec": "refuse"})
        self.assertEqual(self.cou["o-reponse"]["genre"], "reponse")
        self.assertEqual(self.cou["o-echec"]["statutBrut"], "failed")
        self.assertNotIn("o-ancien", self.cou, "90 jours au plus")

    def test_reponses(self):
        r = {x["entrepriseId"]: x for x in self.r["reponses"]}
        self.assertEqual(len(self.r["reponses"]), 2)
        self.assertEqual((r["c-repondu"]["nature"], r["c-refus"]["nature"]), ("interesse", "refus"))
        self.assertEqual(r["c-repondu"]["resume"], "Bonjour, Ça m'intéresse, pouvez-vous m'appeler ?", "les lignes citées « > » sont retirées")

    def test_recherches(self):
        r = self.r["recherches"]
        decouverte = [x for x in r if x["origine"] == "decouverte"]
        self.assertEqual(sorted((x["metier"], x["ville"], x["trouvees"]) for x in decouverte),
                         [("dératisation", "Niort", 1), ("nettoyage", "La Rochelle", 1), ("plomberie", "La Rochelle", 1)], "r2 a plus de 90 jours, r3 n'est pas une découverte")
        self.assertEqual([x["trouvees"] for x in r if x["origine"] == "cycle"], [4], "un cycle qui ne trouve rien n'est pas une recherche")

    def test_chiffres_du_jour(self):
        j = self.r["jour"]
        self.assertEqual((j["envoyes"], j["envoyesFroid"], j["reponses"], j["refus"], j["enAttente"]), (2, 1, 1, 1, 1), j)

    def test_chauffe(self):
        c = self.r["chauffe"]
        self.assertEqual((c["jour"], c["plafondMax"], c["phase"]), (16, 15, "chauffe"))
        self.assertEqual(c["plafondDuJour"], 5 + (16 - 14) * 2)      # 9 : la rampe monte de 2 par jour après 14 jours sans courriel à froid
        self.assertTrue(c["plafondDuJour"] <= c["plafondMax"])

    def test_chauffe_cas(self):
        from datetime import date
        f = self.m.calculer_chauffe
        base = {"channels.email.max_daily_sends": "15", "channels.email.warmup.start_date": "2099-12-31", "channels.email.warmup.min_days": "14",
                "channels.email.warmup.start_sends": "5", "channels.email.warmup.daily_increase": "2"}
        v = f(base, date(2026, 10, 25))
        self.assertEqual((v["phase"], v["plafondDuJour"], v["debut"]), ("verrou", 0, "2099-12-31"))
        base["channels.email.warmup.start_date"] = "2026-10-20"
        self.assertEqual(f(base, date(2026, 10, 25))["plafondDuJour"], 0, "14 jours sans courriel à froid")
        self.assertEqual(f(base, date(2026, 11, 3))["plafondDuJour"], 5, "le premier jour d'envoi")
        self.assertEqual(f(base, date(2026, 11, 4))["plafondDuJour"], 7)
        self.assertEqual(f(base, date(2027, 3, 1))["plafondDuJour"], 15, "borné par max_daily_sends")
        self.assertEqual(f(base, date(2027, 3, 1))["phase"], "rodee")
        del base["channels.email.warmup.start_date"]
        self.assertEqual((f(base, date(2026, 10, 25))["phase"], f(base, date(2026, 10, 25))["plafondDuJour"]), ("sans_rampe", 15))

    def test_yaml_minimal(self):
        k = self.m.lire_cles_yaml('a:\n  b:\n    c: "x y"   # note\n    d: 3\n  e: \'q\'\n# f: 9\nz: 1')
        self.assertEqual(k, {"a.b.c": "x y", "a.b.d": "3", "a.e": "q", "z": "1"})

    def test_la_base_n_est_pas_touchee(self):
        d = self.dossier / "data" / "harvey.db"
        avant = hashlib.sha256(d.read_bytes()).hexdigest()
        compter = lambda: (lambda c: (c.execute("SELECT COUNT(*) FROM outbox").fetchone()[0], c.close()))(sqlite3.connect(str(d)))[0]
        n_avant = compter()
        lancer("--essai", "--harvey", str(self.dossier))
        self.assertEqual(hashlib.sha256(d.read_bytes()).hexdigest(), avant)
        self.assertEqual(compter(), n_avant)
        # la connexion elle-même refuse d'écrire
        b = self.m.ouvrir_base(d)
        with self.assertRaises(sqlite3.OperationalError):
            b.execute("DELETE FROM outbox")
        b.close()

    def test_envoi_complet(self):
        s = FauxServeur()
        try:
            code, out, err = lancer("--harvey", str(self.dossier), "--url", s.url)
            self.assertEqual(code, 0, err)
            self.assertEqual(len(s.recus), 1)
            self.assertEqual(s.recus[0]["auth"], "Bearer " + JETON)
            self.assertTrue(s.recus[0]["type"].startswith("application/json"))
            self.assertEqual(json.loads(s.recus[0]["corps"])["version"], 1)
            self.assertNotIn(JETON, out + err)
            self.assertNotIn(ENTREPRISE_SECRETE, out + err, "le message de succès ne cite aucun prospect")
        finally:
            s.fermer()

    def test_refus_du_serveur(self):
        for code_http, motif in ((401, "refuse le jeton"), (400, "forme du relevé"), (413, "trop lourd"), (429, "trop de relevés"), (503, "pas encore ouvert")):
            s = FauxServeur(code_http, {"error": "x", "motif": "genereLe illisible"} if code_http == 400 else {"error": "x"})
            try:
                code, out, err = lancer("--harvey", str(self.dossier), "--url", s.url)
                self.assertEqual(code, 5, (code_http, err))
                self.assertIn(motif, err)
                self.assertNotIn(JETON, out + err)
            finally:
                s.fermer()

    def test_serveur_injoignable(self):
        s = FauxServeur()
        url = s.url
        s.fermer()
        code, out, err = lancer("--harvey", str(self.dossier), "--url", url)
        self.assertEqual(code, 4, err)
        self.assertNotIn(JETON, out + err)

    def test_http_hors_boucle_locale_refuse(self):
        code, out, err = lancer("--harvey", str(self.dossier), "--url", "http://api.teamop.fr/api/pauline/releve")
        self.assertEqual(code, 2)
        self.assertIn("https", err)

    def test_sans_jeton(self):
        with tempfile.TemporaryDirectory() as t:
            construire(t)
            (Path(t) / ".env").write_text("SMTP_HOST=x\n")
            code, out, err = lancer("--harvey", t, "--url", "http://127.0.0.1:9/x")
            self.assertEqual(code, 2)
            self.assertIn("TEAMOP_RELEVE_JETON", err)
            code, out, err = lancer("--essai", "--harvey", t)
            self.assertEqual(code, 0, "--essai ne lit pas le jeton")

    def test_base_introuvable(self):
        with tempfile.TemporaryDirectory() as t:
            code, out, err = lancer("--essai", "--harvey", t)
            self.assertEqual(code, 3)
            self.assertIn("introuvable", err)

    def test_base_illisible_sans_trace(self):
        with tempfile.TemporaryDirectory() as t:
            (Path(t) / "data").mkdir()
            (Path(t) / "data" / "harvey.db").write_bytes(b"ceci n'est pas une base SQLite" * 50)
            code, out, err = lancer("--essai", "--harvey", t)
            self.assertEqual(code, 3, err)
            self.assertNotIn("Traceback", err)

    def test_base_neuve_sans_tables(self):
        with tempfile.TemporaryDirectory() as t:
            (Path(t) / "data").mkdir()
            sqlite3.connect(str(Path(t) / "data" / "harvey.db")).close()
            code, out, err = lancer("--essai", "--harvey", t)
            self.assertEqual(code, 0, err)
            r = json.loads(out)
            self.assertEqual((r["entreprises"], r["courriels"], r["jour"]["envoyes"]), ([], [], 0))

    def test_fabriquer_jeton(self):
        with tempfile.TemporaryDirectory() as t:
            code, out, err = lancer("--fabriquer-jeton", "--harvey", t)
            self.assertEqual(code, 0, err)
            env = Path(t) / ".env"
            jeton = re.search(r"TEAMOP_RELEVE_JETON=(\S+)", env.read_text()).group(1)
            self.assertEqual(len(jeton), 64)
            self.assertNotIn(jeton, out + err, "le jeton ne s'affiche jamais")
            empreinte = out.strip().splitlines()[-1]
            self.assertEqual(empreinte, hashlib.sha256(jeton.encode()).hexdigest())
            self.assertEqual(stat.S_IMODE(env.stat().st_mode), 0o600)
            avant = env.read_text()
            code, out2, err2 = lancer("--fabriquer-jeton", "--harvey", t)
            self.assertEqual(code, 2)
            self.assertEqual(env.read_text(), avant, "un jeton existant n'est jamais écrasé sans --remplacer")
            self.assertNotIn(jeton, out2 + err2)
            code, out3, err3 = lancer("--fabriquer-jeton", "--remplacer", "--harvey", t)
            self.assertEqual(code, 0)
            self.assertNotEqual(env.read_text(), avant)
            self.assertEqual(env.read_text().count("TEAMOP_RELEVE_JETON="), 1)

    def test_fabriquer_jeton_garde_le_reste_du_env(self):
        with tempfile.TemporaryDirectory() as t:
            (Path(t) / ".env").write_text("SMTP_PASSWORD=motdepasse-secret\nIMAP_HOST=imap.example")
            lancer("--fabriquer-jeton", "--harvey", t)
            texte = (Path(t) / ".env").read_text()
            self.assertIn("SMTP_PASSWORD=motdepasse-secret\nIMAP_HOST=imap.example\nTEAMOP_RELEVE_JETON=", texte)

    def test_alleger(self):
        r = {"courriels": [{"texte": "x" * 6000} for _ in range(300)]}
        r = self.m.alleger(r)
        self.assertLessEqual(len(json.dumps(r).encode()), self.m.TAILLE_CIBLE)

    def test_plafonds_du_script(self):
        with tempfile.TemporaryDirectory() as t:
            construire(t)
            b = sqlite3.connect(str(Path(t) / "data" / "harvey.db"))
            for i in range(620):
                b.execute("INSERT INTO companies (id, name, updated_at) VALUES (?,?,?)", ("g%d" % i, "Gros %d" % i, h(-1)))
            for i in range(350):
                b.execute("INSERT INTO outbox (id, prospect_id, subject, body, status, created_at) VALUES (?,?,?,?,?,?)", ("go%d" % i, "p-pret", "s", "b", "pending_review", h(-1)))
            b.commit(); b.close()
            code, out, err = lancer("--essai", "--harvey", t)
            self.assertEqual(code, 0, err)
            r = json.loads(out)
            self.assertEqual((len(r["entreprises"]), len(r["courriels"])), (500, 300))


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--construire":
        construire(sys.argv[2])
        sys.exit(0)
    sys.exit(0 if unittest.main(exit=False, verbosity=1).result.wasSuccessful() else 1)

#!/usr/bin/env python3
"""MUTATIONS DU PONT DES AGENTS (28 octobre 2026) — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER ».

On remet, un par un, les défauts que les bancs 3090, 3091 et 3092 gardent, et on exige que le banc visé TOMBE. Une mutation qui ne casse rien est ou bien un banc aveugle, ou bien une
mutation mal visée (`git diff` après mutation) — voir CLAUDE.md. Chaque mutation vérifie qu'elle a touché UN endroit (l'ancre se trouve exactement une fois), restaure le fichier d'origine
EN ENTIER (on réécrit le texte gardé en mémoire, on ne passe pas par `git checkout` : un correctif non commité partirait avec), et chaque exécution a son délai.

    python3 scratchpad/mutations-pont-agents.py            # toutes
    python3 scratchpad/mutations-pont-agents.py 0 10       # de la première à la dixième

⛔ À lancer au PREMIER PLAN, après avoir COMMITÉ le correctif et le banc, et à vérifier ensuite par `git diff` vide.
"""
import os, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 'server-msg/'
V = 'server/'

# (nom, fichier, ancre, remplacement, bancs qui doivent tomber)
M = [
    # ── la garde PT ──
    ('garde : plus de preuve de boucle locale', S + 'pont-agents.js', "if (!BOUCLE.has(req.socket && req.socket.remoteAddress)) return refuser(res, 'hors_boucle');", "", ['3090']),
    ('garde : plus de refus derrière un proxy', S + 'pont-agents.js', "for (const h of ENTETES_PROXY) if (req.headers[h] !== undefined) return refuser(res, 'proxy');", "", ['3090']),
    ('garde : le secret n\'est plus comparé', S + 'pont-agents.js', "if (!crypto.timingSafeEqual(sha256(Buffer.from(brut.toLowerCase(), 'utf8')), cfg.empreinte)) return refuser(res, 'faux');", "", ['3090']),
    ('garde : le secret absent passe', S + 'pont-agents.js', "if (brut === undefined) return refuser(res, 'absent');", "if (brut === undefined) { etat.acces++; return next(); }", ['3090']),
    ('garde : inerte sans configuration → ouverte', S + 'pont-agents.js', "if (!cfg || !Buffer.isBuffer(cfg.empreinte)) return refuser(res, 'inerte');", "if (!cfg || !Buffer.isBuffer(cfg.empreinte)) { etat.acces++; return next(); }", ['3090']),
    ('garde : le secret n\'est comparé qu\'à moitié', S + 'pont-agents.js', "crypto.timingSafeEqual(sha256(Buffer.from(brut.toLowerCase(), 'utf8')), cfg.empreinte)", "crypto.timingSafeEqual(sha256(Buffer.from(brut.toLowerCase(), 'utf8')).subarray(0, 4), cfg.empreinte.subarray(0, 4))", ['3090']),
    # ── la configuration ──
    ('config : l\'empreinte de l\'administration est acceptée', S + 'pont-agents.js', "if (Buffer.isBuffer(adminEmpreinte) && crypto.timingSafeEqual(adminEmpreinte, empreinte)) throw err(", "if (false) throw err(", ['3090']),
    ('config : la production est acceptée', S + 'pont-agents.js', "if (instance !== 'beta') throw err(", "if (false) throw err(", ['3090']),
    ('config : une clé inconnue est acceptée', S + 'pont-agents.js', "for (const k of Object.keys(brut)) if (!['actif', 'secretSha256', 'justin'].includes(k)) throw err(", "for (const k of Object.keys(brut)) if (false) throw err(", ['3090']),
    ('config : une empreinte trop régulière est acceptée', S + 'pont-agents.js', "if (new Set(hex).size < 8) throw err(", "if (false) throw err(", ['3090']),
    # ── poster ──
    ('poster : un robot parle sans être membre', S + 'pont-agents.js', "if (!stockage.convPourMembre(conv, auteur)) return non('pas_membre');", "", ['3090']),
    ('poster : « justin » sans import accepté', S + 'pont-agents.js', "if (importe !== true) return non('justin_interdit');", "", ['3090', '3091']),
    ('poster : la table se lit sans hasOwnProperty (prototype)', S + 'pont-agents.js', "if (typeof m.fil !== 'string' || !Object.prototype.hasOwnProperty.call(t.fils, m.fil)) return non('fil_inconnu');", "if (typeof m.fil !== 'string' || !t.fils[m.fil]) return non('fil_inconnu');", ['3090']),
    ('poster : un auteur au nom de prototype', S + 'pont-agents.js', "} else if (typeof m.de === 'string' && Object.prototype.hasOwnProperty.call(t.robots, m.de) && m.de !== SYSTEME.id) {", "} else if (typeof m.de === 'string' && t.robots[m.de] && m.de !== SYSTEME.id) {", ['3090']),
    ('poster : le cid n\'est plus exigé', S + 'pont-agents.js', "if (typeof m.cid !== 'string' || !CID.test(m.cid)) return non('champ_invalide');", "m.cid = typeof m.cid === 'string' && CID.test(m.cid) ? m.cid : 'sans-cid-' + Math.random().toString(36).slice(2);", ['3090']),
    ('poster : la date d\'import n\'est plus posée', V + '../' + S + 'stockage.js', "ts = Number.isSafeInteger(tsImpose) && tsImpose > 0 ? tsImpose : horloge()", "ts = horloge()", ['3090', '3091']),
    ('poster : l\'état « lu » de l\'historique est perdu', S + 'pont-agents.js', "if (importe === true && m.lu === true && auteur !== t.justin) { try { stockage.membreLu({ conv, uid: t.justin, seq: r.seq }); } catch (e) {} }", "", ['3090', '3091']),
    ('poster : la note système d\'un fil privé n\'est plus marquée', S + 'pont-agents.js', "if (prive) { auteur = t.robots[m.fil]; texte = 'ℹ️ ' + texte; }", "if (prive) { auteur = t.robots[m.fil]; }", ['3090']),
    ('poster : plus de plafond de lot', S + 'pont-agents.js', "b.messages.length > LOT_MAX) return refus(res, 400, 'champ_invalide');", "b.messages.length > 100000) return refus(res, 400, 'champ_invalide');", ['3090']),
    # ── installer ──
    ('installer : une directe est recréée à chaque appel', S + 'pont-agents.js', "if (t.fils[a.id] && stockage.convPourMembre(t.fils[a.id], justin.id)) continue;", "", ['3090']),
    ('installer : les groupes sont recréés à chaque appel', S + 'pont-agents.js', "if (t.fils[g.fil] && stockage.convPourMembre(t.fils[g.fil], justin.id)) {", "if (false) {", ['3090']),
    ('installer : les robots ne sont plus collègues (hors de l\'espace)', S + 'pont-agents.js', "if (!stockage.espaceMembreAjouter({ espace: t.espace, uid: t.robots[id] }).deja) creees.membres++;", "creees.membres++;", ['3090']),
    ('installer : un agent réservé (« systeme ») accepté', S + 'pont-agents.js', "|| a.id === SYSTEME.id || vus.has(a.id)) return null;", "|| vus.has(a.id)) return null;", ['3090']),
    # ── nouveaux ──
    ('nouveaux : ce que le pont a recopié revient', S + 'pont-agents.js', "if (typeof d.cid === 'string' && d.cid.startsWith('tour-')) continue;", "", ['3090']),
    ('nouveaux : « Justin a créé le groupe » compte comme un message', S + 'pont-agents.js', "d.auteur === t.justin && d.type !== 'systeme' && !d.supprime", "d.auteur === t.justin && !d.supprime", ['3090']),
    ('nouveaux : n\'importe quel auteur compte comme Justin', S + 'pont-agents.js', "if (e.event === 'message' && d.auteur === t.justin &&", "if (e.event === 'message' &&", ['3090']),
    ('nouveaux : les conversations hors pont comptent', S + 'pont-agents.js', "if (!filDe.has(d.conv)) continue;", "if (!filDe.has(d.conv)) filDe.set(d.conv, 'equipe');", ['3090']),
    ('nouveaux : « depuis » mal formé est ignoré', S + 'pont-agents.js', "if (typeof brut !== 'string' || !/^[0-9]{1,15}$/.test(brut)) return refus(res, 400, 'parametre_invalide', { champ: 'depuis' });", "", ['3090']),
    ('nouveaux : sans curseur, tout est rejoué', S + 'pont-agents.js', "if (brut === undefined) return res.json({ ok: true, curseur: stockage.journalMax(), plein: false, evenements: [] });", "", ['3090']),
    ('nouveaux : les suppressions « pour moi » sont perdues', S + 'pont-agents.js', "(d.pour === 'tous' || d.pour === 'moi')", "d.pour === 'tous'", ['3090']),
    # ── supprimer ──
    ('supprimer : Justin n\'est plus administrateur du geste', S + 'pont-agents.js', "pour: 'tous', admin: true });", "pour: 'tous', admin: false });", ['3090']),
    ('supprimer : n\'importe quel fil', S + 'pont-agents.js', "if (typeof b.fil !== 'string' || !Object.prototype.hasOwnProperty.call(t.fils, b.fil) || !Number.isInteger(b.seq) || b.seq < 1) return refus(res, 400, 'champ_invalide');", "if (typeof b.fil !== 'string' || !Number.isInteger(b.seq) || b.seq < 1) return refus(res, 400, 'champ_invalide');", ['3090']),
    # ── app.js ──
    ('app : le pont repasse par le plafond d\'écriture par compte', S + 'app.js', " && r.garde !== 'LV' && r.garde !== 'PT') chaine.push(limiteEcriture);", " && r.garde !== 'LV') chaine.push(limiteEcriture);", ['3090']),
    ('app : la garde PT n\'est plus montée', S + 'app.js', "  garde.PT = gardePont(ctx);", "  garde.PT = [(req, res, next) => next()];", ['3090']),
    # ── côté Tour : pont-messages.js ──
    ('tour : le secret part vers n\'importe quelle adresse', V + 'pont-messages.js', "const BOUCLE = /^http:\\/\\/(127\\.0\\.0\\.1|localhost|\\[::1\\])(:\\d{2,5})?\\/?$/;", "const BOUCLE = /^https?:\\/\\//;", ['3092']),
    ('tour : un secret n\'importe lequel est accepté', V + 'pont-messages.js', "const SECRET = /^[0-9a-f]{64}$/;", "const SECRET = /^.*$/;", ['3092']),
    ('tour : le cid ne porte plus l\'identifiant du registre', V + 'pont-messages.js', "cid: it.k === 'n' ? it.cid : 'tour-' + it.id", "cid: it.k === 'n' ? it.cid : 'tour-' + Math.random().toString(36).slice(2, 14)", ['3091', '3092']),
    ('tour : le secret est aussi dans le corps', V + 'pont-messages.js', "body: corps === undefined ? undefined : JSON.stringify(corps), redirect: 'error'", "body: corps === undefined ? undefined : JSON.stringify(Object.assign({ secret }, corps)), redirect: 'error'", ['3092']),
    ('tour : tout agent notifie le téléphone', V + 'pont-messages.js', "push: !!(!importe && m.niveau && m.niveau !== 'info' && m.de !== 'justin' && m.de !== 'systeme') };", "push: !importe && m.de !== 'justin' };", ['3092']),
    ('tour : un rattrapage notifie et perd sa date', V + 'pont-messages.js', "const importe = rattrapage === true || m.de === 'justin' || horloge() - m.ts > ANCIEN_MS;", "const importe = m.de === 'justin';", ['3091', '3092']),
    ('tour : la file n\'est plus bornée', V + 'pont-messages.js', "while (file.length > FILE_MAX) {", "while (file.length > 1e9) {", ['3092']),
    ('tour : plus d\'attente après un échec', V + 'pont-messages.js', "attenteJusqua = horloge() + attenteMs;", "attenteJusqua = 0;", ['3092']),
    ('tour : le 429 n\'est plus respecté', V + 'pont-messages.js', "if (r.status === 429) { const s = parseInt(r.headers.get('retry-after') || '', 10); return panne(Number.isInteger(s) && s > 0 ? s * 1000 : 0); }", "if (r.status === 429) return panne(0);", ['3092']),
    ('tour : une panne jette la file', V + 'pont-messages.js', "} catch (e) { panne(); journal('envoi : ' + ((e && e.name) || 'erreur')); }", "} catch (e) { file.length = 0; panne(); }", ['3092']),
    ('tour : l\'échec ne se compte plus', V + 'pont-messages.js', "if (!echecDepuis) echecDepuis = horloge();", "", ['3092']),
    ('tour : un lot refusé (400) boucle', V + 'pont-messages.js', "if (r.statut === 400) { for (const it of lot) { quitter(it); compte.rejets++; } journal('lot refusé (400)'); continue; }", "if (r.statut === 400) return;", ['3092']),
    ('tour : un refus définitif retient la file', V + 'pont-messages.js', "else if (x && REJETS.includes(x.raison)) { quitter(it); compte.rejets++; journal('message refusé : ' + x.raison); }", "else if (x && REJETS.includes(x.raison)) { sauver(); return; }", ['3092']),
    ('tour : un message est retiré « le premier » au lieu du sien', V + 'pont-messages.js', "const quitter = (it) => { const i = file.indexOf(it); if (i >= 0) file.splice(i, 1); sortieDeFile(it); };", "const quitter = (it) => { file.shift(); sortieDeFile(it); };", ['3092']),
    ('tour : le premier passage rejoue tout', V + 'pont-messages.js', "if (curseur === null) { curseur = r.j.curseur; sauver(); return; }", "if (curseur === null) curseur = 0;", ['3092']),
    ('tour : ce que Justin écrit retourne à sa source', V + 'pont-messages.js', "conversations.justinEcrit(e.fil, e.texte, { sansEcho: true });", "conversations.justinEcrit(e.fil, e.texte, { sansEcho: false });", ['3091', '3092']),
    ('tour : une suppression d\'OP MESSAGES retourne à sa source', V + 'pont-messages.js', "conversations.retirer(id, { sansEcho: true });", "conversations.retirer(id, { sansEcho: false });", ['3092']),
    ('tour : la note « texte seul » n\'est plus dite', V + 'pont-messages.js', "if (e.genre !== 'texte' || typeof e.texte !== 'string') { noteTexteSeul(e.fil); return true; }", "if (e.genre !== 'texte' || typeof e.texte !== 'string') { return true; }", ['3091', '3092']),
    ('tour : un message qui n\'est pas du texte entre au registre', V + 'pont-messages.js', "if (e.genre !== 'texte' || typeof e.texte !== 'string') { noteTexteSeul(e.fil); return true; }", "if (typeof e.texte !== 'string') { noteTexteSeul(e.fil); return true; }", ['3092']),
    ('tour : un message déjà entré rentre une seconde fois', V + 'pont-messages.js', "if (!conversations.filValide(e.fil) || parSeq.has(e.fil + '#' + e.seq)) return true;", "if (!conversations.filValide(e.fil)) return true;", ['3092']),
    ('tour : un registre d\'état illisible est réécrit', V + 'pont-messages.js', "if (illisible) return false;\n    const lies = [];", "const lies = [];", ['3092']),
    ('tour : un registre illisible laisse démarrer', V + 'pont-messages.js', "if (illisible) { journal('⛔ ' + F + ' illisible : le pont ne démarre pas (le réparer, puis redémarrer)'); return; }", "", ['3092']),
    ('tour : la suppression de la Tour n\'est plus dite', V + 'pont-messages.js', "enfiler({ k: 's', id: x.id, fil: x.fil });", "", ['3091', '3092']),
    ('tour : la suppression vise le mauvais numéro', V + 'pont-messages.js', "{ fil: v.fil, seq: v.seq });", "{ fil: v.fil, seq: v.seq + 1 });", ['3091', '3092']),
    # ── côté Tour : conversations.js, index.js, surveillance, tour.html ──
    ('conversations : le crochet d\'ajout n\'est plus appelé', V + 'conversations.js', "if (!sansEcho && typeof ctx.surAjout === 'function') {", "if (false) {", ['3091', '3092']),
    ('conversations : le crochet de retrait n\'est plus appelé', V + 'conversations.js', "if (!(o && o.sansEcho) && typeof ctx.surRetrait === 'function')", "if (false)", ['3091', '3092']),
    ('conversations : l\'agent n\'est plus réveillé par un message du pont', V + 'conversations.js', "    declencher(m);\n    return { ok: true, message: vue(m), mentions: m.mentions.slice() };", "    return { ok: true, message: vue(m), mentions: m.mentions.slice() };", ['3091', '3092']),
    ('conversations : un rappel client non lu se supprime', V + 'conversations.js', "if (protege(messages[i])) return { ok: false, statut: 409,", "if (false) return { ok: false, statut: 409,", ['3091']),
    ('index : /health ne porte plus le pont', V + 'index.js', "...(pontMessages ? { pont: pontMessages.sante() } : {}),", "", ['3091']),
    ('index : le pont ne démarre plus', V + 'index.js', "if (pontMessages) { pontMessages.demarrer();", "if (pontMessages) { ", ['3091']),
    ('surveillance : echecMin n\'est plus lu', '.github/scripts/surveillance.js', "if (j.pont && j.pont.echecMin >= 30) {", "if (j.pont && j.pont.nimporte >= 30) {", ['3091']),
    ('surveillance : file n\'est plus lue', '.github/scripts/surveillance.js', "if (j.pont && j.pont.file >= 1000) {", "if (j.pont && j.pont.nimporte2 >= 1000) {", ['3091']),
    ('tour.html : le lien ne s\'ouvre plus dans un autre onglet', 'tour.html', 'href="\'+esc(BETA_MSG_ADRESSE)+\'/" target="_blank" rel="noopener noreferrer">Ouvrir OP MESSAGES', 'href="\'+esc(BETA_MSG_ADRESSE)+\'/">Ouvrir OP MESSAGES', ['3092']),
    ('tour.html : le bandeau n\'est plus monté', 'tour.html', "function vueMessagerie(){ return messBandeauOpm()+", "function vueMessagerie(){ return ''+", ['3092']),
]


def lancer(banc):
    try:
        p = subprocess.run(['node', 'tests/test-' + banc + '.js'], cwd=RACINE, capture_output=True, text=True, timeout=150)
    except subprocess.TimeoutExpired:
        return 'délai', 'figé'
    sortie = p.stdout + p.stderr
    dernier = [l for l in sortie.strip().split('\n') if ' ✓' in l and '✗' in l]
    return p.returncode, (dernier[-1].strip() if dernier else sortie.strip().split('\n')[-1][:100])


def main():
    debut = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    fin = int(sys.argv[2]) if len(sys.argv) > 2 else len(M)
    vivantes = []
    for i, (nom, fichier, ancre, neuf, bancs) in enumerate(M[debut:fin], debut):
        chemin = os.path.normpath(os.path.join(RACINE, fichier))
        original = open(chemin, encoding='utf8').read()
        n = original.count(ancre)
        if n != 1:
            print('[%2d] ⚠ ANCRE TROUVÉE %d FOIS (mal visée) : %s' % (i, n, nom))
            vivantes.append((i, nom, 'ancre'))
            continue
        try:
            open(chemin, 'w', encoding='utf8').write(original.replace(ancre, neuf))
            verdicts = []
            for b in bancs:
                code, resume = lancer(b)
                tombe = code != 0
                verdicts.append((b, tombe, resume))
        finally:
            open(chemin, 'w', encoding='utf8').write(original)
        # au moins UN des bancs visés doit tomber (les autres sont cités à titre de couverture)
        mord = any(t for _, t, _ in verdicts)
        print('[%2d] %s %s  → %s' % (i, 'MORD ' if mord else 'VIVANTE', nom, ' · '.join('%s:%s (%s)' % (b, 'tombe' if t else 'VERT', r) for b, t, r in verdicts)))
        sys.stdout.flush()
        if not mord:
            vivantes.append((i, nom, 'vert'))
    print('\n%d mutation(s) jouée(s), %d survivante(s)' % (len(M[debut:fin]), len(vivantes)))
    for i, nom, why in vivantes:
        print('   SURVIVANTE [%d] %s (%s)' % (i, nom, why))
    sys.exit(1 if vivantes else 0)


main()

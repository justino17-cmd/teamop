/* ⛔ CE QUE CE FICHIER GARDE — LÉA AU TRAVAIL (30 octobre 2026) : le premier courriel commercial d'une inscription, écrit avec le moteur (connaissances validées à portée d'outil, grille de relecture, trois rédactions).
     Le module réel `agent-lea.js` sur l'établi `banc-agents-courrier.js`, un faux Anthropic.
       0. COUPÉ (par défaut) : le circuit d'avant, la requête d'avant (2 500 jetons, réflexion coupée, le juge fermé) ;
       1. ALLUMÉ : la première rédaction vient de la boucle (outil de connaissances, réflexion adaptative), la grille note, le courriel est déposé avec ses notes, la phrase d'opposition posée APRÈS le contrôle ;
       2. sous le seuil : trois rédactions, puis « à revoir » pour Justin — jamais d'envoi seul ;
       3. le repli : la boucle échoue → l'appel d'avant ; un défaut du code → réécriture, puis refus comme avant ;
       4. ce qui part chez Anthropic ne change pas : le nom de l'entreprise, le métier — jamais l'adresse, le prénom ni le nom de l'inscrit.
   Les mutations : scratchpad/mutations-travail.py. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, COURRIEL, CHARTE_OUVERTE, NOTEUR_DEBUT } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();
const MODES = { lea: 'brouillon' };
const NOTES = o => ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : ' + ((o || {})[c] || 5)).join('\n');
const TOKA = COURRIEL.replace('Nous avons bien noté votre activité.', 'Nous avons bien noté que Toka Clim est une entreprise de terrain.');
const INSCRIT = { entreprise: 'Toka Clim', email: 'inscrit-3203@exemple-3203.fr' };

(async () => {
  console.log('\n── 3203 · Léa au travail ──');

  console.log('\n0. Coupé : le circuit d’avant');
  {
    const Z = monter({ modes: MODES });
    const r = await Z.lea.surInscription(INSCRIT);
    const q = Z.recus[0];
    v('⛔ sans interrupteur : 2 500 jetons, réflexion coupée, aucun outil, le juge fermé (pas la grille)', [r.depose, q.max_tokens, q.thinking, q.tools, Z.recusJuge.length, Z.recusNoteur.length], [true, 2500, { type: 'disabled' }, undefined, 1, 0]);
    const b = Object.values(Z.fichierJson('agents-brouillons.json'))[0];
    vrai('…le brouillon porte un contrôle sans notes', b.controle.notes === undefined && b.controle.moyenne === undefined);
    Z.nettoyer();
  }

  console.log('\n1. Allumé : la boucle, la grille, le dépôt');
  {
    let n = 0;
    const Z = monter({ modes: MODES, travail: { lea: true }, louisClaude: () => 'RIEN', claude: (req) => { n++; return n === 1 ? { texte: '', actions: [{ id: 'tu_1', nom: 'connaissances_equipe', entree: { question: 'fonctions pour la climatisation' } }] } : COURRIEL.replace('Nous avons bien noté votre activité.', 'Nous avons bien noté que Toka Clim est une entreprise de terrain.'); } });
    const r = await Z.lea.surInscription(INSCRIT);
    const b = Object.values(Z.fichierJson('agents-brouillons.json'))[0];
    v('le courriel est déposé, jugé par la GRILLE (une relecture) et plus par le juge fermé ; notes et moyenne rangées', [r.depose, r.controle, Z.recusNoteur.length, Z.recusJuge.length, b.controle.moyenne, Object.keys(b.controle.notes).length], [true, 'bon', 1, 0, 5, 7]);
    v('…la requête de la première rédaction : mode travail (6 000 jetons, réflexion adaptative, `tool_choice: auto`), un seul outil de lecture', [Z.recus[0].max_tokens, Z.recus[0].thinking.type, Z.recus[0].tools.map(t => t.name), Z.recus[0].tool_choice], [6000, 'adaptive', ['connaissances_equipe'], { type: 'auto' }]);
    vrai('…le résultat de l’outil revient au second tour, sous la forme que l’API attend', Z.recus[1].messages[2].content[0].type === 'tool_result' && Z.recus[1].messages[2].content[0].tool_use_id === 'tu_1');
    vrai('…la phrase d’opposition est posée par le serveur APRÈS le contrôle (elle n’est pas dans ce que le relecteur a lu)', /stop/i.test(b.texte) && !/répondez simplement stop/i.test(Z.recusNoteur[0].messages[0].content), b.texte.slice(-300));
    vrai('⛔ ce qui part chez Anthropic : le nom de l’entreprise, jamais l’adresse de l’inscrit', !/inscrit-3203|exemple-3203/.test(JSON.stringify([Z.recus, Z.recusNoteur])) && /Toka Clim/.test(JSON.stringify(Z.recus[0].messages)));
    Z.nettoyer();
  }

  console.log('\n2. Sous le seuil : jamais déguisé en bon travail');
  {
    const Z = monter({ modes: { lea: 'auto' }, charte: CHARTE_OUVERTE, travail: true, claude: () => TOKA, notes: () => NOTES({ personnalise: 2 }) });
    const r = await Z.lea.surInscription(INSCRIT);
    const b = Object.values(Z.fichierJson('agents-brouillons.json'))[0];
    v('⛔ trois rédactions, trois relectures, puis « à revoir » : le brouillon attend Justin, même en « auto » avec la charte ouverte', [r.controle, r.voie, Z.envoyes.length, Z.recusNoteur.length, b.controle.fautes], ['a_revoir', 'validation', 0, 3, ['grille_personnalise']]);
    vrai('…Léa le DIT à l’équipe (« n’a pas passé le contrôle qualité »)', Z.paroles.some(p => p.fil === 'clients' && /n’a pas passé le contrôle qualité/.test(p.texte)));
    const q3 = Z.recus[2].messages;
    vrai('…la deuxième réécriture rejoue le premier jet et la phrase du critère', q3.length === 3 && q3[2].content.includes('Personnaliser : parler de cette personne'), JSON.stringify(q3).slice(-300));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { lea: 'auto' }, charte: CHARTE_OUVERTE, travail: true, claude: () => TOKA, notes: () => new Error('relecteur en panne') });
    const r = await Z.lea.surInscription(INSCRIT);
    v('⛔ relecteur indisponible : « contrôle non fait », en validation — jamais d’envoi seul', [r.controle, r.voie, Z.envoyes.length], ['non_verifie', 'validation', 0]);
    Z.nettoyer();
  }

  console.log('\n3. Le repli');
  {
    let n = 0;
    const Z = monter({ modes: MODES, travail: true, claude: (req) => { n++; if (n === 1) return new Error('panne passagère'); return COURRIEL.replace('Nous avons bien noté votre activité.', 'Nous avons bien noté que Toka Clim est une entreprise de terrain.'); } });
    const r = await Z.lea.surInscription(INSCRIT);
    v('⛔ la boucle échoue au premier tour : le circuit d’avant reprend (2 500 jetons, juge fermé), le courriel est déposé', [r.depose, Z.recus[1].max_tokens, Z.recus[1].thinking, Z.recusJuge.length, Z.recusNoteur.length], [true, 2500, { type: 'disabled' }, 1, 0]);
    Z.nettoyer();
  }
  {
    const AVEC_TEL = COURRIEL.replace('Nous avons bien noté votre activité.', 'Nous avons bien noté que Toka Clim est une entreprise de terrain. Appelez-nous au 01 23 45 67 89.');
    const Z = monter({ modes: MODES, travail: true, claude: () => AVEC_TEL });
    const r = await Z.lea.surInscription(INSCRIT);
    v('⛔ un numéro dans le courriel (défaut GRAVE) après les trois rédactions : refusé, rien n’est rangé, la relecture n’est pas payée', [r.saute, fs.existsSync(path.join(Z.D, 'agents-brouillons.json')), Z.recusNoteur.length], ['texte_refuse', false, 0]);
    Z.nettoyer();
  }
  {
    const src = fs.readFileSync(path.join(RACINE, 'server', 'agent-lea.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('⛔ le circuit d’avant est toujours dans le code (`CTRL.produire`) : l’interrupteur coupé n’en passe que par là', /CTRL\.produire/.test(src) && /travailActif\(\)/.test(src));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

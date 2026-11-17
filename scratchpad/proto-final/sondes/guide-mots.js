// Le guide des nouveautés, les MOTS et les PROMESSES : au plus 6 cartes, titre de 2 à 5 mots, phrase de 20 mots au plus (compte sévère : une élision compte
// pour deux), pas de mot technique, la première carte dit en trois lignes ancien nom → nouveau nom, et CHAQUE phrase est vraie sur l'écran qu'elle décrit
// (on ouvre l'écran et on y cherche ce que la phrase promet). Une carte sans promesse vérifiée tombe : une carte neuve doit apporter sa preuve.
// Usage : PROFIL=mac|iphone QUI=marc,julie,sm,kb node guide-mots.js
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUIS = (process.env.QUI || 'marc,julie,sm,kb').split(','), TEL = G.TEL.includes(PROFIL);
const MD = require('fs').readFileSync(require('path').join(__dirname, '..', 'refonte', 'GUIDE-NOUVEAUTES.md'), 'utf8').replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' ');
const TECHNIQUES = /\b(onglets?|interface|module|fonctionnalit|param[eè]tr|synchro|serveur|authentification|API|CRM|DSN|SIRET|IBAN|PDF|workflow|dashboard|checkbox|toggle|widget|cache|session|compte administrateur|base de donn)/i;
// ce que chaque carte PROMET, vérifié sur l'écran où « Voir » mène (un texte lu dans l'écran, un bouton qui existe, une zone qui répond)
const txt = f => f.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
// la Comptabilité vit dans un cadre (prototype-comptabilite.html) : on attend que son texte soit là, puis on le lit
const comptaTxt = async c => { for (let k = 0; k < 50; k++) { const f = L.cadre(c.p, /prototype-comptabilite\.html/); if (f) { try { const t = await txt(f); if (t.length > 200) return t; } catch (e) {} } await c.p.waitForTimeout(400); } return ''; };
const PROMESSES = {
  compta:  [['Ventes, Achats, Trésorerie, TVA (et Paie pour le gérant) : tout est sur le même écran', async c => { const t = await comptaTxt(c); return /Ventes/.test(t) && /Achats/.test(t) && /Trésorerie/.test(t) && /TVA/.test(t) && (c.qui === 'julie' || /Paie/.test(t)); }],
            ['les factures y sont (onglet Ventes → Factures)', async c => /Factures|facturé/i.test(await comptaTxt(c))]],
  stock:   [['un champ « Chercher un article »', async c => c.p.evaluate(() => [...document.querySelectorAll('#contenu input')].some(i => /article/i.test(i.placeholder)))],
            ['chaque article dit OÙ il est et COMBIEN il en reste', async c => c.p.evaluate(() => { const L = [...document.querySelectorAll('#contenu .ms-lig, #contenu [data-pr], #contenu .lig, #contenu li, #contenu .carte-art')].map(e => e.innerText); const t = document.getElementById('contenu').innerText; return /Atelier|camion|Nulle part/.test(t) && /\d+(,\d+)?\s?(u|kg|L|m)\b/.test(t); })]],
  taches:  [['la tâche vient d\'elle-même : « OP GESTION te propose » (gérant) ou « ce qu\'on t\'a confié » (bureau)', async c => c.qui === 'julie' ? /Ce qu[’']on t[’']a confié/i.test(await txt(c.p)) : /te propose/i.test(await txt(c.p))],
            ['la tâche se termine toute seule', async c => /se termine (toute )?seule/i.test(await txt(c.p))]],
  equipe:  [['l\'onglet « Qui peut quoi » existe et montre qui voit quoi', async c => { const ok = await L.toucher(c, '#contenu [data-eq="filtre|droits"]'); await L.calme(c.p, 500); return ok && await c.p.evaluate(() => !!document.querySelector('.eqx-dr-tab')); }],
            ['on touche une personne et on y choisit ce qu\'elle voit et peut faire (des cases à cocher)', async c => { await L.toucher(c, '#contenu [data-eq="fiche|sm"]'); await L.calme(c.p, 600); return c.p.evaluate(() => document.querySelectorAll('#calque input[type=checkbox]').length >= 6); }]],
  entreprise:[['« Ton entreprise », « Tes mentions légales », « Ton logo », « Ta banque », « Tes horaires » sont là', async c => { const t = await txt(c.p); return /Ton entreprise/.test(t) && /mentions légales/.test(t) && /logo/i.test(t) && /banque/i.test(t) && /horaires/i.test(t); }]],
  devis:   [['le bouton « Composer un devis » existe', async c => c.p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu a')].some(b => /Composer un devis/.test(b.textContent)))],
            ['il ouvre une grande page où l\'on voit le prix et d\'où l\'on envoie', async c => { await L.toucher(c, '#contenu button:has-text("Composer un devis")'); await L.calme(c.p, 1800);
               const o = await c.p.evaluate(() => { const z = document.getElementById('opdz'); const f = z && z.querySelector('iframe'); let t = z ? z.innerText : ''; try { if (f && f.contentDocument) t += ' ' + f.contentDocument.body.innerText; } catch (e) {} return { ouvert:!!z && !z.hidden && z.getBoundingClientRect().width > 300, t:t.replace(/\s+/g, ' ').slice(0, 2000) }; });
               const fr = L.cadre(c.p), tf = fr ? await fr.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')) : o.t; await c.p.evaluate(() => { try { opdFermer('fin'); } catch (e) {} }); return o.ouvert && /(€|HT|TTC|prix|total)/i.test(tf) && /(Envoyer|Envoi|signature)/i.test(tf); }]],
  achats:  [['les demandes de matériel ET les notes de frais de l\'équipe y sont', async c => { const t = await txt(c.p); return /demandes? de matériel/i.test(t) && /notes? de frais/i.test(t); }]],
  produits:[['trois parties : Commandes, Articles, Fournisseurs', async c => { const t = await c.p.evaluate(() => document.getElementById('contenu').innerText); return /Commandes/.test(t) && /Articles/.test(t) && /Fournisseurs/.test(t); }]],
  journee: [['« Continuer » ou « Commencer » (et, au téléphone, « Y aller » et « Appeler ») sur l\'intervention du moment', async c => { const t = await c.p.evaluate(() => [...document.querySelectorAll('#contenu button')].map(b => b.textContent.trim())); return (TEL ? ['Y aller', 'Appeler'] : []).every(m => t.includes(m)) && (t.includes('Continuer') || t.includes('Commencer')); }],
            ['la fiche d\'une intervention porte un compte rendu et la signature du client', async c => { await c.p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button')].find(x => /Continuer|Commencer|Ouvrir/.test(x.textContent)); if (b) b.click(); }); await L.calme(c.p, 900);
               const t = await c.p.evaluate(() => (document.getElementById('contenu').innerText + ' ' + (document.getElementById('calque') || {}).innerText).replace(/\s+/g, ' ')); return /compte rendu/i.test(t) && /signature|signe|signer/i.test(t); }]],
  camion:  [['un champ « Chercher une pièce »', async c => c.p.evaluate(() => [...document.querySelectorAll('#contenu input')].some(i => /Chercher une pièce/i.test(i.placeholder)))],
            ['ce qui manque à bord est en tête', async c => /manque à bord|Il manque/i.test(await txt(c.p))],
            ['« Il me manque une pièce » prévient le bureau', async c => { const t = await c.p.evaluate(() => [...document.querySelectorAll('#contenu button')].map(b => b.textContent.trim())); return t.some(x => /Il me manque une pièce/.test(x)); }]],
  heures:  [['« Je confirme mes heures » (un seul bouton) ou « Tu as confirmé tes heures », et les journées sont là', async c => { const t = await txt(c.p); return /Je confirme mes heures|Tu as confirmé tes heures/.test(t) && /journées/i.test(t); }]],
  frais:   [['« Nouvelle note de frais » (ticket en photo) et « Demande d\'achat »', async c => { const t = await txt(c.p); return /Nouvelle note de frais/.test(t) && /Demande d[’']achat/.test(t); }],
            ['la réponse du bureau se lit sur l\'écran (une demande a son état)', async c => /En attente|Accepté|Refusé|répond/i.test(await txt(c.p))]],
  conges:  [['les jours restants, « Demande de congé », et les demandes avec leur réponse', async c => { const t = await txt(c.p); return /restants/.test(t) && /Demande de congé/.test(t) && /Mes demandes/.test(t); }]]
};
(async () => {
  for (const QUI of QUIS) {
    const c = await G.ouvrir(PROFIL, QUI), p = c.p, tag = `${QUI}/${PROFIL}`; c.qui = QUI;
    const pg = await G.pages(c);
    v(`${tag} : population : entre 2 et 6 cartes (${pg.length})`, pg.length >= 2 && pg.length <= 6, pg.map(x => x.k));
    const labels = await p.evaluate(() => rlLignes().map(x => x.l));
    // la SOURCE des textes est GUIDE-NOUVEAUTES.md : la page et le document disent la même chose, mot pour mot
    for (const x of pg) { const dans = s => MD.includes(String(s).replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' '));
      v(`${tag} : « ${x.t} » : le titre est écrit dans GUIDE-NOUVEAUTES.md`, dans(x.t), x.t);
      if (x.k === 'menu') for (const l of x.lignes) v(`${tag} : la ligne « ${l} » est écrite dans GUIDE-NOUVEAUTES.md`, dans(l), l);
      else v(`${tag} : « ${x.t} » : la phrase est écrite dans GUIDE-NOUVEAUTES.md`, dans(x.texte), x.texte); }
    for (const x of pg) {
      const nt = G.mots(x.t), nd = x.k === 'menu' ? 0 : G.mots(x.texte);
      v(`${tag} : « ${x.t} » : titre de 2 à 5 mots (${nt})`, nt >= 2 && nt <= 5, nt);
      if (x.k !== 'menu') { v(`${tag} : « ${x.t} » : UNE phrase de 20 mots au plus (${nd})`, nd >= 6 && nd <= 20, x.texte);
        v(`${tag} : « ${x.t} » : une seule phrase (un seul point final)`, (x.texte.match(/[.!?](\s|$)/g) || []).length === 1, x.texte); }
      v(`${tag} : « ${x.t} » : aucun mot technique`, !TECHNIQUES.test(x.t + ' ' + x.texte), x.t + ' ' + x.texte);
      v(`${tag} : « ${x.t} » : aucune majuscule criée ni point d'exclamation`, !/!|[A-ZÉ]{6,}/.test(x.t + ' ' + x.texte.replace(/OP GESTION|TVA/g, '')), x.texte);
    }
    // la première carte : trois lignes, l'ancien nom n'est plus un nom du menu, le nouveau en est un
    const m = pg[0];
    v(`${tag} : la première carte dit exactement 3 lignes « ancien → nouveau » (${m.lignes.length})`, m.lignes.length === 3, m.lignes);
    for (const l of m.lignes) { const [a, b] = l.split(/\s*→\s*/); if (!b) { v(`${tag} : ligne « ${l} » : deux parties`, false, l); continue; }
      const nouveau = /^Menu, en haut/.test(b);
      v(`${tag} : ligne « ${l} » : le nouveau nom est un nom du menu de cette personne`, nouveau ? TEL : labels.some(x => G.sansAccent(x) === G.sansAccent(b)), { b, labels });
      v(`${tag} : ligne « ${l} » : l'ancien nom n'est plus un nom du menu (sinon la carte mentirait)`, !labels.some(x => G.sansAccent(x) === G.sansAccent(a.replace(/^Le bouton « (.*) »$/, '$1'))), { a, labels }); }
    v(`${tag} : ${TEL ? 'au téléphone la première ligne est « Plus → Menu, en haut à gauche »' : 'à l\'ordinateur aucune ligne ne parle du bouton Plus'}`, TEL ? /Plus/.test(m.lignes[0]) && /Menu, en haut à gauche/.test(m.lignes[0]) : !m.lignes.some(l => /Plus/.test(l)), m.lignes);
    // les promesses : on ouvre l'écran et on cherche ce que la phrase dit
    for (const x of pg.filter(y => y.k !== 'menu')) {
      const liste = PROMESSES[x.k];
      v(`${tag} : « ${x.t} » : une promesse vérifiable est écrite pour cette carte`, !!liste, x.k);
      if (!liste) continue;
      for (const [nom, fn] of liste) {
        await p.evaluate(() => { try { document.getElementById('nv')?.remove(); fermerPanneau(); aller(rlOuverture()); } catch (e) {} }); await L.calme(p, 500);
        await L.aller(p, x.voir); await L.calme(p, 700);
        const cadre = L.cadre(p); let ok = false, err = '';
        try { ok = await fn(c, cadre || p); } catch (e) { err = e.message.slice(0, 160); }
        v(`${tag} : « ${x.t} » promet : ${nom}`, !!ok, err);
      }
    }
    // la recherche retrouve les ANCIENS noms (le guide les cite, la recherche les connaît)
    const avant = pg[0].lignes.map(l => l.split(/\s*→\s*/)).filter(([a]) => !/Plus/.test(a));
    if (!TEL) for (const [a, b] of avant) { const r = await p.evaluate(({ q }) => { try { PAL = null; palOuvrir(); PAL.q = q; PAL.i = 0; return palFiltre().map(e => e.l).slice(0, 12); } catch (e) { return ['ERREUR ' + e.message]; } finally { try { palFermer(false); } catch (e) {} } }, { q:a.split(',')[0] });
      v(`${tag} : la recherche « ${a.split(',')[0]} » retrouve « ${b} »`, r.some(x => G.sansAccent(x).includes(G.sansAccent(b.split(',')[0]))), r); }
    v(`${tag} : aucune erreur de console`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });

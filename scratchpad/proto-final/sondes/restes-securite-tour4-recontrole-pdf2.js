// RECONTRÔLE ADVERSE du tour 4, passe PDF (2) : le vrai fichier PDF de la facture et du contrat de l'application (docEnPdf), client au nom de 112 signes, adresse 160, + signes hors WinAnsi dans le nom. 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/pdf-rec4/'; fs.mkdirSync(SORTIE, { recursive: true });
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
const ADR = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur, parking visiteurs à droite du portail'.slice(0, 160);
const EXO = 'Café « Chez Léa » → ✓ œuvre 🇫🇷 été 👨‍👩‍👧 ≥ 5 — N°1 ’s';
(async () => {
  for (const [tag, nom] of [['long', NOM], ['exotique', EXO]]) {
    const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const r = await p.evaluate(async o => { const f = FACTURES.find(x => CLIENTS[x.cli] && CLIENTS[x.cli].type === 'pro') || FACTURES[0]; Object.assign(CLIENTS[f.cli], cliNet({ nom: o.nom, contact: o.nom.slice(0, 40), adr: o.adr, tel: '05 46 12 34 56', mail: 'syndic@jardins-du-port.example.fr' }));
      ACTIONS.pdfFacture({ dataset: { id: f.id } }); await new Promise(r => setTimeout(r, 700));
      const el = document.querySelector('.panneau .pdf'); if (!el) return { err: 'pas de document' };
      const out = docEnPdf(el, 'facture-essai'); const u = out.octets; let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), pages: out.pages, n: u.length }; }, { nom, adr: ADR });
    v(tag + ' · le PDF de la facture est fabriqué', !!r.b64, r.err || { pages: r.pages, octets: r.n });
    if (r.b64) {
      const f = SORTIE + 'facture-' + tag + '.pdf'; fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', f, '-']).stdout.toString(), plat = txt.replace(/\s+/g, ' ');
      console.log('  · extrait :', plat.slice(0, 400));
      if (tag === 'long') { v('long · PDF : le nom entier est écrit (aucune coupe)', plat.includes('Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112).replace(/ +/g, ' ')) || /représenté par son/.test(plat), plat.slice(plat.indexOf('Syndicat'), plat.indexOf('Syndicat') + 160));
        v('long · PDF : aucun « ? » ni « � » dans le texte', !/[?�]/.test(txt), (txt.match(/.{0,30}[?�].{0,30}/g) || []).slice(0, 3));
        v('long · PDF : l’adresse est écrite (Marins d’Aunis)', /Marins d.Aunis/.test(plat), plat.slice(0, 200)); }
      else { const q = (txt.match(/.{0,25}[?�].{0,25}/g) || []); console.log('  · exotique, « ? » restants :', JSON.stringify(q.slice(0, 5)));
        v('exotique · PDF : aucun « ? » ni « � » (flèche, coche, drapeau, famille, ≥, é décomposé, apostrophe courbe, N°)', q.length === 0, q); }
      cp.spawnSync('pdftoppm', ['-r', '70', '-png', f, SORTIE + 'facture-' + tag]);
    }
    v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

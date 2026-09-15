/* Une base aux PROPORTIONS mesurées chez ELAN le 15 septembre (930 Ko de clair ; box 195 Ko
   dont 79 Ko de _ms, mouvements 156 Ko, journal 104 Ko). Tirage déterministe : un banc qui
   change de verdict d'un jour à l'autre ne vaut rien. Aucune donnée de client réel. */
let g = 20260915;
const tir = n => { g = (g * 1103515245 + 12345) % 2147483648; return g % n; };
const pick = a => a[tir(a.length)];
const uid = () => 'x' + (g = (g * 1103515245 + 12345) % 2147483648).toString(36);

const VILLES = ['Toulouse', 'Blagnac', 'Colomiers', 'Muret', 'Balma', 'Tournefeuille', 'Ramonville', 'Cugnaux', 'L\'Union', 'Portet'];
const ENS = ['Restaurant', 'Boulangerie', 'Supermarché', 'Hôtel', 'Clinique', 'Collège', 'Entrepôt', 'Boucherie', 'Pharmacie', 'Cantine'];
const NOMS = ['Le Gourmet', 'Chez Marie', 'Saint-Roch', 'Les Tilleuls', 'La Fontaine', 'Bellevue', 'Le Moulin', 'Val Fleuri', 'Les Acacias', 'Port Neuf'];
const CIB = ['Rongeurs', 'Blattes', 'Mouches', 'Fourmis', 'Punaises', 'Guêpes', 'Désinfection'];
const ZONES = ['Cuisine', 'Réserve', 'Local technique', 'Vestiaire', 'Chambre froide', 'Plonge', 'Quai de livraison', 'Sous-sol'];
const CAT = ['Rodonticide', 'Insecticide', 'Piège', 'Désinfectant', 'Matériel', 'EPI', 'Appât', 'Consommable'];
const MOTS = ('intervention traitement appât poste contrôle rongeur blatte souris rat mouche piège gel '
  + 'pulvérisation nettoyage désinfection passage relevé consommation stock reçu validé technicien').split(' ');
const phrase = n => Array.from({ length: n }, () => pick(MOTS)).join(' ');
const J = 1757000000000;

const clients = Array.from({ length: 80 }, (_, i) => ({
  id: 'c' + i, nom: pick(ENS) + ' ' + pick(NOMS) + ' ' + i, ville: pick(VILLES),
  adresse: (1 + tir(120)) + ' rue ' + pick(NOMS), cp: '31' + String(100 + tir(800)),
  tel: '05' + String(10000000 + tir(80000000)), email: 'contact' + i + '@exemple.fr',
  notes: phrase(14), contrat: tir(2) ? 'Annuel' : '', cree: J - tir(400) * 86400000,
}));

const produits = Array.from({ length: 220 }, (_, i) => ({
  id: 'p' + i, nom: pick(CIB) + ' ' + pick(NOMS) + ' ' + i, cat: pick(CAT),
  unite: pick(['u', 'L', 'mL', 'kg', 'g', 'carton']), stock: tir(60), seuil: tir(10),
  ref: 'REF-' + (1000 + i), fournisseur: 'f' + tir(5), amm: String(2000000 + tir(9000000)),
  tp: pick(['TP14', 'TP18', 'TP02']), notes: phrase(10), cree: J - tir(300) * 86400000, creePar: 'u' + tir(7),
}));

/* La box est l'enregistrement le plus lourd : son stock, et `_ms` — une date par ligne. */
const boxes = Array.from({ length: 18 }, (_, i) => {
  const stock = {}, _ms = {};
  const n = 40 + tir(70);
  for (let k = 0; k < n; k++) { const p = 'p' + tir(220); stock[p] = tir(40); _ms[p] = J - tir(90) * 86400000; }
  return { id: 'b' + i, nom: pick(ZONES) + ' — ' + pick(ENS) + ' ' + pick(NOMS), clientId: 'c' + tir(80),
    zone: pick(ZONES), stock, _ms, _m: J - tir(30) * 86400000, notes: phrase(12) };
});

const interventions = Array.from({ length: 300 }, (_, i) => ({
  id: 'i' + i, num: 'INT-2026-' + String(1000 + i), clientId: 'c' + tir(80),
  titre: pick(CIB) + ' · ' + pick(ZONES), date: new Date(J - tir(200) * 86400000).toISOString().slice(0, 10),
  statut: pick(['planifiee', 'faite', 'facturee', 'annulee']), technicien: 'u' + tir(7),
  duree: 30 + tir(120), rapport: phrase(45), lignes: Array.from({ length: 1 + tir(5) }, () => ({
    produit: 'p' + tir(220), qte: 1 + tir(8), unite: pick(['u', 'mL', 'g']) })),
  adresse: (1 + tir(120)) + ' rue ' + pick(NOMS) + ', ' + pick(VILLES), cree: J - tir(200) * 86400000,
}));

const mouvements = Array.from({ length: 900 }, (_, i) => ({
  id: 'm' + i, ts: J - tir(180) * 86400000, produit: 'p' + tir(220), box: 'b' + tir(18),
  qte: -(1 + tir(6)), unite: pick(['u', 'mL', 'g']), motif: phrase(6), par: 'u' + tir(7),
  intervention: 'i' + tir(300),
}));

/* ⛔ LE SCHÉMA EST CELUI QUE `logEvent()` ÉCRIT, PAS UN SCHÉMA PLAUSIBLE. Ce générateur posait
   `titre`/`cat`/`par` ; la vraie ligne de journal porte `action`/`type`/`userNom` (app.html,
   `logEvent`). Conséquence mesurée le 15 septembre 2026 : 498 lignes sur 500 sortaient avec un
   `type` à `undefined`, l'écran Historique affichait une puce de filtre « undefined », et tout
   test de filtrage bâti dessus jugeait autre chose que l'application. Un banc qui ne parle pas
   le schéma réel ne prouve rien — c'est la même faute que mesurer `go()` au lieu du rendu. */
const journal = Array.from({ length: 500 }, (_, i) => ({
  id: 'j' + i, ts: J - tir(60) * 86400000, action: phrase(3), detail: phrase(16),
  type: pick(['stock', 'sync', 'auth', 'finance', 'plan']),
  userId: 'u' + tir(7), userNom: 'Prénom' + tir(7) + ' Nom' + tir(7),
}));

const users = Array.from({ length: 14 }, (_, i) => ({
  id: 'u' + i, prenom: 'Prénom' + i, nom: 'Nom' + i, login: 'u' + i,
  role: i === 0 ? 'admin' : pick(['tech', 'dr', 'tech', 'tech']), actif: true, pinHash: '',
}));

const devis = Array.from({ length: 40 }, (_, i) => ({ id: 'd' + i, num: 'DEV-2026-' + (100 + i), clientId: 'c' + tir(80),
  date: new Date(J - tir(150) * 86400000).toISOString().slice(0, 10), statut: pick(['brouillon', 'envoye', 'accepte']),
  lignes: Array.from({ length: 2 + tir(6) }, () => ({ des: phrase(7), qte: 1 + tir(4), pu: 20 + tir(300) })), notes: phrase(20) }));
const factures = Array.from({ length: 60 }, (_, i) => ({ id: 'f' + i, num: 'FAC-2026-' + (100 + i), clientId: 'c' + tir(80),
  date: new Date(J - tir(150) * 86400000).toISOString().slice(0, 10), statut: pick(['due', 'payee']), montant: 100 + tir(2000),
  lignes: Array.from({ length: 2 + tir(5) }, () => ({ des: phrase(7), qte: 1 + tir(4), pu: 20 + tir(300) })) }));
const bons = Array.from({ length: 50 }, (_, i) => ({ id: 'bo' + i, num: 'BC-2026-' + (100 + i), fournisseur: 'f' + tir(5),
  date: new Date(J - tir(150) * 86400000).toISOString().slice(0, 10), lignes: Array.from({ length: 2 + tir(8) }, () => ({ produit: 'p' + tir(220), qte: 1 + tir(20) })) }));
const fournisseurs = Array.from({ length: 5 }, (_, i) => ({ id: 'f' + i, nom: 'Fournisseur ' + i, email: 'info' + i + '@ex.fr', notes: phrase(18) }));
const techniciens = users.filter(u => u.role === 'tech').map(u => ({ id: 't' + u.id, nom: u.prenom + ' ' + u.nom, userId: u.id }));

const db = { users, clients, produits, boxes, interventions, mouvements, journal, devis, factures, bons,
  fournisseurs, techniciens, enveloppes: [], vehicules: [], demandes: [], contrats: [], pointages: [],
  messages: [], groupes: [], conducteurs: [], produitsDonnes: [], brouillons: [], champsPerso: [],
  taches: [], absences: [], chantiers: [], telecollectes: [], registres: [], numMax: 2000 };

const s = JSON.stringify(db);
require('fs').writeFileSync(process.argv[2] || 'base-elan-like.json', s);
console.log('base écrite : ' + (Buffer.byteLength(s) / 1024).toFixed(1) + ' Ko · '
  + Object.entries(db).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => k + ' ' + v.length).join(' · '));

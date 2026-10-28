# tests/facturx — les données du banc Factur-X (test-3134)

Rien ici n'est du code de l'application. Ce sont des **données publiques** extraites du jar du validateur Mustang
(`ZUGFeRD/mustangproject`, version 2.26.0, publiée le 25 août 2026), pour que le banc contrôle le XML Factur-X sans Java :

| fichier | ce que c'est | d'où |
|---|---|---|
| `CrossIndustryInvoice_*.xsd` (4 fichiers) | le schéma UN/CEFACT CII 100.D16B, tel quel (avis de copyright UN/CEFACT conservé en tête de chaque fichier) | `external/schemas/d16b/data/standard/` du jar |
| `cii-d16b.json` | l'ordre et la cardinalité des éléments de ce schéma, réduits à ce que le banc rejoue sans `xmllint` | `scripts/facturx-schemas.py` |
| `codes.json` | les listes de codes du profil EN 16931 (Factur-X 1.09.2) que notre XML emploie | `schematron/ZF_250/FACTUR-X_EN16931_codedb.xml`, par le même script |

Régénérer : décompresser le jar dans un dossier, puis `python3 -I scripts/facturx-schemas.py <dossier>`.

⚠️ Ce que ces fichiers ne sont PAS : le Schematron lui-même (XPath 2, qui demande Saxon). Les règles EN 16931 que le banc rejoue
sont écrites à la main dans `tests/test-3134.js` d'après `FACTUR-X_EN16931.sch`, chacune sous son identifiant (BR-CO-15…).

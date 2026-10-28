#!/usr/bin/env python3
"""Extrait, du jar du validateur Mustang (ZUGFeRD/mustangproject), les DONNÉES dont tests/test-3134.js a besoin :

  tests/facturx/cii-d16b.json   l'ordre et la cardinalité des éléments du schéma CII (UN/CEFACT 100.D16B) — le schéma de toute
                                facture Factur-X. Le banc s'en sert pour vérifier un XML SANS xmllint ni Java (qui, eux,
                                valident le vrai .xsd quand ils sont là : le banc le dit).
  tests/facturx/codes.json      les listes de codes du profil EN 16931 (FACTUR-X_EN16931_codedb.xml, Factur-X 1.09.2) que
                                notre XML emploie : type de document, moyens de paiement, exemptions de TVA, unités, etc.

Usage : python3 scripts/facturx-schemas.py <dossier où le jar est décompressé> (il doit contenir external/ et schematron/).
Les .xsd UN/CEFACT et les listes Factur-X sont des textes publics ; on n'en recopie que ce qui sert à contrôler.
"""
import json, os, sys
from lxml import etree

def main(src):
    ns = {'xsd': 'http://www.w3.org/2001/XMLSchema'}
    base = os.path.join(src, 'external/schemas/d16b/data/standard')
    types = {}
    for fich, pref in (('CrossIndustryInvoice_100pD16B.xsd', 'rsm'), ('CrossIndustryInvoice_ReusableAggregateBusinessInformationEntity_100pD16B.xsd', 'ram')):
        t = etree.parse(os.path.join(base, fich))
        for ct in t.iterfind('.//xsd:complexType', ns):
            seq = ct.find('xsd:sequence', ns)
            if seq is None:
                continue
            kids = []
            for e in seq.iterfind('xsd:element', ns):
                mx = e.get('maxOccurs', '1'); mx = -1 if mx == 'unbounded' else int(mx)
                # un enfant déclaré (`name`, de l'espace du type) ou référencé (`ref`, déjà qualifié : udt:DateTimeString)
                kids.append([e.get('name') or e.get('ref'), e.get('type'), int(e.get('minOccurs', '1')), mx])
            types[pref + ':' + ct.get('name')] = kids
    root = etree.parse(os.path.join(base, 'CrossIndustryInvoice_100pD16B.xsd')).find('.//xsd:element[@name="CrossIndustryInvoice"]', ns).get('type')
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tests/facturx')
    json.dump({'racine': root, 'types': types}, open(os.path.join(out, 'cii-d16b.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    db = etree.parse(os.path.join(src, 'schematron/ZF_250/FACTUR-X_EN16931_codedb.xml'))
    cls = {cl.get('id'): [e.get('value') for e in cl.iterfind('enumeration')] for cl in db.iterfind('.//cl')}
    # numéro de liste → ce qu'elle contrôle (relevé dans FACTUR-X_EN16931.sch : <let name="codeValueN" …>)
    noms = {'1': 'guideline', '2': 'typeDocument', '4': 'sujetNote', '8': 'unite', '10': 'categorieTva', '15': 'schemeGlobalId', '16': 'schemeOrganisation',
            '18': 'schemeTvaAcheteur', '25': 'moyenPaiement', '26': 'exemptionTva', '28': 'exigibilite'}
    json.dump({noms[k]: cls[k] for k in noms}, open(os.path.join(out, 'codes.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('types :', len(types), '· racine :', root, '· listes :', len(noms))

if __name__ == '__main__':
    main(sys.argv[1])

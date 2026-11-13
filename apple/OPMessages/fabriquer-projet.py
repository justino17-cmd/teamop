#!/usr/bin/env python3
"""Fabrique OPMessages.xcodeproj/project.pbxproj — le projet Xcode du prototype d'OP MESSAGES (une cible, iPhone, iPad et Mac).

Le projet utilise un DOSSIER SYNCHRONISÉ (Xcode 16 et suivants) : tout ce qui est dans OPMessages/ fait partie de l'application
(les .swift sont compilés, Assets.xcassets et Web/index.html sont embarqués). Ajouter un fichier dans ce dossier suffit, sans
retoucher ce script.

    python3 apple/OPMessages/fabriquer-projet.py             écrit le projet
    python3 apple/OPMessages/fabriquer-projet.py --verifier   ne touche à rien ; sort en 1 si le projet du dépôt n'est plus celui-ci

⚠️ Écrit et contrôlé SANS Xcode (session Linux) : accolades et parenthèses appariées, chaque référence définie une fois. Il n'a
   jamais été ouvert ni compilé par Xcode au moment où ce script a été écrit. Le secours est `project.yml` (XcodeGen).
"""
import os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, 'OPMessages.xcodeproj', 'project.pbxproj')


def ident(n):
    return 'A1F0C0DE000000000000%04X' % n


(PRODUIT, DOSSIER, CADRES, RACINE, PRODUITS, CIBLE, SOURCES, RESSOURCES, PROJET,
 LISTE_PROJET, LISTE_CIBLE, PROJET_DEBUG, PROJET_RELEASE, CIBLE_DEBUG, CIBLE_RELEASE) = [ident(i) for i in range(1, 16)]

COMMUN = [
    'ALWAYS_SEARCH_USER_PATHS = NO;',
    'ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;',
    'CLANG_ANALYZER_NONNULL = YES;',
    'CLANG_ENABLE_MODULES = YES;',
    'CLANG_ENABLE_OBJC_ARC = YES;',
    'CLANG_ENABLE_OBJC_WEAK = YES;',
    'COPY_PHASE_STRIP = NO;',
    'ENABLE_STRICT_OBJC_MSGSEND = YES;',
    'ENABLE_USER_SCRIPT_SANDBOXING = YES;',
    'GCC_NO_COMMON_BLOCKS = YES;',
    'GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;',
    'GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;',
    'GCC_WARN_UNUSED_FUNCTION = YES;',
    'GCC_WARN_UNUSED_VARIABLE = YES;',
    'LOCALIZATION_PREFERS_STRING_CATALOGS = YES;',
]
PROPRE_DEBUG = [
    'DEBUG_INFORMATION_FORMAT = dwarf;',
    'ENABLE_TESTABILITY = YES;',
    'GCC_OPTIMIZATION_LEVEL = 0;',
    'ONLY_ACTIVE_ARCH = YES;',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";',
    'SWIFT_OPTIMIZATION_LEVEL = "-Onone";',
]
PROPRE_RELEASE = [
    'DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";',
    'ENABLE_NS_ASSERTIONS = NO;',
    'SWIFT_COMPILATION_MODE = wholemodule;',
    'SWIFT_OPTIMIZATION_LEVEL = "-O";',
    'VALIDATE_PRODUCT = YES;',
]
REGLAGES_CIBLE = [
    'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;',
    'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;',
    'CODE_SIGN_ENTITLEMENTS = OPMessages/OPMessages.entitlements;',
    # sur Mac : « Signer pour exécuter localement » — l'application se lance sans compte développeur
    '"CODE_SIGN_IDENTITY[sdk=macosx*]" = "-";',
    'CODE_SIGN_STYLE = Automatic;',
    'CURRENT_PROJECT_VERSION = 1;',
    'DEVELOPMENT_TEAM = "";',
    'ENABLE_HARDENED_RUNTIME = YES;',
    'ENABLE_PREVIEWS = YES;',
    'GENERATE_INFOPLIST_FILE = YES;',
    'INFOPLIST_KEY_CFBundleDisplayName = "OP MESSAGES";',
    'INFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.business";',
    '"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphoneos*]" = YES;',
    '"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphonesimulator*]" = YES;',
    '"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphoneos*]" = YES;',
    '"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphonesimulator*]" = YES;',
    '"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphoneos*]" = YES;',
    '"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphonesimulator*]" = YES;',
    'INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
    'INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
    'IPHONEOS_DEPLOYMENT_TARGET = 17.0;',
    'LD_RUNPATH_SEARCH_PATHS = "@executable_path/Frameworks";',
    '"LD_RUNPATH_SEARCH_PATHS[sdk=macosx*]" = "@executable_path/../Frameworks";',
    'MACOSX_DEPLOYMENT_TARGET = 14.0;',
    'MARKETING_VERSION = 0.1;',
    'PRODUCT_BUNDLE_IDENTIFIER = fr.teamop.opmessages.prototype;',
    'PRODUCT_NAME = "$(TARGET_NAME)";',
    'SDKROOT = auto;',
    'SUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx";',
    'SWIFT_EMIT_LOC_STRINGS = YES;',
    'SWIFT_VERSION = 5.0;',
    'TARGETED_DEVICE_FAMILY = "1,2";',
]


def configuration(ident_, nom, reglages):
    corps = '\n'.join('\t\t\t\t' + r for r in sorted(reglages, key=lambda r: r.strip('"').lower()))
    return ('\t\t%s /* %s */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n%s\n\t\t\t};\n\t\t\tname = %s;\n\t\t};\n'
            % (ident_, nom, corps, nom))


def liste(ident_, titre, a, b):
    return ('\t\t%s /* Build configuration list for %s */ = {\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n'
            '\t\t\t\t%s /* Debug */,\n\t\t\t\t%s /* Release */,\n\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n'
            '\t\t\tdefaultConfigurationName = Release;\n\t\t};\n' % (ident_, titre, a, b))


def phase(ident_, genre, nom):
    return ('\t\t%s /* %s */ = {\n\t\t\tisa = %s;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n'
            '\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n' % (ident_, nom, genre))


def fabriquer():
    t = '// !$*UTF8*$!\n{\n\tarchiveVersion = 1;\n\tclasses = {\n\t};\n\tobjectVersion = 77;\n\tobjects = {\n\n'
    t += '/* Begin PBXFileReference section */\n'
    t += ('\t\t%s /* OPMessages.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; '
          'path = OPMessages.app; sourceTree = BUILT_PRODUCTS_DIR; };\n' % PRODUIT)
    t += '/* End PBXFileReference section */\n\n'
    t += '/* Begin PBXFileSystemSynchronizedRootGroup section */\n'
    t += ('\t\t%s /* OPMessages */ = {\n\t\t\tisa = PBXFileSystemSynchronizedRootGroup;\n\t\t\tpath = OPMessages;\n'
          '\t\t\tsourceTree = "<group>";\n\t\t};\n' % DOSSIER)
    t += '/* End PBXFileSystemSynchronizedRootGroup section */\n\n'
    t += '/* Begin PBXFrameworksBuildPhase section */\n' + phase(CADRES, 'PBXFrameworksBuildPhase', 'Frameworks')
    t += '/* End PBXFrameworksBuildPhase section */\n\n'
    t += '/* Begin PBXGroup section */\n'
    t += ('\t\t%s = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t%s /* OPMessages */,\n\t\t\t\t%s /* Products */,\n\t\t\t);\n'
          '\t\t\tsourceTree = "<group>";\n\t\t};\n' % (RACINE, DOSSIER, PRODUITS))
    t += ('\t\t%s /* Products */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t%s /* OPMessages.app */,\n\t\t\t);\n'
          '\t\t\tname = Products;\n\t\t\tsourceTree = "<group>";\n\t\t};\n' % (PRODUITS, PRODUIT))
    t += '/* End PBXGroup section */\n\n'
    t += '/* Begin PBXNativeTarget section */\n'
    t += ('\t\t%s /* OPMessages */ = {\n\t\t\tisa = PBXNativeTarget;\n'
          '\t\t\tbuildConfigurationList = %s /* Build configuration list for PBXNativeTarget "OPMessages" */;\n'
          '\t\t\tbuildPhases = (\n\t\t\t\t%s /* Sources */,\n\t\t\t\t%s /* Frameworks */,\n\t\t\t\t%s /* Resources */,\n\t\t\t);\n'
          '\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);\n'
          '\t\t\tfileSystemSynchronizedGroups = (\n\t\t\t\t%s /* OPMessages */,\n\t\t\t);\n'
          '\t\t\tname = OPMessages;\n\t\t\tpackageProductDependencies = (\n\t\t\t);\n\t\t\tproductName = OPMessages;\n'
          '\t\t\tproductReference = %s /* OPMessages.app */;\n\t\t\tproductType = "com.apple.product-type.application";\n\t\t};\n'
          % (CIBLE, LISTE_CIBLE, SOURCES, CADRES, RESSOURCES, DOSSIER, PRODUIT))
    t += '/* End PBXNativeTarget section */\n\n'
    t += '/* Begin PBXProject section */\n'
    t += ('\t\t%s /* Project object */ = {\n\t\t\tisa = PBXProject;\n\t\t\tattributes = {\n\t\t\t\tBuildIndependentTargetsInParallel = 1;\n'
          '\t\t\t\tLastSwiftUpdateCheck = 1600;\n\t\t\t\tLastUpgradeCheck = 1600;\n\t\t\t\tTargetAttributes = {\n'
          '\t\t\t\t\t%s = {\n\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;\n\t\t\t\t\t};\n\t\t\t\t};\n\t\t\t};\n'
          '\t\t\tbuildConfigurationList = %s /* Build configuration list for PBXProject "OPMessages" */;\n'
          '\t\t\tdevelopmentRegion = fr;\n\t\t\thasScannedForEncodings = 0;\n\t\t\tknownRegions = (\n\t\t\t\tfr,\n\t\t\t\tBase,\n\t\t\t);\n'
          '\t\t\tmainGroup = %s;\n\t\t\tminimizedProjectReferenceProxies = 1;\n\t\t\tpreferredProjectObjectVersion = 77;\n'
          '\t\t\tproductRefGroup = %s /* Products */;\n\t\t\tprojectDirPath = "";\n\t\t\tprojectRoot = "";\n'
          '\t\t\ttargets = (\n\t\t\t\t%s /* OPMessages */,\n\t\t\t);\n\t\t};\n' % (PROJET, CIBLE, LISTE_PROJET, RACINE, PRODUITS, CIBLE))
    t += '/* End PBXProject section */\n\n'
    t += '/* Begin PBXResourcesBuildPhase section */\n' + phase(RESSOURCES, 'PBXResourcesBuildPhase', 'Resources')
    t += '/* End PBXResourcesBuildPhase section */\n\n'
    t += '/* Begin PBXSourcesBuildPhase section */\n' + phase(SOURCES, 'PBXSourcesBuildPhase', 'Sources')
    t += '/* End PBXSourcesBuildPhase section */\n\n'
    t += '/* Begin XCBuildConfiguration section */\n'
    t += configuration(PROJET_DEBUG, 'Debug', COMMUN + PROPRE_DEBUG) + configuration(PROJET_RELEASE, 'Release', COMMUN + PROPRE_RELEASE)
    t += configuration(CIBLE_DEBUG, 'Debug', REGLAGES_CIBLE) + configuration(CIBLE_RELEASE, 'Release', REGLAGES_CIBLE)
    t += '/* End XCBuildConfiguration section */\n\n'
    t += '/* Begin XCConfigurationList section */\n'
    t += liste(LISTE_PROJET, 'PBXProject "OPMessages"', PROJET_DEBUG, PROJET_RELEASE)
    t += liste(LISTE_CIBLE, 'PBXNativeTarget "OPMessages"', CIBLE_DEBUG, CIBLE_RELEASE)
    t += '/* End XCConfigurationList section */\n'
    t += '\t};\n\trootObject = %s /* Project object */;\n}\n' % PROJET
    return t


def controler(t):
    """Ce qu'on peut vérifier sans Xcode. → liste des défauts (vide = rien trouvé)."""
    defauts = []
    nu = re.sub(r'/\*.*?\*/', '', t)                                   # les commentaires ne comptent pas
    nu = re.sub(r'"(?:[^"\\]|\\.)*"', '""', nu)                        # ni le contenu des chaînes
    for o, f in ('{}', '()'):
        if nu.count(o) != nu.count(f):
            defauts.append('%s et %s ne sont pas appariés (%d contre %d)' % (o, f, nu.count(o), nu.count(f)))
    definis = re.findall(r'^\t\t(A1F0C0DE[0-9A-F]{16})(?: /\*.*?\*/)? = \{', t, flags=re.M)
    if len(definis) != len(set(definis)):
        defauts.append('un identifiant est défini deux fois')
    for r in sorted(set(re.findall(r'\bA1F0C0DE[0-9A-F]{16}\b', t)) - set(definis)):
        defauts.append('référence sans objet : ' + r)
    if len(definis) != 15:
        defauts.append('15 objets attendus, %d trouvés' % len(definis))
    for ligne in nu.split('\n'):
        l = ligne.strip()
        if l and not l.endswith((';', '{', '(', ',', '}')) and not l.startswith('//'):
            defauts.append('ligne qui ne se termine pas : ' + l[:60])
    for attendu in ('objectVersion = 77;', 'isa = PBXFileSystemSynchronizedRootGroup;', 'SUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx";',
                    'productType = "com.apple.product-type.application";', 'rootObject = ' + PROJET):
        if attendu not in t:
            defauts.append('manque : ' + attendu)
    return defauts


if __name__ == '__main__':
    texte = fabriquer()
    defauts = controler(texte)
    if defauts:
        print('\n'.join('✗ ' + d for d in defauts))
        sys.exit(1)
    if '--verifier' in sys.argv:
        actuel = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else ''
        if actuel != texte:
            print('le projet du dépôt n’est plus celui que fabrique ce script : relancer sans --verifier')
            sys.exit(1)
        print('projet à jour, contrôles passés (15 objets, références toutes définies)')
    else:
        os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
        open(SORTIE, 'w', encoding='utf-8').write(texte)
        print('écrit : OPMessages.xcodeproj/project.pbxproj (%d caractères, 15 objets)' % len(texte))

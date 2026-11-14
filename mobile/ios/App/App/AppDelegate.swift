import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // ── La barre de menus du Mac : un menu « Aller » avec les raccourcis de l'application ──
    // Chaque commande appelle `window.opgRaccourci(nom)` dans la page de la fenêtre active ; la page garde aussi ses
    // propres écouteurs de clavier (un navigateur n'a pas cette barre de menus). Sans effet visible sur iPhone.
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == UIMenuSystem.main else { return }
        let rechercher = UIKeyCommand(title: "Rechercher ou aller à…", action: #selector(opgPalette), input: "k", modifierFlags: .command)
        let precedent = UIKeyCommand(title: "Écran précédent", action: #selector(opgPrecedent), input: "[", modifierFlags: .command)
        let suivant = UIKeyCommand(title: "Écran suivant", action: #selector(opgSuivant), input: "]", modifierFlags: .command)
        var rubriques: [UIKeyCommand] = []
        for n in 1...9 {
            rubriques.append(UIKeyCommand(title: "Rubrique \(n) du menu", action: #selector(opgRubrique(_:)), input: "\(n)", modifierFlags: .command, propertyList: n))
        }
        let aide = UICommand(title: "Raccourcis clavier et gestes", action: #selector(opgAide))
        let aller = UIMenu(title: "Aller", children: [
            UIMenu(title: "", options: .displayInline, children: [rechercher]),
            UIMenu(title: "", options: .displayInline, children: [precedent, suivant]),
            UIMenu(title: "", options: .displayInline, children: rubriques),
            UIMenu(title: "", options: .displayInline, children: [aide])
        ])
        builder.insertSibling(aller, afterMenu: .view)
        // Un menu « Créer » : les mêmes gestes que les touches N, D, C et A de la page (sans raccourci ici : une lettre seule
        // dans la barre de menus volerait la frappe dans un champ).
        let creer = UIMenu(title: "Créer", children: [
            UICommand(title: "Nouvelle intervention", action: #selector(opgCreer(_:)), propertyList: "intervention"),
            UICommand(title: "Nouveau devis", action: #selector(opgCreer(_:)), propertyList: "devis"),
            UICommand(title: "Nouveau client", action: #selector(opgCreer(_:)), propertyList: "client"),
            UICommand(title: "Nouvelle tâche", action: #selector(opgCreer(_:)), propertyList: "tache")
        ])
        builder.insertSibling(creer, afterMenu: .view)
    }

    private func opgEnvoyer(_ nom: String) {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
        let fenetre = scene?.windows.first(where: { $0.isKeyWindow }) ?? scene?.windows.first
        guard let pont = fenetre?.rootViewController as? CAPBridgeViewController else { return }
        pont.webView?.evaluateJavaScript("window.opgRaccourci && window.opgRaccourci('\(nom)')", completionHandler: nil)
    }

    @objc func opgPalette() { opgEnvoyer("palette") }
    @objc func opgPrecedent() { opgEnvoyer("precedent") }
    @objc func opgSuivant() { opgEnvoyer("suivant") }
    @objc func opgAide() { opgEnvoyer("aide") }
    @objc func opgCreer(_ commande: UICommand) {
        if let nom = commande.propertyList as? String { opgEnvoyer(nom) }
    }
    @objc func opgRubrique(_ commande: UICommand) {
        if let n = commande.propertyList as? Int { opgEnvoyer("rubrique\(n)") }
    }
}

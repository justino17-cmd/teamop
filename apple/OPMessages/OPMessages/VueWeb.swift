//  La vue web du prototype : un WKWebView, le même code pour iOS, iPadOS et macOS.
//
//  Ce qu'elle garantit :
//   · la page est lue DANS l'application (Web/index.html) : aucune connexion n'est nécessaire, aucune n'est ouverte ;
//   · un lien vers l'extérieur ne remplace jamais le prototype : il s'ouvre dans le navigateur du système ;
//   · la page s'inspecte depuis Safari (Développement › nom de l'appareil) pour la mettre au point.

import SwiftUI
import WebKit

#if os(macOS)
import AppKit
typealias VueNative = NSViewRepresentable
#else
import UIKit
typealias VueNative = UIViewRepresentable
#endif

struct VueWeb: VueNative {

    func makeCoordinator() -> Coordinateur { Coordinateur() }

    #if os(macOS)
    func makeNSView(context: Context) -> WKWebView { fabriquer(context.coordinator) }
    func updateNSView(_ vue: WKWebView, context: Context) {}
    #else
    func makeUIView(context: Context) -> WKWebView { fabriquer(context.coordinator) }
    func updateUIView(_ vue: WKWebView, context: Context) {}
    #endif

    private func fabriquer(_ coordinateur: Coordinateur) -> WKWebView {
        let reglages = WKWebViewConfiguration()
        #if os(iOS)
        reglages.allowsInlineMediaPlayback = true
        #endif

        let vue = WKWebView(frame: .zero, configuration: reglages)
        vue.navigationDelegate = coordinateur
        vue.uiDelegate = coordinateur
        // Le geste du bord de l'écran (iPhone, iPad) et les deux doigts sur le pavé (Mac) reviennent à l'écran d'avant : la page tient son historique d'écrans.
        vue.allowsBackForwardNavigationGestures = true
        if #available(iOS 16.4, macOS 13.3, *) { vue.isInspectable = true }

        // Le fond derrière la page : celui du thème d'OP MESSAGES, de jour comme de nuit (jamais un éclair blanc à l'ouverture).
        #if os(macOS)
        vue.underPageBackgroundColor = NSColor(name: nil) { apparence in
            apparence.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                ? NSColor(srgbRed: 0x0b / 255, green: 0x16 / 255, blue: 0x33 / 255, alpha: 1)
                : NSColor(srgbRed: 0xf2 / 255, green: 0xf2 / 255, blue: 0xf7 / 255, alpha: 1)
        }
        #else
        let fond = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0x0b / 255, green: 0x16 / 255, blue: 0x33 / 255, alpha: 1)
                : UIColor(red: 0xf2 / 255, green: 0xf2 / 255, blue: 0xf7 / 255, alpha: 1)
        }
        vue.isOpaque = false
        vue.backgroundColor = fond
        vue.scrollView.backgroundColor = fond
        vue.underPageBackgroundColor = fond
        // La page est une coquille d'application : c'est elle qui défile à l'intérieur, pas la vue entière.
        vue.scrollView.contentInsetAdjustmentBehavior = .never
        vue.scrollView.bounces = false
        vue.scrollView.alwaysBounceVertical = false
        #endif

        if let page = Bundle.main.url(forResource: "index", withExtension: "html") {
            vue.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        } else {
            vue.loadHTMLString(
                "<meta name='viewport' content='width=device-width'><p style='font:17px -apple-system;padding:40px'>"
                + "La page du prototype (index.html) n’est pas dans l’application. Lance « node synchroniser.js », puis relance.</p>",
                baseURL: nil)
        }
        return vue
    }
}

final class Coordinateur: NSObject, WKNavigationDelegate, WKUIDelegate {

    // Une adresse de fichier (la page elle-même, ses ancres) reste dans l'application ; tout le reste part dans le navigateur du système.
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let adresse = navigationAction.request.url else { decisionHandler(.cancel); return }
        if adresse.isFileURL || adresse.scheme == "about" || adresse.scheme == "blob" || adresse.scheme == "data" {
            decisionHandler(.allow)
            return
        }
        ouvrirDehors(adresse)
        decisionHandler(.cancel)
    }

    // Un lien « nouvelle fenêtre » (target="_blank") : même règle, dehors.
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let adresse = navigationAction.request.url, !adresse.isFileURL { ouvrirDehors(adresse) }
        return nil
    }

    private func ouvrirDehors(_ adresse: URL) {
        guard let schema = adresse.scheme, ["http", "https", "mailto", "tel"].contains(schema) else { return }
        #if os(macOS)
        NSWorkspace.shared.open(adresse)
        #else
        UIApplication.shared.open(adresse)
        #endif
    }
}

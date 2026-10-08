import SwiftUI
import WebKit

struct CampusWebView: UIViewRepresentable {
    @ObservedObject var health: HealthStore
    func makeCoordinator() -> Coordinator { Coordinator(health: health) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "uqHealth")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: Coordinator.dashboardURL))
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "uqHealth", contentWorld: .page)
        view.navigationDelegate = nil
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
        static let dashboardURL = URL(string: "https://uq-bus-time-board-gxyx.vercel.app/")!
        let health: HealthStore
        init(health: HealthStore) { self.health = health }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.scheme == "https", url.host == Self.dashboardURL.host, url.port == nil || url.port == 443 {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
                if navigationAction.navigationType == .linkActivated, ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
            }
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            let origin = message.frameInfo.securityOrigin
            guard message.frameInfo.isMainFrame, origin.protocol == "https", origin.host == Self.dashboardURL.host,
                  origin.port == 0 || origin.port == 443,
                  let action = message.body as? String, ["status", "connect", "sync", "disconnect"].contains(action) else {
                replyHandler(nil, "Health access is unavailable here."); return
            }
            Task { @MainActor in
                switch action {
                case "connect": await health.connect()
                case "sync": await health.refresh()
                case "disconnect": health.disconnect()
                default: break
                }
                replyHandler(health.payload(), nil)
            }
        }
    }
}

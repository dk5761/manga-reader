import ExpoModulesCore
import WebKit

public class CookieSyncModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CookieSync")

    /// Get cookie string for HTTP headers from WKWebView
    AsyncFunction("getCookieString") { (url: String, promise: Promise) in
      DispatchQueue.main.async {
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        
        cookieStore.getAllCookies { cookies in
          let targetDomain = URL(string: url)?.host ?? ""
          
          let relevantCookies = cookies.filter { cookie in
            self.cookieMatchesDomain(cookie: cookie, targetDomain: targetDomain)
          }
          
          let cookieString = relevantCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
          
          print("[CookieSync] Cookie string for \(targetDomain): \(relevantCookies.count) cookies")
          promise.resolve([
            "cookieString": cookieString,
            "count": relevantCookies.count,
            "domain": targetDomain
          ])
        }
      }
    }

    /// Check if cf_clearance cookie exists for a domain
    AsyncFunction("hasCfClearance") { (url: String, promise: Promise) in
      DispatchQueue.main.async {
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        
        cookieStore.getAllCookies { cookies in
          let targetDomain = URL(string: url)?.host ?? ""
          
          let cfClearance = cookies.first { cookie in
            cookie.name == "cf_clearance" && self.cookieMatchesDomain(cookie: cookie, targetDomain: targetDomain)
          }
          
          let hasClearance = cfClearance != nil
          print("[CookieSync] cf_clearance for \(targetDomain): \(hasClearance)")
          
          promise.resolve([
            "hasCfClearance": hasClearance,
            "domain": targetDomain,
            "cookieValue": cfClearance?.value ?? ""
          ])
        }
      }
    }

    /// Get all cookies from WKWebView for a domain
    AsyncFunction("getCookiesFromWebView") { (url: String, promise: Promise) in
      DispatchQueue.main.async {
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        
        cookieStore.getAllCookies { cookies in
          let targetDomain = URL(string: url)?.host ?? ""
          var cookieList: [[String: Any]] = []
          
          for cookie in cookies {
            if self.cookieMatchesDomain(cookie: cookie, targetDomain: targetDomain) {
              cookieList.append([
                "name": cookie.name,
                "value": cookie.value,
                "domain": cookie.domain,
                "path": cookie.path,
                "isSecure": cookie.isSecure,
                "isHTTPOnly": cookie.isHTTPOnly,
                "expiresDate": cookie.expiresDate?.timeIntervalSince1970 ?? 0
              ])
            }
          }
          
          print("[CookieSync] Found \(cookieList.count) cookies for \(targetDomain)")
          promise.resolve([
            "cookies": cookieList,
            "domain": targetDomain
          ])
        }
      }
    }

    /// Sync cookies from WKWebView to NSHTTPCookieStorage (for URLSession/fetch)
    AsyncFunction("syncCookiesToNative") { (url: String, promise: Promise) in
      DispatchQueue.main.async {
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        
        cookieStore.getAllCookies { cookies in
          var syncedCount = 0
          let targetDomain = URL(string: url)?.host ?? ""
          
          for cookie in cookies {
            if self.cookieMatchesDomain(cookie: cookie, targetDomain: targetDomain) {
              HTTPCookieStorage.shared.setCookie(cookie)
              syncedCount += 1
              print("[CookieSync] Synced: \(cookie.name) for \(cookie.domain)")
            }
          }
          
          print("[CookieSync] Synced \(syncedCount) cookies for \(targetDomain)")
          promise.resolve([
            "success": true,
            "syncedCount": syncedCount,
            "domain": targetDomain
          ])
        }
      }
    }
  }
  
  /// Helper to check if a cookie matches the target domain
  private func cookieMatchesDomain(cookie: HTTPCookie, targetDomain: String) -> Bool {
    let cookieDomain = cookie.domain.hasPrefix(".") ? String(cookie.domain.dropFirst()) : cookie.domain
    return targetDomain.hasSuffix(cookieDomain) || cookieDomain.hasSuffix(targetDomain)
  }
}

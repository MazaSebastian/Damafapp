package com.damafapp.pos

import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.view.Display
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private var customerPresentation: CustomerPresentation? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Debugging
        WebView.setWebContentsDebuggingEnabled(true)

        // 1. Setup Main Screen (Admin POS)
        val mainWebView = findViewById<WebView>(R.id.main_webview)
        // Production URL
        // setupWebView(mainWebView, "https://damafapp-six.vercel.app/admin/pos")
        // Local Debugging (Network IP for Physical Device)
        setupWebView(mainWebView, "http://192.168.1.19:5173/admin/pos")

        // 2. Setup Secondary Screen (Customer Presentation)
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val displays = displayManager.displays

        // Check for multiple displays
        if (displays.size > 1) {
            // Index 1 is usually the first external display
            showPresentation(displays[1])
        }

        // 3. Listener for Plug/Unplug events
        displayManager.registerDisplayListener(object : DisplayManager.DisplayListener {
            override fun onDisplayAdded(displayId: Int) {
                val newDisplay = displayManager.getDisplay(displayId)
                if (newDisplay != null) showPresentation(newDisplay)
            }

            override fun onDisplayRemoved(displayId: Int) {
                if (customerPresentation != null && customerPresentation?.display?.displayId == displayId) {
                    customerPresentation?.dismiss()
                    customerPresentation = null
                }
            }

            override fun onDisplayChanged(displayId: Int) {}
        }, null)
    }

    private fun showPresentation(display: Display) {
        if (customerPresentation != null && customerPresentation?.display?.displayId != display.displayId) {
            customerPresentation?.dismiss()
        }
        
        customerPresentation = CustomerPresentation(this, display)
        try {
            customerPresentation?.show()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        customerPresentation?.dismiss()
        super.onDestroy()
    }

    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(webView: WebView, url: String) {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.allowFileAccess = true

        // Interface for Printing
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidPrint")

        // Debugging
        WebView.setWebContentsDebuggingEnabled(true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Allow normal HTTP/HTTPS (internal navigation or known web links)
                if (url.startsWith("http://") || url.startsWith("https://")) {
                     // Check common deep link redirects that end up as intents
                     if (url.contains("wa.me") || url.contains("api.whatsapp.com")) {
                         // Let it load, the redirect might trigger the scheme below or handle it via logic.
                         // But usually wa.me redirects to "whatsapp://" or "intent://".
                         // So we return false to let WebView follow the redirect chain until the scheme changes.
                         return false
                     }
                     return false
                }

                // Handle external schemes (whatsapp, tel, mailto, intent, etc.)
                try {
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                    startActivity(intent)
                    return true // We handled it
                } catch (e: Exception) {
                    android.util.Log.e("WebView", "Could not handle intent: $url", e)
                    // If no app found, we might want to try fallback (e.g. Play Store for WhatsApp)
                    // For now, prevent crash by catching exception
                    return true // We intercepted it to prevent WebView error page
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Ignore "ERR_UNKNOWN_URL_SCHEME" if we missed it or if it happened during redirect
                if (error?.description?.toString()?.contains("net::ERR_UNKNOWN_URL_SCHEME") == true) {
                    return
                }
                android.widget.Toast.makeText(this@MainActivity, "Error: ${error?.description}", android.widget.Toast.LENGTH_LONG).show()
            }
        }

       webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    android.util.Log.d("WebViewConsole", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                }
                return true
            }
        }

        webView.loadUrl(url)
    }
}

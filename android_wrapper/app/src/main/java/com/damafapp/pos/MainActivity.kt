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
        // CHANGE THIS URL TO YOUR DEPLOYED URL
        // Example: https://damafapp-six.vercel.app/admin/pos
        setupWebView(mainWebView, "http://10.0.2.2:5173/admin/pos")

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
            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
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

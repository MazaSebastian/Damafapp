package com.damafapp.pos

import android.content.Context
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.dantsu.escposprinter.EscPosPrinter
import com.dantsu.escposprinter.connection.usb.UsbPrintersConnections
import com.dantsu.escposprinter.textparser.PrinterTextParserImg
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

class WebAppInterface(private val context: Context) {

    private fun getRootView(): android.view.View {
        return (context as? android.app.Activity)?.findViewById(android.R.id.content)
            ?: throw IllegalStateException("Context must be an Activity")
    }

    @JavascriptInterface
    fun printTicket(jsonOrder: String) {
        try {
            val order = JSONObject(jsonOrder)
            printUsb(order)
            showStyledSnackbar(getRootView(), "Imprimiendo...", SnackbarType.INFO)
        } catch (e: Exception) {
            e.printStackTrace()
            showStyledSnackbar(getRootView(), "Error al imprimir: ${e.message}", SnackbarType.ERROR)
        }
    }

    @JavascriptInterface
    fun testConnection() {
        try {
            val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
            val deviceList = manager.deviceList
            
            if (deviceList.isEmpty()) {
                showStyledSnackbar(getRootView(), "⚠️ No se detectan dispositivos USB conectados", SnackbarType.WARNING)
                return
            }

            val printer = UsbPrintersConnections.selectFirstConnected(context)
            if (printer != null) {
                showStyledSnackbar(getRootView(), "✅ Impresora detectada: ${printer.device.productName}", SnackbarType.SUCCESS)
            } else {
                val names = deviceList.values.joinToString { it.productName ?: "Sin nombre" }
                showStyledSnackbar(getRootView(), "⚠️ USB detectado pero no es impresora: $names", SnackbarType.WARNING)
            }
        } catch (e: Exception) {
            showStyledSnackbar(getRootView(), "Error al verificar: ${e.message}", SnackbarType.ERROR)
        }
    }

    /**
     * Returns JSON array of all connected USB devices with printer detection.
     * Each printer gets a sequential `printerIndex` for use with printTestPage/printToDevice.
     * Called from JS: window.AndroidPrint.listUsbDevices()
     */
    @JavascriptInterface
    fun listUsbDevices(): String {
        try {
            val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
            val deviceList = manager.deviceList
            val printerConnections = UsbPrintersConnections(context).list ?: emptyArray()
            val printerDeviceIds = printerConnections.map { it.device.deviceId }.toSet()
            
            // Build a map from deviceId -> printerIndex (sequential among printers only)
            val printerIndexMap = mutableMapOf<Int, Int>()
            printerConnections.forEachIndexed { idx, conn ->
                printerIndexMap[conn.device.deviceId] = idx
            }
            
            val result = org.json.JSONArray()
            
            deviceList.values.forEachIndexed { index, device ->
                val obj = JSONObject()
                val isPrinter = printerDeviceIds.contains(device.deviceId)
                obj.put("index", index)
                obj.put("name", device.productName ?: "Dispositivo desconocido")
                obj.put("vendorId", device.vendorId)
                obj.put("productId", device.productId)
                obj.put("deviceId", device.deviceId)
                obj.put("isPrinter", isPrinter)
                obj.put("printerIndex", if (isPrinter) printerIndexMap[device.deviceId] ?: -1 else -1)
                obj.put("manufacturer", device.manufacturerName ?: "N/A")
                result.put(obj)
            }
            
            return result.toString()
        } catch (e: Exception) {
            return "[]"
        }
    }

    /**
     * Print a test page to a specific printer by its printerIndex.
     * Called from JS: window.AndroidPrint.printTestPage(0) — where 0 is the printerIndex, NOT deviceIndex
     */
    @JavascriptInterface
    fun printTestPage(printerIndex: Int) {
        try {
            val printerConnections = UsbPrintersConnections(context).list
            if (printerConnections == null || printerIndex < 0 || printerIndex >= printerConnections.size) {
                showStyledSnackbar(getRootView(), "❌ Impresora #$printerIndex no encontrada", SnackbarType.ERROR)
                return
            }
            
            val connection = printerConnections[printerIndex]
            val deviceName = connection.device.productName ?: "Sin nombre"
            val printer = EscPosPrinter(connection, 203, 80f, 46)
            
            val testText = """
                [C]<b><font size='big'>TEST DE IMPRESION</font></b>
                [C]--------------------------------
                [C]Impresora #$printerIndex
                [C]$deviceName
                [C]--------------------------------
                [L]
                [C]Si puedes leer esto,
                [C]la impresora funciona
                [C]correctamente.
                [L]
                [C]<font size='big'>✅ OK</font>
                [L]
                [L]
                [L]
            """.trimIndent()
            
            printer.printFormattedTextAndCut(testText)
            printer.disconnectPrinter()
            
            showStyledSnackbar(getRootView(), "✅ Test impreso en: $deviceName", SnackbarType.SUCCESS)
        } catch (e: Exception) {
            showStyledSnackbar(getRootView(), "❌ Error en test: ${e.message}", SnackbarType.ERROR)
        }
    }

    /**
     * Print order to a specific device by printerIndex.
     * Called from JS: window.AndroidPrint.printToDevice(jsonOrder, 0)
     */
    @JavascriptInterface
    fun printToDevice(jsonOrder: String, printerIndex: Int) {
        try {
            val printerConnections = UsbPrintersConnections(context).list
            if (printerConnections == null || printerIndex < 0 || printerIndex >= printerConnections.size) {
                showStyledSnackbar(getRootView(), "❌ Impresora #$printerIndex no disponible", SnackbarType.ERROR)
                return
            }
            
            val order = JSONObject(jsonOrder)
            val connection = printerConnections[printerIndex]
            val printer = EscPosPrinter(connection, 203, 80f, 46)
            
            val formattedText = formatOrderToEscPos(order)
            printer.printFormattedTextAndCut(formattedText)
            printer.disconnectPrinter()
            
            showStyledSnackbar(getRootView(), "✅ Impreso en: ${connection.device.productName}", SnackbarType.SUCCESS)
        } catch (e: Exception) {
            showStyledSnackbar(getRootView(), "❌ Error: ${e.message}", SnackbarType.ERROR)
        }
    }

    private fun printUsb(order: JSONObject) {
        try {
            showStyledSnackbar(getRootView(), "Buscando impresoras USB...", SnackbarType.INFO)
            
            val printerConnections = UsbPrintersConnections(context).list
            
            if (printerConnections == null || printerConnections.isEmpty()) {
                // FALLBACK DEBUGGING: List all devices to see if OS sees anything
                val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
                val deviceList = manager.deviceList
                if (deviceList.isEmpty()) {
                    showStyledSnackbar(getRootView(), "❌ ERROR: Android no detecta ningún dispositivo USB. Revise el cable OTG.", SnackbarType.ERROR)
                } else {
                    val names = deviceList.values.joinToString { it.productName ?: "Desconocido" }
                    showStyledSnackbar(getRootView(), "❌ Dispositivos USB encontrados pero no reconocidos como impresora: $names", SnackbarType.ERROR)
                }
                return
            }

            val formattedText = formatOrderToEscPos(order)
            var printedCount = 0
            var lastError: String? = null
            
            // Print on ALL connected printers
            for (connection in printerConnections) {
                try {
                    val deviceName = connection.device.productName ?: "Impresora"
                    val printer = EscPosPrinter(connection, 203, 80f, 46)
                    printer.printFormattedTextAndCut(formattedText)
                    printer.disconnectPrinter()
                    printedCount++
                } catch (e: Exception) {
                    lastError = "${connection.device.productName}: ${e.message}"
                    e.printStackTrace()
                }
            }
            
            if (printedCount > 0) {
                showStyledSnackbar(getRootView(), "✅ Impreso en $printedCount impresora(s)", SnackbarType.SUCCESS)
            } else {
                showStyledSnackbar(getRootView(), "❌ No se pudo imprimir: $lastError", SnackbarType.ERROR)
            }
            
        } catch (e: Exception) {
            e.printStackTrace()
            showStyledSnackbar(getRootView(), "❌ Error crítico: ${e.message}", SnackbarType.ERROR)
        }
    }

    private fun formatOrderToEscPos(order: JSONObject): String {
        val sb = StringBuilder()
        
        // 1. Top Header
        sb.append("[C]<b><font size='big'>DAMAF APP</font></b>\n")
        sb.append("[C]--------------------------------\n")

        // 2. Date & Time (Explicit)
        // Parse ISO string to local readable
        val dateRaw = order.optString("created_at", "")
        // Simple manual parsing or use the formatted string passed from JS if available. 
        // Assuming ISO: 2026-01-19T21:30:00...
        var dateDisplay = dateRaw
        var timeDisplay = ""
        
        if (dateRaw.length >= 16) {
           // 2026-01-19T21:30
           val parts = dateRaw.split("T")
           if (parts.size >= 2) {
               val d = parts[0].split("-") // [2026, 01, 19]
               if (d.size == 3) dateDisplay = "${d[2]}/${d[1]}/${d[0]}"
               
               timeDisplay = parts[1].substring(0, 5) // 21:30
           }
        }

        sb.append("[L]Fecha: $dateDisplay\n")
        if (timeDisplay.isNotEmpty()) sb.append("[L]Hora:  $timeDisplay\n")
        
        // 3. ORDEN Header (Centered)
        sb.append("\n[C]ORDEN\n")
        
        // 3. ID (HUGE)
        // 3. ID (HUGE)
        val orderNumber = order.optString("order_number", "")
        val displayId = if (orderNumber.isNotEmpty() && orderNumber != "null") {
             "#" + orderNumber.padStart(4, '0') 
        } else {
             "#" + order.optString("id", "").take(4)
        }
        
        sb.append("[C]<b><font size='big'>$displayId</font></b>\n")
        sb.append("[C]--------------------------------\n")
        
        // 4. Client & Type
        val profile = order.optJSONObject("profiles") // Supabase sometimes wraps joined data
        // Check both locations for safety
        val clientName = profile?.optString("full_name") 
            ?: order.optString("client_name") // Fallback if flattened
            ?: "Invitado"
            
        sb.append("[L]Cliente: <b>$clientName</b>\n")
        
        // Extended Profile Data (from POS search)
        val clientAddress = order.optString("client_address", "")
        val clientPhone = order.optString("client_phone", "")
        val clientShift = order.optString("client_shift", "")
        
        if (clientAddress.isNotEmpty()) sb.append("[L]Calle: $clientAddress\n")
        if (clientPhone.isNotEmpty()) sb.append("[L]Tel: $clientPhone\n")
        if (clientShift.isNotEmpty()) {
             sb.append("\n[C]Turno de entrega:\n")
             sb.append("[C]<b><font size='big'>$clientShift</font></b>\n")
        }
        
        
        // Order Type - HUGE (Match PAGO size)
        val type = order.optString("order_type", "takeaway")
        val typeText = if (type == "delivery") "DELIVERY" else "TAKE AWAY"
        
        // Changed from 'wide' to 'big' to match Payment/Total style requested
        sb.append("\n[C]<b><font size='big'>$typeText</font></b>\n\n")

        if (type == "delivery") {
            // Fallback for non-profile delivery address
            val address = order.optString("delivery_address", "")
            // Only show if different or if we didn't show client_address above
            // Usually delivery_address is the one to go.
            // Let's assume for Takeaway/POS we trust the profile address if printed.
            // If Type is DELIVERY, we should reiterate the delivery address.
            if (address.isNotEmpty() && address != clientAddress) {
                 sb.append("[L]Entregar en: $address\n")
            }
        }
        
        sb.append("[C]--------------------------------\n")
        
        // 5. Items (BIG FONT based on feedback)
        val items = order.optJSONArray("cart_items") 
        val itemsArray = if (items != null && items.length() > 0) items else order.optJSONArray("items")

        if (itemsArray != null) {
            for (i in 0 until itemsArray.length()) {
                val item = itemsArray.getJSONObject(i)
                val name = item.optString("name", "Producto")
                val qty = item.optInt("quantity", 1)
                
                // Item Line: BIG FONT
                // "1 x Bacon King"
                sb.append("[L]<b><font size='big'>$qty x $name</font></b>\n")
                
                // Modifiers
                val modifiers = item.optJSONArray("modifiers")
                if (modifiers != null) {
                    for (j in 0 until modifiers.length()) {
                        val mod = modifiers.getJSONObject(j)
                        val modName = mod.optString("name", "")
                        sb.append("[L]  + $modName\n")
                    }
                }
                
                // Notes
                val notes = item.optString("notes", "")
                if (notes.isNotEmpty()) {
                     sb.append("[L]  (Nota: $notes)\n")
                }
                
                // Spacer
                sb.append("[L]\n")
            }
        }
        
        sb.append("[C]--------------------------------\n")
        
        // 6. Totals (HUGE & WIDE)
        val method = order.optString("payment_method", "cash")
        val methodStr = when(method) {
            "mercadopago" -> "Mercado Pago"
            "cash" -> "Efectivo"
            "transfer" -> "Transferencia"
            else -> method
        }
        
        // Spacer
        sb.append("\n")
        
        // Payment Method: MAX SIZE (Big + Bold)
        sb.append("[L]<b><font size='big'>PAGO: ${methodStr.uppercase()}</font></b>\n")
        
        val total = order.optDouble("total", 0.0)
        
        // Extra Spacing
        sb.append("\n")
        sb.append("[L]<font size='big'>TOTAL</font>\n")
        
        // TOTAL Amount: BIG + BOLD
        // Note: 'big' is usually the max standard font (Double Width/Height).
        sb.append("[L]<b><font size='big'>${formatCurrency(total)}</font></b>\n")
        sb.append("\n") // More space at bottom
        
        sb.append("[C]www.damaf.com\n")
        
        // 7. Fiscal Data (CAE)
        val invoices = order.optJSONArray("invoices")
        if (invoices != null && invoices.length() > 0) {
            val inv = invoices.getJSONObject(0)
            val cae = inv.optString("cae", "")
            val caeDue = inv.optString("cae_due_date", "")
            val cbteTipo = inv.optInt("cbte_tipo", 6) // 6=B, 11=C
            val ptoVta = inv.optInt("pt_vta", 0)
            val cbteNro = inv.optLong("cbte_nro", 0)
            
            val letter = if (cbteTipo == 11) "C" else if (cbteTipo == 1) "A" else "B"
            
            // Separator
            sb.append("[C]--------------------------------\n")
            sb.append("\n")
            
            // Fiscal Details
            sb.append("[C]<b>FACTURA $letter</b>\n")
            sb.append("[C]NRO: ${ptoVta.toString().padStart(4, '0')}-${cbteNro.toString().padStart(8, '0')}\n")
            sb.append("[C]CAE: $cae\n")
            sb.append("[C]VTO: $caeDue\n")
        }
        
        sb.append("\n\n\n\n") // Extra Feed before cut (Requested to avoid cutting text)
        
        return sb.toString()
    }
    
    private fun formatCurrency(amount: Double): String {
        // Remove decimals if whole number
        return if (amount % 1.0 == 0.0) {
            "$" + amount.toInt().toString()
        } else {
            "$" + "%.2f".format(amount)
        }
    }
}

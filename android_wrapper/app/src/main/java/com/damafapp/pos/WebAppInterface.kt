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

    // =============================================
    // TSPL PROTOCOL — For XP-470B Label Printer
    // =============================================

    /**
     * Send raw TSPL commands to a USB device by deviceId.
     * Returns true if successful.
     */
    private fun sendRawTspl(deviceId: Int, tsplCommands: String): Boolean {
        val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
        val device = manager.deviceList.values.find { it.deviceId == deviceId } ?: return false
        
        val connection = manager.openDevice(device) ?: return false
        
        try {
            // Find the bulk OUT endpoint
            for (i in 0 until device.interfaceCount) {
                val intf = device.getInterface(i)
                connection.claimInterface(intf, true)
                
                for (j in 0 until intf.endpointCount) {
                    val endpoint = intf.getEndpoint(j)
                    if (endpoint.direction == android.hardware.usb.UsbConstants.USB_DIR_OUT) {
                        val data = tsplCommands.toByteArray(Charsets.UTF_8)
                        val result = connection.bulkTransfer(endpoint, data, data.size, 5000)
                        connection.releaseInterface(intf)
                        connection.close()
                        return result >= 0
                    }
                }
                connection.releaseInterface(intf)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        connection.close()
        return false
    }

    /**
     * Print a TSPL test label on the XP-470B.
     * Called from JS: window.AndroidPrint.printTsplTest(deviceId)
     */
    @JavascriptInterface
    fun printTsplTest(deviceId: Int) {
        try {
            showStyledSnackbar(getRootView(), "Enviando test TSPL...", SnackbarType.INFO)
            
            val tspl = StringBuilder()
            tspl.append("SIZE 60 mm, 40 mm\r\n")
            tspl.append("GAP 2 mm, 0 mm\r\n")
            tspl.append("DIRECTION 1,0\r\n")
            tspl.append("CLS\r\n")
            tspl.append("TEXT 30,30,\"3\",0,1,1,\"TEST DAMAF APP\"\r\n")
            tspl.append("TEXT 30,80,\"2\",0,1,1,\"Etiquetadora XP-470B\"\r\n")
            tspl.append("TEXT 30,120,\"2\",0,1,1,\"Funcionando OK\"\r\n")
            tspl.append("PRINT 1,1\r\n")
            
            val success = sendRawTspl(deviceId, tspl.toString())
            
            if (success) {
                showStyledSnackbar(getRootView(), "✅ Test TSPL enviado correctamente", SnackbarType.SUCCESS)
            } else {
                showStyledSnackbar(getRootView(), "❌ No se pudo enviar TSPL. Verifica permisos USB.", SnackbarType.ERROR)
            }
        } catch (e: Exception) {
            showStyledSnackbar(getRootView(), "❌ Error TSPL: ${e.message}", SnackbarType.ERROR)
        }
    }

    /**
     * Print order items as a TSPL label on XP-470B.
     * Called from JS: window.AndroidPrint.printTsplLabel(jsonOrder, deviceId)
     */
    @JavascriptInterface
    fun printTsplLabel(jsonOrder: String, deviceId: Int) {
        try {
            val order = JSONObject(jsonOrder)
            val items = order.optJSONArray("cart_items") ?: order.optJSONArray("items")
            
            val orderNumber = order.optString("order_number", "")
            val displayId = if (orderNumber.isNotEmpty() && orderNumber != "null") {
                "#" + orderNumber.padStart(4, '0')
            } else {
                "#" + order.optString("id", "").take(4)
            }
            
            // Calculate label height based on items
            val itemCount = items?.length() ?: 0
            var yPos = 30
            val lineHeight = 35
            val labelHeight = 60 + (itemCount * lineHeight) + 40 // header + items + footer
            
            val tspl = StringBuilder()
            tspl.append("SIZE 60 mm, ${labelHeight / 8} mm\r\n")
            tspl.append("GAP 2 mm, 0 mm\r\n")
            tspl.append("DIRECTION 1,0\r\n")
            tspl.append("CLS\r\n")
            
            // Order number header
            tspl.append("TEXT 30,$yPos,\"3\",0,1,1,\"ORDEN $displayId\"\r\n")
            yPos += 50
            
            // Separator line
            tspl.append("TEXT 30,$yPos,\"1\",0,1,1,\"------------------------------\"\r\n")
            yPos += 30
            
            // Items
            if (items != null) {
                for (i in 0 until items.length()) {
                    val item = items.getJSONObject(i)
                    val name = item.optString("name", "Producto")
                    val qty = item.optInt("quantity", 1)
                    
                    tspl.append("TEXT 30,$yPos,\"2\",0,1,1,\"${qty}x $name\"\r\n")
                    yPos += lineHeight
                    
                    // Removed ingredients
                    val removed = item.optJSONArray("removed_ingredients")
                    if (removed != null) {
                        for (j in 0 until removed.length()) {
                            tspl.append("TEXT 50,$yPos,\"1\",0,1,1,\"SIN ${removed.getString(j)}\"\r\n")
                            yPos += 25
                        }
                    }
                    
                    // Modifiers
                    val mods = item.optJSONArray("modifiers")
                    if (mods != null) {
                        for (j in 0 until mods.length()) {
                            val mod = mods.getJSONObject(j)
                            tspl.append("TEXT 50,$yPos,\"1\",0,1,1,\"+ ${mod.optString("name", "")}\"\r\n")
                            yPos += 25
                        }
                    }
                    
                    // Side & Drink
                    val side = item.optString("side_name", "")
                    if (side.isNotEmpty()) {
                        tspl.append("TEXT 50,$yPos,\"1\",0,1,1,\"Guarnicion: $side\"\r\n")
                        yPos += 25
                    }
                    val drink = item.optString("drink_name", "")
                    if (drink.isNotEmpty()) {
                        tspl.append("TEXT 50,$yPos,\"1\",0,1,1,\"Bebida: $drink\"\r\n")
                        yPos += 25
                    }
                }
            }
            
            tspl.append("PRINT 1,1\r\n")
            
            val success = sendRawTspl(deviceId, tspl.toString())
            
            if (success) {
                showStyledSnackbar(getRootView(), "✅ Etiqueta impresa", SnackbarType.SUCCESS)
            } else {
                showStyledSnackbar(getRootView(), "❌ Error al imprimir etiqueta", SnackbarType.ERROR)
            }
        } catch (e: Exception) {
            showStyledSnackbar(getRootView(), "❌ Error TSPL: ${e.message}", SnackbarType.ERROR)
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
        
        // Read ticket config flags (all default to true if not present)
        val cfg = order.optJSONObject("ticket_config")
        fun show(key: String): Boolean = cfg?.optBoolean(key, true) ?: true
        
        // 1. Top Header
        if (show("header")) {
            sb.append("[C]<b><font size='big'>DAMAF APP</font></b>\n")
            sb.append("[C]--------------------------------\n")
        }

        // 2. Date & Time
        if (show("datetime")) {
            val dateRaw = order.optString("created_at", "")
            var dateDisplay = dateRaw
            var timeDisplay = ""
            
            if (dateRaw.length >= 16) {
               val parts = dateRaw.split("T")
               if (parts.size >= 2) {
                   val d = parts[0].split("-")
                   if (d.size == 3) dateDisplay = "${d[2]}/${d[1]}/${d[0]}"
                   timeDisplay = parts[1].substring(0, 5)
               }
            }

            sb.append("[L]Fecha: $dateDisplay\n")
            if (timeDisplay.isNotEmpty()) sb.append("[L]Hora:  $timeDisplay\n")
        }
        
        // 3. ORDEN & Number
        if (show("order_number")) {
            sb.append("\n[C]ORDEN\n")
            val orderNumber = order.optString("order_number", "")
            val displayId = if (orderNumber.isNotEmpty() && orderNumber != "null") {
                 "#" + orderNumber.padStart(4, '0') 
            } else {
                 "#" + order.optString("id", "").take(4)
            }
            sb.append("[C]<b><font size='big'>$displayId</font></b>\n")
            sb.append("[C]--------------------------------\n")
        }
        
        // 4. Client Name
        val clientName = order.optString("client_name", "").let {
            if (it.isNotEmpty() && it != "null") it
            else {
                val profile = order.optJSONObject("profiles")
                profile?.optString("full_name", "Invitado") ?: "Invitado"
            }
        }
        
        if (show("client_name")) {
            sb.append("[L]Cliente: <b>$clientName</b>\n")
        }
        
        // Extended Profile Data
        val clientAddress = order.optString("client_address", "")
        val clientPhone = order.optString("client_phone", "")
        val clientShift = order.optString("client_shift", "")
        
        if (show("client_address") && clientAddress.isNotEmpty()) {
            sb.append("[L]Calle: $clientAddress\n")
        }
        if (show("client_phone") && clientPhone.isNotEmpty()) {
            sb.append("[L]Tel: $clientPhone\n")
        }
        if (show("scheduled_time") && clientShift.isNotEmpty()) {
             sb.append("\n[C]Turno de entrega:\n")
             sb.append("[C]<b><font size='big'>$clientShift</font></b>\n")
        }
        
        // Order Type
        if (show("order_type")) {
            val type = order.optString("order_type", "takeaway")
            val typeText = if (type == "delivery") "DELIVERY" else "TAKE AWAY"
            sb.append("\n[C]<b><font size='big'>$typeText</font></b>\n\n")

            if (type == "delivery") {
                val address = order.optString("delivery_address", "")
                if (address.isNotEmpty() && address != clientAddress) {
                     sb.append("[L]Entregar en: $address\n")
                }
            }
        }
        
        sb.append("[C]--------------------------------\n")
        
        // 5. Items
        if (show("items")) {
            val items = order.optJSONArray("cart_items") 
            val itemsArray = if (items != null && items.length() > 0) items else order.optJSONArray("items")

            if (itemsArray != null) {
                for (i in 0 until itemsArray.length()) {
                    val item = itemsArray.getJSONObject(i)
                    val name = item.optString("name", "Producto")
                    val qty = item.optInt("quantity", 1)
                    
                    sb.append("[L]<b><font size='big'>$qty x $name</font></b>\n")
                    
                    // Removed Ingredients
                    if (show("removed_ingredients")) {
                        val removedIngredients = item.optJSONArray("removed_ingredients")
                        if (removedIngredients != null && removedIngredients.length() > 0) {
                            for (j in 0 until removedIngredients.length()) {
                                val ingredient = removedIngredients.getString(j)
                                sb.append("[L]  SIN $ingredient\n")
                            }
                        }
                    }
                    
                    // Modifiers / Extras
                    if (show("modifiers")) {
                        val modifiers = item.optJSONArray("modifiers")
                        if (modifiers != null) {
                            for (j in 0 until modifiers.length()) {
                                val mod = modifiers.getJSONObject(j)
                                val modName = mod.optString("name", "")
                                val modQty = mod.optInt("quantity", 1)
                                if (modQty > 1) {
                                    sb.append("[L]  + $modName x$modQty\n")
                                } else {
                                    sb.append("[L]  + $modName\n")
                                }
                            }
                        }
                    }
                    
                    // Sides
                    if (show("sides")) {
                        val sideName = item.optString("side_name", "")
                        if (sideName.isNotEmpty()) {
                            sb.append("[L]  Guarnicion: $sideName\n")
                        }
                    }
                    
                    // Drinks
                    if (show("drinks")) {
                        val drinkName = item.optString("drink_name", "")
                        if (drinkName.isNotEmpty()) {
                            sb.append("[L]  Bebida: $drinkName\n")
                        }
                    }
                    
                    // Item Notes
                    if (show("item_notes")) {
                        val notes = item.optString("notes", "")
                        if (notes.isNotEmpty()) {
                             sb.append("[L]  (Nota: $notes)\n")
                        }
                    }
                    
                    sb.append("[L]\n")
                }
            }
        }
        
        // Customer Notes
        if (show("customer_notes")) {
            val customerNotes = order.optString("notes", "")
            if (customerNotes.isNotEmpty()) {
                sb.append("[C]--------------------------------\n")
                sb.append("[L]Nota: $customerNotes\n")
            }
        }
        
        sb.append("[C]--------------------------------\n")
        
        // 6. Payment & Total
        if (show("payment_method")) {
            val method = order.optString("payment_method", "cash")
            val methodStr = when(method) {
                "mercadopago" -> "Mercado Pago"
                "cash" -> "Efectivo"
                "transfer" -> "Transferencia"
                else -> method
            }
            sb.append("\n")
            sb.append("[L]<b><font size='big'>PAGO: ${methodStr.uppercase()}</font></b>\n")
        }
        
        if (show("total")) {
            val total = order.optDouble("total", 0.0)
            sb.append("\n")
            sb.append("[L]<font size='big'>TOTAL</font>\n")
            sb.append("[L]<b><font size='big'>${formatCurrency(total)}</font></b>\n")
            sb.append("\n")
        }
        
        if (show("footer")) {
            sb.append("[C]www.damaf.com\n")
        }
        
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

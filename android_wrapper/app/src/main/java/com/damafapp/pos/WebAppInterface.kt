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

    @JavascriptInterface
    fun printTicket(jsonOrder: String) {
        try {
            val order = JSONObject(jsonOrder)
            printUsb(order)
            Toast.makeText(context, "Imprimiendo...", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Error al imprimir: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    @JavascriptInterface
    fun testConnection() {
        try {
            val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
            val deviceList = manager.deviceList
            
            if (deviceList.isEmpty()) {
                Toast.makeText(context, "⚠️ No se detectan dispositivos USB conectados", Toast.LENGTH_LONG).show()
                return
            }

            val printer = UsbPrintersConnections.selectFirstConnected(context)
            if (printer != null) {
                Toast.makeText(context, "✅ Impresora detectada: ${printer.device.productName}", Toast.LENGTH_LONG).show()
            } else {
                val names = deviceList.values.joinToString { it.productName ?: "Sin nombre" }
                Toast.makeText(context, "⚠️ USB detectado pero no es impresora: $names", Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Error al verificar: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun printUsb(order: JSONObject) {
        try {
            Toast.makeText(context, "Buscando impresora USB...", Toast.LENGTH_SHORT).show()
            
            val usbConnection = UsbPrintersConnections.selectFirstConnected(context)
            
            if (usbConnection == null) {
                // FALLBACK DEBUGGING: List all devices to see if OS sees anything
                val manager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
                val deviceList = manager.deviceList
                if (deviceList.isEmpty()) {
                    Toast.makeText(context, "❌ ERROR: Android no detecta ningún dispositivo USB. Revise el cable OTG.", Toast.LENGTH_LONG).show()
                } else {
                    val names = deviceList.values.joinToString { it.productName ?: "Desconocido" }
                    Toast.makeText(context, "❌ Dispositivos USB encontrados pero no reconocidos como impresora: $names", Toast.LENGTH_LONG).show()
                }
                return
            }

            Toast.makeText(context, "✅ Impresora conectada. Imprimiendo...", Toast.LENGTH_SHORT).show()

            // 80mm width, 46 chars per line to avoid edge cutoff (was 48)
            val printer = EscPosPrinter(usbConnection, 203, 80f, 46)
            
            val formattedText = formatOrderToEscPos(order)
            
            // Apply Cut Command explicitly
            printer.printFormattedTextAndCut(formattedText)
            printer.disconnectPrinter()
            
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "❌ Error crítico: ${e.message}", Toast.LENGTH_LONG).show()
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
        val orderId = order.optString("id", "").take(8)
        sb.append("[C]<b><font size='big'>#$orderId</font></b>\n")
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

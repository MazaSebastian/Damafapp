
/**
 * Printer Utility for ESC/POS 80mm Thermal Printers
 * Supports WebUSB for direct printing or falls back to browser print
 */

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@';
const CUT = GS + 'V' + '\x41' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const ALIGN_RIGHT = ESC + 'a' + '\x02';
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const TEXT_DOUBLE = GS + '!' + '\x11'; // Double width & height
const TEXT_NORMAL = GS + '!' + '\x00';

export const printTicket = async (order) => {
    try {
        // 1. Android Native Check
        if (window.AndroidPrint) {
            console.log("Printing via Android Native Interface");
            window.AndroidPrint.printTicket(JSON.stringify(order));
            return;
        }

        // 2. WebUSB Check
        if (navigator.usb) {
            await printWebUSB(order);
        } else {
            // Fallback for non-WebUSB browsers
            console.warn('WebUSB not supported, using window.print()');
            window.print();
        }
    } catch (error) {
        console.error('Print failed:', error);
        // Fallback
        window.print();
    }
};

export const checkPrinterStatus = () => {
    if (window.AndroidPrint && window.AndroidPrint.testConnection) {
        window.AndroidPrint.testConnection();
    } else {
        console.warn("Monitor de Impresora: No detectado entorno Android");
        // Could imply successful check if on web for debugging? No, keep silent or toast.
        // toast.info("Modo Web: No se puede verificar USB nativo")
    }
};

const printWebUSB = async (order) => {
    try {
        // 1. Request Device (User must click first time)
        // Note: In production, you'd save the device vendorId/productId to reconnect automatically
        const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: 0x04b8 }] // Example: EPSON. Remove filter to see all.
        });

        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);

        const encoder = new TextEncoder();

        // Helper to send data
        const send = async (text) => {
            const data = encoder.encode(text);
            await device.transferOut(device.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === 'out').endpointNumber, data);
        }

        // 2. Build Receipt Content
        let commands = INIT;

        // Header
        commands += ALIGN_CENTER + BOLD_ON + TEXT_DOUBLE + "DAMAF APP\n" + TEXT_NORMAL + BOLD_OFF;
        commands += "Av. Principal 123\n";
        commands += "Tel: 555-1234\n";
        commands += "--------------------------------\n";

        // Order Info
        commands += ALIGN_LEFT;
        commands += `Orden: #${order.id.slice(0, 8)}\n`;
        commands += `Fecha: ${new Date(order.created_at).toLocaleString()}\n`;
        commands += "--------------------------------\n";

        // Items
        commands += BOLD_ON + "CANT  DESCRIPCION        PRECIO\n" + BOLD_OFF;

        order.items.forEach(item => {
            const qty = item.quantity.toString().padEnd(4);
            const price = `$${(item.price * item.quantity).toFixed(2)}`.padStart(8);
            // Truncate name to fit
            const name = item.name.substring(0, 18).padEnd(20);

            commands += `${qty}${name}${price}\n`;

            // Modifiers
            if (item.modifiers && item.modifiers.length > 0) {
                item.modifiers.forEach(mod => {
                    commands += `    + ${mod.name}\n`;
                });
            }
        });

        commands += "--------------------------------\n";

        // Totals
        commands += ALIGN_RIGHT + BOLD_ON;
        commands += `TOTAL: $${order.total.toFixed(2)}\n` + BOLD_OFF;
        commands += ALIGN_CENTER + "\n";

        // Footer
        commands += "Gracias por su compra!\n";
        commands += "www.damaf.com\n";
        commands += "\n\n\n\n"; // Feed
        commands += CUT;

        // 3. Send to Printer
        await send(commands);

        await device.close();

    } catch (e) {
        console.error("USB Print Error (Likely no device selected):", e);
        throw e;
    }
}

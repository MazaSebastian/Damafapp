import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/**
 * Generates a PDF invoice compliant with AFIP standards for 80mm Thermal Printer.
 * Optimized for Android / Webview printing.
 * @param {Object} invoice - The invoice data
 * @param {Object} company - The company data
 */
export const generateInvoicePDF = async (invoice, company) => {
    // 1. Calculate Dynamic Height
    // Estimate content length to avoid page breaks on thermal paper
    const items = invoice.items || [{ quantity: 1, name: 'Consumo Gastronómico', price: invoice.total_amount }];
    const baseHeight = 150; // Headers + Footers (approximate)
    const itemHeight = 15; // Avg height per item (accounting for wrapping)
    const dynamicHeight = baseHeight + (items.length * itemHeight);

    // Create Doc with calculated height
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, dynamicHeight]
    });

    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - (margin * 2);
    let y = 5; // Vertical cursor

    // Helper: Centered Text
    const centerText = (text, yPos, size = 9, font = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', font);
        const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, yPos);
        return size * 0.4; // approx height increment suitable for line spacing
    };

    // Helper: Left/Right Text line
    const rowText = (left, right, yPos, size = 9, font = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', font);
        doc.text(left, margin, yPos);

        const rightWidth = doc.getStringUnitWidth(right) * size / doc.internal.scaleFactor;
        doc.text(right, pageWidth - margin - rightWidth, yPos);
        return size * 0.4;
    };

    // Helper: Horizontal Line
    const drawLine = (yPos) => {
        doc.setLineWidth(0.1);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        return 2; // spacing
    };

    // --- HEADER ---
    y += centerText(company.business_name || 'MI EMPRESA', y, 12, 'bold');
    y += 4;
    y += centerText(company.address || 'Dirección Comercial', y, 8);
    y += 4;
    y += centerText('IVA Responsable Inscripto', y, 8); // Ajustar según condición
    y += 4;
    y += centerText(`CUIT: ${company.cuit}`, y, 8);
    y += 4; // Spacing

    y += drawLine(y);
    y += 2;

    // Factura Info
    const letter = invoice.cbte_tipo === 11 ? 'C' : (invoice.cbte_tipo === 6 ? 'B' : 'A');
    const letterCode = invoice.cbte_tipo === 11 ? '011' : (invoice.cbte_tipo === 6 ? '006' : '001');
    const ptoVta = invoice.pt_vta.toString().padStart(4, '0');
    const cbteNro = invoice.cbte_nro.toString().padStart(8, '0');

    y += centerText(`FACTURA "${letter}" (COD. ${letterCode})`, y, 10, 'bold');
    y += 5;
    y += centerText(`N° ${ptoVta}-${cbteNro}`, y, 10, 'bold');
    y += 5;
    y += centerText(`Fecha: ${new Date(invoice.created_at || new Date()).toLocaleDateString('es-AR')}`, y, 8);
    y += 5;

    y += drawLine(y);
    y += 2;

    // --- CLIENTE ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('A: ' + (invoice.customer_name || 'Consumidor Final'), margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text((invoice.customer_iva || 'Consumidor Final') + ' - ' + (invoice.customer_doc || '0'), margin, y);
    y += 4;
    if (invoice.customer_address) {
        doc.text(invoice.customer_address, margin, y);
        y += 4;
    }

    y += drawLine(y);
    y += 2;

    // --- ITEMS ---
    // Headers
    rowText('Cant. x Desc.', 'Total', y, 8, 'bold');
    y += 4;

    // List
    const items = invoice.items || [{ quantity: 1, name: 'Consumo Gastronómico', price: invoice.total_amount }];
    items.forEach(item => {
        // Multi-line description if needed
        const qtyDesc = `${item.quantity} x ${item.name}`;

        // Simple wrapping logic specifically for 80mm
        const maxDescWidth = 50; // mm
        const splitDesc = doc.splitTextToSize(qtyDesc, maxDescWidth);
        const itemTotal = (item.price * item.quantity).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

        doc.setFont('helvetica', 'normal');
        doc.text(splitDesc, margin, y);

        const rightWidth = doc.getStringUnitWidth(itemTotal) * 8 / doc.internal.scaleFactor;
        doc.text(itemTotal, pageWidth - margin - rightWidth, y); // Align with first line of desc

        y += (splitDesc.length * 4); // Increment based on lines
    });

    y += 2;
    y += drawLine(y);
    y += 4;

    // --- TOTAL ---
    rowText('TOTAL', invoice.total_amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }), y, 14, 'bold');
    y += 10;

    // --- CAI / CAE ---
    centerText(`CAE: ${invoice.cae}`, y, 9, 'bold');
    y += 5;
    const dueDate = invoice.cae_due_date ?
        new Date(invoice.cae_due_date.slice(0, 4) + '-' + invoice.cae_due_date.slice(4, 6) + '-' + invoice.cae_due_date.slice(6, 8)).toLocaleDateString('es-AR')
        : '-';
    centerText(`Vto. CAE: ${dueDate}`, y, 9);
    y += 8;

    // --- QR CODE ---
    const qrData = {
        ver: 1,
        fecha: invoice.created_at ? invoice.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        cuit: parseInt(company.cuit.replace(/-/g, '')),
        ptoVta: invoice.pt_vta,
        tipoCmp: invoice.cbte_tipo,
        nroCmp: invoice.cbte_nro,
        importe: invoice.total_amount,
        moneda: "PES",
        ctz: 1,
        tipoDocRec: invoice.doc_tipo || 99,
        nroDocRec: parseInt(invoice.customer_doc || 0),
        tipoCodAut: "E",
        codAut: parseInt(invoice.cae)
    };

    const jsonQr = JSON.stringify(qrData);
    const base64Qr = btoa(jsonQr);
    const afipUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Qr}`;

    try {
        const qrImage = await QRCode.toDataURL(afipUrl);
        // Centered QR
        const qrSize = 35;
        const xQr = (pageWidth - qrSize) / 2;
        doc.addImage(qrImage, 'PNG', xQr, y, qrSize, qrSize);
        y += qrSize + 5;
    } catch (e) {
        console.error("Error generating QR", e);
    }

    centerText('¡Gracias por su visita!', y, 8, 'italic');

    // Auto Print?
    doc.autoPrint(); // Opens print dialog automatically

    // Save
    doc.save(`Ticket-${invoice.cbte_tipo === 11 ? 'C' : 'B'}-${ptoVta}-${cbteNro}.pdf`);
};

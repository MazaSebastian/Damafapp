import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/**
 * Generates a PDF invoice compliant with AFIP standards.
 * @param {Object} invoice - The invoice data (from DB 'invoices' table + joined order/customer)
 * @param {Object} company - The company data (from settings/config)
 */
export const generateInvoicePDF = async (invoice, company) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper for centering text
    const centerText = (text, y) => {
        const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    };

    // Helper for right aligning text
    const rightText = (text, y, x = pageWidth - 10) => {
        const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        doc.text(text, x - textWidth, y);
    };

    // --- HEADER ---
    // Letter Box (A, B, C)
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth / 2 - 7.5, 10, 15, 15, 'FD'); // Box 15x15 centered

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const letter = invoice.cbte_tipo === 11 ? 'C' : (invoice.cbte_tipo === 6 ? 'B' : 'A');
    const letterCode = invoice.cbte_tipo === 11 ? '011' : (invoice.cbte_tipo === 6 ? '006' : '001');
    centerText(letter, 19);

    doc.setFontSize(8);
    centerText(`COD. ${letterCode}`, 23);

    // Left Header (Company Info)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(company.business_name || 'MI EMPRESA', 10, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(company.address || 'Dirección Comercial', 10, 28);
    doc.text(company.city || 'Ciudad, Provincia', 10, 33);
    doc.text('I.V.A.: Responsable Monotributo', 10, 38); // TODO: Dynamic based on settings

    // Right Header (Invoice Details)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', pageWidth - 10, 20, { align: 'right' });

    doc.setFontSize(10);
    const ptoVta = invoice.pt_vta.toString().padStart(4, '0');
    const cbteNro = invoice.cbte_nro.toString().padStart(8, '0');
    doc.text(`N° ${ptoVta}-${cbteNro}`, pageWidth - 10, 28, { align: 'right' });

    const invoiceDate = new Date(invoice.created_at || new Date()).toLocaleDateString('es-AR');
    doc.text(`Fecha: ${invoiceDate}`, pageWidth - 10, 33, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(`CUIT: ${company.cuit}`, pageWidth - 10, 43, { align: 'right' });
    doc.text(`IIBB: ${company.iibb || company.cuit}`, pageWidth - 10, 48, { align: 'right' });
    doc.text(`Inicio de Actividades: ${company.start_date || '-'}`, pageWidth - 10, 53, { align: 'right' });

    // Line Separator
    doc.line(10, 60, pageWidth - 10, 60);

    // --- CUSTOMER INFO ---
    doc.setFont('helvetica', 'bold');
    doc.text('Señor(es):', 10, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer_name || 'Consumidor Final', 35, 70);

    doc.setFont('helvetica', 'bold');
    doc.text('Domicilio:', 10, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer_address || '-', 35, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('IVA:', 10, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer_iva || 'Consumidor Final', 35, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('CUIT:', pageWidth / 2, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer_doc || '-', pageWidth / 2 + 15, 80);

    // Line Separator
    doc.line(10, 85, pageWidth - 10, 85);

    // --- ITEMS TABLE ---
    // Headers
    const yTable = 95;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yTable - 5, pageWidth - 20, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Cant.', 15, yTable);
    doc.text('Descripción', 35, yTable);
    doc.text('P. Unit.', pageWidth - 60, yTable, { align: 'right' });
    doc.text('Subtotal', pageWidth - 15, yTable, { align: 'right' });

    // Items (Mocked if not provided in invoice object, usually fetched from order_items)
    let y = 105;
    const items = invoice.items || [{ quantity: 1, name: 'Consumo Gastronómico / Varios', price: invoice.total_amount }];

    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
        doc.text(item.quantity.toString(), 15, y);
        doc.text(item.name, 35, y);
        doc.text(item.price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }), pageWidth - 60, y, { align: 'right' });
        doc.text((item.price * item.quantity).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }), pageWidth - 15, y, { align: 'right' });
        y += 8;
    });

    // --- TOTALS ---
    const yTotal = 200; // Fixed at bottom or dynamic
    doc.line(10, yTotal, pageWidth - 10, yTotal);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', pageWidth - 60, yTotal + 10);
    doc.text(invoice.total_amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }), pageWidth - 15, yTotal + 10, { align: 'right' });

    // --- FOOTER (CAE & QR) ---
    const yFooter = 250;

    // QR Code Generation
    // AFIP QR Data Structure: https://www.afip.gob.ar/fe/qr/especificaciones.asp
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
        tipoCodAut: "E", // E = CAE
        codAut: parseInt(invoice.cae)
    };

    // Base64 JSON for QR
    const jsonQr = JSON.stringify(qrData);
    const base64Qr = btoa(jsonQr);
    const afipUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Qr}`;

    try {
        const qrImage = await QRCode.toDataURL(afipUrl);
        doc.addImage(qrImage, 'PNG', 10, yFooter - 10, 30, 30);
    } catch (e) {
        console.error("Error generating QR", e);
    }

    // CAE Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Comprobante Autorizado', 50, yFooter);

    doc.setFont('helvetica', 'normal');
    doc.text(`CAE: ${invoice.cae}`, 50, yFooter + 6);

    const dueDate = invoice.cae_due_date ?
        new Date(invoice.cae_due_date.slice(0, 4) + '-' + invoice.cae_due_date.slice(4, 6) + '-' + invoice.cae_due_date.slice(6, 8)).toLocaleDateString('es-AR')
        : '-';
    doc.text(`Vencimiento CAE: ${dueDate}`, 50, yFooter + 12);

    doc.setFontSize(8);
    doc.text('Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación', 10, pageHeight - 10);

    // Save
    doc.save(`Factura-${invoice.cbte_tipo === 11 ? 'C' : 'B'}-${ptoVta}-${cbteNro}.pdf`);
};

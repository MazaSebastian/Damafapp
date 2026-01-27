
// Helper to wrap SOAP Body for WSFE
const createSoapEnvelope = (method: string, body: string, token: string, sign: string, cuit: string) => {
    return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:${method}>
         <ar:Auth>
            <ar:Token>${token}</ar:Token>
            <ar:Sign>${sign}</ar:Sign>
            <ar:Cuit>${cuit}</ar:Cuit>
         </ar:Auth>
         ${body}
      </ar:${method}>
   </soapenv:Body>
</soapenv:Envelope>`;
}

export const getLastVoucher = async (token: string, sign: string, cuit: string, ptoVta: number, cbteTipo: number, environment: 'production' | 'testing') => {
    const url = environment === 'production'
        ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
        : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    const body = `
        <ar:PtoVta>${ptoVta}</ar:PtoVta>
        <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    `;

    const soapRequest = createSoapEnvelope('FECompUltimoAutorizado', body, token, sign, cuit);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado' },
        body: soapRequest
    });

    const text = await response.text();
    // Parse result (Simplified)
    const match = text.match(/<CbteNro>(.*?)<\/CbteNro>/);
    return match ? parseInt(match[1]) : 0;
}

export const generateInvoice = async (
    token: string,
    sign: string,
    cuit: string,
    invoiceData: any,
    environment: 'production' | 'testing'
) => {
    const url = environment === 'production'
        ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
        : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    // Construct FECAERequest XML
    // This expects invoiceData to have: CbteTipo, PtoVta, Concepto, DocTipo, DocNro, CbteDesde, CbteHasta, CbteFch, ImpTotal, etc.
    const body = `
         <ar:FeCAEReq>
            <ar:FeCabReq>
               <ar:CantReg>1</ar:CantReg>
               <ar:PtoVta>${invoiceData.PtoVta}</ar:PtoVta>
               <ar:CbteTipo>${invoiceData.CbteTipo}</ar:CbteTipo>
            </ar:FeCabReq>
            <ar:FeDetReq>
               <ar:FECAEDetRequest>
                  <ar:Concepto>${invoiceData.Concepto}</ar:Concepto>
                  <ar:DocTipo>${invoiceData.DocTipo}</ar:DocTipo>
                  <ar:DocNro>${invoiceData.DocNro}</ar:DocNro>
                  <ar:CbteDesde>${invoiceData.CbteDesde}</ar:CbteDesde>
                  <ar:CbteHasta>${invoiceData.CbteHasta}</ar:CbteHasta>
                  <ar:CbteFch>${invoiceData.CbteFch}</ar:CbteFch>
                  <ar:ImpTotal>${invoiceData.ImpTotal}</ar:ImpTotal>
                  <ar:ImpTotConc>0</ar:ImpTotConc>
                  <ar:ImpNeto>${invoiceData.ImpTotal}</ar:ImpNeto>
                  <ar:ImpOpEx>0</ar:ImpOpEx>
                  <ar:ImpTrib>0</ar:ImpTrib>
                  <ar:ImpIVA>0</ar:ImpIVA>
                  <ar:MonId>PES</ar:MonId>
                  <ar:MonCotiz>1</ar:MonCotiz>
               </ar:FECAEDetRequest>
            </ar:FeDetReq>
         </ar:FeCAEReq>
    `;

    const soapRequest = createSoapEnvelope('FECAESolicitar', body, token, sign, cuit);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar' },
        body: soapRequest
    });

    const text = await response.text();

    // Parse CAE and CAE Fch Vto
    const caeMatch = text.match(/<CAE>(.*?)<\/CAE>/);
    const dateMatch = text.match(/<CAEFchVto>(.*?)<\/CAEFchVto>/);
    const resultMatch = text.match(/<Resultado>(.*?)<\/Resultado>/);

    // Parse Errors
    const errorMatch = text.match(/<Err>(.*?)<\/Err>/s); // s flag for dotAll not always supported in strict regex, but usually works in JS. Safe to use [\s\S]*?
    let errorMsg = null;
    if (errorMatch) {
        const msgMatch = errorMatch[1].match(/<Msg>(.*?)<\/Msg>/);
        const codeMatch = errorMatch[1].match(/<Code>(.*?)<\/Code>/);
        if (msgMatch) {
            errorMsg = `${msgMatch[1]} (Cod: ${codeMatch ? codeMatch[1] : '?'})`;
        }
    }

    // Parse Observations
    const obsMatch = text.match(/<Obs>(.*?)<\/Obs>/s);
    let obsMsg = null;
    if (obsMatch) {
        const msgMatch = obsMatch[1].match(/<Msg>(.*?)<\/Msg>/);
        if (msgMatch) obsMsg = msgMatch[1];
    }

    return {
        cae: caeMatch ? caeMatch[1] : null,
        caeFchVto: dateMatch ? dateMatch[1] : null,
        resultado: resultMatch ? resultMatch[1] : 'Error',
        errorMsg: errorMsg || obsMsg, // Returns the specific error message if found
        rawResponse: text // Keep raw for debugging
    };
}

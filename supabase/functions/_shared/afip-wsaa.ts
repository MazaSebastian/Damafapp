
import { createClient } from 'npm:@supabase/supabase-js@2'
import forge from 'npm:node-forge@1.3.1';

// Interface for Token/Sign
interface AfipAuth {
    token: string
    sign: string
    expiration: Date
}

// XML Template for LoginTicketRequest
const getLoginTicketRequest = (service: string = 'wsfe'): string => {
    const now = new Date();
    const expiration = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours

    // Format: YYYY-MM-DDTHH:mm:ss
    const formatDate = (date: Date) => date.toISOString().split('.')[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${formatDate(now)}</generationTime>
    <expirationTime>${formatDate(expiration)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

export const getWSAAAuth = async (supabase: any, environment: 'testing' | 'production' = 'production'): Promise<AfipAuth> => {
    // 1. Check if we have a valid token in DB
    const { data: existingToken } = await supabase
        .from('afip_tokens')
        .select('*')
        .eq('environment', environment)
        .gt('expiration_time', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existingToken) {
        return {
            token: existingToken.token,
            sign: existingToken.sign,
            expiration: new Date(existingToken.expiration_time)
        };
    }

    // 2. If not, generate a new one
    // Retrieve Credentials
    const { data: credentials } = await supabase
        .from('afip_credentials')
        .select('*')
        .eq('environment', environment)
        .eq('is_active', true)
        .single();

    if (!credentials) {
        throw new Error('AFIP Credentials not found/active');
    }

    // Generating TRA
    const tra = getLoginTicketRequest('wsfe');

    // Sign TRA (CMS/PKCS#7)
    // Sanitize Key just in case
    const safeKey = credentials.private_key.replace(/\\n/g, '\n').trim();
    const cms = await signTRA(tra, safeKey, credentials.cert_crt);

    // Call WSAA
    const wsdlUrl = environment === 'production'
        ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
        : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

    // SOAP Request for LoginCMS
    const soapRequest = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://wsaa.view.sua.dvadac.desein.afip.gov">
   <soapenv:Header/>
   <soapenv:Body>
      <ser:loginCms>
         <in0>${cms}</in0>
      </ser:loginCms>
   </soapenv:Body>
</soapenv:Envelope>`;

    // Execute Request
    const response = await fetch(wsdlUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': ''
        },
        body: soapRequest
    });

    const textResponse = await response.text();

    // Parse XML Response (Simplified regex parsing for now)
    const tokenMatch = textResponse.match(/<token>(.*?)<\/token>/);
    const signMatch = textResponse.match(/<sign>(.*?)<\/sign>/);
    const expirationMatch = textResponse.match(/<expirationTime>(.*?)<\/expirationTime>/);

    if (!tokenMatch || !signMatch) {
        console.error("WSAA Error", textResponse);
        // Try to extract faultstring or error
        const faultMatch = textResponse.match(/<faultstring>(.*?)<\/faultstring>/) || textResponse.match(/<faultcode>(.*?)<\/faultcode>/);
        const errorDetail = faultMatch ? faultMatch[1] : textResponse.substring(0, 500); // Return up to 500 chars of xml to see what happened
        throw new Error(`AFIP WSAA Error: ${errorDetail}`);
    }

    const newToken = tokenMatch[1];
    const newSign = signMatch[1];
    const expirationTime = expirationMatch ? expirationMatch[1] : new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString();

    // Save to DB
    await supabase.from('afip_tokens').insert({
        environment,
        token: newToken,
        sign: newSign,
        expiration_time: expirationTime
    });

    return {
        token: newToken,
        sign: newSign,
        expiration: new Date(expirationTime)
    };
}

// Function to Sign TRA using node-forge
async function signTRA(xml: string, keyPem: string, certPem: string): Promise<string> {
    try {
        const pki = forge.pki;
        const privateKey = pki.privateKeyFromPem(keyPem);
        const certificate = pki.certificateFromPem(certPem);

        // Create PKCS#7 signed data
        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(xml, 'utf8');
        p7.addCertificate(certificate);
        p7.addSigner({
            key: privateKey,
            certificate: certificate,
            digestAlgorithm: forge.pki.oids.sha256,
            authenticatedAttributes: [{
                type: forge.pki.oids.contentType,
                value: forge.pki.oids.data
            }, {
                type: forge.pki.oids.messageDigest,
            }, {
                type: forge.pki.oids.signingTime,
            }]
        });

        // Detached signature is NOT what AFIP wants usually, they want standard CMS.
        // But LoginCMS expects valid Base64 of the CMS.
        p7.sign({ detached: false });

        const asn1 = p7.toAsn1();
        const der = forge.asn1.toDer(asn1).getBytes();
        const base64 = forge.util.encode64(der);

        return base64;
    } catch (e) {
        console.error("Signing Error:", e);
        throw new Error("Failed to sign TRA with provided credentials");
    }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Afip from "npm:@afipsdk/afip.js@0.7.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Initialize Supabase Client (Admin context required for Storage)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 3. Parse Request Body
        const { order_id, total, point_of_sale, tax_id, invoice_type } = await req.json()

        if (!total || !point_of_sale) {
            throw new Error('Variables faltantes: total o punto de venta')
        }

        console.log(`🚀 Iniciando Facturación para Orden #${order_id || 'N/A'}`)

        // 4. Retrieve Certificates from Storage (Bucket 'afip-certs')
        // We assume files are named 'certificate.crt' and 'private.key'
        const { data: certData, error: certError } = await supabase.storage.from('afip-certs').download('certificate.crt')
        const { data: keyData, error: keyError } = await supabase.storage.from('afip-certs').download('private.key')

        if (certError || keyError) {
            console.error('Cert/Key Error:', certError, keyError)
            throw new Error('No se encontraron los certificados en el Storage (bucket: afip-certs)')
        }

        const certContent = await certData.text()
        const keyContent = await keyData.text()

        // 5. Initialize AFIP SDK
        const afip = new Afip({
            CUIT: Deno.env.get('AFIP_CUIT') ? parseInt(Deno.env.get('AFIP_CUIT')!) : 20111111112, // Default or Env
            cert: certContent,
            key: keyContent,
            production: false, // Force Testing for now (change to true in Prod)
            res_folder: '/tmp/' // Deno writable path
        })

        // 6. Get Last Voucher Number
        const serverStatus = await afip.ElectronicBilling.getServerStatus()
        console.log('📡 AFIP Server Status:', serverStatus.AppServer)

        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(point_of_sale, 6) // 6 = Factura B (Hardcoded for test)
        const nextVoucher = lastVoucher + 1

        // 7. Prepared Invoice Data (Factura B < $XXX doesn't need DNI)
        const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0]

        const data = {
            'CantReg': 1, // Cantidad de comprobantes a registrar
            'PtoVta': point_of_sale,
            'CbteTipo': 6, // Factura B (TODO: Dynamic based on client)
            'Concepto': 1, // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
            'DocTipo': 99, // 99 = Sin identificar (< $limit), 96 = DNI, 80 = CUIT
            'DocNro': 0,
            'CbteDesde': nextVoucher,
            'CbteHasta': nextVoucher,
            'CbteFch': parseInt(date.replace(/-/g, '')),
            'ImpTotal': total,
            'ImpTotConc': 0, // Importe neto no gravado
            'ImpNeto': total / 1.21, // Basic reverse calc for 21%
            'ImpOpEx': 0,
            'ImpTrib': 0,
            'ImpIVA': total - (total / 1.21),
            'FchServDesde': null,
            'FchServHasta': null,
            'FchVtoPago': null,
            'MonId': 'PES',
            'MonCotiz': 1,
            'Iva': [
                {
                    'Id': 5, // 21%
                    'BaseImp': total / 1.21,
                    'Importe': total - (total / 1.21)
                }
            ]
        }

        // Handling User ID if provided
        if (tax_id) {
            data.DocTipo = 80 // CUIT
            data.DocNro = tax_id
        }

        console.log('📝 Creating Voucher:', data)

        // 8. Create Voucher
        const response = await afip.ElectronicBilling.createVoucher(data)

        console.log('✅ Voucher Created:', response)

        return new Response(
            JSON.stringify({
                success: true,
                cae: response.CAE,
                cae_expiration: response.CAEFchVto,
                voucher_number: nextVoucher
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Error handling request:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

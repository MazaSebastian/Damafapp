
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getWSAAAuth } from '../_shared/afip-wsaa.ts'
import { getLastVoucher, generateInvoice } from '../_shared/afip-wsfe.ts'

console.log("AFIP Invoice Function initialized")

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, orderId, environment = 'production' } = await req.json()

        // 1. Authenticate (WSAA)
        // This will either get existing token or try to generate new one (which might fail if signing not implemented)
        const auth = await getWSAAAuth(supabaseClient, environment);

        // Get Credentials for CUIT and PtoVta
        const { data: credentials } = await supabaseClient
            .from('afip_credentials')
            .select('*')
            .eq('environment', environment)
            .single();

        if (!credentials) throw new Error("No active credentials found");

        if (action === 'status') {
            const lastVoucher = await getLastVoucher(auth.token, auth.sign, credentials.cuit, credentials.sales_point, 6, environment); // 6 = Factura B
            return new Response(JSON.stringify({ status: 'online', last_voucher: lastVoucher }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'generate' && orderId) {
            // Fetch Order Data
            const { data: order } = await supabaseClient
                .from('orders')
                .select('*, customer:customer_id(*), address:delivery_address_id(*)')
                .eq('id', orderId)
                .single();

            if (!order) throw new Error("Order not found");

            // Determine Invoice Details
            const isMonotributo = credentials.tax_condition === 'monotributo';
            const cbteTipo = isMonotributo ? 11 : 6; // 11=Factura C, 6=Factura B
            const docTipo = 99; // Sin identificar (Consumidor Final < X amount)
            const docNro = '0';

            const lastCbte = await getLastVoucher(auth.token, auth.sign, credentials.cuit, credentials.sales_point, cbteTipo, environment);
            const nextCbte = lastCbte + 1;
            const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

            const invoiceData = {
                PtoVta: credentials.sales_point,
                CbteTipo: cbteTipo,
                Concepto: 1, // Productos
                DocTipo: docTipo,
                DocNro: docNro,
                CbteDesde: nextCbte,
                CbteHasta: nextCbte,
                CbteFch: date,
                ImpTotal: order.total,
            };

            const result = await generateInvoice(auth.token, auth.sign, credentials.cuit, invoiceData, environment);

            if (result.cae) {
                // Success: update DB
                await supabaseClient.from('invoices').insert({
                    order_id: orderId,
                    cae: result.cae,
                    cae_due_date: result.caeFchVto, // Format matches? check
                    cbte_tipo: cbteTipo,
                    cbte_nro: nextCbte,
                    pt_vta: credentials.sales_point,
                    total_amount: order.total,
                    status: 'authorized',
                    afip_response: result
                });

                return new Response(JSON.stringify({ success: true, cae: result.cae, number: nextCbte }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            } else {
                return new Response(JSON.stringify({ success: false, error: result }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                })
            }
        }

        return new Response(JSON.stringify({ error: 'Invalid Action' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // #region agent log
  fetch('http://127.0.0.1:7817/ingest/ad9fb65c-2094-4cdc-b76a-efbaee009d2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c93616'},body:JSON.stringify({sessionId:'c93616',location:'lib/supabase-server.js:getSupabaseAdmin',message:'env check',data:{hasUrl:Boolean(url),urlHost:url?new URL(url).host:null,hasServiceRoleKey:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),hasSecretKey:Boolean(process.env.SUPABASE_SECRET_KEY),hasAnyKey:Boolean(serviceRoleKey),keyPrefix:serviceRoleKey?serviceRoleKey.slice(0,10):null},timestamp:Date.now(),hypothesisId:'A-B-C'})}).catch(()=>{});
  // #endregion

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

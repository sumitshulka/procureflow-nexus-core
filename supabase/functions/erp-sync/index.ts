import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ERPIntegration {
  id: string;
  name: string;
  erp_type: string;
  base_url: string;
  auth_type: string;
  auth_config: Record<string, string>;
  endpoint_mappings: Record<string, { create: string; update: string; method: string }>;
  field_mappings: Record<string, Record<string, string>>;
  request_headers: Record<string, string>;
  request_timeout_seconds: number;
  retry_attempts: number;
  sync_invoices: boolean;
  sync_purchase_orders: boolean;
}

interface SyncRequest {
  integrationId: string;
  action: "sync_all" | "sync_entity";
  entityType?: "invoice" | "purchase_order";
  entityId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SyncRequest = await req.json();
    const { integrationId, action, entityType, entityId } = body;

    console.log(`ERP Sync request: action=${action}, integration=${integrationId}`);

    // Get integration config
    const { data: integration, error: intError } = await supabase
      .from("erp_integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: "Integration not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let synced = 0;
    let failed = 0;

    if (action === "sync_all") {
      // Sync invoices
      if (integration.sync_invoices) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("*")
          .in("status", ["approved", "paid"])
          .order("created_at", { ascending: false })
          .limit(50);

        for (const invoice of invoices || []) {
          const result = await syncEntity(
            supabase,
            integration as ERPIntegration,
            "invoice",
            invoice,
            userData.user.id
          );
          if (result.success) synced++;
          else failed++;
        }
      }

      // Sync purchase orders
      if (integration.sync_purchase_orders) {
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("*")
          .in("status", ["approved", "sent", "acknowledged"])
          .order("created_at", { ascending: false })
          .limit(50);

        for (const po of pos || []) {
          const result = await syncEntity(
            supabase,
            integration as ERPIntegration,
            "purchase_order",
            po,
            userData.user.id
          );
          if (result.success) synced++;
          else failed++;
        }
      }
    } else if (action === "sync_entity" && entityType && entityId) {
      // Sync single entity
      const table = entityType === "invoice" ? "invoices" : "purchase_orders";
      const { data: entity, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", entityId)
        .single();

      if (!error && entity) {
        const result = await syncEntity(
          supabase,
          integration as ERPIntegration,
          entityType,
          entity,
          userData.user.id
        );
        if (result.success) synced++;
        else failed++;
      }
    }

    // Update last sync status
    await supabase
      .from("erp_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: failed > 0 ? (synced > 0 ? "partial" : "failed") : "success",
      })
      .eq("id", integrationId);

    console.log(`ERP Sync completed: synced=${synced}, failed=${failed}`);

    return new Response(
      JSON.stringify({ success: true, synced, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ERP Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncEntity(
  supabase: any,
  integration: ERPIntegration,
  entityType: "invoice" | "purchase_order",
  entity: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  const entityReference = entityType === "invoice" 
    ? entity.invoice_number 
    : entity.po_number;

  // Create log entry
  const { data: logEntry } = await supabase
    .from("erp_sync_logs")
    .insert({
      integration_id: integration.id,
      entity_type: entityType,
      entity_id: entity.id,
      entity_reference: entityReference,
      sync_direction: "outbound",
      status: "in_progress",
      triggered_by: userId,
    })
    .select()
    .single();

  try {
    // Build request payload using field mappings
    const fieldMappings = integration.field_mappings[entityType] || {};
    const payload = mapFields(entity, fieldMappings);

    // Get endpoint config
    const endpointConfig = integration.endpoint_mappings[entityType];
    const endpoint = endpointConfig?.create || `/api/${entityType}s`;
    const method = endpointConfig?.method || "POST";

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...integration.request_headers,
    };

    // Add auth headers
    switch (integration.auth_type) {
      case "api_key":
        headers["X-API-Key"] = integration.auth_config.api_key || "";
        break;
      case "bearer":
        headers["Authorization"] = `Bearer ${integration.auth_config.bearer_token}`;
        break;
      case "basic":
        const basicAuth = btoa(
          `${integration.auth_config.username}:${integration.auth_config.password}`
        );
        headers["Authorization"] = `Basic ${basicAuth}`;
        break;
      case "oauth2":
        // For OAuth2, we'd need to handle token refresh - simplified here
        headers["Authorization"] = `Bearer ${integration.auth_config.access_token || ""}`;
        break;
    }

    const url = `${integration.base_url}${endpoint}`;
    console.log(`Syncing ${entityType} ${entity.id} to ${url}`);

    // Make request with retry logic
    let response: Response | null = null;
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= integration.retry_attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          integration.request_timeout_seconds * 1000
        );

        response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) break;
        
        // Don't retry on client errors
        if (response.status >= 400 && response.status < 500) break;
        
        retryCount = attempt + 1;
      } catch (err) {
        lastError = err as Error;
        retryCount = attempt + 1;
        
        // Wait before retry (exponential backoff)
        if (attempt < integration.retry_attempts) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    const duration = Date.now() - startTime;
    let responsePayload = null;
    let erpRefId = null;
    let erpRefNumber = null;

    if (response) {
      try {
        responsePayload = await response.json();
        // Try to extract ERP reference from common response patterns
        erpRefId = responsePayload?.id || responsePayload?.documentId || responsePayload?.data?.id;
        erpRefNumber = responsePayload?.documentNumber || responsePayload?.number || responsePayload?.data?.documentNumber;
      } catch {
        responsePayload = { raw: await response.text() };
      }
    }

    const success = response?.ok || false;

    // Update log entry
    await supabase
      .from("erp_sync_logs")
      .update({
        status: success ? "success" : "failed",
        request_payload: payload,
        response_payload: responsePayload,
        response_code: response?.status,
        error_message: success ? null : (lastError?.message || `HTTP ${response?.status}`),
        error_details: lastError ? { message: lastError.message, stack: lastError.stack } : null,
        retry_count: retryCount,
        erp_reference_id: erpRefId,
        erp_reference_number: erpRefNumber,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("id", logEntry?.id);

    return { success, error: success ? undefined : (lastError?.message || `HTTP ${response?.status}`) };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    await supabase
      .from("erp_sync_logs")
      .update({
        status: "failed",
        error_message: (error as Error).message,
        error_details: { message: (error as Error).message, stack: (error as Error).stack },
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("id", logEntry?.id);

    return { success: false, error: (error as Error).message };
  }
}

function mapFields(entity: any, mappings: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  
  // If no mappings defined, return entity as-is
  if (Object.keys(mappings).length === 0) {
    return entity;
  }

  for (const [ourField, erpField] of Object.entries(mappings)) {
    if (entity[ourField] !== undefined) {
      // Handle nested field names (e.g., "vendor.name")
      const parts = erpField.split(".");
      if (parts.length === 1) {
        result[erpField] = entity[ourField];
      } else {
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = current[parts[i]] || {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = entity[ourField];
      }
    }
  }

  return result;
}

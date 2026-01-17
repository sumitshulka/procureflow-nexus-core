import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateUserBody = {
  email: string;
  password: string;
  fullName?: string;
  role_id?: string;
  department_id?: string | null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing Supabase env vars" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client bound to caller token (but using service key so we can RPC even if RLS is strict)
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    const caller = authData?.user;

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify admin role
    const { data: hasAdminRole, error: roleError } = await supabaseClient.rpc(
      "has_role_by_name",
      {
        _user_id: caller.id,
        _role_name: "admin",
      },
    );

    if (roleError || !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    const body = (await req.json()) as CreateUserBody;

    if (!body?.email || !body?.password) {
      return new Response(JSON.stringify({ error: "email and password are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fullName = body.fullName?.trim() || null;
    const departmentId = body.department_id ?? null;
    const roleId = body.role_id ?? null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create auth user WITHOUT changing the caller's session
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : {},
    });

    if (createError || !created?.user) {
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const newUserId = created.user.id;

    // Ensure profile fields are set (trigger may have created it already)
    const profilePayload: Record<string, unknown> = {
      id: newUserId,
    };
    if (fullName) profilePayload.full_name = fullName;
    if (departmentId !== undefined) profilePayload.department_id = departmentId;

    const { error: upsertProfileError } = await adminClient
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertProfileError) {
      return new Response(JSON.stringify({ error: upsertProfileError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Set role (replace any default role inserted by trigger)
    if (roleId) {
      const { error: clearRolesError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", newUserId);

      if (clearRolesError) {
        return new Response(JSON.stringify({ error: clearRolesError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { error: assignRoleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role_id: roleId });

      if (assignRoleError) {
        return new Response(JSON.stringify({ error: assignRoleError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Best-effort security log
    try {
      await supabaseClient.rpc("log_security_event", {
        p_user_id: caller.id,
        p_event_type: "admin_create_user_success",
        p_event_data: {
          target_user_id: newUserId,
          target_email: body.email,
          role_id: roleId,
          department_id: departmentId,
        },
        p_success: true,
      });
    } catch (_) {
      // ignore
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: newUserId, email: body.email } }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in admin-create-user function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

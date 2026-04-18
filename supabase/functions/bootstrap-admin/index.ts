// Bootstrap Super Admin endpoint.
// Only succeeds when NO user with the "Super Admin" or "Admin" role exists yet.
// Creates an auth user, assigns the Super Admin role, and returns a one-time
// generated password that the user must change on first login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type BootstrapBody = {
  email?: string;
  fullName?: string;
};

function generatePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // Guarantee at least one of each class
  const required = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  const rest = Array.from(bytes.slice(4)).map((b) => all[b % all.length]);
  const pwdArr = [...required, ...rest];
  // Shuffle
  for (let i = pwdArr.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [pwdArr[i], pwdArr[j]] = [pwdArr[j], pwdArr[i]];
  }
  return pwdArr.join("");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // GET: status check — does an admin already exist?
    if (req.method === "GET") {
      const { data: roles } = await admin
        .from("custom_roles")
        .select("id, name")
        .in("name", ["Super Admin", "Admin", "admin", "administrator"]);

      const roleIds = (roles ?? []).map((r) => r.id);
      let alreadyExists = false;

      if (roleIds.length > 0) {
        const { count: c1 } = await admin
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .in("role_id", roleIds);
        const { count: c2 } = await admin
          .from("user_role_assignments")
          .select("user_id", { count: "exact", head: true })
          .in("custom_role_id", roleIds);
        alreadyExists = (c1 ?? 0) > 0 || (c2 ?? 0) > 0;
      }

      return new Response(
        JSON.stringify({ alreadyExists }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as BootstrapBody;
    const email = (body.email ?? "").trim().toLowerCase();
    const fullName = (body.fullName ?? "").trim() || null;

    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "A valid email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Find / ensure the Super Admin role
    const { data: roles, error: rolesErr } = await admin
      .from("custom_roles")
      .select("id, name")
      .in("name", ["Super Admin", "Admin", "admin", "administrator"]);

    if (rolesErr) {
      return new Response(
        JSON.stringify({ error: rolesErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    let superAdminRole = (roles ?? []).find((r) => r.name === "Super Admin")
      ?? (roles ?? []).find((r) => r.name.toLowerCase() === "admin")
      ?? (roles ?? []).find((r) => r.name.toLowerCase() === "administrator");

    if (!superAdminRole) {
      const { data: created, error: createRoleErr } = await admin
        .from("custom_roles")
        .insert({ name: "Super Admin", description: "Full access to all system features", is_active: true })
        .select("id, name")
        .single();
      if (createRoleErr || !created) {
        return new Response(
          JSON.stringify({ error: createRoleErr?.message || "Failed to create Super Admin role" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
        );
      }
      superAdminRole = created;
    }

    const adminRoleIds = (roles ?? []).map((r) => r.id);
    if (!adminRoleIds.includes(superAdminRole.id)) adminRoleIds.push(superAdminRole.id);

    // Reject if any admin already exists
    const { count: ur1 } = await admin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .in("role_id", adminRoleIds);
    const { count: ur2 } = await admin
      .from("user_role_assignments")
      .select("user_id", { count: "exact", head: true })
      .in("custom_role_id", adminRoleIds);

    if ((ur1 ?? 0) > 0 || (ur2 ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          error: "A Super Admin already exists. Bootstrap is disabled.",
          alreadyExists: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }

    // Generate one-time password
    const password = generatePassword(18);

    // Create the auth user (email confirmed so they can log in immediately)
    const { data: createdUser, error: createUserErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName, must_change_password: true } : { must_change_password: true },
      });

    if (createUserErr || !createdUser?.user) {
      return new Response(
        JSON.stringify({ error: createUserErr?.message || "Failed to create user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const newUserId = createdUser.user.id;

    // Profile (trigger may have created one already)
    await admin.from("profiles").upsert(
      { id: newUserId, ...(fullName ? { full_name: fullName } : {}) },
      { onConflict: "id" },
    );

    // Assign role in BOTH tables used by this app's authorization layers
    const { error: urErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role_id: superAdminRole.id });
    if (urErr) {
      console.error("user_roles insert failed:", urErr.message);
    }

    const { error: uraErr } = await admin
      .from("user_role_assignments")
      .insert({ user_id: newUserId, custom_role_id: superAdminRole.id });
    if (uraErr) {
      console.error("user_role_assignments insert failed:", uraErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUserId, email },
        password,
        notice: "Save this password now — it will not be shown again. You must change it after first login.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("bootstrap-admin error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

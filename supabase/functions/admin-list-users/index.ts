import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Admin list users function called");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify the user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Check if user has admin role using has_role_by_name function (case-insensitive)
    const { data: hasAdminRole, error: roleError } = await supabaseClient.rpc('has_role_by_name', {
      _user_id: user.id,
      _role_name: 'admin'
    });

    if (roleError || !hasAdminRole) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Log the security event
    await supabaseClient.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'admin_list_users_access',
      p_event_data: {},
      p_success: true
    });

    // List users using service role key (admin operation)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      
      // Log failed attempt
      await supabaseClient.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'admin_list_users_failed',
        p_event_data: { error: listError.message },
        p_success: false
      });
      
      return new Response(
        JSON.stringify({ error: listError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Users listed successfully");
    
    return new Response(
      JSON.stringify({ data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in admin-list-users function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
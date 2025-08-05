-- COMPREHENSIVE SECURITY FIXES - Final Phase
-- Addresses ALL remaining linter issues

-- 1. Find and fix remaining exposed auth.users issue
-- Query system tables to identify the exposed view
DO $$
DECLARE
    view_name text;
BEGIN
    -- Drop any remaining views that might expose auth.users
    FOR view_name IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%auth.users%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(view_name) || ' CASCADE';
    END LOOP;
END $$;

-- 2. Fix remaining functions missing SET search_path (5 functions)
-- These functions need to be secured against search path attacks

-- Fix begin_transaction function
CREATE OR REPLACE FUNCTION public.begin_transaction()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Using EXECUTE to run the BEGIN statement
  EXECUTE 'BEGIN';
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix commit_transaction function
CREATE OR REPLACE FUNCTION public.commit_transaction()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Using EXECUTE to run the COMMIT statement
  EXECUTE 'COMMIT';
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix rollback_transaction function
CREATE OR REPLACE FUNCTION public.rollback_transaction()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Using EXECUTE to run the ROLLBACK statement
  EXECUTE 'ROLLBACK';
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix delete_procurement_request function
CREATE OR REPLACE FUNCTION public.delete_procurement_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    result jsonb;
    req_status text;
    is_used_in_inventory boolean;
BEGIN
    -- Check if the request exists and get its status
    SELECT status::text INTO req_status FROM public.procurement_requests WHERE id = p_request_id;
    
    IF req_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Procurement request not found');
    END IF;
    
    -- Check if request is in a state that allows deletion
    IF req_status NOT IN ('draft', 'submitted') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Request cannot be deleted because it is in %s status', req_status)
        );
    END IF;
    
    -- Check if the request is used in inventory transactions
    SELECT EXISTS (
        SELECT 1 FROM inventory_transactions
        WHERE request_id = p_request_id::text
        LIMIT 1
    ) INTO is_used_in_inventory;
    
    IF is_used_in_inventory THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request cannot be deleted because it is used in inventory transactions'
        );
    END IF;
    
    -- Delete related request items first
    DELETE FROM public.procurement_request_items
    WHERE request_id = p_request_id;
    
    -- Delete any approvals related to this request
    DELETE FROM public.approvals
    WHERE entity_type = 'procurement_request' AND entity_id = p_request_id;
    
    -- Delete the request itself
    DELETE FROM public.procurement_requests
    WHERE id = p_request_id
    RETURNING to_jsonb(id) INTO result;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Procurement request deleted successfully',
        'data', result
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$;

-- Fix can_delete_procurement_request function
CREATE OR REPLACE FUNCTION public.can_delete_procurement_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    result jsonb;
    req_status text;
    is_used_in_inventory boolean;
BEGIN
    -- Check if the request exists and get its status
    SELECT status::text INTO req_status FROM public.procurement_requests WHERE id = p_request_id;
    
    IF req_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Procurement request not found');
    END IF;
    
    -- Check if request is in a state that allows deletion
    IF req_status NOT IN ('draft', 'submitted') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Request cannot be deleted because it is in %s status', req_status)
        );
    END IF;
    
    -- Check if the request is used in inventory transactions
    SELECT EXISTS (
        SELECT 1 FROM inventory_transactions
        WHERE request_id = p_request_id::text
        LIMIT 1
    ) INTO is_used_in_inventory;
    
    IF is_used_in_inventory THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request cannot be deleted because it is used in inventory transactions'
        );
    END IF;
    
    -- If all checks pass, return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Request can be deleted'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$;

-- 3. Create RLS policies for tables that have RLS enabled but no policies
-- These tables currently have RLS enabled but no access control

-- For custom_roles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_roles') THEN
        -- Admin can manage custom roles
        DROP POLICY IF EXISTS "Admin can manage custom roles" ON public.custom_roles;
        CREATE POLICY "Admin can manage custom roles" 
        ON public.custom_roles 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- Users can view active custom roles
        DROP POLICY IF EXISTS "Users can view active custom roles" ON public.custom_roles;
        CREATE POLICY "Users can view active custom roles" 
        ON public.custom_roles 
        FOR SELECT 
        USING (is_active = true);
    END IF;
END $$;

-- For system_modules table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_modules') THEN
        -- Admin can manage system modules
        DROP POLICY IF EXISTS "Admin can manage system modules" ON public.system_modules;
        CREATE POLICY "Admin can manage system modules" 
        ON public.system_modules 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- Users can view active system modules
        DROP POLICY IF EXISTS "Users can view active system modules" ON public.system_modules;
        CREATE POLICY "Users can view active system modules" 
        ON public.system_modules 
        FOR SELECT 
        USING (is_active = true);
    END IF;
END $$;

-- For user_module_permissions table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_module_permissions') THEN
        -- Admin can manage user module permissions
        DROP POLICY IF EXISTS "Admin can manage user module permissions" ON public.user_module_permissions;
        CREATE POLICY "Admin can manage user module permissions" 
        ON public.user_module_permissions 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- Users can view their own permissions
        DROP POLICY IF EXISTS "Users can view their own module permissions" ON public.user_module_permissions;
        CREATE POLICY "Users can view their own module permissions" 
        ON public.user_module_permissions 
        FOR SELECT 
        USING (user_id = auth.uid());
    END IF;
END $$;

-- For security_audit_logs table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit_logs') THEN
        -- Only admin can view security audit logs
        DROP POLICY IF EXISTS "Admin can view security audit logs" ON public.security_audit_logs;
        CREATE POLICY "Admin can view security audit logs" 
        ON public.security_audit_logs 
        FOR SELECT 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- System can insert security audit logs
        DROP POLICY IF EXISTS "System can insert security audit logs" ON public.security_audit_logs;
        CREATE POLICY "System can insert security audit logs" 
        ON public.security_audit_logs 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- For products table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'products'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'products'
    ) THEN
        -- All authenticated users can view products
        CREATE POLICY "Authenticated users can view products" 
        ON public.products 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
        
        -- Admin and procurement officers can manage products
        CREATE POLICY "Admin and procurement officers can manage products" 
        ON public.products 
        FOR ALL 
        USING (
            has_role(auth.uid(), 'admin'::user_role) OR 
            has_role(auth.uid(), 'procurement_officer'::user_role)
        );
    END IF;
END $$;

-- For product_price_history table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'product_price_history'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'product_price_history'
    ) THEN
        -- All authenticated users can view product price history
        CREATE POLICY "Authenticated users can view price history" 
        ON public.product_price_history 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
        
        -- System can insert price history
        CREATE POLICY "System can insert price history" 
        ON public.product_price_history 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- For approval_assignments table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'approval_assignments'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'approval_assignments'
    ) THEN
        -- Admin can manage approval assignments
        CREATE POLICY "Admin can manage approval assignments" 
        ON public.approval_assignments 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- Users can view approval assignments
        CREATE POLICY "Users can view approval assignments" 
        ON public.approval_assignments 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- For organization_settings table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_settings'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'organization_settings'
    ) THEN
        -- Admin can manage organization settings
        CREATE POLICY "Admin can manage organization settings" 
        ON public.organization_settings 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view organization settings
        CREATE POLICY "Users can view organization settings" 
        ON public.organization_settings 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- For units table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'units'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'units'
    ) THEN
        -- Admin can manage units
        CREATE POLICY "Admin can manage units" 
        ON public.units 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view units
        CREATE POLICY "Users can view units" 
        ON public.units 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- For departments table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'departments'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'departments'
    ) THEN
        -- Admin can manage departments
        CREATE POLICY "Admin can manage departments" 
        ON public.departments 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view departments
        CREATE POLICY "Users can view departments" 
        ON public.departments 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- For pricing_templates table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pricing_templates'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pricing_templates'
    ) THEN
        -- Template creators can manage their templates
        CREATE POLICY "Template creators can manage their templates" 
        ON public.pricing_templates 
        FOR ALL 
        USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view active templates
        CREATE POLICY "Users can view active templates" 
        ON public.pricing_templates 
        FOR SELECT 
        USING (is_active = true);
    END IF;
END $$;

-- For user_types table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_types'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_types'
    ) THEN
        -- Admin can manage user types
        CREATE POLICY "Admin can manage user types" 
        ON public.user_types 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view user types
        CREATE POLICY "Users can view user types" 
        ON public.user_types 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- For product_classifications table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'product_classifications'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'product_classifications'
    ) THEN
        -- Admin can manage product classifications
        CREATE POLICY "Admin can manage product classifications" 
        ON public.product_classifications 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- All authenticated users can view active classifications
        CREATE POLICY "Users can view active classifications" 
        ON public.product_classifications 
        FOR SELECT 
        USING (is_active = true);
    END IF;
END $$;

-- For rfp_activities table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rfp_activities'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'rfp_activities'
    ) THEN
        -- RFP creators and admins can view activities
        CREATE POLICY "RFP stakeholders can view activities" 
        ON public.rfp_activities 
        FOR SELECT 
        USING (
            has_role(auth.uid(), 'admin'::user_role) OR 
            has_role(auth.uid(), 'procurement_officer'::user_role) OR
            performed_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.rfps r 
                WHERE r.id = rfp_activities.rfp_id 
                AND r.created_by = auth.uid()
            )
        );
        
        -- System can insert activities
        CREATE POLICY "System can insert activities" 
        ON public.rfp_activities 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- For security_logs table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'security_logs'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'security_logs'
    ) THEN
        -- Only admin can view security logs
        CREATE POLICY "Admin can view security logs" 
        ON public.security_logs 
        FOR SELECT 
        USING (has_role(auth.uid(), 'admin'::user_role));
        
        -- System can insert security logs
        CREATE POLICY "System can insert security logs" 
        ON public.security_logs 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- For rfp_responses table (if it exists and has RLS but no policies)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rfp_responses'
    ) AND NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'rfp_responses'
    ) THEN
        -- Organization can view all responses
        CREATE POLICY "Organization can view all responses" 
        ON public.rfp_responses 
        FOR SELECT 
        USING (
            has_role(auth.uid(), 'admin'::user_role) OR 
            has_role(auth.uid(), 'procurement_officer'::user_role)
        );
        
        -- Vendors can manage their own responses
        CREATE POLICY "Vendors can manage their responses" 
        ON public.rfp_responses 
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.vendor_registrations vr 
                WHERE vr.id = rfp_responses.vendor_id 
                AND vr.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 4. Remove any remaining SECURITY DEFINER views
-- Drop and recreate views without SECURITY DEFINER property
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find views with SECURITY DEFINER and remove the property
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND definition ILIKE '%security_definer%'
    LOOP
        -- We already replaced dangerous views with secure functions
        -- Any remaining SECURITY DEFINER views should be dropped
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_record.schemaname) || '.' || quote_ident(view_record.viewname) || ' CASCADE';
    END LOOP;
END $$;
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      approval_assignments: {
        Row: {
          approver_id: string
          created_at: string | null
          department_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          approver_id: string
          created_at?: string | null
          department_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          approver_id?: string
          created_at?: string | null
          department_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_hierarchies: {
        Row: {
          approver_level: number
          approver_role: string
          created_at: string
          department_id: string
          id: string
          updated_at: string
        }
        Insert: {
          approver_level: number
          approver_role: string
          created_at?: string
          department_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          approver_level?: number
          approver_role?: string
          created_at?: string
          department_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_hierarchies_approver_role_fkey"
            columns: ["approver_role"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_hierarchies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_date: string | null
          approver_id: string | null
          comments: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_allocations: {
        Row: {
          allocated_amount: number
          approved_amount: number | null
          created_at: string | null
          cycle_id: string
          department_id: string | null
          head_id: string
          id: string
          notes: string | null
          period_number: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["budget_allocation_status"]
          submitted_at: string | null
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          allocated_amount?: number
          approved_amount?: number | null
          created_at?: string | null
          cycle_id: string
          department_id?: string | null
          head_id: string
          id?: string
          notes?: string | null
          period_number: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["budget_allocation_status"]
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          approved_amount?: number | null
          created_at?: string | null
          cycle_id?: string
          department_id?: string | null
          head_id?: string
          id?: string
          notes?: string | null
          period_number?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["budget_allocation_status"]
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_allocations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "budget_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "budget_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_cycles: {
        Row: {
          allowed_department_ids: string[] | null
          created_at: string | null
          created_by: string
          end_date: string
          fiscal_year: number
          id: string
          name: string
          period_type: Database["public"]["Enums"]["budget_period_type"]
          start_date: string
          status: Database["public"]["Enums"]["budget_cycle_status"]
          updated_at: string | null
        }
        Insert: {
          allowed_department_ids?: string[] | null
          created_at?: string | null
          created_by: string
          end_date: string
          fiscal_year: number
          id?: string
          name: string
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          start_date: string
          status?: Database["public"]["Enums"]["budget_cycle_status"]
          updated_at?: string | null
        }
        Update: {
          allowed_department_ids?: string[] | null
          created_at?: string | null
          created_by?: string
          end_date?: string
          fiscal_year?: number
          id?: string
          name?: string
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["budget_cycle_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_heads: {
        Row: {
          allow_department_subitems: boolean
          code: string | null
          created_at: string | null
          created_by: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          allow_department_subitems?: boolean
          code?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          allow_department_subitems?: boolean
          code?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_line_items: {
        Row: {
          allocation_id: string
          amount: number
          created_at: string | null
          description: string
          id: string
          justification: string | null
          updated_at: string | null
        }
        Insert: {
          allocation_id: string
          amount: number
          created_at?: string | null
          description: string
          id?: string
          justification?: string | null
          updated_at?: string | null
        }
        Update: {
          allocation_id?: string
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          justification?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "budget_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      compliance_areas: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_audits: {
        Row: {
          area_id: string | null
          audit_type: string | null
          auditor_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          findings: Json | null
          id: string
          overall_result: string | null
          recommendations: Json | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          audit_type?: string | null
          auditor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          findings?: Json | null
          id?: string
          overall_result?: string | null
          recommendations?: Json | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          audit_type?: string | null
          auditor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          findings?: Json | null
          id?: string
          overall_result?: string | null
          recommendations?: Json | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "compliance_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_date: string | null
          checked_by: string | null
          created_at: string | null
          evidence: Json | null
          id: string
          next_check_date: string | null
          notes: string | null
          rule_id: string | null
          score: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_date?: string | null
          checked_by?: string | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          next_check_date?: string | null
          notes?: string | null
          rule_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          check_date?: string | null
          checked_by?: string | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          next_check_date?: string | null
          notes?: string | null
          rule_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_policies: {
        Row: {
          category: string
          compliance_rate: number | null
          content: string
          created_at: string | null
          created_by: string | null
          description: string
          effective_date: string
          id: string
          owner: string
          review_date: string
          status: string
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          category: string
          compliance_rate?: number | null
          content: string
          created_at?: string | null
          created_by?: string | null
          description: string
          effective_date: string
          id?: string
          owner: string
          review_date: string
          status?: string
          title: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          category?: string
          compliance_rate?: number | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          effective_date?: string
          id?: string
          owner?: string
          review_date?: string
          status?: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          area_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          rule_type: string
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          rule_type: string
          severity?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          rule_type?: string
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "compliance_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_violations: {
        Row: {
          assigned_to: string | null
          check_id: string | null
          created_at: string | null
          description: string | null
          id: string
          identified_date: string | null
          resolution_date: string | null
          resolution_notes: string | null
          rule_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          check_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          check_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_violations_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "compliance_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_of_department_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_of_department_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_of_department_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_of_department_id_fkey"
            columns: ["head_of_department_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          imap_host: string | null
          imap_port: number | null
          imap_secure: boolean | null
          is_active: boolean
          pop_host: string | null
          pop_port: number | null
          pop_secure: boolean | null
          provider: string
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          is_active?: boolean
          pop_host?: string | null
          pop_port?: number | null
          pop_secure?: boolean | null
          provider: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          is_active?: boolean
          pop_host?: string | null
          pop_port?: number | null
          pop_secure?: boolean | null
          provider?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_variables: Json | null
          body_template: string
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          subject_template: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          available_variables?: Json | null
          body_template: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          subject_template: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          available_variables?: Json | null
          body_template?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          subject_template?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      erp_integrations: {
        Row: {
          auth_config: Json | null
          auth_type: string
          auto_sync: boolean | null
          base_url: string
          created_at: string
          created_by: string | null
          description: string | null
          endpoint_mappings: Json | null
          erp_type: Database["public"]["Enums"]["erp_type"]
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status:
            | Database["public"]["Enums"]["erp_sync_status"]
            | null
          name: string
          request_headers: Json | null
          request_timeout_seconds: number | null
          retry_attempts: number | null
          sync_frequency_minutes: number | null
          sync_invoices: boolean | null
          sync_products: boolean | null
          sync_purchase_orders: boolean | null
          sync_vendors: boolean | null
          updated_at: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string
          auto_sync?: boolean | null
          base_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_mappings?: Json | null
          erp_type: Database["public"]["Enums"]["erp_type"]
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["erp_sync_status"]
            | null
          name: string
          request_headers?: Json | null
          request_timeout_seconds?: number | null
          retry_attempts?: number | null
          sync_frequency_minutes?: number | null
          sync_invoices?: boolean | null
          sync_products?: boolean | null
          sync_purchase_orders?: boolean | null
          sync_vendors?: boolean | null
          updated_at?: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          auto_sync?: boolean | null
          base_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_mappings?: Json | null
          erp_type?: Database["public"]["Enums"]["erp_type"]
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?:
            | Database["public"]["Enums"]["erp_sync_status"]
            | null
          name?: string
          request_headers?: Json | null
          request_timeout_seconds?: number | null
          retry_attempts?: number | null
          sync_frequency_minutes?: number | null
          sync_invoices?: boolean | null
          sync_products?: boolean | null
          sync_purchase_orders?: boolean | null
          sync_vendors?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          entity_id: string
          entity_reference: string | null
          entity_type: Database["public"]["Enums"]["erp_sync_entity"]
          erp_reference_id: string | null
          erp_reference_number: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          request_payload: Json | null
          response_code: number | null
          response_payload: Json | null
          retry_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["erp_sync_status"]
          sync_direction: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          entity_id: string
          entity_reference?: string | null
          entity_type: Database["public"]["Enums"]["erp_sync_entity"]
          erp_reference_id?: string | null
          erp_reference_number?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          request_payload?: Json | null
          response_code?: number | null
          response_payload?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["erp_sync_status"]
          sync_direction?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string
          entity_reference?: string | null
          entity_type?: Database["public"]["Enums"]["erp_sync_entity"]
          erp_reference_id?: string | null
          erp_reference_number?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          request_payload?: Json | null
          response_code?: number | null
          response_payload?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["erp_sync_status"]
          sync_direction?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "erp_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          last_updated: string | null
          minimum_level: number | null
          product_id: string
          quantity: number
          reorder_level: number | null
          warehouse_id: string
        }
        Insert: {
          id?: string
          last_updated?: string | null
          minimum_level?: number | null
          product_id: string
          quantity?: number
          reorder_level?: number | null
          warehouse_id: string
        }
        Update: {
          id?: string
          last_updated?: string | null
          minimum_level?: number | null
          product_id?: string
          quantity?: number
          reorder_level?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          approval_status: string | null
          currency: string | null
          delivery_details: Json | null
          delivery_status: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference: string | null
          request_id: string | null
          source_warehouse_id: string | null
          target_warehouse_id: string | null
          transaction_date: string | null
          type: string
          unit_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          currency?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference?: string | null
          request_id?: string | null
          source_warehouse_id?: string | null
          target_warehouse_id?: string | null
          transaction_date?: string | null
          type: string
          unit_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string | null
          currency?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference?: string | null
          request_id?: string | null
          source_warehouse_id?: string | null
          target_warehouse_id?: string | null
          transaction_date?: string | null
          type?: string
          unit_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_target_warehouse_id_fkey"
            columns: ["target_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_approval_history: {
        Row: {
          approval_level_id: string
          approved_at: string | null
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          invoice_id: string
          rejected_at: string | null
          status: string
        }
        Insert: {
          approval_level_id: string
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          rejected_at?: string | null
          status?: string
        }
        Update: {
          approval_level_id?: string
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          rejected_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_approval_history_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "invoice_approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_approval_history_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_approval_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_approval_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level_name: string
          level_number: number
          max_amount: number | null
          min_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_name: string
          level_number: number
          max_amount?: number | null
          min_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_name?: string
          level_number?: number
          max_amount?: number | null
          min_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoice_approval_matrix: {
        Row: {
          approval_level_id: string
          approver_role: Database["public"]["Enums"]["user_role"] | null
          approver_user_id: string | null
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          sequence_order: number
          updated_at: string
        }
        Insert: {
          approval_level_id: string
          approver_role?: Database["public"]["Enums"]["user_role"] | null
          approver_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          approval_level_id?: string
          approver_role?: Database["public"]["Enums"]["user_role"] | null
          approver_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_approval_matrix_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "invoice_approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_approval_matrix_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_approval_matrix_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number | null
          discount_rate: number | null
          final_amount: number
          id: string
          invoice_id: string
          notes: string | null
          po_item_id: string | null
          product_id: string | null
          quantity: number
          tax_amount: number | null
          tax_rate: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number | null
          discount_rate?: number | null
          final_amount: number
          id?: string
          invoice_id: string
          notes?: string | null
          po_item_id?: string | null
          product_id?: string | null
          quantity: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number | null
          discount_rate?: number | null
          final_amount?: number
          id?: string
          invoice_id?: string
          notes?: string | null
          po_item_id?: string | null
          product_id?: string | null
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approval_status: string | null
          attachments: Json | null
          corrective_action_required: string | null
          created_at: string
          created_by: string
          currency: string
          current_approval_level: number | null
          discount_amount: number | null
          disputed_at: string | null
          disputed_by: string | null
          disputed_reason: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_pdf_url: string | null
          is_non_po_invoice: boolean
          non_po_justification: string | null
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_reference: string | null
          purchase_order_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          signatory_designation: string | null
          signatory_name: string | null
          status: string
          submitted_for_approval_at: string | null
          subtotal_amount: number
          tax_amount: number
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approval_status?: string | null
          attachments?: Json | null
          corrective_action_required?: string | null
          created_at?: string
          created_by: string
          currency?: string
          current_approval_level?: number | null
          discount_amount?: number | null
          disputed_at?: string | null
          disputed_by?: string | null
          disputed_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_pdf_url?: string | null
          is_non_po_invoice?: boolean
          non_po_justification?: string | null
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          purchase_order_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          signatory_designation?: string | null
          signatory_name?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          subtotal_amount?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approval_status?: string | null
          attachments?: Json | null
          corrective_action_required?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          current_approval_level?: number | null
          discount_amount?: number | null
          disputed_at?: string | null
          disputed_by?: string | null
          disputed_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_pdf_url?: string | null
          is_non_po_invoice?: boolean
          non_po_justification?: string | null
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          purchase_order_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          signatory_designation?: string | null
          signatory_name?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          subtotal_amount?: number
          tax_amount?: number
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          postal_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          route_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          route_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          route_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_category: string
          event_key: string
          event_name: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          recipient_config: Json | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_category: string
          event_key: string
          event_name: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          recipient_config?: Json | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_category?: string
          event_key?: string
          event_name?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          recipient_config?: Json | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string | null
          id: string
          inventory_valuation_method: string
          organization_name: string | null
          rfp_reopen_time_limit_days: number | null
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_valuation_method?: string
          organization_name?: string | null
          rfp_reopen_time_limit_days?: number | null
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_valuation_method?: string
          organization_name?: string | null
          rfp_reopen_time_limit_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      po_approval_history: {
        Row: {
          approval_level_id: string
          approved_at: string | null
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          purchase_order_id: string
          rejected_at: string | null
          status: string
        }
        Insert: {
          approval_level_id: string
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          purchase_order_id: string
          rejected_at?: string | null
          status?: string
        }
        Update: {
          approval_level_id?: string
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          purchase_order_id?: string
          rejected_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_approval_history_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "po_approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_approval_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_approval_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level_name: string
          level_number: number
          max_amount: number | null
          min_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_name: string
          level_number: number
          max_amount?: number | null
          min_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_name?: string
          level_number?: number
          max_amount?: number | null
          min_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      po_approval_matrix: {
        Row: {
          approval_level_id: string
          approver_role: Database["public"]["Enums"]["user_role"] | null
          approver_user_id: string | null
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          sequence_order: number
          updated_at: string
        }
        Insert: {
          approval_level_id: string
          approver_role?: Database["public"]["Enums"]["user_role"] | null
          approver_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          approval_level_id?: string
          approver_role?: Database["public"]["Enums"]["user_role"] | null
          approver_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          sequence_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_approval_matrix_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "po_approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_approval_matrix_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_approval_matrix_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      po_email_logs: {
        Row: {
          error_message: string | null
          id: string
          purchase_order_id: string | null
          recipient_email: string
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          purchase_order_id?: string | null
          recipient_email: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          error_message?: string | null
          id?: string
          purchase_order_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_email_logs_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_template_fields: {
        Row: {
          calculation_formula: string | null
          column_number: number
          created_at: string
          description: string | null
          display_order: number
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean
          row_number: number
          template_id: string
        }
        Insert: {
          calculation_formula?: string | null
          column_number?: number
          created_at?: string
          description?: string | null
          display_order?: number
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean
          row_number?: number
          template_id: string
        }
        Update: {
          calculation_formula?: string | null
          column_number?: number
          created_at?: string
          description?: string | null
          display_order?: number
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          row_number?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pricing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          template_data: Json
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          template_data?: Json
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          template_data?: Json
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      procurement_request_items: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_price: number | null
          id: string
          product_id: string | null
          quantity: number
          request_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_price?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          request_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_price?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          created_at: string | null
          date_created: string
          date_needed: string
          department: string | null
          description: string | null
          estimated_value: number | null
          id: string
          priority: Database["public"]["Enums"]["request_priority"]
          request_number: string
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_created?: string
          date_needed: string
          department?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number: string
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_created?: string
          date_needed?: string
          department?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_classifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          product_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_date: string
          id: string
          inventory_transaction_id: string | null
          notes: string | null
          price: number
          product_id: string
          purchase_order_id: string | null
          source_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          inventory_transaction_id?: string | null
          notes?: string | null
          price: number
          product_id: string
          purchase_order_id?: string | null
          source_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          inventory_transaction_id?: string | null
          notes?: string | null
          price?: number
          product_id?: string
          purchase_order_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          classification: string
          classification_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_price: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tags: string[] | null
          tax_code_id: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          classification: string
          classification_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags?: string[] | null
          tax_code_id?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          classification?: string
          classification_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags?: string[] | null
          tax_code_id?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "product_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          department_id: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          is_vendor: boolean
          mobile: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          is_vendor?: boolean
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_vendor?: boolean
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          delivery_date: string | null
          description: string
          discount_amount: number | null
          discount_rate: number | null
          final_amount: number
          id: string
          po_id: string
          product_id: string | null
          quantity: number
          specifications: string | null
          tax_amount: number | null
          tax_code_id: string | null
          tax_rate: number | null
          total_price: number
          unit_price: number
          warranty_period: string | null
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          description: string
          discount_amount?: number | null
          discount_rate?: number | null
          final_amount: number
          id?: string
          po_id: string
          product_id?: string | null
          quantity: number
          specifications?: string | null
          tax_amount?: number | null
          tax_code_id?: string | null
          tax_rate?: number | null
          total_price: number
          unit_price: number
          warranty_period?: string | null
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          description?: string
          discount_amount?: number | null
          discount_rate?: number | null
          final_amount?: number
          id?: string
          po_id?: string
          product_id?: string | null
          quantity?: number
          specifications?: string | null
          tax_amount?: number | null
          tax_code_id?: string | null
          tax_rate?: number | null
          total_price?: number
          unit_price?: number
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          acknowledgment_date: string | null
          acknowledgment_notes: string | null
          actual_delivery_date: string | null
          approval_status: string | null
          attachments: Json | null
          billing_address: Json | null
          created_at: string
          created_by: string
          currency: string | null
          current_approval_level: number | null
          delivery_address: Json | null
          delivery_terms: string | null
          discount_amount: number | null
          expected_delivery_date: string | null
          final_amount: number
          id: string
          payment_terms: string | null
          po_date: string
          po_number: string
          procurement_request_id: string | null
          rfp_id: string | null
          rfp_response_id: string | null
          special_instructions: string | null
          specific_instructions: string | null
          status: string
          submitted_for_approval_at: string | null
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
          warranty_terms: string | null
        }
        Insert: {
          acknowledgment_date?: string | null
          acknowledgment_notes?: string | null
          actual_delivery_date?: string | null
          approval_status?: string | null
          attachments?: Json | null
          billing_address?: Json | null
          created_at?: string
          created_by: string
          currency?: string | null
          current_approval_level?: number | null
          delivery_address?: Json | null
          delivery_terms?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          final_amount: number
          id?: string
          payment_terms?: string | null
          po_date?: string
          po_number: string
          procurement_request_id?: string | null
          rfp_id?: string | null
          rfp_response_id?: string | null
          special_instructions?: string | null
          specific_instructions?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount: number
          updated_at?: string
          vendor_id: string
          warranty_terms?: string | null
        }
        Update: {
          acknowledgment_date?: string | null
          acknowledgment_notes?: string | null
          actual_delivery_date?: string | null
          approval_status?: string | null
          attachments?: Json | null
          billing_address?: Json | null
          created_at?: string
          created_by?: string
          currency?: string | null
          current_approval_level?: number | null
          delivery_address?: Json | null
          delivery_terms?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          final_amount?: number
          id?: string
          payment_terms?: string | null
          po_date?: string
          po_number?: string
          procurement_request_id?: string | null
          rfp_id?: string | null
          rfp_response_id?: string | null
          special_instructions?: string | null
          specific_instructions?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_rfp_response_id_fkey"
            columns: ["rfp_response_id"]
            isOneToOne: false
            referencedRelation: "rfp_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          description: string | null
          id: string
          performed_by: string
          rfp_id: string
          title: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by: string
          rfp_id: string
          title: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string
          rfp_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_activities_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_addendums: {
        Row: {
          addendum_number: number
          attachments: Json | null
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          field_overrides: Json | null
          id: string
          is_published: boolean
          published_at: string | null
          rfp_id: string
          title: string
          updated_at: string
        }
        Insert: {
          addendum_number: number
          attachments?: Json | null
          content?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          field_overrides?: Json | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          rfp_id: string
          title: string
          updated_at?: string
        }
        Update: {
          addendum_number?: number
          attachments?: Json | null
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          field_overrides?: Json | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          rfp_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_addendums_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_communications: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_clarification: boolean
          is_public: boolean
          message: string
          parent_id: string | null
          recipient_id: string | null
          recipient_type: string | null
          rfp_id: string
          sender_id: string
          sender_type: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_clarification?: boolean
          is_public?: boolean
          message: string
          parent_id?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          rfp_id: string
          sender_id: string
          sender_type: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_clarification?: boolean
          is_public?: boolean
          message?: string
          parent_id?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          rfp_id?: string
          sender_id?: string
          sender_type?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_communications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "rfp_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_communications_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_evaluation_criteria: {
        Row: {
          created_at: string
          criteria_name: string
          criteria_type: string
          description: string | null
          evaluation_method: string | null
          id: string
          max_score: number
          rfp_id: string
          weightage: number
        }
        Insert: {
          created_at?: string
          criteria_name: string
          criteria_type: string
          description?: string | null
          evaluation_method?: string | null
          id?: string
          max_score?: number
          rfp_id: string
          weightage: number
        }
        Update: {
          created_at?: string
          criteria_name?: string
          criteria_type?: string
          description?: string | null
          evaluation_method?: string | null
          id?: string
          max_score?: number
          rfp_id?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfp_evaluation_criteria_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          related_entity_id: string | null
          related_entity_type: string | null
          rfp_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          rfp_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          rfp_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_notifications_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_response_items: {
        Row: {
          brand_model: string | null
          created_at: string
          delivery_timeline: string | null
          description: string
          id: string
          product_id: string | null
          quantity: number
          rfp_response_id: string
          specifications: string | null
          total_price: number
          unit_price: number
          warranty_period: string | null
        }
        Insert: {
          brand_model?: string | null
          created_at?: string
          delivery_timeline?: string | null
          description: string
          id?: string
          product_id?: string | null
          quantity: number
          rfp_response_id: string
          specifications?: string | null
          total_price: number
          unit_price: number
          warranty_period?: string | null
        }
        Update: {
          brand_model?: string | null
          created_at?: string
          delivery_timeline?: string | null
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          rfp_response_id?: string
          specifications?: string | null
          total_price?: number
          unit_price?: number
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_response_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_response_items_rfp_response_id_fkey"
            columns: ["rfp_response_id"]
            isOneToOne: false
            referencedRelation: "rfp_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_response_scores: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_calculated_score: number | null
          created_at: string | null
          criteria_id: string
          id: string
          is_approved: boolean | null
          manual_override_reason: string | null
          manual_score: number | null
          response_id: string
          selected_option_id: string | null
          submitted_value: string | null
          updated_at: string | null
          uploaded_document_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_calculated_score?: number | null
          created_at?: string | null
          criteria_id: string
          id?: string
          is_approved?: boolean | null
          manual_override_reason?: string | null
          manual_score?: number | null
          response_id: string
          selected_option_id?: string | null
          submitted_value?: string | null
          updated_at?: string | null
          uploaded_document_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_calculated_score?: number | null
          created_at?: string | null
          criteria_id?: string
          id?: string
          is_approved?: boolean | null
          manual_override_reason?: string | null
          manual_score?: number | null
          response_id?: string
          selected_option_id?: string | null
          submitted_value?: string | null
          updated_at?: string | null
          uploaded_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_response_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "rfp_scoring_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_response_scores_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "rfp_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_response_scores_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "rfp_scoring_options"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_responses: {
        Row: {
          bid_validity_until: string | null
          commercial_documents: Json | null
          commercial_score: number | null
          commercial_submission_status: string | null
          commercial_submitted_at: string | null
          compliance_documents: Json | null
          created_at: string
          currency: string | null
          delivery_timeline: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_notes: string | null
          id: string
          is_technically_qualified: boolean | null
          payment_terms_accepted: boolean | null
          response_number: string
          rfp_id: string
          status: string
          submitted_at: string
          technical_documents: Json | null
          technical_score: number | null
          technical_score_approved_at: string | null
          technical_score_approved_by: string | null
          technical_submission_status: string | null
          technical_submitted_at: string | null
          total_bid_amount: number
          total_score: number | null
          total_technical_score: number | null
          updated_at: string
          vendor_id: string
          warranty_period: string | null
        }
        Insert: {
          bid_validity_until?: string | null
          commercial_documents?: Json | null
          commercial_score?: number | null
          commercial_submission_status?: string | null
          commercial_submitted_at?: string | null
          compliance_documents?: Json | null
          created_at?: string
          currency?: string | null
          delivery_timeline?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          id?: string
          is_technically_qualified?: boolean | null
          payment_terms_accepted?: boolean | null
          response_number: string
          rfp_id: string
          status?: string
          submitted_at?: string
          technical_documents?: Json | null
          technical_score?: number | null
          technical_score_approved_at?: string | null
          technical_score_approved_by?: string | null
          technical_submission_status?: string | null
          technical_submitted_at?: string | null
          total_bid_amount: number
          total_score?: number | null
          total_technical_score?: number | null
          updated_at?: string
          vendor_id: string
          warranty_period?: string | null
        }
        Update: {
          bid_validity_until?: string | null
          commercial_documents?: Json | null
          commercial_score?: number | null
          commercial_submission_status?: string | null
          commercial_submitted_at?: string | null
          compliance_documents?: Json | null
          created_at?: string
          currency?: string | null
          delivery_timeline?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          id?: string
          is_technically_qualified?: boolean | null
          payment_terms_accepted?: boolean | null
          response_number?: string
          rfp_id?: string
          status?: string
          submitted_at?: string
          technical_documents?: Json | null
          technical_score?: number | null
          technical_score_approved_at?: string | null
          technical_score_approved_by?: string | null
          technical_submission_status?: string | null
          technical_submitted_at?: string | null
          total_bid_amount?: number
          total_score?: number | null
          total_technical_score?: number | null
          updated_at?: string
          vendor_id?: string
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_responses_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_responses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_scoring_criteria: {
        Row: {
          created_at: string | null
          criterion_name: string
          criterion_type: string
          description: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          max_points: number
          requires_document: boolean | null
          rfp_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criterion_name: string
          criterion_type: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_points: number
          requires_document?: boolean | null
          rfp_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criterion_name?: string
          criterion_type?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_points?: number
          requires_document?: boolean | null
          rfp_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_scoring_criteria_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_scoring_options: {
        Row: {
          created_at: string | null
          criteria_id: string
          display_order: number | null
          id: string
          max_value: number | null
          min_value: number | null
          option_label: string
          option_value: string | null
          points: number
        }
        Insert: {
          created_at?: string | null
          criteria_id: string
          display_order?: number | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          option_label: string
          option_value?: string | null
          points: number
        }
        Update: {
          created_at?: string | null
          criteria_id?: string
          display_order?: number | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          option_label?: string
          option_value?: string | null
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfp_scoring_options_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "rfp_scoring_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_template_fields: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rfp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_template_values: {
        Row: {
          created_at: string
          field_name: string
          field_value: Json | null
          id: string
          rfp_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value?: Json | null
          id?: string
          rfp_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: Json | null
          id?: string
          rfp_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_template_values_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_template_values_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rfp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          template_data: Json
          updated_at: string
          usage_count: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          template_data?: Json
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          template_data?: Json
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      rfps: {
        Row: {
          attachments: Json | null
          bid_validity_period: number | null
          commercial_evaluation_deadline: string | null
          commercial_opening_date: string | null
          created_at: string
          created_by: string
          currency: string | null
          delivery_terms: string | null
          description: string | null
          enable_technical_scoring: boolean | null
          estimated_value: number | null
          evaluation_criteria: Json | null
          id: string
          minimum_eligibility_criteria: string | null
          minimum_technical_score: number | null
          payment_terms: string | null
          pre_bid_meeting_date: string | null
          pre_bid_meeting_venue: string | null
          procurement_request_id: string | null
          rfp_number: string
          status: string
          submission_deadline: string
          technical_evaluation_deadline: string | null
          technical_opening_date: string | null
          terms_and_conditions: string | null
          title: string
          updated_at: string
          warranty_requirements: string | null
        }
        Insert: {
          attachments?: Json | null
          bid_validity_period?: number | null
          commercial_evaluation_deadline?: string | null
          commercial_opening_date?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          enable_technical_scoring?: boolean | null
          estimated_value?: number | null
          evaluation_criteria?: Json | null
          id?: string
          minimum_eligibility_criteria?: string | null
          minimum_technical_score?: number | null
          payment_terms?: string | null
          pre_bid_meeting_date?: string | null
          pre_bid_meeting_venue?: string | null
          procurement_request_id?: string | null
          rfp_number: string
          status?: string
          submission_deadline: string
          technical_evaluation_deadline?: string | null
          technical_opening_date?: string | null
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
          warranty_requirements?: string | null
        }
        Update: {
          attachments?: Json | null
          bid_validity_period?: number | null
          commercial_evaluation_deadline?: string | null
          commercial_opening_date?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          enable_technical_scoring?: boolean | null
          estimated_value?: number | null
          evaluation_criteria?: Json | null
          id?: string
          minimum_eligibility_criteria?: string | null
          minimum_technical_score?: number | null
          payment_terms?: string | null
          pre_bid_meeting_date?: string | null
          pre_bid_meeting_venue?: string | null
          procurement_request_id?: string | null
          rfp_number?: string
          status?: string
          submission_deadline?: string
          technical_evaluation_deadline?: string | null
          technical_opening_date?: string | null
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
          warranty_requirements?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfps_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          impact: number
          mitigation_strategy: string | null
          owner_id: string | null
          probability: number
          risk_level: string | null
          risk_score: number | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact: number
          mitigation_strategy?: string | null
          owner_id?: string | null
          probability: number
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number
          mitigation_strategy?: string | null
          owner_id?: string | null
          probability?: number
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "risk_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      risk_metrics: {
        Row: {
          created_at: string | null
          id: string
          impact: number
          metric_date: string | null
          mitigation_progress: number | null
          notes: string | null
          probability: number
          recorded_by: string | null
          risk_id: string
          risk_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact: number
          metric_date?: string | null
          mitigation_progress?: number | null
          notes?: string | null
          probability: number
          recorded_by?: string | null
          risk_id: string
          risk_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impact?: number
          metric_date?: string | null
          mitigation_progress?: number | null
          notes?: string | null
          probability?: number
          recorded_by?: string | null
          risk_id?: string
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_metrics_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_mitigation_actions: {
        Row: {
          action_description: string | null
          action_title: string
          assigned_to: string | null
          completion_date: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          effectiveness_rating: number | null
          id: string
          risk_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          action_description?: string | null
          action_title: string
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          effectiveness_rating?: number | null
          id?: string
          risk_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string
          assigned_to?: string | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          effectiveness_rating?: number | null
          id?: string
          risk_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_mitigation_actions_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          module_id: string
          module_uuid: string | null
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          module_uuid?: string | null
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          module_uuid?: string | null
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_uuid_fkey"
            columns: ["module_uuid"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          role_name: string | null
          success: boolean
          target_user_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          role_name?: string | null
          success?: boolean
          target_user_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          role_name?: string | null
          success?: boolean
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      standard_po_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          email_template_body: string | null
          email_template_subject: string | null
          id: string
          organization_id: string | null
          po_number_format: Json | null
          standard_specific_instructions: string | null
          standard_terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email_template_body?: string | null
          email_template_subject?: string | null
          id?: string
          organization_id?: string | null
          po_number_format?: Json | null
          standard_specific_instructions?: string | null
          standard_terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email_template_body?: string | null
          email_template_subject?: string | null
          id?: string
          organization_id?: string | null
          po_number_format?: Json | null
          standard_specific_instructions?: string | null
          standard_terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          menu_item_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          menu_item_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          menu_item_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_modules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_codes: {
        Row: {
          code: string
          condition_rules: Json | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tax_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          condition_rules?: Json | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tax_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          condition_rules?: Json | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tax_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_codes_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          rate_name: string
          rate_percentage: number
          tax_code_id: string
          tax_element_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate_name: string
          rate_percentage: number
          tax_code_id: string
          tax_element_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate_name?: string
          rate_percentage?: number
          tax_code_id?: string
          tax_element_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_types: {
        Row: {
          applicability_rules: Json | null
          code: string
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tax_elements: Json | null
          updated_at: string | null
        }
        Insert: {
          applicability_rules?: Json | null
          code: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tax_elements?: Json | null
          updated_at?: string | null
        }
        Update: {
          applicability_rules?: Json | null
          code?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tax_elements?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          abbreviation: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          module_id: string
          permission: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          permission: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          custom_role_id: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          custom_role_id: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          custom_role_id?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_communications: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          parent_id: string | null
          receiver_id: string | null
          sender_id: string
          sender_type: string
          subject: string
          vendor_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          parent_id?: string | null
          receiver_id?: string | null
          sender_id: string
          sender_type: string
          subject: string
          vendor_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          parent_id?: string | null
          receiver_id?: string | null
          sender_id?: string
          sender_type?: string
          subject?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_communications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vendor_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          is_verified: boolean | null
          mime_type: string | null
          uploaded_at: string | null
          vendor_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          vendor_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          vendor_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_product_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          vendor_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          vendor_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          id: string
          is_active: boolean
          price_updated_at: string | null
          product_id: string
          registered_at: string
          vendor_currency: string | null
          vendor_id: string
          vendor_price: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          price_updated_at?: string | null
          product_id: string
          registered_at?: string
          vendor_currency?: string | null
          vendor_id: string
          vendor_price?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean
          price_updated_at?: string | null
          product_id?: string
          registered_at?: string
          vendor_currency?: string | null
          vendor_id?: string
          vendor_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_products_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendor_products_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_registrations: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          annual_turnover: number | null
          approval_comments: string | null
          bank_branch: string | null
          bank_name: string | null
          billing_address: Json | null
          business_address: Json | null
          business_description: string | null
          company_name: string
          company_type: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          gst_number: string | null
          id: string
          ifsc_code: string | null
          incorporation_date: string | null
          pan_number: string | null
          primary_email: string
          primary_phone: string
          registered_address: Json
          registration_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_email: string | null
          secondary_phone: string | null
          signatory_designation: string | null
          signatory_email: string | null
          signatory_name: string
          signatory_pan: string | null
          signatory_phone: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          tan_number: string | null
          updated_at: string | null
          user_id: string | null
          vendor_number: string | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          annual_turnover?: number | null
          approval_comments?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          business_address?: Json | null
          business_description?: string | null
          company_name: string
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          incorporation_date?: string | null
          pan_number?: string | null
          primary_email: string
          primary_phone: string
          registered_address: Json
          registration_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          signatory_designation?: string | null
          signatory_email?: string | null
          signatory_name: string
          signatory_pan?: string | null
          signatory_phone?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          tan_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_number?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          annual_turnover?: number | null
          approval_comments?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          business_address?: Json | null
          business_description?: string | null
          company_name?: string
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          incorporation_date?: string | null
          pan_number?: string | null
          primary_email?: string
          primary_phone?: string
          registered_address?: Json
          registration_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          signatory_designation?: string | null
          signatory_email?: string | null
          signatory_name?: string
          signatory_pan?: string | null
          signatory_phone?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          tan_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_number?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      warehouse_locations: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          location_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: { Args: never; Returns: Json }
      calculate_technical_score: {
        Args: { p_response_id: string }
        Returns: number
      }
      can_access_invoice_as_approver: {
        Args: { p_invoice_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_invoice_as_staff: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_access_invoice_as_vendor: {
        Args: { p_user_id: string; p_vendor_id: string }
        Returns: boolean
      }
      can_assign_role: {
        Args: { role_to_assign: string; target_user_id: string }
        Returns: boolean
      }
      can_delete_procurement_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      can_view_commercial_responses: {
        Args: { p_rfp_id: string }
        Returns: boolean
      }
      can_view_technical_responses: {
        Args: { p_rfp_id: string }
        Returns: boolean
      }
      check_password_history: {
        Args: {
          p_history_count?: number
          p_new_password_hash: string
          p_user_id: string
        }
        Returns: boolean
      }
      commit_transaction: { Args: never; Returns: Json }
      delete_procurement_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      generate_vendor_number: { Args: never; Returns: string }
      get_applicable_tax_code:
        | {
            Args: {
              p_buyer_location_id?: string
              p_product_id: string
              p_seller_location_id?: string
            }
            Returns: {
              applicable_rates: Json
              tax_code_code: string
              tax_code_id: string
              tax_code_name: string
            }[]
          }
        | {
            Args: { p_buyer_state?: string; p_vendor_id: string }
            Returns: {
              rates: Json
              tax_code: string
              tax_code_id: string
              tax_name: string
              tax_type_code: string
              tax_type_name: string
              total_rate: number
            }[]
          }
      get_approval_requests_secure: {
        Args: never
        Returns: {
          approval_date: string
          approver_id: string
          comments: string
          created_at: string
          entity_id: string
          entity_status: string
          entity_type: string
          id: string
          request_title: string
          requester_id: string
          requester_name: string
          status: string
        }[]
      }
      get_currency_for_country: {
        Args: { country_name: string }
        Returns: string
      }
      get_effective_rfp_data: { Args: { p_rfp_id: string }; Returns: Json }
      get_invoice_approval_level: {
        Args: { invoice_amount: number }
        Returns: string
      }
      get_latest_product_price: {
        Args: { p_product_id: string }
        Returns: {
          currency: string
          effective_date: string
          price: number
        }[]
      }
      get_next_po_number: { Args: never; Returns: string }
      get_organization_base_currency: { Args: never; Returns: string }
      get_po_approval_level: { Args: { po_amount: number }; Returns: string }
      get_procurement_request_details_secure: {
        Args: never
        Returns: {
          created_at: string
          date_created: string
          date_needed: string
          department: string
          description: string
          estimated_value: number
          id: string
          priority: Database["public"]["Enums"]["request_priority"]
          request_number: string
          requester_department: string
          requester_id: string
          requester_name: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          total_estimated_value: number
          updated_at: string
        }[]
      }
      get_required_approval_level: {
        Args: { po_amount: number }
        Returns: string
      }
      get_required_invoice_approval_level: {
        Args: { invoice_amount: number }
        Returns: string
      }
      get_security_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: boolean
      }
      has_role_by_name: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      initiate_invoice_approval: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      initiate_po_approval: { Args: { p_po_id: string }; Returns: Json }
      is_request_completed: { Args: { request_id: string }; Returns: boolean }
      log_rfp_activity: {
        Args: {
          p_activity_data?: Json
          p_activity_type: string
          p_description?: string
          p_performed_by: string
          p_rfp_id: string
          p_title: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      record_delivery_and_update_inventory: {
        Args: { p_delivery_details: Json; transaction_id: string }
        Returns: Json
      }
      rollback_transaction: { Args: never; Returns: Json }
      soft_delete_rfp_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
      update_transaction_delivery_details: {
        Args: { p_delivery_details: Json; transaction_id: string }
        Returns: Json
      }
      user_has_module_permission: {
        Args: { p_module_name: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      validate_password_strength: { Args: { password: string }; Returns: Json }
    }
    Enums: {
      budget_allocation_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
      budget_cycle_status: "draft" | "open" | "closed" | "archived"
      budget_period_type: "monthly" | "quarterly"
      erp_sync_entity: "invoice" | "purchase_order" | "vendor" | "product"
      erp_sync_status:
        | "pending"
        | "in_progress"
        | "success"
        | "failed"
        | "partial"
      erp_type:
        | "sap_s4hana"
        | "sap_business_one"
        | "oracle_netsuite"
        | "oracle_fusion"
        | "microsoft_dynamics_365"
        | "microsoft_dynamics_nav"
        | "sage_intacct"
        | "quickbooks_enterprise"
        | "tally_prime"
        | "custom_rest"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "completed"
        | "canceled"
      user_role:
        | "admin"
        | "requester"
        | "procurement_officer"
        | "inventory_manager"
        | "finance_officer"
        | "vendor"
        | "evaluation_committee"
        | "department_head"
      vendor_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      budget_allocation_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      budget_cycle_status: ["draft", "open", "closed", "archived"],
      budget_period_type: ["monthly", "quarterly"],
      erp_sync_entity: ["invoice", "purchase_order", "vendor", "product"],
      erp_sync_status: [
        "pending",
        "in_progress",
        "success",
        "failed",
        "partial",
      ],
      erp_type: [
        "sap_s4hana",
        "sap_business_one",
        "oracle_netsuite",
        "oracle_fusion",
        "microsoft_dynamics_365",
        "microsoft_dynamics_nav",
        "sage_intacct",
        "quickbooks_enterprise",
        "tally_prime",
        "custom_rest",
      ],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "completed",
        "canceled",
      ],
      user_role: [
        "admin",
        "requester",
        "procurement_officer",
        "inventory_manager",
        "finance_officer",
        "vendor",
        "evaluation_committee",
        "department_head",
      ],
      vendor_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
      ],
    },
  },
} as const

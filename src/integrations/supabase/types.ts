export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      organization_settings: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string | null
          id: string
          organization_name: string | null
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_name?: string | null
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_name?: string | null
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
            referencedRelation: "procurement_request_details"
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
          employee_id: string | null
          full_name: string | null
          id: string
          mobile: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      purchase_orders: {
        Row: {
          acknowledgment_date: string | null
          acknowledgment_notes: string | null
          actual_delivery_date: string | null
          attachments: Json | null
          billing_address: Json | null
          created_at: string
          created_by: string
          currency: string | null
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
          status: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
          vendor_id: string
          warranty_terms: string | null
        }
        Insert: {
          acknowledgment_date?: string | null
          acknowledgment_notes?: string | null
          actual_delivery_date?: string | null
          attachments?: Json | null
          billing_address?: Json | null
          created_at?: string
          created_by: string
          currency?: string | null
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
          status?: string
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
          vendor_id: string
          warranty_terms?: string | null
        }
        Update: {
          acknowledgment_date?: string | null
          acknowledgment_notes?: string | null
          actual_delivery_date?: string | null
          attachments?: Json | null
          billing_address?: Json | null
          created_at?: string
          created_by?: string
          currency?: string | null
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
          status?: string
          tax_amount?: number | null
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
            referencedRelation: "procurement_request_details"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "vendor_registration_details"
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
      rfp_responses: {
        Row: {
          bid_validity_until: string | null
          commercial_documents: Json | null
          commercial_score: number | null
          compliance_documents: Json | null
          created_at: string
          currency: string | null
          delivery_timeline: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_notes: string | null
          id: string
          payment_terms_accepted: boolean | null
          response_number: string
          rfp_id: string
          status: string
          submitted_at: string
          technical_documents: Json | null
          technical_score: number | null
          total_bid_amount: number
          total_score: number | null
          updated_at: string
          vendor_id: string
          warranty_period: string | null
        }
        Insert: {
          bid_validity_until?: string | null
          commercial_documents?: Json | null
          commercial_score?: number | null
          compliance_documents?: Json | null
          created_at?: string
          currency?: string | null
          delivery_timeline?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          id?: string
          payment_terms_accepted?: boolean | null
          response_number: string
          rfp_id: string
          status?: string
          submitted_at?: string
          technical_documents?: Json | null
          technical_score?: number | null
          total_bid_amount: number
          total_score?: number | null
          updated_at?: string
          vendor_id: string
          warranty_period?: string | null
        }
        Update: {
          bid_validity_until?: string | null
          commercial_documents?: Json | null
          commercial_score?: number | null
          compliance_documents?: Json | null
          created_at?: string
          currency?: string | null
          delivery_timeline?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          id?: string
          payment_terms_accepted?: boolean | null
          response_number?: string
          rfp_id?: string
          status?: string
          submitted_at?: string
          technical_documents?: Json | null
          technical_score?: number | null
          total_bid_amount?: number
          total_score?: number | null
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
            referencedRelation: "vendor_registration_details"
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
          created_at: string
          created_by: string
          currency: string | null
          delivery_terms: string | null
          description: string | null
          estimated_value: number | null
          evaluation_criteria: Json | null
          id: string
          minimum_eligibility_criteria: string | null
          payment_terms: string | null
          pre_bid_meeting_date: string | null
          pre_bid_meeting_venue: string | null
          procurement_request_id: string | null
          rfp_number: string
          status: string
          submission_deadline: string
          technical_evaluation_deadline: string | null
          terms_and_conditions: string | null
          title: string
          updated_at: string
          warranty_requirements: string | null
        }
        Insert: {
          attachments?: Json | null
          bid_validity_period?: number | null
          commercial_evaluation_deadline?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          estimated_value?: number | null
          evaluation_criteria?: Json | null
          id?: string
          minimum_eligibility_criteria?: string | null
          payment_terms?: string | null
          pre_bid_meeting_date?: string | null
          pre_bid_meeting_venue?: string | null
          procurement_request_id?: string | null
          rfp_number: string
          status?: string
          submission_deadline: string
          technical_evaluation_deadline?: string | null
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
          warranty_requirements?: string | null
        }
        Update: {
          attachments?: Json | null
          bid_validity_period?: number | null
          commercial_evaluation_deadline?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          estimated_value?: number | null
          evaluation_criteria?: Json | null
          id?: string
          minimum_eligibility_criteria?: string | null
          payment_terms?: string | null
          pre_bid_meeting_date?: string | null
          pre_bid_meeting_venue?: string | null
          procurement_request_id?: string | null
          rfp_number?: string
          status?: string
          submission_deadline?: string
          technical_evaluation_deadline?: string | null
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
            referencedRelation: "procurement_request_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfps_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
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
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "vendor_registration_details"
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
            referencedRelation: "vendor_registration_details"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "vendor_registration_details"
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
            referencedRelation: "vendor_registration_details"
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
      approval_requests_view: {
        Row: {
          approval_date: string | null
          approver_id: string | null
          comments: string | null
          created_at: string | null
          entity_id: string | null
          entity_status: string | null
          entity_type: string | null
          id: string | null
          request_title: string | null
          requester_id: string | null
          requester_name: string | null
          status: string | null
        }
        Relationships: []
      }
      procurement_request_details: {
        Row: {
          created_at: string | null
          date_created: string | null
          date_needed: string | null
          department: string | null
          description: string | null
          estimated_value: number | null
          id: string | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          request_number: string | null
          requester_department: string | null
          requester_id: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          title: string | null
          total_estimated_value: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      vendor_registration_details: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          annual_turnover: number | null
          approval_comments: string | null
          avatar_url: string | null
          bank_branch: string | null
          bank_name: string | null
          billing_address: Json | null
          business_address: Json | null
          business_description: string | null
          company_name: string | null
          company_type: string | null
          created_at: string | null
          gst_number: string | null
          id: string | null
          ifsc_code: string | null
          incorporation_date: string | null
          pan_number: string | null
          primary_email: string | null
          primary_phone: string | null
          registered_address: Json | null
          registration_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_name: string | null
          secondary_email: string | null
          secondary_phone: string | null
          signatory_designation: string | null
          signatory_email: string | null
          signatory_full_name: string | null
          signatory_name: string | null
          signatory_pan: string | null
          signatory_phone: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          tan_number: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          website: string | null
          years_in_business: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      can_assign_role: {
        Args: {
          target_user_id: string
          role_to_assign: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_delete_procurement_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      delete_procurement_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      generate_vendor_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_currency_for_country: {
        Args: { country_name: string }
        Returns: string
      }
      get_effective_rfp_data: {
        Args: { p_rfp_id: string }
        Returns: Json
      }
      get_latest_product_price: {
        Args: { p_product_id: string }
        Returns: {
          price: number
          currency: string
          effective_date: string
        }[]
      }
      has_role: {
        Args: {
          user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_request_completed: {
        Args: { request_id: string }
        Returns: boolean
      }
      log_rfp_activity: {
        Args: {
          p_rfp_id: string
          p_activity_type: string
          p_performed_by: string
          p_title: string
          p_description?: string
          p_activity_data?: Json
        }
        Returns: string
      }
      record_delivery_and_update_inventory: {
        Args: { transaction_id: string; p_delivery_details: Json }
        Returns: Json
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_transaction_delivery_details: {
        Args: { transaction_id: string; p_delivery_details: Json }
        Returns: Json
      }
      user_has_module_permission: {
        Args: { p_user_id: string; p_module_name: string; p_permission: string }
        Returns: boolean
      }
    }
    Enums: {
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          bin: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          paid_till: string
          plan_id: string
          safety_pct: number
          status: string
        }
        Insert: {
          bin?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          paid_till?: string
          plan_id?: string
          safety_pct?: number
          status?: string
        }
        Update: {
          bin?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          paid_till?: string
          plan_id?: string
          safety_pct?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'companies_plan_id_fkey'
            columns: ['plan_id']
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          store_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role: string
          store_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      order_events: {
        Row: {
          actor: string | null
          company_id: string
          created_at: string
          id: number
          order_id: string
          status: string
        }
        Insert: {
          actor?: string | null
          company_id: string
          created_at?: string
          id?: never
          order_id: string
          status: string
        }
        Update: {
          actor?: string | null
          company_id?: string
          created_at?: string
          id?: never
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_events_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_events_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          company_id: string
          order_id: string
          price: number
          product_id: string
          qty: number
        }
        Insert: {
          company_id: string
          order_id: string
          price: number
          product_id: string
          qty: number
        }
        Update: {
          company_id?: string
          order_id?: string
          price?: number
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_company_id_fkey'
            columns: ['product_id', 'company_id']
            referencedRelation: 'products'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      orders: {
        Row: {
          comment: string | null
          company_id: string
          courier: string | null
          created_at: string
          created_by: string | null
          delivery_date: string
          delivery_slot: string | null
          eta: string | null
          id: string
          number: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          courier?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          delivery_slot?: string | null
          eta?: string | null
          id?: string
          number?: never
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          courier?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          delivery_slot?: string | null
          eta?: string | null
          id?: string
          number?: never
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      plans: {
        Row: {
          features: Json
          id: string
          max_stores: number | null
          max_users: number | null
          name: string
          price: number
          sort: number
        }
        Insert: {
          features?: Json
          id: string
          max_stores?: number | null
          max_users?: number | null
          name: string
          price: number
          sort?: number
        }
        Update: {
          features?: Json
          id?: string
          max_stores?: number | null
          max_users?: number | null
          name?: string
          price?: number
          sort?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string
          company_id: string
          cost: number
          created_at: string
          id: string
          name: string
          price: number
          shelf_days: number
          sort: number
          unit: string
        }
        Insert: {
          active?: boolean
          category?: string
          company_id: string
          cost?: number
          created_at?: string
          id?: string
          name: string
          price?: number
          shelf_days?: number
          sort?: number
          unit?: string
        }
        Update: {
          active?: boolean
          category?: string
          company_id?: string
          cost?: number
          created_at?: string
          id?: string
          name?: string
          price?: number
          shelf_days?: number
          sort?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          company_id: string | null
          consent_at: string | null
          consent_version: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          role: string | null
          store_id: string | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          role?: string | null
          store_id?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          role?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      shift_items: {
        Row: {
          company_id: string
          price: number
          product_id: string
          qty: number
          shift_date: string
          shift_id: string
          store_id: string
        }
        Insert: {
          company_id: string
          price: number
          product_id: string
          qty: number
          shift_date: string
          shift_id: string
          store_id: string
        }
        Update: {
          company_id?: string
          price?: number
          product_id?: string
          qty?: number
          shift_date?: string
          shift_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shift_items_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shift_items_product_id_company_id_fkey'
            columns: ['product_id', 'company_id']
            referencedRelation: 'products'
            referencedColumns: ['id', 'company_id']
          },
          {
            foreignKeyName: 'shift_items_shift_id_fkey'
            columns: ['shift_id']
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shift_items_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      shifts: {
        Row: {
          closed_by: string | null
          comment: string | null
          company_id: string
          created_at: string
          id: string
          shift_date: string
          store_id: string
          total: number
        }
        Insert: {
          closed_by?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          shift_date: string
          store_id: string
          total?: number
        }
        Update: {
          closed_by?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          shift_date?: string
          store_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'shifts_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shifts_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      store_stock: {
        Row: {
          company_id: string
          product_id: string
          qty: number
          store_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          product_id: string
          qty?: number
          store_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          product_id?: string
          qty?: number
          store_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'store_stock_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'store_stock_product_id_company_id_fkey'
            columns: ['product_id', 'company_id']
            referencedRelation: 'products'
            referencedColumns: ['id', 'company_id']
          },
          {
            foreignKeyName: 'store_stock_store_id_company_id_fkey'
            columns: ['store_id', 'company_id']
            referencedRelation: 'stores'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stores_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      warehouse_stock: {
        Row: {
          company_id: string
          product_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          company_id: string
          product_id: string
          qty?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          product_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'warehouse_stock_company_id_fkey'
            columns: ['company_id']
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'warehouse_stock_product_id_company_id_fkey'
            columns: ['product_id', 'company_id']
            referencedRelation: 'products'
            referencedColumns: ['id', 'company_id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_production: { Args: { p_items: Json }; Returns: undefined }
      admin_create_company: {
        Args: {
          p_bin: string
          p_city: string
          p_name: string
          p_owner_email: string
          p_owner_name: string
          p_plan: string
          p_trial_days?: number
        }
        Returns: string
      }
      can_store: { Args: { p_store: string }; Returns: boolean }
      close_shift: {
        Args: {
          p_comment?: string
          p_date?: string
          p_items: Json
          p_store: string
        }
        Returns: string
      }
      create_company: {
        Args: { p_bin?: string; p_city?: string; p_name: string }
        Returns: string
      }
      create_order: {
        Args: {
          p_comment?: string
          p_date?: string
          p_items: Json
          p_slot?: string
          p_store: string
        }
        Returns: number
      }
      delete_my_account: { Args: never; Returns: undefined }
      give_consent: { Args: { p_version: string }; Returns: undefined }
      invite_employee: {
        Args: {
          p_email: string
          p_name: string
          p_role: string
          p_store?: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      load_demo_data: { Args: never; Returns: undefined }
      my_company: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
      my_store: { Args: never; Returns: string }
      set_order_status: {
        Args: {
          p_courier?: string
          p_eta?: string
          p_order: string
          p_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

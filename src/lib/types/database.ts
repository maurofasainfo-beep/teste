export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CompanyStatus = "active" | "inactive";
export type PlatformRole = "owner" | "admin" | "support";
export type PlatformProfileStatus = "active" | "inactive";
export type ProfileRole = "admin" | "employee";
export type ProfileStatus = "active" | "inactive";
export type QueueEntryStatus =
  | "waiting"
  | "released"
  | "completed"
  | "cancelled";
export type MessageTemplateType = "queue_created" | "customer_released";
export type MessageProviderName =
  | "none"
  | "whatsapp_extension"
  | "evolution_api"
  | "sms";
export type MessageEventStatus =
  | "recorded"
  | "pending"
  | "reserved"
  | "processing"
  | "retry"
  | "cancelled"
  | "expired"
  | "simulated"
  | "skipped"
  | "sent"
  | "failed";
export type NotificationChannel =
  | "none"
  | "simulated"
  | "whatsapp_extension"
  | "evolution_api"
  | "sms";
export type WhatsAppDeviceStatus =
  | "created"
  | "pending_activation"
  | "active"
  | "disconnected"
  | "error"
  | "revoked"
  | "expired";
export type WhatsAppDeviceLogEventType =
  | "device_created"
  | "device_activated"
  | "device_revoked"
  | "heartbeat_received"
  | "message_batch_reserved"
  | "message_sent_ack"
  | "message_failed_ack"
  | "auth_failed"
  | "device_error"
  | "primary_sender_changed"
  | "rate_limited";

export type PublicCompany = {
  id: string;
  trade_name: string;
  public_queue_slug: string;
};

export type PublicQueueEntry = {
  id: string;
  company_id: string;
  customer_name: string;
  ticket_code: string;
  status: QueueEntryStatus;
  position: number | null;
  party_size: number;
  created_at: string;
  released_at: string | null;
};

export type PublicCustomerQueueEntry = {
  customer_name: string | null;
  masked_customer_phone: string | null;
  ticket_code: string | null;
  status: QueueEntryStatus;
  position: number | null;
  party_size: number | null;
  company_trade_name: string;
  public_queue_slug: string;
  created_at: string | null;
  released_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  released_link_expiration_minutes: number;
  expires_at: string | null;
  is_expired: boolean;
  estimated_wait_min_minutes: number | null;
  estimated_wait_max_minutes: number | null;
  estimated_wait_label: string | null;
  estimated_wait_available: boolean;
};

export type Database = {
  public: {
    Tables: {
      platform_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          role: PlatformRole;
          status: PlatformProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          role: PlatformRole;
          status?: PlatformProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_profiles"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          cnpj: string;
          corporate_name: string;
          trade_name: string;
          email: string;
          phone: string | null;
          status: CompanyStatus;
          public_queue_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cnpj: string;
          corporate_name: string;
          trade_name: string;
          email: string;
          phone?: string | null;
          status?: CompanyStatus;
          public_queue_slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      company_settings: {
        Row: {
          company_id: string;
          released_link_expiration_minutes: number;
          notification_channel: NotificationChannel;
          estimated_wait_enabled: boolean;
          estimated_wait_default_minutes: number;
          estimated_wait_sample_size: number;
          estimated_wait_margin_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          released_link_expiration_minutes?: number;
          notification_channel?: NotificationChannel;
          estimated_wait_enabled?: boolean;
          estimated_wait_default_minutes?: number;
          estimated_wait_sample_size?: number;
          estimated_wait_margin_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          name: string;
          email: string;
          role: ProfileRole;
          status: ProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          name: string;
          email: string;
          role?: ProfileRole;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      queue_entries: {
        Row: {
          id: string;
          company_id: string;
          customer_name: string;
          customer_phone: string;
          ticket_code: string;
          status: QueueEntryStatus;
          position: number | null;
          party_size: number;
          public_customer_token: string;
          cancelled_by_customer: boolean;
          created_by: string | null;
          released_by: string | null;
          created_at: string;
          released_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_name: string;
          customer_phone: string;
          ticket_code?: string;
          status?: QueueEntryStatus;
          position?: number | null;
          party_size?: number;
          public_customer_token?: string;
          cancelled_by_customer?: boolean;
          created_by?: string | null;
          released_by?: string | null;
          created_at?: string;
          released_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["queue_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "queue_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_entries_released_by_fkey";
            columns: ["released_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      message_templates: {
        Row: {
          id: string;
          company_id: string;
          type: MessageTemplateType;
          title: string;
          content: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: MessageTemplateType;
          title: string;
          content: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_templates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      message_events: {
        Row: {
          id: string;
          company_id: string;
          queue_entry_id: string | null;
          provider: MessageProviderName;
          channel: string;
          type: MessageTemplateType;
          payload: Json;
          status: MessageEventStatus;
          device_id: string | null;
          reservation_id: string | null;
          reservation_token_hash: string | null;
          reserved_at: string | null;
          reservation_expires_at: string | null;
          processing_started_at: string | null;
          sent_at: string | null;
          failed_at: string | null;
          attempt_count: number;
          max_attempts: number;
          next_retry_at: string | null;
          idempotency_key: string | null;
          provider_response: Json | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          queue_entry_id?: string | null;
          provider?: MessageProviderName;
          channel?: string;
          type: MessageTemplateType;
          payload?: Json;
          status?: MessageEventStatus;
          device_id?: string | null;
          reservation_id?: string | null;
          reservation_token_hash?: string | null;
          reserved_at?: string | null;
          reservation_expires_at?: string | null;
          processing_started_at?: string | null;
          sent_at?: string | null;
          failed_at?: string | null;
          attempt_count?: number;
          max_attempts?: number;
          next_retry_at?: string | null;
          idempotency_key?: string | null;
          provider_response?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "message_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_events_queue_entry_id_fkey";
            columns: ["queue_entry_id"];
            isOneToOne: false;
            referencedRelation: "queue_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_devices: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          token_hash: string;
          signing_secret_hash: string | null;
          signing_secret_encrypted: string | null;
          status: WhatsAppDeviceStatus;
          is_primary_sender: boolean;
          connected_phone: string | null;
          browser_name: string | null;
          user_agent: string | null;
          extension_version: string | null;
          last_seen_at: string | null;
          last_connected_at: string | null;
          last_disconnected_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          token_hash: string;
          signing_secret_hash?: string | null;
          signing_secret_encrypted?: string | null;
          status?: WhatsAppDeviceStatus;
          is_primary_sender?: boolean;
          connected_phone?: string | null;
          browser_name?: string | null;
          user_agent?: string | null;
          extension_version?: string | null;
          last_seen_at?: string | null;
          last_connected_at?: string | null;
          last_disconnected_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_devices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "whatsapp_devices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_device_logs: {
        Row: {
          id: string;
          company_id: string;
          device_id: string | null;
          event_type: WhatsAppDeviceLogEventType;
          message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          device_id?: string | null;
          event_type: WhatsAppDeviceLogEventType;
          message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_device_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "whatsapp_device_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_device_logs_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_devices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_company: {
        Args: { queue_slug: string };
        Returns: PublicCompany[];
      };
      get_public_queue_entries: {
        Args: { queue_slug: string };
        Returns: PublicQueueEntry[];
      };
      get_public_customer_queue_entry: {
        Args: { customer_token: string };
        Returns: PublicCustomerQueueEntry[];
      };
      cancel_public_customer_queue_entry: {
        Args: { customer_token: string };
        Returns: Array<{
          id: string;
          status: QueueEntryStatus;
          cancelled_at: string;
          cancelled_by_customer: boolean;
        }>;
      };
      mask_customer_phone: {
        Args: { raw_phone: string };
        Returns: string;
      };
      get_primary_whatsapp_device: {
        Args: { target_company_id: string };
        Returns: Database["public"]["Tables"]["whatsapp_devices"]["Row"][];
      };
      set_primary_whatsapp_device: {
        Args: { target_device_id: string };
        Returns: Database["public"]["Tables"]["whatsapp_devices"]["Row"];
      };
      revoke_whatsapp_device: {
        Args: { target_device_id: string };
        Returns: Database["public"]["Tables"]["whatsapp_devices"]["Row"];
      };
      release_expired_message_reservations: {
        Args: Record<string, never>;
        Returns: number;
      };
      reserve_pending_message_events: {
        Args: { target_device_id: string; batch_limit?: number };
        Returns: Array<{
          id: string;
          queue_entry_id: string | null;
          type: MessageTemplateType;
          payload: Json;
          idempotency_key: string | null;
          reservation_id: string;
          reservation_token: string;
          attempt_count: number;
          max_attempts: number;
        }>;
      };
    };
    Enums: {
      company_status: CompanyStatus;
      profile_role: ProfileRole;
      profile_status: ProfileStatus;
      queue_entry_status: QueueEntryStatus;
      message_template_type: MessageTemplateType;
      message_provider: MessageProviderName;
      message_event_status: MessageEventStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanySettings =
  Database["public"]["Tables"]["company_settings"]["Row"];
export type PlatformProfile =
  Database["public"]["Tables"]["platform_profiles"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type QueueEntry = Database["public"]["Tables"]["queue_entries"]["Row"];
export type MessageTemplate =
  Database["public"]["Tables"]["message_templates"]["Row"];
export type MessageEvent = Database["public"]["Tables"]["message_events"]["Row"];
export type WhatsAppDevice =
  Database["public"]["Tables"]["whatsapp_devices"]["Row"];
export type WhatsAppDeviceLog =
  Database["public"]["Tables"]["whatsapp_device_logs"]["Row"];

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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability_slots: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_booked: boolean | null
          mindsetter_id: string | null
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_booked?: boolean | null
          mindsetter_id?: string | null
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_booked?: boolean | null
          mindsetter_id?: string | null
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_mindsetter_id_fkey"
            columns: ["mindsetter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          detail: Json | null
          event: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          event: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          event?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          attempts: number
          created_at: string
          dedup_key: string | null
          html_body: string
          id: string
          last_error: string | null
          locale: string
          max_attempts: number
          next_attempt_at: string
          provider_message_id: string | null
          status: string
          subject: string
          template_key: string
          text_body: string | null
          to_email: string
          to_name: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedup_key?: string | null
          html_body: string
          id?: string
          last_error?: string | null
          locale?: string
          max_attempts?: number
          next_attempt_at?: string
          provider_message_id?: string | null
          status?: string
          subject: string
          template_key: string
          text_body?: string | null
          to_email: string
          to_name?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedup_key?: string | null
          html_body?: string
          id?: string
          last_error?: string | null
          locale?: string
          max_attempts?: number
          next_attempt_at?: string
          provider_message_id?: string | null
          status?: string
          subject?: string
          template_key?: string
          text_body?: string | null
          to_email?: string
          to_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_queue_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string | null
          event_id: string
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          access_mode: string | null
          address: string | null
          auto_confirm: boolean | null
          created_at: string | null
          description: string | null
          duration_min: number | null
          format: string
          id: string
          is_online: boolean | null
          is_paid: boolean | null
          meet_url: string | null
          organizer_id: string | null
          price_cents: number | null
          seats_max: number | null
          seats_min: number | null
          starts_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_mode?: string | null
          address?: string | null
          auto_confirm?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          format: string
          id?: string
          is_online?: boolean | null
          is_paid?: boolean | null
          meet_url?: string | null
          organizer_id?: string | null
          price_cents?: number | null
          seats_max?: number | null
          seats_min?: number | null
          starts_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_mode?: string | null
          address?: string | null
          auto_confirm?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          format?: string
          id?: string
          is_online?: boolean | null
          is_paid?: boolean | null
          meet_url?: string | null
          organizer_id?: string | null
          price_cents?: number | null
          seats_max?: number | null
          seats_min?: number | null
          starts_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_admin1: {
        Row: {
          admin1_code: string
          country_code: string
          created_at: string
          geoname_id: number | null
          name: string
          updated_at: string
        }
        Insert: {
          admin1_code: string
          country_code: string
          created_at?: string
          geoname_id?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          admin1_code?: string
          country_code?: string
          created_at?: string
          geoname_id?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_admin1_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "geo_countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      geo_cities: {
        Row: {
          admin1_code: string | null
          ascii_name: string
          country_code: string
          created_at: string
          geoname_id: number
          name: string
          population: number
          search_names: string[]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          admin1_code?: string | null
          ascii_name: string
          country_code: string
          created_at?: string
          geoname_id: number
          name: string
          population?: number
          search_names?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          admin1_code?: string | null
          ascii_name?: string
          country_code?: string
          created_at?: string
          geoname_id?: number
          name?: string
          population?: number
          search_names?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "geo_countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      geo_countries: {
        Row: {
          continent: string | null
          created_at: string
          iso2: string
          iso3: string | null
          name: string
          phone_code: string | null
          updated_at: string
        }
        Insert: {
          continent?: string | null
          created_at?: string
          iso2: string
          iso3?: string | null
          name: string
          phone_code?: string | null
          updated_at?: string
        }
        Update: {
          continent?: string | null
          created_at?: string
          iso2?: string
          iso3?: string | null
          name?: string
          phone_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_waitlist: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          social_link: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          social_link?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          social_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          registered: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          registered?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          registered?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      mindsetter_profiles: {
        Row: {
          created_at: string | null
          fckups: Json | null
          help_with: Json | null
          id: string
          is_public: boolean | null
          my_way: Json | null
          numbers: Json | null
          onboarding_step: number | null
          philosophy: string | null
          philosophy_author: string | null
          promo_video: Json | null
          reel_life: Json | null
          roles: Json | null
          superpowers: Json | null
          updated_at: string | null
          video_blog: Json | null
          wins: Json | null
        }
        Insert: {
          created_at?: string | null
          fckups?: Json | null
          help_with?: Json | null
          id: string
          is_public?: boolean | null
          my_way?: Json | null
          numbers?: Json | null
          onboarding_step?: number | null
          philosophy?: string | null
          philosophy_author?: string | null
          promo_video?: Json | null
          reel_life?: Json | null
          roles?: Json | null
          superpowers?: Json | null
          updated_at?: string | null
          video_blog?: Json | null
          wins?: Json | null
        }
        Update: {
          created_at?: string | null
          fckups?: Json | null
          help_with?: Json | null
          id?: string
          is_public?: boolean | null
          my_way?: Json | null
          numbers?: Json | null
          onboarding_step?: number | null
          philosophy?: string | null
          philosophy_author?: string | null
          promo_video?: Json | null
          reel_life?: Json | null
          roles?: Json | null
          superpowers?: Json | null
          updated_at?: string | null
          video_blog?: Json | null
          wins?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mindsetter_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          access_restricted: boolean
          account_type: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          city_geoname_id: number | null
          company: string | null
          content_locale: string | null
          country: string | null
          country_code: string | null
          cover_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          industry: string | null
          interests: string[] | null
          is_blocked: boolean | null
          job_title: string | null
          languages: string[] | null
          last_name: string | null
          onboarding_step: number | null
          region_code: string | null
          region_name: string | null
          role: string | null
          socials: Json | null
          tagline: string | null
          timezone: string | null
          updated_at: string | null
          username: string
          verification_deadline: string | null
          verification_status: string
        }
        Insert: {
          about?: string | null
          access_restricted?: boolean
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_geoname_id?: number | null
          company?: string | null
          content_locale?: string | null
          country?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          industry?: string | null
          interests?: string[] | null
          is_blocked?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          onboarding_step?: number | null
          region_code?: string | null
          region_name?: string | null
          role?: string | null
          socials?: Json | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string | null
          username: string
          verification_deadline?: string | null
          verification_status?: string
        }
        Update: {
          about?: string | null
          access_restricted?: boolean
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_geoname_id?: number | null
          company?: string | null
          content_locale?: string | null
          country?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          interests?: string[] | null
          is_blocked?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          onboarding_step?: number | null
          region_code?: string | null
          region_name?: string | null
          role?: string | null
          socials?: Json | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string
          verification_deadline?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_geoname_id_fkey"
            columns: ["city_geoname_id"]
            isOneToOne: false
            referencedRelation: "geo_cities"
            referencedColumns: ["geoname_id"]
          },
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "geo_countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      session_settings: {
        Row: {
          accepts_bookings: boolean
          created_at: string | null
          currency: string | null
          durations: number[]
          fee_consent_accepted: boolean
          mindsetter_id: string
          price_cents: number | null
          session_type: string
          timezone: string | null
          topics: string[] | null
          updated_at: string | null
          weekly_availability: Json
        }
        Insert: {
          accepts_bookings?: boolean
          created_at?: string | null
          currency?: string | null
          durations?: number[]
          fee_consent_accepted?: boolean
          mindsetter_id: string
          price_cents?: number | null
          session_type?: string
          timezone?: string | null
          topics?: string[] | null
          updated_at?: string | null
          weekly_availability?: Json
        }
        Update: {
          accepts_bookings?: boolean
          created_at?: string | null
          currency?: string | null
          durations?: number[]
          fee_consent_accepted?: boolean
          mindsetter_id?: string
          price_cents?: number | null
          session_type?: string
          timezone?: string | null
          topics?: string[] | null
          updated_at?: string | null
          weekly_availability?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_settings_mindsetter_id_fkey"
            columns: ["mindsetter_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          booker_id: string | null
          confirmed_by_booker: boolean | null
          confirmed_by_mindsetter: boolean | null
          created_at: string | null
          hold_until: string | null
          id: string
          meet_url: string | null
          mindsetter_id: string | null
          price_cents: number | null
          session_type: string
          slot_id: string | null
          status: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          booker_id?: string | null
          confirmed_by_booker?: boolean | null
          confirmed_by_mindsetter?: boolean | null
          created_at?: string | null
          hold_until?: string | null
          id?: string
          meet_url?: string | null
          mindsetter_id?: string | null
          price_cents?: number | null
          session_type: string
          slot_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          booker_id?: string | null
          confirmed_by_booker?: boolean | null
          confirmed_by_mindsetter?: boolean | null
          created_at?: string | null
          hold_until?: string | null
          id?: string
          meet_url?: string | null
          mindsetter_id?: string | null
          price_cents?: number | null
          session_type?: string
          slot_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_mindsetter_id_fkey"
            columns: ["mindsetter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_email_messages: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          dedup_key: string | null
          html_body: string
          id: string
          last_error: string | null
          locale: string
          max_attempts: number
          next_attempt_at: string
          provider_message_id: string | null
          status: string
          subject: string
          template_key: string
          text_body: string | null
          to_email: string
          to_name: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      expire_unverified_access: { Args: never; Returns: undefined }
      is_mindsetter: { Args: { uid: string }; Returns: boolean }
      is_public_mindsetter: { Args: { profile_id: string }; Returns: boolean }
      is_staff: { Args: { uid: string }; Returns: boolean }
      is_valid_weekly_availability: { Args: { data: Json }; Returns: boolean }
      is_verified_member: { Args: { uid: string }; Returns: boolean }
      search_cities: {
        Args: { p_country?: string; p_limit?: number; p_query: string }
        Returns: {
          country_code: string
          country_name: string
          geoname_id: number
          name: string
          population: number
          region_code: string
          region_name: string
          timezone: string
        }[]
      }
      trigger_email_queue_processing: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

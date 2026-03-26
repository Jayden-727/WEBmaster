export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          created_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          mode: "source" | "rendered";
          status: "pending" | "running" | "completed" | "failed";
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          mode: "source" | "rendered";
          status?: "pending" | "running" | "completed" | "failed";
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analyses"]["Insert"]>;
      };
      analysis_metadata: {
        Row: {
          id: string;
          analysis_id: string;
          title: string | null;
          description: string | null;
          canonical: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image: string | null;
          robots: string | null;
          language: string | null;
          charset: string | null;
          json_ld: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          title?: string | null;
          description?: string | null;
          canonical?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          robots?: string | null;
          language?: string | null;
          charset?: string | null;
          json_ld?: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_metadata"]["Insert"]>;
      };
      analysis_content: {
        Row: {
          id: string;
          analysis_id: string;
          raw_html: string | null;
          rendered_html: string | null;
          clean_text: string | null;
          markdown_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          raw_html?: string | null;
          rendered_html?: string | null;
          clean_text?: string | null;
          markdown_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_content"]["Insert"]>;
      };
      analysis_stack: {
        Row: {
          id: string;
          analysis_id: string;
          category: string;
          detected_tool: string;
          confidence: number;
          matched_signals_json: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          category: string;
          detected_tool: string;
          confidence: number;
          matched_signals_json?: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_stack"]["Insert"]>;
      };
      analysis_structure: {
        Row: {
          id: string;
          analysis_id: string;
          component_name: string;
          detected_count: number;
          confidence: number;
          matched_patterns_json: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          component_name: string;
          detected_count: number;
          confidence: number;
          matched_patterns_json?: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_structure"]["Insert"]>;
      };
      analysis_links: {
        Row: {
          id: string;
          analysis_id: string;
          href: string;
          text: string | null;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          href: string;
          text?: string | null;
          is_internal: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_links"]["Insert"]>;
      };
      analysis_images: {
        Row: {
          id: string;
          analysis_id: string;
          src: string;
          alt: string | null;
          is_lazy: boolean;
          filename: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          src: string;
          alt?: string | null;
          is_lazy: boolean;
          filename?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_images"]["Insert"]>;
      };
      analysis_lighthouse: {
        Row: {
          id: string;
          analysis_id: string;
          performance_score: number | null;
          accessibility_score: number | null;
          best_practices_score: number | null;
          seo_score: number | null;
          lcp: number | null;
          cls: number | null;
          inp: number | null;
          fcp: number | null;
          tbt: number | null;
          raw_json: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          performance_score?: number | null;
          accessibility_score?: number | null;
          best_practices_score?: number | null;
          seo_score?: number | null;
          lcp?: number | null;
          cls?: number | null;
          inp?: number | null;
          fcp?: number | null;
          tbt?: number | null;
          raw_json?: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_lighthouse"]["Insert"]>;
      };
    };
  };
}


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "assignments": {
                  Row: {
                    "accepts_file": boolean,"accepts_text": boolean,"cohort_id": string,"created_at": string,"created_by": string,"due_at": string | null,"id": string,"instructions": string,"late_allowed": boolean,"published_at": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_file"?: boolean,"accepts_text"?: boolean,"cohort_id": string,"created_at"?: string,"created_by": string,"due_at"?: string | null,"id"?: string,"instructions"?: string,"late_allowed"?: boolean,"published_at"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accepts_file"?: boolean,"accepts_text"?: boolean,"cohort_id"?: string,"created_at"?: string,"created_by"?: string,"due_at"?: string | null,"id"?: string,"instructions"?: string,"late_allowed"?: boolean,"published_at"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cohort_members": {
                  Row: {
                    "cohort_id": string,"joined_at": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"joined_at"?: string,"profile_id": string
                  }
                  Update: {
                    "cohort_id"?: string,"joined_at"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cohort_members_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cohort_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cohorts": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"description": string,"ends_on": string | null,"enrolment_open": boolean,"id": string,"invite_code": string,"name": string,"owner_id": string,"starts_on": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"enrolment_open"?: boolean,"id"?: string,"invite_code"?: string,"name": string,"owner_id": string,"starts_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"enrolment_open"?: boolean,"id"?: string,"invite_code"?: string,"name"?: string,"owner_id"?: string,"starts_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cohorts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_assignments": {
                  Row: {
                    "cohort_id": string,"created_at": string,"due_at": string | null,"exercise_id": string,"id": string,"max_attempts": number | null,"published_at": string | null,"reveal_corrections": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"created_at"?: string,"due_at"?: string | null,"exercise_id": string,"id"?: string,"max_attempts"?: number | null,"published_at"?: string | null,"reveal_corrections"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "cohort_id"?: string,"created_at"?: string,"due_at"?: string | null,"exercise_id"?: string,"id"?: string,"max_attempts"?: number | null,"published_at"?: string | null,"reveal_corrections"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_assignments_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_assignments_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_attempts": {
                  Row: {
                    "answers": NonNullable<Json>,"exercise_assignment_id": string,"id": string,"max_score": number | null,"profile_id": string,"score": number | null,"started_at": string,"submitted_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"exercise_assignment_id": string,"id"?: string,"max_score"?: number | null,"profile_id": string,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"exercise_assignment_id"?: string,"id"?: string,"max_score"?: number | null,"profile_id"?: string,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_attempts_exercise_assignment_id_fkey"
      columns: ["exercise_assignment_id"]
isOneToOne: false
      referencedRelation: "exercise_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_attempts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "brief": string,"content": NonNullable<Json>,"created_at": string,"id": string,"kind": Database["public"]['Enums']["exercise_kind"],"owner_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brief"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["exercise_kind"],"owner_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "brief"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["exercise_kind"],"owner_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"resources": {
                  Row: {
                    "cohort_id": string,"created_at": string,"created_by": string,"description": string,"file_name": string,"id": string,"mime_type": string | null,"published_at": string | null,"size_bytes": number | null,"storage_path": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"created_at"?: string,"created_by": string,"description"?: string,"file_name": string,"id"?: string,"mime_type"?: string | null,"published_at"?: string | null,"size_bytes"?: number | null,"storage_path": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cohort_id"?: string,"created_at"?: string,"created_by"?: string,"description"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string | null,"published_at"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "assignment_id": string,"body": string,"created_at": string,"feedback": string | null,"feedback_at": string | null,"feedback_by": string | null,"file_name": string | null,"id": string,"profile_id": string,"size_bytes": number | null,"storage_path": string | null,"submitted_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"body"?: string,"created_at"?: string,"feedback"?: string | null,"feedback_at"?: string | null,"feedback_by"?: string | null,"file_name"?: string | null,"id"?: string,"profile_id": string,"size_bytes"?: number | null,"storage_path"?: string | null,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assignment_id"?: string,"body"?: string,"created_at"?: string,"feedback"?: string | null,"feedback_at"?: string | null,"feedback_by"?: string | null,"file_name"?: string | null,"id"?: string,"profile_id"?: string,"size_bytes"?: number | null,"storage_path"?: string | null,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_feedback_by_fkey"
      columns: ["feedback_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_read_cohort":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_exercise_for_student":
{ Args: { "p_exercise_assignment_id": string }; Returns: Json
                           },
"grade_exercise":
{ Args: { "p_answers": Json,"p_content": Json }; Returns: Json
                           },
"is_cohort_member":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"is_formateur":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_cohort":
{ Args: { "p_invite_code": string }; Returns: {
              "cohort_id": string,"cohort_name": string,"deja_membre": boolean
            }[]
                           },
"list_exercises_for_student":
{ Args: { "p_cohort_id": string }; Returns: {
              "bareme": number,"brief": string,"due_at": string,"exercise_assignment_id": string,"kind": Database["public"]['Enums']["exercise_kind"],"max_attempts": number,"meilleur_score": number,"tentatives_utilisees": number,"title": string
            }[]
                           },
"owns_cohort":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"strip_exercise_answers":
{ Args: { "p_content": Json }; Returns: Json
                           },
"submit_exercise_attempt":
{ Args: { "p_answers": Json,"p_exercise_assignment_id": string }; Returns: Json
                           },
"try_uuid":
{ Args: { "p_text": string }; Returns: string
                           }
          }
          Enums: {
            "exercise_kind": "qcm"|"drill"|"case_study"|"argument_map","user_role": "formateur"|"etudiant"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "exercise_kind": ["qcm", "drill", "case_study", "argument_map"],"user_role": ["formateur", "etudiant"]
          }
        }
} as const

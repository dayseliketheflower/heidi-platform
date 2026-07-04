-- Baseline migration: reconciled snapshot of the live production public schema as of 2026-07-04.
-- Captured via 'supabase db dump --linked --schema public' after fixing three live issues:
-- 1. panic_alerts admin check had no role restriction (anyone could read all alerts).
-- 2. boundary_agreements had permissive duplicate policies bypassing the scoped ones.
-- 3. notify_*_confirmation triggers had prod URL/anon key hardcoded -- moved to Vault
--    secrets (edge_functions_base_url, edge_functions_anon_key).
--
-- Also adds on_auth_user_created, a trigger on auth.users -> handle_new_user() that
-- exists in production but was missed by the original --schema public dump (it lives
-- on a table in the auth schema, not public). Without it, no environment seeded from
-- this baseline alone would auto-populate public.users on signup.
--
-- Also adds public.is_admin(), a SECURITY DEFINER helper. The first version of the
-- panic_alerts fix (inline 'SELECT 1 FROM public.users WHERE role=admin') caused
-- Postgres to detect infinite recursion (42P17) because public.users has its own
-- self-referencing RLS policy ('Admins can read all users'). is_admin() runs as the
-- table owner, bypassing that table's RLS, avoiding the recursion. NOTE:
-- 'Admins can read all users' itself is STILL broken by this same recursion and is
-- not yet fixed -- see FOLLOW_UP_FINDINGS.md.
--
-- See MIGRATION_HISTORY.md for what was found and the rule going forward.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


-- Lives on auth.users, not public — omitted by a `--schema public` dump but required
-- for signups to populate public.users at all.
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


CREATE OR REPLACE FUNCTION "public"."notify_companion_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
DECLARE
  v_url text;
  v_anon_key text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'edge_functions_base_url';
  SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'edge_functions_anon_key';

  IF v_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/send-companion-confirmation',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_companion_confirmation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_waitlist_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
DECLARE
  v_url text;
  v_anon_key text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'edge_functions_base_url';
  SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'edge_functions_anon_key';

  IF v_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/send-waitlist-confirmation',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_waitlist_confirmation"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_admin_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."_admin_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."active_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_name" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "scheduled_start" timestamp with time zone NOT NULL,
    "scheduled_end" timestamp with time zone NOT NULL,
    "checkin_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "emergency_contact" "text",
    "last_checkin_sent" timestamp with time zone
);


ALTER TABLE "public"."active_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid",
    "old_value" "text",
    "new_value" "text",
    "note" "text"
);


ALTER TABLE "public"."admin_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "provider_id" "uuid",
    "tier" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_date" timestamp with time zone,
    "duration_mins" integer,
    "location_type" "text",
    "location_address" "text",
    "boundary_agreement_id" "uuid",
    "review_submitted" boolean DEFAULT false,
    "stripe_payment_intent_id" "text",
    "cancelled_reason" "text",
    "pi_released_at" timestamp with time zone,
    CONSTRAINT "bookings_cancelled_reason_check" CHECK (("cancelled_reason" = ANY (ARRAY['expired'::"text", 'declined'::"text", 'client_cancelled'::"text"]))),
    CONSTRAINT "bookings_tier_check" CHECK (("tier" = ANY (ARRAY['meet'::"text", 'connect'::"text", 'be_with'::"text", 'stay'::"text", 'standard'::"text", 'steady_companion'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boundary_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "touch_handholding" "text",
    "touch_side_by_side" boolean DEFAULT false,
    "touch_hug" boolean DEFAULT false,
    "touch_other_text" "text",
    "topics_to_avoid" "text",
    "notes" "text",
    "emergency_contact_name" "text" NOT NULL,
    "emergency_contact_phone" "text" NOT NULL,
    "policy_confirmed" boolean DEFAULT false NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"(),
    "emergency_contact_relationship" "text",
    "client_confirmed_at" timestamp with time zone,
    "provider_confirmed_at" timestamp with time zone,
    "locked" boolean DEFAULT false NOT NULL,
    CONSTRAINT "boundary_agreements_touch_handholding_check" CHECK (("touch_handholding" = ANY (ARRAY['yes'::"text", 'no'::"text", 'ask'::"text"])))
);


ALTER TABLE "public"."boundary_agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_signups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "first_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "city" "text",
    "referral_source" "text",
    "interests" "text",
    "notes" "text"
);


ALTER TABLE "public"."client_signups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companion_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "companion_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companion_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flagged_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flagged_phrase" "text" NOT NULL,
    "full_message" "text",
    "sender" "text" NOT NULL,
    "session_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "flagged_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flagged_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."incident_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "reported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "reporter_id" "uuid"
);


ALTER TABLE "public"."incident_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "reporter_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "wants_followup" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "flagged" boolean DEFAULT false NOT NULL,
    "flag_reason" "text",
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."panic_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "provider_id" "uuid",
    "session_location" "text",
    "triggered_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "booking_id" "uuid",
    "reporter_id" "uuid",
    "alert_type" "text" DEFAULT 'panic'::"text",
    "message" "text"
);


ALTER TABLE "public"."panic_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'client'::"text" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "average_rating" numeric(3,1),
    "review_count" integer DEFAULT 0 NOT NULL,
    "preferences" "jsonb",
    "avatar_url" "text",
    "bio" "text",
    "borough" "text",
    "service_tags" "text"[],
    "hourly_rate" numeric(8,2),
    "notification_preferences" "jsonb" DEFAULT '{"new_messages": true, "session_reminders": true, "booking_confirmations": true}'::"jsonb" NOT NULL,
    "stripe_customer_id" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['client'::"text", 'provider'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "dob" "date",
    "phone" "text",
    "borough" "text",
    "provider_type" "text"[],
    "nursing_school" "text",
    "nursing_grad_year" "text",
    "statement_1" "text",
    "statement_2" "text",
    "bgcheck_consent" boolean DEFAULT false NOT NULL,
    "bgcheck_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "application_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "companion_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "bgcheck_cleared_at" timestamp with time zone,
    "flagged_for_rescreening" boolean DEFAULT false NOT NULL,
    "rating" numeric(3,2),
    "total_sessions" integer DEFAULT 0 NOT NULL,
    "last_active_at" timestamp with time zone,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "checkr_candidate_id" "text",
    "checkr_report_id" "text"
);


ALTER TABLE "public"."provider_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "bio" "text",
    "borough" "text",
    "provider_type" "text"[],
    "services" "text"[],
    "hourly_rate" numeric(10,2),
    "rating" numeric(3,2),
    "session_count" integer DEFAULT 0,
    "repeat_client_rate" numeric(5,4),
    "verified" boolean DEFAULT false,
    "active" boolean DEFAULT true,
    "nursing_school" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_account_id" "text",
    "stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_status" "text",
    "subscription_current_period_end" timestamp with time zone
);


ALTER TABLE "public"."provider_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "reviewer_id" "uuid",
    "reviewee_id" "uuid",
    "rating" integer,
    "body" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "booking_id" "uuid",
    "is_public" boolean DEFAULT true NOT NULL,
    "flagged" boolean DEFAULT false NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "ended_early" boolean DEFAULT false NOT NULL,
    "early_end_reason" "text",
    "checkin_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'client'::"text" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['client'::"text", 'provider_applicant'::"text", 'provider'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_admin_config"
    ADD CONSTRAINT "_admin_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."active_sessions"
    ADD CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_log"
    ADD CONSTRAINT "admin_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boundary_agreements"
    ADD CONSTRAINT "boundary_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_signups"
    ADD CONSTRAINT "client_signups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companion_notes"
    ADD CONSTRAINT "companion_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_notes"
    ADD CONSTRAINT "incident_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_reports"
    ADD CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_applications"
    ADD CONSTRAINT "provider_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_applications"
    ADD CONSTRAINT "provider_applications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_client_signup_send_confirmation" AFTER INSERT ON "public"."client_signups" FOR EACH ROW EXECUTE FUNCTION "public"."notify_waitlist_confirmation"();



CREATE OR REPLACE TRIGGER "on_companion_application_send_confirmation" AFTER INSERT ON "public"."provider_applications" FOR EACH ROW EXECUTE FUNCTION "public"."notify_companion_confirmation"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_boundary_agreement_id_fkey" FOREIGN KEY ("boundary_agreement_id") REFERENCES "public"."boundary_agreements"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id");



ALTER TABLE ONLY "public"."boundary_agreements"
    ADD CONSTRAINT "boundary_agreements_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."companion_notes"
    ADD CONSTRAINT "companion_notes_companion_id_fkey" FOREIGN KEY ("companion_id") REFERENCES "public"."provider_applications"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."incident_notes"
    ADD CONSTRAINT "incident_notes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."incident_reports"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."panic_alerts"
    ADD CONSTRAINT "panic_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_applications"
    ADD CONSTRAINT "provider_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active profiles readable by authenticated users" ON "public"."provider_profiles" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Admin can manage all incidents" ON "public"."incidents" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all agreements" ON "public"."boundary_agreements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all applications" ON "public"."provider_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all bookings" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all panic alerts" ON "public"."panic_alerts" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admin can read all sessions" ON "public"."sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin only" ON "public"."admin_log" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all users" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin reads on client_signups" ON "public"."client_signups" FOR SELECT USING (true);



CREATE POLICY "Allow public inserts" ON "public"."client_signups" FOR INSERT WITH CHECK (true);



CREATE POLICY "Applicant can insert own application" ON "public"."provider_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Applicant can read own application" ON "public"."provider_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Applicant can update own application" ON "public"."provider_applications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can read all profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update profiles" ON "public"."profiles" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Client can insert booking" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "Client can insert conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = "auth"."uid"()));



CREATE POLICY "Client can insert own agreement" ON "public"."boundary_agreements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "boundary_agreements"."booking_id") AND ("bookings"."client_id" = "auth"."uid"())))));



CREATE POLICY "Client can insert own agreements" ON "public"."boundary_agreements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "boundary_agreements"."booking_id") AND ("bookings"."client_id" = "auth"."uid"())))));



CREATE POLICY "Client can read own agreement" ON "public"."boundary_agreements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "boundary_agreements"."booking_id") AND ("bookings"."client_id" = "auth"."uid"())))));



CREATE POLICY "Client can read own bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "client_id"));



CREATE POLICY "Client can read own session" ON "public"."sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "sessions"."booking_id") AND ("bookings"."client_id" = "auth"."uid"())))));



CREATE POLICY "Clients can create bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("client_id" = "auth"."uid"()));



CREATE POLICY "Clients can read own bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "Companion can read messages in own conversations" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND ("c"."provider_id" = "auth"."uid"())))));



CREATE POLICY "Companion can read own conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING (("provider_id" = "auth"."uid"()));



CREATE POLICY "Companions can update own bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."provider_profiles"
  WHERE (("provider_profiles"."id" = "bookings"."provider_id") AND ("provider_profiles"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."provider_profiles"
  WHERE (("provider_profiles"."id" = "bookings"."provider_id") AND ("provider_profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Participants can insert conversation" ON "public"."conversations" FOR INSERT WITH CHECK ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));



CREATE POLICY "Participants can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND ("c"."status" = 'active'::"text") AND (("c"."client_id" = "auth"."uid"()) OR ("c"."provider_id" = "auth"."uid"())))))));



CREATE POLICY "Participants can read their conversation" ON "public"."conversations" FOR SELECT USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "provider_id")));



CREATE POLICY "Participants can read their messages" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."client_id" = "auth"."uid"()) OR ("conversations"."provider_id" = "auth"."uid"()))))));



CREATE POLICY "Participants can send messages" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."client_id" = "auth"."uid"()) OR ("conversations"."provider_id" = "auth"."uid"())))))));



CREATE POLICY "Provider can read agreement for their booking" ON "public"."boundary_agreements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "boundary_agreements"."booking_id") AND ("bookings"."provider_id" = "auth"."uid"())))));



CREATE POLICY "Provider can read own bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Provider can read own session" ON "public"."sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "sessions"."booking_id") AND ("bookings"."provider_id" = "auth"."uid"())))));



CREATE POLICY "Provider can update booking status" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Providers can read own profile" ON "public"."provider_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Providers can update own profile" ON "public"."provider_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Reporter can insert own incident" ON "public"."incidents" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Reporter can read own incidents" ON "public"."incidents" FOR SELECT TO "authenticated" USING (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Reviews readable by authenticated users" ON "public"."reviews" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own row" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own row" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."_admin_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."active_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated users can insert own flagged messages" ON "public"."flagged_messages" FOR INSERT TO "authenticated" WITH CHECK (("sender" = ("auth"."uid"())::"text"));



CREATE POLICY "authenticated users can insert own incident reports" ON "public"."incident_reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boundary_agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_signups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companion_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flagged_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."panic_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_companion_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_companion_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_companion_confirmation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_waitlist_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_waitlist_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_waitlist_confirmation"() TO "service_role";



GRANT ALL ON TABLE "public"."_admin_config" TO "anon";
GRANT ALL ON TABLE "public"."_admin_config" TO "authenticated";
GRANT ALL ON TABLE "public"."_admin_config" TO "service_role";



GRANT ALL ON TABLE "public"."active_sessions" TO "anon";
GRANT ALL ON TABLE "public"."active_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."active_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_log" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."boundary_agreements" TO "anon";
GRANT ALL ON TABLE "public"."boundary_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."boundary_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."client_signups" TO "anon";
GRANT ALL ON TABLE "public"."client_signups" TO "authenticated";
GRANT ALL ON TABLE "public"."client_signups" TO "service_role";



GRANT ALL ON TABLE "public"."companion_notes" TO "anon";
GRANT ALL ON TABLE "public"."companion_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."companion_notes" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."flagged_messages" TO "anon";
GRANT ALL ON TABLE "public"."flagged_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."flagged_messages" TO "service_role";



GRANT ALL ON TABLE "public"."incident_notes" TO "anon";
GRANT ALL ON TABLE "public"."incident_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_notes" TO "service_role";



GRANT ALL ON TABLE "public"."incident_reports" TO "anon";
GRANT ALL ON TABLE "public"."incident_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_reports" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."panic_alerts" TO "anon";
GRANT ALL ON TABLE "public"."panic_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."panic_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provider_applications" TO "anon";
GRANT ALL ON TABLE "public"."provider_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_applications" TO "service_role";



GRANT ALL ON TABLE "public"."provider_profiles" TO "anon";
GRANT ALL ON TABLE "public"."provider_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








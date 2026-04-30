-- Private table to hold internal app secrets (no RLS policies = no client access)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- No policies => only SECURITY DEFINER functions / service role can read

-- Insert a strong random push internal secret if missing
INSERT INTO public.app_secrets (key, value)
SELECT 'push_internal_secret', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.app_secrets WHERE key = 'push_internal_secret');

-- Update notify_user to read the secret from the private table
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text, _data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://yybgjvyfoyalzohkbkmx.supabase.co/functions/v1/send-push';
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM public.app_secrets WHERE key = 'push_internal_secret';

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (_user_id, _type, _title, _body, _data);

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object(
      'user_id', _user_id,
      'title', _title,
      'body', _body,
      'data', _data
    )
  );
END;
$function$;

-- Revoke anon execute on remaining SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_secret_likes() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_secret_comments() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_comment_likes() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.points_on_secret() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.points_on_comment() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.points_on_profile_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.points_on_ride_post() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_ride_request_insert() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_ride_request_status() FROM anon, public;

-- Remove avatars public-list policy. Public bucket still serves files via direct URL.
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
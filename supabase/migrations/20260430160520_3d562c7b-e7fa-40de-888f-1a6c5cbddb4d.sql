-- 1) Drop & recreate get_public_profiles without phone, restrict to authenticated
DROP FUNCTION IF EXISTS public.get_public_profiles();

CREATE FUNCTION public.get_public_profiles()
 RETURNS TABLE(id uuid, name text, surname text, instagram_tag text, avatar_url text, points integer, three_facts jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, p.name, p.surname, p.instagram_tag, p.avatar_url, p.points,
    CASE WHEN p.three_facts IS NULL THEN NULL
         ELSE (SELECT jsonb_agg(jsonb_build_object('text', f->>'text'))
               FROM jsonb_array_elements(p.three_facts) f)
    END,
    p.created_at
  FROM public.profiles p
  WHERE p.onboarded = true;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;

-- Revoke anon execute on other SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.get_ride_requests_for_post(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_ride_requests_for_post(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ride_posts_with_driver() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_ride_posts_with_driver() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_secrets() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_secrets() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_comments(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_comments(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_lie_guesses() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_lie_guesses() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.guess_lie(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.guess_lie(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2) Update notify_user to pass an internal secret header
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text, _data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://yybgjvyfoyalzohkbkmx.supabase.co/functions/v1/send-push';
  v_secret text := current_setting('app.settings.push_internal_secret', true);
BEGIN
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

-- 3) Fix avatars storage SELECT policy
DROP POLICY IF EXISTS "Avatars selectable by url only - no listing" ON storage.objects;
CREATE POLICY "Avatars publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- 4) Realtime channel access — users can only subscribe to their own notifications topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification channel" ON realtime.messages;
CREATE POLICY "Users can read own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications-' || auth.uid()::text
  OR realtime.topic() NOT LIKE 'notifications-%'
);
-- 1) Track rewarded ride post count (cap at 2)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS awarded_rides_count integer NOT NULL DEFAULT 0;

-- 2) Trigger: award +10 for each posted ride, capped at 2 rewarded posts
CREATE OR REPLACE FUNCTION public.points_on_ride_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT awarded_rides_count INTO v_count FROM public.profiles WHERE id = NEW.driver_id;
  IF v_count IS NULL THEN v_count := 0; END IF;
  IF v_count < 2 THEN
    UPDATE public.profiles
    SET points = points + 10,
        awarded_rides_count = awarded_rides_count + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_on_ride_post ON public.ride_posts;
CREATE TRIGGER trg_points_on_ride_post
AFTER INSERT ON public.ride_posts
FOR EACH ROW
EXECUTE FUNCTION public.points_on_ride_post();

-- 3) Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all push subs" ON public.push_subscriptions;
CREATE POLICY "Admins view all push subs"
ON public.push_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- 4) In-app notifications table (lightweight inbox)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;
CREATE POLICY "Admins manage all notifications"
ON public.notifications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notifications(user_id, read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5) Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 6) Helper: enqueue web push via edge function + insert in-app notification
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text, _data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text := 'https://yybgjvyfoyalzohkbkmx.supabase.co/functions/v1/send-push';
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (_user_id, _type, _title, _body, _data);

  PERFORM net.http_post(
    url := v_url,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'user_id', _user_id,
      'title', _title,
      'body', _body,
      'data', _data
    )
  );
END;
$$;

-- 7) Trigger: notify driver of new ride request
CREATE OR REPLACE FUNCTION public.notify_on_ride_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver uuid;
  v_requester_name text;
  v_origin text;
  v_destination text;
BEGIN
  SELECT driver_id, origin, destination INTO v_driver, v_origin, v_destination
  FROM public.ride_posts WHERE id = NEW.ride_post_id;

  SELECT (name || ' ' || surname) INTO v_requester_name
  FROM public.profiles WHERE id = NEW.requester_id;

  PERFORM public.notify_user(
    v_driver,
    'ride_request_new',
    'Nuova richiesta passaggio',
    COALESCE(v_requester_name, 'Qualcuno') || ' ha richiesto un posto: ' || v_origin || ' → ' || v_destination,
    jsonb_build_object('ride_post_id', NEW.ride_post_id, 'request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ride_request_insert ON public.ride_requests;
CREATE TRIGGER trg_notify_ride_request_insert
AFTER INSERT ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ride_request_insert();

-- 8) Trigger: notify requester when status changes
CREATE OR REPLACE FUNCTION public.notify_on_ride_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_origin text;
  v_destination text;
  v_title text;
  v_body text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT origin, destination INTO v_origin, v_destination
  FROM public.ride_posts WHERE id = NEW.ride_post_id;

  IF NEW.status = 'accepted' THEN
    v_title := 'Richiesta accettata ✅';
    v_body := 'Il tuo passaggio ' || v_origin || ' → ' || v_destination || ' è stato accettato!';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Richiesta rifiutata';
    v_body := 'Il tuo passaggio ' || v_origin || ' → ' || v_destination || ' è stato rifiutato.';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.notify_user(
    NEW.requester_id,
    'ride_request_' || NEW.status,
    v_title,
    v_body,
    jsonb_build_object('ride_post_id', NEW.ride_post_id, 'request_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ride_request_status ON public.ride_requests;
CREATE TRIGGER trg_notify_ride_request_status
AFTER UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ride_request_status();
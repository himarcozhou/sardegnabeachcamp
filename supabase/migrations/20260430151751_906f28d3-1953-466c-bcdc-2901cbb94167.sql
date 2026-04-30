-- 1. Drop old unique constraint, add lookup index
ALTER TABLE public.ride_requests
  DROP CONSTRAINT IF EXISTS ride_requests_ride_post_id_requester_id_key;

CREATE INDEX IF NOT EXISTS ride_requests_post_requester_idx
  ON public.ride_requests (ride_post_id, requester_id);

-- 2. Prevent duplicate ACTIVE requests per (ride, user)
CREATE UNIQUE INDEX IF NOT EXISTS ride_requests_active_unique_idx
  ON public.ride_requests (ride_post_id, requester_id)
  WHERE status IN ('pending', 'accepted');

-- 3. Enforce "rejected is final" server-side for requester self-updates.
-- Note: driver/admin UPDATE policies are separate and unaffected.
DROP POLICY IF EXISTS "Requester update own ride request" ON public.ride_requests;
CREATE POLICY "Requester update own ride request"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id
    AND status <> 'rejected'
  )
  WITH CHECK (auth.uid() = requester_id);

-- 4. Update notify trigger to also notify on driver-initiated cancellation
CREATE OR REPLACE FUNCTION public.notify_on_ride_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ELSIF NEW.status = 'cancelled' AND auth.uid() IS DISTINCT FROM NEW.requester_id THEN
    v_title := 'Sei stato rimosso dal passaggio';
    v_body := 'Il guidatore ha annullato il tuo posto su ' || v_origin || ' → ' || v_destination || '. Puoi richiederlo di nuovo.';
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
$function$;
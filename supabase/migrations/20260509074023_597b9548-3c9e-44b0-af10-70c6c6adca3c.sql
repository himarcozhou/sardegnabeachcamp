-- Enable pg_cron for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function that deletes rides whose date is before today
CREATE OR REPLACE FUNCTION public.delete_past_ride_posts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ride_posts WHERE ride_date < CURRENT_DATE;
$$;

-- Unschedule any prior version, then schedule daily at 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('delete-past-ride-posts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'delete-past-ride-posts',
  '0 3 * * *',
  $$ SELECT public.delete_past_ride_posts(); $$
);
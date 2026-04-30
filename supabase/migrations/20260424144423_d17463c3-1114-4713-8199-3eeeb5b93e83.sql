DROP FUNCTION public.get_public_secrets();

CREATE OR REPLACE FUNCTION public.get_public_secrets()
 RETURNS TABLE(id uuid, content text, likes_count integer, comments_count integer, created_at timestamp with time zone, hidden boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.content, s.likes_count, s.comments_count, s.created_at, s.hidden
  FROM public.secrets s
  WHERE s.hidden = false OR public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY s.created_at DESC;
$function$;
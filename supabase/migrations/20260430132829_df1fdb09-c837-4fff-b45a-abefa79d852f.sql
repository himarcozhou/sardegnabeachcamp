ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

DROP FUNCTION IF EXISTS public.get_public_profiles();

CREATE OR REPLACE FUNCTION public.get_public_profiles()
 RETURNS TABLE(id uuid, name text, surname text, instagram_tag text, phone text, avatar_url text, points integer, three_facts jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, p.name, p.surname, p.instagram_tag, p.phone, p.avatar_url, p.points,
    CASE WHEN p.three_facts IS NULL THEN NULL
         ELSE (SELECT jsonb_agg(jsonb_build_object('text', f->>'text'))
               FROM jsonb_array_elements(p.three_facts) f)
    END,
    p.created_at
  FROM public.profiles p
  WHERE p.onboarded = true;
$function$;
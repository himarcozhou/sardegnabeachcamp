
DROP FUNCTION IF EXISTS public.get_my_lie_guesses();

CREATE FUNCTION public.get_my_lie_guesses()
RETURNS TABLE(target_id uuid, guessed_index int, was_correct boolean, lie_index int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.target_id,
    g.guessed_index,
    g.was_correct,
    COALESCE((
      SELECT (idx - 1)::int
      FROM profiles p,
           LATERAL jsonb_array_elements(p.three_facts) WITH ORDINALITY AS arr(fact, idx)
      WHERE p.id = g.target_id
        AND COALESCE((fact->>'is_lie')::boolean, false) = true
      LIMIT 1
    ), -1) AS lie_index
  FROM public.lie_guesses g
  WHERE g.guesser_id = auth.uid();
$$;

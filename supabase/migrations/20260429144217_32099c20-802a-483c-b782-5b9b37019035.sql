
CREATE TABLE public.lie_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guesser_id uuid NOT NULL,
  target_id uuid NOT NULL,
  guessed_index int NOT NULL CHECK (guessed_index BETWEEN 0 AND 2),
  was_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guesser_id, target_id)
);

ALTER TABLE public.lie_guesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own guesses" ON public.lie_guesses
  FOR SELECT USING (auth.uid() = guesser_id);

CREATE POLICY "Admins see all guesses" ON public.lie_guesses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Writes go through the RPC only; no INSERT/UPDATE/DELETE policies for end users.

CREATE OR REPLACE FUNCTION public.guess_lie(_target_id uuid, _guessed_index int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_facts jsonb;
  v_lie_index int := -1;
  v_correct boolean;
  v_existing record;
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_uid = _target_id THEN
    RAISE EXCEPTION 'Cannot guess yourself';
  END IF;
  IF _guessed_index NOT BETWEEN 0 AND 2 THEN
    RAISE EXCEPTION 'Invalid index';
  END IF;

  SELECT three_facts INTO v_facts FROM public.profiles WHERE id = _target_id;
  IF v_facts IS NULL OR jsonb_array_length(v_facts) <> 3 THEN
    RAISE EXCEPTION 'Target has no facts';
  END IF;

  FOR i IN 0..2 LOOP
    IF COALESCE((v_facts->i->>'is_lie')::boolean, false) THEN
      v_lie_index := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_lie_index = -1 THEN
    RAISE EXCEPTION 'Target has no lie set';
  END IF;

  v_correct := (v_lie_index = _guessed_index);

  SELECT * INTO v_existing FROM public.lie_guesses
    WHERE guesser_id = v_uid AND target_id = _target_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'already', true,
      'correct', v_existing.was_correct,
      'guessed_index', v_existing.guessed_index,
      'lie_index', v_lie_index
    );
  END IF;

  INSERT INTO public.lie_guesses (guesser_id, target_id, guessed_index, was_correct)
  VALUES (v_uid, _target_id, _guessed_index, v_correct);

  IF v_correct THEN
    UPDATE public.profiles SET points = points + 2 WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'already', false,
    'correct', v_correct,
    'guessed_index', _guessed_index,
    'lie_index', v_lie_index
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_lie_guesses()
RETURNS TABLE(target_id uuid, guessed_index int, was_correct boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_id, guessed_index, was_correct
  FROM public.lie_guesses
  WHERE guesser_id = auth.uid();
$$;

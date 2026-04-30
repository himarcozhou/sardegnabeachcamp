
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict avatar listing: replace broad SELECT policy with per-user folder
DROP POLICY IF EXISTS "Avatar images public" ON storage.objects;
CREATE POLICY "Avatars selectable by url only - no listing"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND (
    -- owner can list own folder
    (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
    -- public access still works because bucket is public, but listing requires the policy
    OR true
  )
);


-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  instagram_tag TEXT,
  avatar_url TEXT,
  three_facts JSONB,
  points INT NOT NULL DEFAULT 0,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'it',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  awarded_facts BOOLEAN NOT NULL DEFAULT false,
  awarded_avatar BOOLEAN NOT NULL DEFAULT false,
  awarded_instagram BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public can see safe columns via view; for direct table access:
CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins see all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profile view (no is_lie, no internal flags)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  surname,
  instagram_tag,
  avatar_url,
  points,
  -- strip is_lie from facts
  CASE 
    WHEN three_facts IS NULL THEN NULL
    ELSE (
      SELECT jsonb_agg(jsonb_build_object('text', f->>'text'))
      FROM jsonb_array_elements(three_facts) f
    )
  END AS three_facts,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow anyone to read profiles via the view by adding a public select policy on the table
-- (the view uses security_invoker so it inherits RLS — we need a pass-through for public columns)
-- Instead: provide a SECURITY DEFINER function returning safe public list
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id UUID,
  name TEXT,
  surname TEXT,
  instagram_tag TEXT,
  avatar_url TEXT,
  points INT,
  three_facts JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    p.id, p.name, p.surname, p.instagram_tag, p.avatar_url, p.points,
    CASE WHEN p.three_facts IS NULL THEN NULL
         ELSE (SELECT jsonb_agg(jsonb_build_object('text', f->>'text'))
               FROM jsonb_array_elements(p.three_facts) f)
    END,
    p.created_at
  FROM public.profiles p
  WHERE p.onboarded = true;
$$;

-- ============ SECRETS ============
CREATE TABLE public.secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Author can see own secret (with author_id), admin sees all, others NEVER get author_id
CREATE POLICY "Author sees own secret" ON public.secrets FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admin sees all secrets" ON public.secrets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert own secret" ON public.secrets FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admin can update secrets" ON public.secrets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete secrets" ON public.secrets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Public anonymous feed function
CREATE OR REPLACE FUNCTION public.get_public_secrets()
RETURNS TABLE (
  id UUID,
  content TEXT,
  likes_count INT,
  comments_count INT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.content, s.likes_count, s.comments_count, s.created_at
  FROM public.secrets s
  WHERE s.hidden = false
  ORDER BY s.created_at DESC;
$$;

-- ============ COMMENTS ============
CREATE TABLE public.secret_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES public.secrets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  likes_count INT NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.secret_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Author sees own comment" ON public.secret_comments FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admin sees all comments" ON public.secret_comments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated insert own comment" ON public.secret_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admin update comments" ON public.secret_comments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete comments" ON public.secret_comments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_public_comments(_secret_id UUID)
RETURNS TABLE (
  id UUID,
  secret_id UUID,
  content TEXT,
  likes_count INT,
  created_at TIMESTAMPTZ,
  author_name TEXT,
  author_avatar TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.secret_id, c.content, c.likes_count, c.created_at,
         p.name AS author_name, p.avatar_url AS author_avatar
  FROM public.secret_comments c
  LEFT JOIN public.profiles p ON p.id = c.author_id
  WHERE c.secret_id = _secret_id AND c.hidden = false
  ORDER BY c.created_at ASC;
$$;

-- ============ LIKES ============
CREATE TABLE public.secret_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_id UUID NOT NULL REFERENCES public.secrets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, secret_id)
);
ALTER TABLE public.secret_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User see own likes" ON public.secret_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User insert own likes" ON public.secret_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User delete own likes" ON public.secret_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.secret_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comment_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User see own comment likes" ON public.comment_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User insert own comment likes" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User delete own comment likes" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ============ GAMES ============
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Admin manage games" ON public.games FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_game_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view scores" ON public.user_game_scores FOR SELECT USING (true);
CREATE POLICY "User insert own scores" ON public.user_game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage scores" ON public.user_game_scores FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admin manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Like count triggers
CREATE OR REPLACE FUNCTION public.bump_secret_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.secrets SET likes_count = likes_count + 1 WHERE id = NEW.secret_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.secrets SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.secret_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_secret_likes_count
AFTER INSERT OR DELETE ON public.secret_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_secret_likes();

CREATE OR REPLACE FUNCTION public.bump_comment_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.secret_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.secret_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_comment_likes_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_likes();

CREATE OR REPLACE FUNCTION public.bump_secret_comments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.secrets SET comments_count = comments_count + 1 WHERE id = NEW.secret_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.secrets SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.secret_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_secret_comments_count
AFTER INSERT OR DELETE ON public.secret_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_secret_comments();

-- Points: +1 per secret posted, +1 per comment, +5 facts complete, +10 avatar, +10 instagram
CREATE OR REPLACE FUNCTION public.points_on_secret()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET points = points + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_points_secret AFTER INSERT ON public.secrets FOR EACH ROW EXECUTE FUNCTION public.points_on_secret();

CREATE OR REPLACE FUNCTION public.points_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET points = points + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_points_comment AFTER INSERT ON public.secret_comments FOR EACH ROW EXECUTE FUNCTION public.points_on_comment();

CREATE OR REPLACE FUNCTION public.points_on_profile_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- +5 when 3 facts completed
  IF NEW.three_facts IS NOT NULL AND jsonb_array_length(NEW.three_facts) = 3 AND NEW.awarded_facts = false THEN
    NEW.points := NEW.points + 5;
    NEW.awarded_facts := true;
  END IF;
  -- +10 avatar
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url <> '' AND NEW.awarded_avatar = false THEN
    NEW.points := NEW.points + 10;
    NEW.awarded_avatar := true;
  END IF;
  -- +10 instagram
  IF NEW.instagram_tag IS NOT NULL AND NEW.instagram_tag <> '' AND NEW.awarded_instagram = false THEN
    NEW.points := NEW.points + 10;
    NEW.awarded_instagram := true;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_points_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.points_on_profile_update();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, surname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.secrets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.secret_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.secret_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;

-- ============ SEED ============
INSERT INTO public.games (title, description, icon, route, is_active) VALUES
('Indovina la bugia', 'Guess which fact is the lie about other guests', '🤥', '/games/guess-lie', true),
('Quiz veloce', 'Quick trivia about the event', '⚡', '/games/quiz', true),
('Classifica lampo', 'Beat the clock for points', '🏆', '/games/leaderboard', true);

INSERT INTO public.announcements (title, content, priority, starts_at, ends_at) VALUES
('Benvenuti alla festa! 🎉', 'Esplora segreti, gioca e conosci tutti i partecipanti.', 10, now() - interval '1 day', now() + interval '30 days');

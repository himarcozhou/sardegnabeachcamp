
-- Ride request status enum
CREATE TYPE public.ride_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Ride posts
CREATE TABLE public.ride_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  ride_date DATE NOT NULL,
  ride_time TIME NOT NULL,
  origin TEXT NOT NULL DEFAULT 'Resort',
  destination TEXT NOT NULL DEFAULT 'Aeroporto Cagliari',
  slots INT NOT NULL CHECK (slots >= 1 AND slots <= 8),
  notes TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ride_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view ride posts"
  ON public.ride_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Driver insert own ride post"
  ON public.ride_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver update own ride post"
  ON public.ride_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Driver delete own ride post"
  ON public.ride_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admin manage ride posts"
  ON public.ride_posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ride_posts_updated
BEFORE UPDATE ON public.ride_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ride requests
CREATE TABLE public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_post_id UUID NOT NULL REFERENCES public.ride_posts(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  seats INT NOT NULL CHECK (seats >= 1 AND seats <= 8),
  luggage TEXT NOT NULL,
  status public.ride_request_status NOT NULL DEFAULT 'pending',
  driver_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_post_id, requester_id)
);

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Requester sees own requests
CREATE POLICY "Requester sees own ride request"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

-- Driver sees requests on own posts
CREATE POLICY "Driver sees requests on own ride"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_posts rp
    WHERE rp.id = ride_post_id AND rp.driver_id = auth.uid()
  ));

-- Admin sees all
CREATE POLICY "Admin sees all ride requests"
  ON public.ride_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Requester can insert (not on own post)
CREATE POLICY "Requester insert own ride request"
  ON public.ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND NOT EXISTS (
      SELECT 1 FROM public.ride_posts rp
      WHERE rp.id = ride_post_id AND rp.driver_id = auth.uid()
    )
  );

-- Requester can cancel own request
CREATE POLICY "Requester update own ride request"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Driver can update requests for own post (accept/reject)
CREATE POLICY "Driver update requests on own ride"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_posts rp
    WHERE rp.id = ride_post_id AND rp.driver_id = auth.uid()
  ));

CREATE POLICY "Admin manage ride requests"
  ON public.ride_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ride_requests_updated
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: list ride posts with driver info (safe public-ish view)
CREATE OR REPLACE FUNCTION public.get_ride_posts_with_driver()
RETURNS TABLE (
  id UUID,
  driver_id UUID,
  driver_name TEXT,
  driver_surname TEXT,
  driver_avatar TEXT,
  ride_date DATE,
  ride_time TIME,
  origin TEXT,
  destination TEXT,
  slots INT,
  notes TEXT,
  is_open BOOLEAN,
  created_at TIMESTAMPTZ,
  accepted_seats INT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.id, rp.driver_id, p.name, p.surname, p.avatar_url,
    rp.ride_date, rp.ride_time, rp.origin, rp.destination,
    rp.slots, rp.notes, rp.is_open, rp.created_at,
    COALESCE((
      SELECT SUM(rr.seats)::int FROM public.ride_requests rr
      WHERE rr.ride_post_id = rp.id AND rr.status = 'accepted'
    ), 0) AS accepted_seats
  FROM public.ride_posts rp
  LEFT JOIN public.profiles p ON p.id = rp.driver_id
  ORDER BY rp.ride_date ASC, rp.ride_time ASC;
$$;

-- Helper: requests with requester info (only visible to driver of post or requester or admin via RLS on ride_requests)
CREATE OR REPLACE FUNCTION public.get_ride_requests_for_post(_post_id UUID)
RETURNS TABLE (
  id UUID,
  ride_post_id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_surname TEXT,
  requester_avatar TEXT,
  seats INT,
  luggage TEXT,
  status public.ride_request_status,
  driver_note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rr.id, rr.ride_post_id, rr.requester_id,
    p.name, p.surname, p.avatar_url,
    rr.seats, rr.luggage, rr.status, rr.driver_note, rr.created_at
  FROM public.ride_requests rr
  LEFT JOIN public.profiles p ON p.id = rr.requester_id
  WHERE rr.ride_post_id = _post_id
    AND (
      EXISTS (SELECT 1 FROM public.ride_posts rp WHERE rp.id = _post_id AND rp.driver_id = auth.uid())
      OR rr.requester_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  ORDER BY rr.created_at ASC;
$$;

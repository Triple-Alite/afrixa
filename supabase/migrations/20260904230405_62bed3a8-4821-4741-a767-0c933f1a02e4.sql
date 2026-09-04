CREATE OR REPLACE FUNCTION public.are_connected(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() IN (_a, _b)
    AND EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted'
        AND ((requester_id = _a AND addressee_id = _b)
          OR (requester_id = _b AND addressee_id = _a))
    );
$$;
REVOKE ALL ON FUNCTION public.handle_post_comment() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_reaction() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_connection_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.are_connected(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.can_view_post(UUID) FROM anon;
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE public.messages ALTER COLUMN body SET DEFAULT '';

CREATE POLICY "Participants mark messages read" ON public.messages
FOR UPDATE TO authenticated
USING (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() IN (c.participant_a, c.participant_b)))
WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() IN (c.participant_a, c.participant_b)));

ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE POLICY "Chat participants read attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id::text = (storage.foldername(name))[1] AND auth.uid() IN (c.participant_a, c.participant_b)));

CREATE POLICY "Chat participants upload attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id::text = (storage.foldername(name))[1] AND auth.uid() IN (c.participant_a, c.participant_b)));
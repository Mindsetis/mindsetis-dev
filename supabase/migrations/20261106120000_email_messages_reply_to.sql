-- Optional Reply-To for queued emails.
--
-- Why: the "Help & Support" form emails the support mailbox FROM our no-reply sender, and the
-- team has to answer the user straight from the mailbox — so the message needs `Reply-To: <the
-- address the user typed>`. The queue row had no place for it and the `process-email-queue` Edge
-- Function never sent one. NULL (the default) keeps every existing email exactly as it was.
--
-- `claim_due_email_messages` is `returns setof email_messages`, so the new column reaches the Edge
-- Function without touching that function. RLS is unchanged (the table has no client policies).
alter table public.email_messages
  add column if not exists reply_to text;

comment on column public.email_messages.reply_to is
  'Optional Reply-To address; sent as the Resend `reply_to` field by process-email-queue. NULL = none.';

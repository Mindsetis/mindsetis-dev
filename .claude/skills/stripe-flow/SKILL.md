---
name: stripe-flow
description: >-
  Safely implement or modify a Stripe Connect financial flow in Mindsetis — charges, fee
  split, 48h hold via delayed transfers, refunds, payouts, and webhook handlers. Enforces
  server-only, signature-verified, idempotent patterns. Use when the user says "add
  payments", "implement the hold", "handle the Stripe webhook", or touches money code.
---

# Skill: stripe-flow

The finance layer is the highest-risk part of the MVP (spec §9). Delegate deep work to the
`stripe-payments` subagent and always finish with a `security-auditor` review.

## Hard requirements

1. **Server-only.** Stripe secret-key calls and money writes live in Server Actions or
   Supabase Edge Functions using the service role. Never in the client. Never grant clients
   write access to `transactions` / `payouts`.
2. **Webhooks:** verify the signature FIRST, then act. Make handlers **idempotent** (dedupe
   by event id / payment_intent) so retries don't double-process.
3. **Cards never stored by us** — rely on Stripe tokenization/PCI.
4. **Secrets in env**, not in the client bundle.

## Flow reference

- **Charge:** booker pays for paid sessions; organizer pays to create paid events. Record
  `amount_cents` + `platform_fee_cents` on `transactions`.
- **Split:** destination or separate charges + transfers, auto platform fee.
- **48h hold:** capture now, delay the transfer until the complaint window closes, then
  transfer → mark `paid_out`. Mirror the session machine
  (`held → paid_out | disputed`) and `transactions.status`
  (`pending → held → released | refunded | failed`).
- **Refund/dispute:** surface in the admin finance panel.

## Webhooks to wire

`payment_intent.succeeded` → mark tx held/paid · `account.updated` → update
`stripe_accounts.onboarding_complete` / `payouts_enabled` · `transfer.*` → update payout
status. Place in `supabase/functions/` (Edge) or `app/api/`.

## Steps

1. Read existing `lib/stripe/`, finance tables, and env config.
2. Implement server-side; add signature verification + idempotency to any webhook.
3. Keep the transaction/session status transitions consistent with the state machines.
4. Gate the payments module behind the admin toggle (togglable module).
5. Run the `security-auditor` subagent on the change; report files, events handled, and any
   new env vars.

## Checklist

- [ ] No secret keys or money writes reachable from the client.
- [ ] Webhook signature verified + handler idempotent.
- [ ] `transactions` / `payouts` written only via service role.
- [ ] Status transitions match spec §3.3 / §3.5.
- [ ] security-auditor review requested.

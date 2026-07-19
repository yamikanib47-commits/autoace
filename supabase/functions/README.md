# AutoAce Edge middleware

These functions are the serverless bridge for public mutations and future integrations. They use the Supabase service role only inside Edge Functions; never put that key in Vercel or frontend code.

## Deploy

```bash
supabase login
supabase link --project-ref vuybamfovddoyowqvmsc
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" WHATSAPP_WEBHOOK_SECRET="replace-with-a-random-secret"
supabase functions deploy vehicle-search --no-verify-jwt
supabase functions deploy create-buyer-request --no-verify-jwt
supabase functions deploy create-seller-request --no-verify-jwt
supabase functions deploy vehicle-interest --no-verify-jwt
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

`whatsapp-webhook` enforces `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>` itself. The public submission functions still validate and sanitize all input. Before switching frontend traffic, test each function against the live project and confirm the expected rows and RLS behaviour.

## Endpoint base

`https://vuybamfovddoyowqvmsc.supabase.co/functions/v1`

All functions return `{ status: "success", data }` or `{ status: "error", message }`.

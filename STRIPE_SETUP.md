# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe payments for your prop trading firm platform.

## Overview

The Stripe integration allows users to:
- Purchase trading account tiers via Stripe Checkout
- Automatically create trading accounts after successful payment
- Handle payment webhooks securely

## Files Created/Modified

### New Files:
- `src/lib/stripe.ts` - Stripe client configuration
- `src/app/api/stripe/create-checkout/route.ts` - Creates Stripe checkout sessions
- `src/app/api/stripe/webhook/route.ts` - Handles Stripe webhook events
- `src/components/stripe/checkout-button.tsx` - Client-side checkout button component
- `src/app/(dashboard)/dashboard/tiers/page.tsx` - User-facing tiers page (alternative view)

### Modified Files:
- `src/app/(dashboard)/accounts/purchase/page.tsx` - Updated to use real tiers with Stripe checkout

## Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create a Stripe account if you don't have one
3. Navigate to **Developers > API keys**
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

## Step 2: Configure Environment Variables

Update your `.env` file with your Stripe keys:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Update the app URL to match your dev server port
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

**Note:** You'll get the `STRIPE_WEBHOOK_SECRET` in Step 4 after setting up webhooks.

## Step 3: Install Stripe CLI (for webhook testing)

### Windows:
```bash
# Using Scoop
scoop install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### Mac:
```bash
brew install stripe/stripe-cli/stripe
```

### Linux:
```bash
# Download the latest release from GitHub
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

## Step 4: Set Up Webhook for Local Development

1. Login to Stripe CLI:
```bash
stripe login
```

2. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3002/api/stripe/webhook
```

3. Copy the webhook signing secret that appears (starts with `whsec_`)
4. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

**Keep the Stripe CLI running while testing!** It forwards webhook events from Stripe to your local server.

## Step 5: Test the Integration

1. Make sure your dev server is running on port 3002:
```bash
npm run dev
```

2. Navigate to `/dashboard/accounts/purchase` (or `/dashboard/tiers`)

3. Click "Purchase for $XX.XX" on any tier

4. You'll be redirected to Stripe Checkout

5. Use Stripe test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - Use any future expiry date, any CVC, and any ZIP code

6. Complete the checkout

7. You should be redirected back to `/dashboard/accounts?success=true`

8. The webhook will automatically create a trading account for the user

## Step 6: Verify Account Creation

After successful payment:

1. Go to `/dashboard/accounts` to see the new account
2. Check the admin panel at `/admin/accounts` to see the account created
3. Check the audit logs at `/admin/audit-logs` to see the creation event

## Step 7: Production Setup

When you're ready to go live:

### 1. Switch to Live Mode in Stripe Dashboard
- Navigate to Stripe Dashboard
- Toggle from "Test mode" to "Live mode" (top right)
- Get your **live** API keys from **Developers > API keys**

### 2. Update Environment Variables
Replace your test keys with live keys in production `.env`:
```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
NEXT_PUBLIC_APP_URL=https://yourpropfirm.com
```

### 3. Set Up Production Webhooks
1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourpropfirm.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
5. Copy the webhook signing secret
6. Add it to your production environment as `STRIPE_WEBHOOK_SECRET`

## Webhook Events

Currently, the integration handles:

- **`checkout.session.completed`**: Creates a trading account when payment succeeds

You can extend this to handle other events like:
- `payment_intent.succeeded`
- `customer.subscription.created` (for subscription-based tiers)
- `charge.refunded` (to handle refunds)

## Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Webhook signature verification** - Always verify webhook signatures (already implemented)
3. **Test mode vs Live mode** - Keep test and live keys separate
4. **Idempotency** - Consider adding idempotency checks to prevent duplicate account creation

## Troubleshooting

### Issue: "No signature" error
**Solution:** Make sure Stripe CLI is running with `stripe listen --forward-to localhost:3002/api/stripe/webhook`

### Issue: Webhook not triggering
**Solution:**
- Check that Stripe CLI is running
- Verify the webhook URL matches your dev server port
- Check the Stripe CLI output for errors

### Issue: Account not created after payment
**Solution:**
- Check the webhook handler logs in your terminal
- Verify the metadata (userId, tierId) is being passed correctly
- Check the database for any errors

### Issue: "Invalid signature" in production
**Solution:**
- Ensure you're using the correct webhook secret from Stripe Dashboard
- Verify the webhook endpoint URL is correct
- Check that the webhook is receiving the raw request body

## Support

- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)

## Next Steps

Consider adding:
1. Email confirmations after purchase
2. Subscription-based tiers (monthly/yearly)
3. Account reset payments
4. Coupon/promo code support
5. Failed payment retry logic

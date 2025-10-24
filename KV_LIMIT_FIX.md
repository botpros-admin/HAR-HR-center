# KV Write Limit Fix - October 24, 2025

## Problem

Daily emails from Cloudflare indicating KV write limit exceeded (1,000 writes/day free tier).

```
You have exceeded the daily Cloudflare Workers KV free tier limit of 1000 Workers KV put operations.
```

## Root Cause

**Every-minute cron job causing excessive KV writes:**

### Before (wrangler.toml line 56):
```toml
crons = ["0 13 * * *", "0 14 * * *", "* * * * *"]
                                      ^^^^^^^^^^^^
                                      THIS WAS THE PROBLEM
```

The `* * * * *` cron expression runs **every single minute** (1,440 times per day).

### What It Did:
The `checkStageChanges()` function (workers/index.ts:127-221) polled Bitrix24 every minute and wrote state to KV for every employee:

```typescript
// Ran 1,440 times/day
for (const item of items) {
  // Write to KV for EVERY item (39 employees)
  await env.CACHE.put(
    `item_state:${itemId}`,
    stateToCache,
    { expirationTtl: 30 * 24 * 60 * 60 }
  );
}
```

### The Math:
- **Cron runs per day:** 1,440 (every minute)
- **Employees polled:** ~39 (Applicants + Onboarding categories)
- **KV writes per run:** 39
- **Total daily writes:** 1,440 × 39 = **56,160 writes/day**
- **Free tier limit:** 1,000 writes/day
- **Overage:** 56x over the limit! 🚨

## Solution

**Removed the every-minute cron trigger.**

### After (wrangler.toml line 58):
```toml
crons = ["0 13 * * *", "0 14 * * *"]
```

Now only runs:
- **Daily at 1:00 PM UTC** (9 AM EDT)
- **Daily at 2:00 PM UTC** (9 AM EST)

These daily triggers are for email reminders only, which use D1 database (not KV).

## Impact

**Before:**
- ~56,000 KV writes/day
- Daily limit exceeded emails
- Risk of Worker failure when KV writes return 429 errors

**After:**
- ~0 KV writes/day (only from actual user sessions, if any)
- No more limit exceeded emails
- System within free tier

## Alternative: Use Bitrix24 Webhooks

If you need real-time stage change detection, configure Bitrix24 to send webhooks to:
```
POST https://hartzell.work/api/bitrix/webhook
```

This way the Worker only runs when an actual stage change occurs (not polling every minute).

## Deployment

**Deployed:** October 24, 2025 at 2:46 AM UTC
**Version ID:** 60c2eb9a-5bc0-479f-af98-b1561abece89
**Status:** ✅ Active

## Verification

Check current cron triggers:
```bash
cd cloudflare-app
wrangler deployments list
```

Output shows only 2 schedules:
```
schedule: 0 13 * * *
schedule: 0 14 * * *
```

## Future Considerations

If you need to re-enable stage change automation:

### Option A: Use Bitrix24 Webhooks (Recommended)
- No polling required
- Zero KV writes
- Real-time detection
- Configure in Bitrix24: Administration → Integrations → Webhooks

### Option B: Reduce Polling Frequency
- Change from `* * * * *` to `*/15 * * * *` (every 15 minutes)
- Reduces writes to ~3,744/day (still 3.7x over limit)
- Still requires upgrading to Paid plan ($5/month)

### Option C: Upgrade to Paid Plan
- $5/month minimum
- Includes 10M reads, 1M writes per month
- Supports current every-minute polling

## Related Files

- `cloudflare-app/wrangler.toml` - Cron configuration
- `cloudflare-app/workers/index.ts` - Scheduled handler (lines 127-221, 490-686)
- `cloudflare-app/workers/routes/bitrix-webhooks.ts` - Webhook handler (alternative)

---

**Problem:** Excessive KV writes from every-minute cron
**Solution:** Disabled polling, kept daily email reminders
**Result:** $0/month operation restored ✅

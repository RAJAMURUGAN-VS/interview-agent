# 📋 GOOGLE GEMINI API QUOTA GUIDE

**Status:** ⚠️ You've hit the free tier limit  
**Error Code:** 429 RESOURCE_EXHAUSTED  
**Limit:** 20 requests per day (free tier)

---

## 🔍 WHAT HAPPENED

Your Google Gemini API key is on the **free tier**, which has these limits:

```
Free Tier Limit:
├── 20 requests per day (across all models)
├── Resets daily at UTC midnight
└── No cost, but strict quotas
```

You've made 20+ MCQ/CodeFill/Interview requests today, hitting the daily limit.

---

## ✅ HOW TO FIX (3 Options)

### Option A: Wait Until Tomorrow (Easiest) ⏱️
- **Time:** ~12-24 hours
- **Cost:** $0
- **Action:** Try again tomorrow after UTC midnight
- **Best for:** Testing/demo purposes

---

### Option B: Upgrade to Paid Plan ⭐ (Recommended)
- **Time:** 5-10 minutes
- **Cost:** Pay-as-you-go (usually $1-5/day for moderate use)
- **New Limit:** 1,500 requests/minute
- **Best for:** Production deployment

**Steps to enable billing:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. Click "Select a Project" (top left)
   ```
   [Interview Agent] ▼
   ```

3. Click "Billing" in left menu

4. Click "Enable Billing"

5. Select or create a billing account

6. Add payment method (credit card)

7. Confirm

**That's it!** Quota limits automatically increase after billing is enabled.

---

### Option C: Use Multiple API Keys 🔑
If you have multiple Google accounts:

1. Create a new Google Cloud project with account #2
2. Generate new Gemini API key
3. Add to `backend/.env`:
   ```
   GOOGLE_API_KEY=your_new_key_here
   ```
4. Restart backend
5. Try again

You can cycle between keys when one hits quota (rough workaround).

---

## 📊 QUOTA COMPARISON

| Plan | Requests/Day | Requests/Min | Cost |
|------|--------------|--------------|------|
| **Free** | 20 | 4 | $0 |
| **Paid** | Unlimited | 1,500 | $0.50-$5/day* |

*Pricing varies by model. Gemini 3.5-Flash is one of the cheapest.

---

## 💡 CURRENT IMPROVEMENTS

I've added **user-friendly error messages** so users know what happened:

```
"API quota exceeded. Please try again tomorrow or upgrade to a 
paid plan at https://ai.google.dev"
```

When quota is hit, users now get:
- ✅ Clear error message (not cryptic 429 code)
- ✅ Link to upgrade information
- ✅ Option to try tomorrow

**Files updated:**
- `backend/app/routes/mcq.py`
- `backend/app/routes/codefill.py`

---

## 📝 WHAT TO DO RIGHT NOW

### Immediate (Next 5 minutes)
Pick one:
- [ ] **Wait until tomorrow** (free, but no work today)
- [ ] **Upgrade to paid** (5 min setup, unlimited access)
- [ ] **Use another API key** (if you have another account)

### Short-term (Later today)
- [ ] If you chose paid: Set billing up on Google Cloud
- [ ] Restart Flask backend
- [ ] Test MCQ generation again

### Long-term (Before production)
- [ ] Set up monitoring for quota usage
- [ ] Consider batching requests to reduce API calls
- [ ] Maybe cache commonly generated questions

---

## 🎯 RECOMMENDATION

**For Testing/Development:** Upgrade to paid plan (highly recommended)
- Only ~$1-5 per day for moderate usage
- Unlimited requests (no more waiting)
- Can set daily budgets to avoid surprises

**For Production:** Upgrade to paid plan (required)
- Can't rely on free tier for live users
- Need reliable, high quota
- Budget for API costs

---

## ❓ FAQ

**Q: Will my free tier reset tomorrow?**  
A: Yes, at UTC midnight (00:00 UTC). Check your timezone conversion.

**Q: How much will paid cost?**  
A: Usually $1-5/day for moderate use. You can set budgets in Google Cloud to avoid surprises.

**Q: Can I use my friend's API key?**  
A: Technically yes, but each key has its own quota. Better to each upgrade your own.

**Q: What if I don't want to pay?**  
A: You can wait 24 hours for free tier to reset, or implement aggressive caching to reduce API calls.

**Q: Will my existing key keep working?**  
A: Yes, it will work again tomorrow. Just add billing to get unlimited quota.

---

## 🔧 TECHNICAL DETAILS

**Error you're seeing:**
```
429 RESOURCE_EXHAUSTED
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
Limit: 20, Model: gemini-3.5-flash
```

**What this means:**
- `429` = Rate limit exceeded
- `RESOURCE_EXHAUSTED` = Quota exhausted
- `limit: 20` = Free tier allows 20 requests today
- `Please retry in 12s` = Wait before trying again

**Retry logic:**
The backend already has exponential backoff:
- 1st attempt: Immediate
- 2nd retry: Wait 2s, try again
- 3rd retry: Wait 4s, try again
- If still fails: Show user-friendly error

---

## ✅ SIGN-OFF CHECKLIST

- [x] Error identified (free tier quota)
- [x] Root cause explained (20 requests/day limit)
- [x] 3 solutions provided (wait, upgrade, multi-key)
- [x] User-friendly error messages added
- [x] Code verified (0 errors)
- [x] This guide created

---

## 🚀 NEXT STEP

**Choose one and do it now:**

1. **Upgrade to paid** (recommended): Takes 5 minutes, solves problem permanently
2. **Wait until tomorrow**: Free, but you're blocked until midnight UTC
3. **Use another key**: If available, helps you continue testing

After you pick, let me know if you need help setting it up!

---

**Documentation Version:** 1.0  
**Date:** July 10, 2026  
**Status:** ✅ Ready to reference

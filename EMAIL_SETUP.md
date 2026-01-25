# Email Setup Guide - Test Drive Confirmations

This guide will help you set up email sending for test drive booking confirmations using Resend.

## Why Resend?

- ✅ **Free tier**: 3,000 emails/month
- ✅ **Simple setup**: No complex OAuth required
- ✅ **Great developer experience**: Clean API
- ✅ **Reliable**: High deliverability rates
- ✅ **Perfect for hackathons**: Quick to set up

## Step-by-Step Setup

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" (you can use GitHub, Google, or email)
3. Verify your email address

### Step 2: Get Your API Key

1. Once logged in, go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "HackTamu2026")
4. Copy the API key (you'll only see it once!)

### Step 3: Add API Key to Your Project

1. Open your `.env.local` file
2. Add the following:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Car Marketplace <onboarding@resend.dev>
```

**Note**: For testing, you can use `onboarding@resend.dev` as the from email. This is Resend's test domain and works immediately.

### Step 4: Verify Your Domain (Optional - for production)

If you want to use your own domain:

1. Go to [Domains](https://resend.com/domains) in Resend dashboard
2. Click "Add Domain"
3. Follow the DNS setup instructions
4. Update `RESEND_FROM_EMAIL` to use your domain:
   ```env
   RESEND_FROM_EMAIL=Car Marketplace <noreply@yourdomain.com>
   ```

### Step 5: Test the Feature

1. Start your dev server: `pnpm dev`
2. Go to any car detail page
3. Click "Book a Test Drive"
4. Fill out the chatbot form
5. Check your email inbox for the confirmation!

## Troubleshooting

### Email not sending?

1. **Check API key**: Make sure `RESEND_API_KEY` is set in `.env.local`
2. **Check from email**: Use `onboarding@resend.dev` for testing
3. **Check server logs**: Look for error messages in your terminal
4. **Check Resend dashboard**: Go to [Logs](https://resend.com/emails) to see email status

### "Invalid API key" error

- Make sure you copied the full API key (starts with `re_`)
- Restart your dev server after adding the key
- Check for extra spaces or quotes in `.env.local`

### Emails going to spam?

- For production, verify your domain
- Use a professional from email address
- Include proper email headers (already done in the template)

## API Route

The email sending is handled by `/app/api/test-drive/route.ts`. It:
- Validates the form data
- Creates a beautiful HTML email template
- Sends the email via Resend
- Returns success/error response

## Email Template

The email includes:
- Professional HTML design
- All test drive details
- Next steps information
- Responsive design (works on mobile)

## Free Tier Limits

- **3,000 emails/month** on the free tier
- Perfect for hackathon demos and testing
- Upgrade if you need more

## Alternative: Gmail SMTP (Not Recommended)

If you prefer Gmail, you'd need to:
1. Enable 2FA on your Google account
2. Generate an app password
3. Use Nodemailer with Gmail SMTP
4. More complex setup, less reliable for production

**Recommendation**: Stick with Resend for simplicity and reliability.


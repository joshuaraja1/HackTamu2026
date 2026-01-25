import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    // Check if Resend API key is configured
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('RESEND_API_KEY not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('RESEND')));
      return NextResponse.json(
        { 
          error: 'Email service not configured',
          message: 'RESEND_API_KEY is not set in environment variables. Please check your .env.local file.'
        },
        { status: 503 }
      );
    }

    // Initialize Resend with the API key
    const resend = new Resend(apiKey);

    const body = await request.json();
    console.log('Received test drive request:', { 
      carName: body.carName, 
      date: body.date, 
      time: body.time, 
      name: body.name, 
      contact: body.contact 
    });

    const { carName, date, time, name, contact, email } = body;

    // Validate required fields
    if (!carName || !date || !time || !name || !contact) {
      console.error('Missing required fields:', { carName, date, time, name, contact });
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: { carName: !!carName, date: !!date, time: !!time, name: !!name, contact: !!contact }
        },
        { status: 400 }
      );
    }

    // Determine if contact is email or phone
    const isEmail = contact.includes('@');
    const userEmail = isEmail ? contact : email || contact;

    if (!userEmail || !userEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Create email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Drive Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚗 RideIQ - Test Drive Confirmed!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for booking a test drive with us! We're excited to show you the <strong>${carName}</strong>.
    </p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Test Drive Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Vehicle:</td>
          <td style="padding: 8px 0; color: #1f2937;">${carName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Date:</td>
          <td style="padding: 8px 0; color: #1f2937;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Time:</td>
          <td style="padding: 8px 0; color: #1f2937;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Name:</td>
          <td style="padding: 8px 0; color: #1f2937;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Contact:</td>
          <td style="padding: 8px 0; color: #1f2937;">${contact}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Our team will contact you shortly to confirm the details and provide you with the exact location for your test drive.
    </p>
    
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>What to expect:</strong><br>
        • A sales representative will call you within 24 hours<br>
        • You'll receive directions to our dealership<br>
        • The vehicle will be ready for your scheduled time
      </p>
    </div>
    
    <p style="font-size: 16px; margin-top: 30px; margin-bottom: 10px;">
      If you have any questions, feel free to reach out to us.
    </p>
    
    <p style="font-size: 16px; margin-top: 20px; color: #6b7280;">
      Best regards,<br>
      <strong>The RideIQ Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">This is an automated confirmation email. Please do not reply to this message.</p>
  </div>
</body>
</html>
    `;

    const emailText = `
Test Drive Confirmation

Hi ${name},

Thank you for booking a test drive with us! We're excited to show you the ${carName}.

Test Drive Details:
- Vehicle: ${carName}
- Date: ${date}
- Time: ${time}
- Name: ${name}
- Contact: ${contact}

Our team will contact you shortly to confirm the details and provide you with the exact location for your test drive.

Best regards,
The RideIQ Team
    `;

    // Send email using Resend
    console.log('Sending email via Resend...');
    console.log('From:', process.env.RESEND_FROM_EMAIL || 'RideIQ <onboarding@resend.dev>');
    console.log('To:', userEmail);
    console.log('API Key present:', !!apiKey);
    console.log('API Key length:', apiKey?.length);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'RideIQ <onboarding@resend.dev>';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Test Drive Confirmation: ${carName}`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      
      // Check if it's a domain verification error
      if (error.statusCode === 403 && error.message?.includes('only send testing emails to your own email')) {
        // This is a Resend limitation - onboarding@resend.dev can only send to account owner
        // For production, user needs to verify a domain
        console.warn('Resend domain verification required. Using onboarding@resend.dev can only send to account owner email.');
        
        // Extract the account email from the error message
        const accountEmailMatch = error.message.match(/\(([^)]+)\)/);
        const accountEmail = accountEmailMatch ? accountEmailMatch[1] : null;
        
        // Check if the recipient email matches the account email (case-insensitive)
        const emailMatches = accountEmail && userEmail.toLowerCase() === accountEmail.toLowerCase();
        
        if (emailMatches) {
          // Email matches, but there might be a casing issue - try again with exact account email
          console.log('Retrying with account email:', accountEmail);
          const retryResult = await resend.emails.send({
            from: fromEmail,
            to: accountEmail, // Use exact account email
            subject: `Test Drive Confirmation: ${carName}`,
            html: emailHtml,
            text: emailText,
          });
          
          if (retryResult.error) {
            return NextResponse.json(
              { 
                error: 'Email service limitation',
                message: 'Resend requires domain verification to send emails. For testing, emails can only be sent to the account owner email. Please verify a domain at resend.com/domains for production use.',
                details: retryResult.error.message,
                suggestion: 'To enable email sending to all recipients, verify your domain in the Resend dashboard.'
              },
              { status: 503 }
            );
          }
          
          // Success on retry
          console.log('✅ Email sent successfully on retry!');
          console.log('Email ID:', retryResult.data?.id);
          return NextResponse.json({
            success: true,
            messageId: retryResult.data?.id,
            message: 'Test drive confirmation email sent successfully',
          });
        } else {
          // Different email - domain verification required
          return NextResponse.json(
            { 
              error: 'Email service limitation',
              message: `Resend's free tier only allows sending to the account owner email (${accountEmail}). To send to other recipients, please verify a domain at resend.com/domains.`,
              accountEmail: accountEmail,
              recipientEmail: userEmail,
              suggestion: 'For production, verify your domain in Resend dashboard and update RESEND_FROM_EMAIL to use your domain.'
            },
            { status: 503 }
          );
        }
      }
      
      // Other errors
      return NextResponse.json(
        { 
          error: 'Failed to send email', 
          details: error.message || error,
          apiKeyConfigured: !!apiKey
        },
        { status: 500 }
      );
    }

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data?.id);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Test drive confirmation email sent successfully',
    });
  } catch (error: any) {
    console.error('Test drive email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
  recaptchaToken?: string;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY environment variable is not set');
      return false;
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    // For reCAPTCHA v3, check the score (0.0 - 1.0)
    // Scores closer to 1.0 indicate lower risk
    if (data.success && data.score >= 0.5) {
      return true;
    }

    console.warn('reCAPTCHA verification failed:', {
      success: data.success,
      score: data.score,
      errorCodes: data['error-codes'],
    });

    return false;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }
    const resend = new Resend(apiKey);

    const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
    const body: ContactFormData = await request.json();
    const { name, email, phone, reason, message, recaptchaToken } = body;

    // Validate reCAPTCHA token
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: 'reCAPTCHA token is missing' },
        { status: 400 }
      );
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || !email || !phone || !reason || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get contact email from environment variable
    const contactEmail = process.env.EMAIL_CONTACT_FORM;
    if (!contactEmail) {
      console.error('EMAIL_CONTACT_FORM environment variable is not set');
      return NextResponse.json(
        { error: 'Contact form is not configured' },
        { status: 500 }
      );
    }

    // Map reason to readable text
    const reasonMap: Record<string, string> = {
      trial: 'Prueba Gratuita / Free Trial',
      sales: 'Ventas / Sales',
      support: 'Contacto/Soporte / Contact/Support',
    };

    const reasonText = reasonMap[reason] || reason;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${commercialName} Contact Form <${process.env.EMAIL_FROM || 'noreply@weddingapp.com'}>`,
      to: [contactEmail],
      replyTo: email,
      subject: `Nuevo contacto desde la web - ${reasonText}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">📬 Nuevo Contacto desde la Web</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">👤 Nombre:</div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">${name}</div>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">📧 Email:</div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;"><a href="mailto:${email}">${email}</a></div>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">📱 Teléfono:</div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;"><a href="tel:${phone}">${phone}</a></div>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">🎯 Motivo:</div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">${reasonText}</div>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #e11d48; margin-bottom: 5px;">💬 Mensaje:</div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${message}</div>
              </div>

              <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
                <p>Este mensaje fue enviado desde el formulario de contacto de ${commercialName}.</p>
                <p>Para responder, puedes usar directamente el email: <a href="mailto:${email}">${email}</a></p>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending contact form email:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('Contact form email sent successfully:', data?.id);
    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

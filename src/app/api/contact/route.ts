import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const commercialName = process.env.NEXT_PUBLIC_COMMERCIAL_NAME || 'Nupci';
    const body: ContactFormData = await request.json();
    const { name, email, phone, reason, message } = body;

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
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .field {
                margin-bottom: 20px;
              }
              .field-label {
                font-weight: bold;
                color: #e11d48;
                margin-bottom: 5px;
              }
              .field-value {
                background: white;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">📬 Nuevo Contacto desde la Web</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="field-label">👤 Nombre:</div>
                  <div class="field-value">${name}</div>
                </div>

                <div class="field">
                  <div class="field-label">📧 Email:</div>
                  <div class="field-value"><a href="mailto:${email}">${email}</a></div>
                </div>

                <div class="field">
                  <div class="field-label">📱 Teléfono:</div>
                  <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
                </div>

                <div class="field">
                  <div class="field-label">🎯 Motivo:</div>
                  <div class="field-value">${reasonText}</div>
                </div>

                <div class="field">
                  <div class="field-label">💬 Mensaje:</div>
                  <div class="field-value" style="white-space: pre-wrap;">${message}</div>
                </div>

                <div class="footer">
                  <p>Este mensaje fue enviado desde el formulario de contacto de ${commercialName}.</p>
                  <p>Para responder, puedes usar directamente el email: <a href="mailto:${email}">${email}</a></p>
                </div>
              </div>
            </div>
          </body>
        </html>
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

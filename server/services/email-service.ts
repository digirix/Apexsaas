import { MailService } from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

interface EmailProvider {
  id: number;
  provider: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  apiKey: string;
  apiSecret?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  configData?: string;
}

export async function sendEmail(emailProvider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    const fromAddress = `${emailProvider.fromName} <${emailProvider.fromEmail}>`;
    const emailData = {
      ...params,
      from: params.from || fromAddress,
      replyTo: params.replyTo || emailProvider.replyToEmail || emailProvider.fromEmail
    };

    switch (emailProvider.provider) {
      case 'SENDGRID':
        return await sendWithSendGrid(emailProvider, emailData);
      
      case 'SMTP':
        return await sendWithSMTP(emailProvider, emailData);
      
      case 'MAILGUN':
        return await sendWithMailgun(emailProvider, emailData);
      
      case 'SES':
        return await sendWithSES(emailProvider, emailData);
      
      case 'POSTMARK':
        return await sendWithPostmark(emailProvider, emailData);
      
      case 'RESEND':
        return await sendWithResend(emailProvider, emailData);
      
      default:
        console.error(`Unsupported email provider: ${emailProvider.provider}`);
        return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function sendWithSendGrid(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    const mailService = new MailService();
    mailService.setApiKey(provider.apiKey);

    const msg = {
      to: params.to,
      from: params.from!,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo
    };

    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

async function sendWithSMTP(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransporter({
      host: provider.smtpHost!,
      port: provider.smtpPort || 587,
      secure: provider.smtpSecure || false,
      auth: {
        user: provider.fromEmail,
        pass: provider.apiKey
      }
    });

    const mailOptions = {
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('SMTP error:', error);
    return false;
  }
}

async function sendWithMailgun(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    // Mailgun API implementation
    const domain = provider.configData ? JSON.parse(provider.configData).domain : null;
    if (!domain) {
      console.error('Mailgun domain not configured');
      return false;
    }

    const formData = new FormData();
    formData.append('from', params.from!);
    formData.append('to', params.to);
    formData.append('subject', params.subject);
    if (params.text) formData.append('text', params.text);
    if (params.html) formData.append('html', params.html);
    if (params.replyTo) formData.append('h:Reply-To', params.replyTo);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${provider.apiKey}`).toString('base64')}`
      },
      body: formData
    });

    return response.ok;
  } catch (error) {
    console.error('Mailgun error:', error);
    return false;
  }
}

async function sendWithSES(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    // AWS SES implementation would go here
    // This requires AWS SDK which isn't installed
    console.warn('AWS SES not implemented - requires AWS SDK');
    return false;
  } catch (error) {
    console.error('SES error:', error);
    return false;
  }
}

async function sendWithPostmark(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    const payload = {
      From: params.from!,
      To: params.to,
      Subject: params.subject,
      TextBody: params.text,
      HtmlBody: params.html,
      ReplyTo: params.replyTo
    };

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': provider.apiKey
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Postmark error:', error);
    return false;
  }
}

async function sendWithResend(provider: EmailProvider, params: EmailParams): Promise<boolean> {
  try {
    const payload = {
      from: params.from!,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
      reply_to: params.replyTo ? [params.replyTo] : undefined
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Resend error:', error);
    return false;
  }
}

// Email template helpers
export function generateDefaultEmailTemplate(title: string, message: string, linkUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin: 0;">${title}</h1>
    </div>
    
    <div style="padding: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
        
        ${linkUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${linkUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
            </a>
        </div>
        ` : ''}
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #888;">
        <p>This is an automated notification from your accounting management system.</p>
    </div>
</body>
</html>`;
}

// Validate email provider configuration
export function validateEmailProvider(provider: EmailProvider): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!provider.fromEmail || !provider.fromEmail.includes('@')) {
    errors.push('Valid from email is required');
  }

  if (!provider.fromName) {
    errors.push('From name is required');
  }

  if (!provider.apiKey) {
    errors.push('API key is required');
  }

  switch (provider.provider) {
    case 'SMTP':
      if (!provider.smtpHost) errors.push('SMTP host is required');
      if (!provider.smtpPort) errors.push('SMTP port is required');
      break;
    
    case 'MAILGUN':
      if (!provider.configData) {
        errors.push('Mailgun domain configuration is required');
      } else {
        try {
          const config = JSON.parse(provider.configData);
          if (!config.domain) errors.push('Mailgun domain is required in configuration');
        } catch {
          errors.push('Invalid Mailgun configuration JSON');
        }
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
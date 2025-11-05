import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface EmailConfig {
  smtpServer: string
  smtpPort: number
  smtpLogin: string
  smtpPassword: string
  senderAddress: string
  recipientAddress: string
  bccAddress?: string
}

interface FormSubmissionData {
  fullName?: string
  email?: string
  phone?: string
  selectedAreas?: string[]
  painIntensity?: number
  aiSummary?: string
  [key: string]: any
}

function createTransporter(config: EmailConfig): Transporter {
  return nodemailer.createTransport({
    host: config.smtpServer,
    port: config.smtpPort,
    secure: false, // true for 465, false for other ports
    connectionTimeout: 10000, // 10 seconds instead of default 2s
    greetingTimeout: 10000,   // 10 seconds for SMTP greeting
    socketTimeout: 10000,     // 10 seconds for socket operations
    auth: {
      user: config.smtpLogin,
      pass: config.smtpPassword,
    },
    logger: true,  // Enable console logging
    debug: true    // Enable SMTP-level debugging
  })
}

function generatePatientConfirmationEmail(data: FormSubmissionData): string {
  const patientName = data.fullName || 'Patient'
  const painAreas = Array.isArray(data.selectedAreas) && data.selectedAreas.length > 0
    ? data.selectedAreas.join(', ')
    : 'Not specified'
  const intensity = data.painIntensity || 'Not specified'
  const aiSummary = data.aiSummary || '<p>AI summary not available</p>'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .summary-box { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
        .info-item { margin: 10px 0; }
        .label { font-weight: 600; color: #374151; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">Thank You for Your Submission</h1>
      </div>
      <div class="content">
        <p>Dear ${patientName},</p>
        <p>Thank you for completing your pain assessment. We have received your submission and our team will review it shortly.</p>

        <div class="summary-box">
          <h2 style="margin-top: 0; color: #10b981;">Submission Summary</h2>
          <div class="info-item">
            <span class="label">Pain Areas:</span> ${painAreas}
          </div>
          <div class="info-item">
            <span class="label">Pain Intensity:</span> ${intensity}/10
          </div>
        </div>

        <div class="summary-box">
          <h2 style="margin-top: 0; color: #10b981;">Your Clinical Summary</h2>
          ${aiSummary}
        </div>

        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Our clinical team will review your assessment</li>
          <li>We will contact you within 1-2 business days</li>
          <li>If you have urgent concerns, please call us directly</li>
        </ul>

        <div class="footer">
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateClinicNotificationEmail(data: FormSubmissionData): string {
  const patientName = data.fullName || 'Not provided'
  const patientEmail = data.email || 'Not provided'
  const patientPhone = data.phone || 'Not provided'
  const painAreas = Array.isArray(data.selectedAreas) && data.selectedAreas.length > 0
    ? data.selectedAreas.join(', ')
    : 'Not specified'
  const intensity = data.painIntensity || 'Not specified'
  const aiSummary = data.aiSummary || '<p>AI summary not available</p>'
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .summary-box { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
        .info-item { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: 600; color: #374151; display: inline-block; min-width: 150px; }
        .value { color: #1f2937; }
        .urgent { background-color: #fef2f2; border-left-color: #ef4444; }
        .timestamp { color: #6b7280; font-size: 14px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">New Pain Assessment Submission</h1>
        <p class="timestamp" style="margin: 5px 0 0 0;">${timestamp}</p>
      </div>
      <div class="content">

        <div class="info-box">
          <h2 style="margin-top: 0; color: #3b82f6;">Patient Information</h2>
          <div class="info-item">
            <span class="label">Name:</span>
            <span class="value">${patientName}</span>
          </div>
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">${patientEmail}</span>
          </div>
          <div class="info-item">
            <span class="label">Phone:</span>
            <span class="value">${patientPhone}</span>
          </div>
        </div>

        <div class="info-box">
          <h2 style="margin-top: 0; color: #3b82f6;">Pain Overview</h2>
          <div class="info-item">
            <span class="label">Affected Areas:</span>
            <span class="value">${painAreas}</span>
          </div>
          <div class="info-item">
            <span class="label">Pain Intensity:</span>
            <span class="value">${intensity}/10</span>
          </div>
        </div>

        <div class="summary-box">
          <h2 style="margin-top: 0; color: #10b981;">AI Clinical Summary</h2>
          ${aiSummary}
        </div>

        <p style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <strong>Action Required:</strong> Please review this submission and contact the patient within 1-2 business days.
        </p>
      </div>
    </body>
    </html>
  `
}

export async function sendSubmissionEmails(
  formData: FormSubmissionData,
  config: EmailConfig
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []
  const transporter = createTransporter(config)

  // Email 1: Send confirmation to patient
  if (formData.email) {
    try {
      await transporter.sendMail({
        from: `"PEXP Assessment" <${config.senderAddress}>`,
        to: formData.email,
        subject: `Your Pain Assessment Submission - ${formData.fullName || 'Confirmation'}`,
        html: generatePatientConfirmationEmail(formData),
      })
      console.log(`✓ Confirmation email sent to patient: ${formData.email}`)
    } catch (error) {
      const errorMsg = `Failed to send confirmation email to patient: ${error instanceof Error ? error.message : String(error)}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  } else {
    const errorMsg = 'Patient email not provided, skipping confirmation email'
    console.warn(errorMsg)
    errors.push(errorMsg)
  }

  // Email 2: Send notification to clinic
  try {
    const mailOptions: any = {
      from: `"PEXP Assessment System" <${config.senderAddress}>`,
      to: config.recipientAddress,
      subject: `New Pain Assessment - ${formData.fullName || 'New Patient'}`,
      html: generateClinicNotificationEmail(formData),
    }

    // Add BCC if configured
    if (config.bccAddress) {
      mailOptions.bcc = config.bccAddress
    }

    await transporter.sendMail(mailOptions)
    console.log(`✓ Notification email sent to clinic: ${config.recipientAddress}`)
    if (config.bccAddress) {
      console.log(`  (BCC: ${config.bccAddress})`)
    }
  } catch (error) {
    const errorMsg = `Failed to send notification email to clinic: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMsg)
    errors.push(errorMsg)
  }

  return {
    success: errors.length === 0,
    errors,
  }
}

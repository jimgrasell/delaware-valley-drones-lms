import axios from 'axios';
import { AppError } from '../middleware/errorHandler';

interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
  metadata?: Record<string, string>;
}

export class EmailService {
  private apiKey = process.env.POSTMARK_API_KEY;
  private apiUrl = 'https://api.postmarkapp.com/email';
  private fromEmail = process.env.FROM_EMAIL || 'noreply@delawarevalleydrones.com';
  private fromName = 'Delaware Valley Drones';

  /**
   * Send email via Postmark
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.apiKey) {
      console.warn('Postmark API key not configured. Skipping email.');
      return;
    }

    try {
      await axios.post(
        this.apiUrl,
        {
          From: `${this.fromName} <${this.fromEmail}>`,
          To: options.to,
          Subject: options.subject,
          HtmlBody: options.htmlBody,
          TextBody: options.textBody || this.stripHtml(options.htmlBody),
          Tag: options.tag,
          Metadata: options.metadata,
        },
        {
          headers: {
            'X-Postmark-Server-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Postmark email sending error:', error);
      throw new AppError('Failed to send email', 500, 'EMAIL_SEND_FAILED');
    }
  }

  /**
   * Send welcome email to new student
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const htmlBody = `
      <h2>Welcome to the FAA Part 107 Remote Pilot Certification Course!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for enrolling in our comprehensive online course. You now have lifetime access to:</p>
      <ul>
        <li>13 structured course chapters with video lessons</li>
        <li>113+ quiz questions with instant feedback</li>
        <li>Interactive discussions in our community forum</li>
        <li>Certificate of completion upon successful graduation</li>
      </ul>
      <p><strong>Getting Started:</strong></p>
      <ol>
        <li>Log in to your account at <a href="${process.env.FRONTEND_URL}">DelawareValleyDrones.com</a></li>
        <li>Start with Chapter 1: Introduction to UAS and Remote Pilot Regulations</li>
        <li>Watch the video lessons, review course materials, and take the chapter quizzes</li>
        <li>Complete all chapters and pass the final assessment to earn your certificate</li>
      </ol>
      <p>Questions? Visit our <a href="${process.env.FRONTEND_URL}/forum">Community Forum</a> to ask questions and interact with other students.</p>
      <p>Best regards,<br/>James Grasell<br/>UAS Remote Pilot Certified<br/>Delaware Valley Drones</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to the FAA Part 107 Remote Pilot Certification Course',
      htmlBody,
      tag: 'welcome',
      metadata: {
        category: 'welcome_email',
      },
    });
  }

  /**
   * Send enrollment confirmation email
   */
  async sendEnrollmentConfirmation(email: string, name: string): Promise<void> {
    const htmlBody = `
      <h2>Enrollment Confirmation</h2>
      <p>Hi ${name},</p>
      <p>Your enrollment in the FAA Part 107 Remote Pilot Certification Course has been confirmed.</p>
      <p><strong>Order Details:</strong></p>
      <ul>
        <li>Course: FAA Part 107 Remote Pilot Certification</li>
        <li>Price: $99.99</li>
        <li>Access Type: Lifetime</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">View your dashboard</a> to start learning!</p>
      <p>Best regards,<br/>Delaware Valley Drones Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Your Enrollment in the FAA Part 107 Course is Confirmed',
      htmlBody,
      tag: 'enrollment_confirmation',
      metadata: {
        category: 'transaction',
      },
    });
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(
    email: string,
    name: string,
    amount: number,
    transactionId: string,
    date: Date
  ): Promise<void> {
    const amountFormatted = (amount / 100).toFixed(2);

    const htmlBody = `
      <h2>Payment Receipt</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your payment. Here's your receipt:</p>
      <p><strong>Transaction Details:</strong></p>
      <ul>
        <li>Item: FAA Part 107 Remote Pilot Certification Course</li>
        <li>Amount: $${amountFormatted}</li>
        <li>Transaction ID: ${transactionId}</li>
        <li>Date: ${date.toLocaleDateString()}</li>
        <li>Status: Completed</li>
      </ul>
      <p>Keep this receipt for your records. You can also view your payment history in your account dashboard.</p>
      <p>Best regards,<br/>Delaware Valley Drones Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Payment Receipt for FAA Part 107 Course',
      htmlBody,
      tag: 'payment_receipt',
      metadata: {
        category: 'transaction',
        transactionId,
      },
    });
  }

  /**
   * Send quiz passed notification
   */
  async sendQuizPassedEmail(email: string, name: string, chapterTitle: string, score: number): Promise<void> {
    const htmlBody = `
      <h2>Quiz Passed! ✓</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! You have successfully passed the <strong>${chapterTitle}</strong> quiz.</p>
      <p><strong>Your Score:</strong> ${score}%</p>
      <p>You're making great progress toward your FAA Part 107 Remote Pilot Certification!</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">Continue learning</a></p>
      <p>Best regards,<br/>Delaware Valley Drones Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: `Quiz Passed: ${chapterTitle}`,
      htmlBody,
      tag: 'quiz_passed',
      metadata: {
        category: 'quiz_notification',
        chapterTitle,
      },
    });
  }

  /**
   * Send quiz failed notification with retry option
   */
  async sendQuizFailedEmail(email: string, name: string, chapterTitle: string, score: number, passingScore: number): Promise<void> {
    const htmlBody = `
      <h2>Quiz Not Passed</h2>
      <p>Hi ${name},</p>
      <p>You didn't pass the <strong>${chapterTitle}</strong> quiz this time.</p>
      <p><strong>Your Score:</strong> ${score}%</p>
      <p><strong>Passing Score Required:</strong> ${passingScore}%</p>
      <p>Don't worry! You can review the course materials and try again. Here are some tips:</p>
      <ul>
        <li>Review the chapter content thoroughly</li>
        <li>Take notes on key concepts</li>
        <li>Revisit any topics you found challenging</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">Retry the quiz</a></p>
      <p>Best regards,<br/>Delaware Valley Drones Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: `Quiz Results: ${chapterTitle} - Please Try Again`,
      htmlBody,
      tag: 'quiz_failed',
      metadata: {
        category: 'quiz_notification',
        chapterTitle,
      },
    });
  }

  /**
   * Send certificate earned email
   */
  async sendCertificateEmail(
    email: string,
    name: string,
    certificateUrl: string,
    certificateId: string
  ): Promise<void> {
    const htmlBody = `
      <h2>Certificate of Completion Earned! 🎓</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! You have successfully completed the FAA Part 107 Remote Pilot Certification Course!</p>
      <p>Your official certificate of completion is ready to download and share.</p>
      <p><strong>Certificate Details:</strong></p>
      <ul>
        <li>Course: FAA Part 107 Remote Pilot Certification</li>
        <li>Certificate ID: ${certificateId}</li>
        <li>Issued: ${new Date().toLocaleDateString()}</li>
      </ul>
      <p><a href="${certificateUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Certificate</a></p>
      <p>Share your achievement on social media and let others know about your accomplishment!</p>
      <p>Next steps: Use this certificate as proof of your Part 107 training when applying for your FAA Remote Pilot License.</p>
      <p>Best regards,<br/>James Grasell<br/>UAS Remote Pilot Certified<br/>Delaware Valley Drones</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Certificate of Completion - FAA Part 107 Course',
      htmlBody,
      tag: 'certificate_earned',
      metadata: {
        category: 'certificate',
        certificateId,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void> {
    const htmlBody = `
      <h2>Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset the password for your Delaware Valley Drones account.</p>
      <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this reset, you can safely ignore this email.</p>
      <p>Best regards,<br/>Delaware Valley Drones Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Delaware Valley Drones Password',
      htmlBody,
      tag: 'password_reset',
      metadata: {
        category: 'security',
      },
    });
  }

  /**
   * Helper: Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }
}

export const emailService = new EmailService();

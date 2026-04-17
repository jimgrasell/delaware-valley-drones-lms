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
   * Send quiz result notification — picks one of three templates
   * based on the student's score:
   *   - < 70%        → failed, encourage retake with study tips
   *   - 70% to 79%   → passed but encourage retake for 80%+
   *   - >= 80%       → excellent, simple congratulations
   */
  async sendQuizResultEmail(
    email: string,
    name: string,
    chapterTitle: string,
    chapterId: string,
    score: number,
    passingScore: number
  ): Promise<void> {
    const chapterUrl = `${process.env.FRONTEND_URL}/chapters/${chapterId}`;
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

    let subject: string;
    let htmlBody: string;
    let tag: string;

    if (score < passingScore) {
      // Tier 1: Not passed
      subject = `Quiz Results: ${chapterTitle} — Let's Review and Try Again`;
      tag = 'quiz_failed';
      htmlBody = `
        <h2>Quiz Results: ${chapterTitle}</h2>
        <p>Hi ${name},</p>
        <p>You scored <strong>${score}%</strong> on the <strong>${chapterTitle}</strong> quiz. The passing mark is ${passingScore}%, so you'll need to retake this one before moving on.</p>
        <p>Don't be discouraged — this is how the learning works. The students who eventually ace the FAA Part 107 exam almost all had to retake chapter quizzes along the way. Here's how to prepare for the retake:</p>
        <ol>
          <li><strong>Re-read the chapter content</strong> — pay extra attention to any sections you skimmed the first time.</li>
          <li><strong>Watch the video lecture again</strong> (if you took the quiz right after). Reviewing a day later makes concepts stick.</li>
          <li><strong>Study the figures carefully.</strong> Many questions test your ability to read charts, diagrams, and regulatory tables.</li>
          <li><strong>Write down key terms and rules in your own words.</strong> If you can explain a concept simply, you understand it.</li>
          <li><strong>Take a break.</strong> 15–20 minutes away helps your brain consolidate what you just read.</li>
        </ol>
        <p>When you're ready, retake the quiz — there's no penalty, and only your best score counts toward certification.</p>
        <p><a href="${chapterUrl}" style="background-color: #0f4c81; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Back to the chapter</a></p>
        <p>You've got this.</p>
        <p>— Delaware Valley Drones Team</p>
      `;
    } else if (score < 80) {
      // Tier 2: Passed but encourage improvement (70-79)
      subject = `Passed! But You Can Do Even Better — ${chapterTitle}`;
      tag = 'quiz_passed_low';
      htmlBody = `
        <h2>Passed — and there's room to grow</h2>
        <p>Hi ${name},</p>
        <p>Good work — you passed the <strong>${chapterTitle}</strong> quiz with a score of <strong>${score}%</strong>. You've cleared the ${passingScore}% passing threshold, so you're free to move on to the next chapter.</p>
        <p>That said, we encourage you to aim higher. Here's why:</p>
        <ul>
          <li>The actual FAA Part 107 exam requires a 70% minimum, but students who consistently score 80%+ on our practice quizzes pass the real exam on the first attempt at much higher rates.</li>
          <li>Scores in the 70s often mean a few concepts aren't fully locked in. Better to find them here than on exam day.</li>
          <li>Retaking the quiz is free and only your best score is kept.</li>
        </ul>
        <p>Consider a quick review of the chapter and a retake to push your score into the 80s. It'll pay off at the FAA testing center.</p>
        <p>
          <a href="${chapterUrl}" style="background-color: #0f4c81; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Back to the chapter</a>
          <a href="${dashboardUrl}" style="background-color: #fff; color: #0f4c81; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; border: 1px solid #0f4c81;">Continue to next chapter</a>
        </p>
        <p>— Delaware Valley Drones Team</p>
      `;
    } else {
      // Tier 3: Excellent (80%+)
      subject = `Excellent Work on ${chapterTitle}! 🎯`;
      tag = 'quiz_passed_high';
      htmlBody = `
        <h2>Excellent Work!</h2>
        <p>Hi ${name},</p>
        <p>Outstanding — you scored <strong>${score}%</strong> on the <strong>${chapterTitle}</strong> quiz.</p>
        <p>A score of 80% or higher means you've genuinely absorbed the material, not just passed the minimum. This is the level that correlates strongly with passing the FAA Part 107 knowledge test on the first attempt. Keep this pace up and you're on track for certification.</p>
        <p>Take a short break if you've earned one, then head back to the dashboard to continue the course.</p>
        <p><a href="${dashboardUrl}" style="background-color: #0f4c81; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Continue learning</a></p>
        <p>— Delaware Valley Drones Team</p>
      `;
    }

    await this.sendEmail({
      to: email,
      subject,
      htmlBody,
      tag,
      metadata: {
        category: 'quiz_notification',
        chapterTitle,
        score: String(score),
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

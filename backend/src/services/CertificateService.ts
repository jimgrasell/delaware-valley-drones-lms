import { AppDataSource } from '../config/database';
import { Certificate } from '../models/Certificate';
import { User } from '../models/User';
import { ChapterProgress, ProgressStatus } from '../models/ChapterProgress';
import { AppError } from '../middleware/errorHandler';
import * as crypto from 'crypto';

export class CertificateService {
  private certificateRepository = AppDataSource.getRepository(Certificate);
  private userRepository = AppDataSource.getRepository(User);
  private progressRepository = AppDataSource.getRepository(ChapterProgress);

  /**
   * Generate unique verification ID
   */
  private generateVerificationId(): string {
    return crypto.randomBytes(12).toString('hex').toUpperCase();
  }

  /**
   * Check if user has completed the course
   */
  async isCoursePassed(userId: string): Promise<boolean> {
    const progress = await this.progressRepository.find({
      where: { userId },
    });

    if (progress.length === 0) {
      return false;
    }

    // Check if all chapters are completed
    const completedChapters = progress.filter((p) => p.status === 'completed').length;
    const totalChapters = 13;

    return completedChapters === totalChapters;
  }

  /**
   * Calculate final score based on quiz attempts
   */
  async calculateFinalScore(userId: string): Promise<number> {
    const progress = await this.progressRepository.find({
      where: { userId },
    });

    if (progress.length === 0) return 0;

    const scoresWithQuiz = progress.filter((p) => p.bestQuizScore !== null && p.bestQuizScore > 0);

    if (scoresWithQuiz.length === 0) return 0;

    const sum = scoresWithQuiz.reduce((acc, p) => acc + (p.bestQuizScore || 0), 0);
    const average = sum / scoresWithQuiz.length;

    return parseFloat(average.toFixed(2));
  }

  /**
   * Create certificate for user
   */
  async createCertificate(userId: string): Promise<Certificate> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if certificate already exists
    const existingCertificate = await this.certificateRepository.findOne({
      where: { userId },
    });

    if (existingCertificate) {
      throw new AppError('Certificate already issued for this user', 400, 'CERTIFICATE_ALREADY_EXISTS');
    }

    // Verify course is passed
    const isPassed = await this.isCoursePassed(userId);

    if (!isPassed) {
      throw new AppError('User has not completed the course', 400, 'COURSE_NOT_COMPLETED');
    }

    // Calculate final score
    const finalScore = await this.calculateFinalScore(userId);

    // Generate verification ID
    const verificationId = this.generateVerificationId();

    // Create certificate record
    const certificate = this.certificateRepository.create({
      userId,
      verificationId,
      finalScore,
      completionDate: new Date(),
      certificateUrl: this.generateCertificateUrl(verificationId),
    });

    await this.certificateRepository.save(certificate);

    return certificate;
  }

  /**
   * Get certificate for user
   */
  async getCertificate(userId: string): Promise<Certificate | null> {
    const certificate = await this.certificateRepository.findOne({
      where: { userId },
    });

    return certificate || null;
  }

  /**
   * Get certificate by verification ID
   */
  async getCertificateByVerificationId(verificationId: string): Promise<Certificate | null> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationId },
    });

    return certificate || null;
  }

  /**
   * Verify certificate by verification ID
   */
  async verifyCertificate(verificationId: string): Promise<any> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationId },
      relations: ['user'],
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
    }

    return {
      verificationId: certificate.verificationId,
      studentName: certificate.user.name,
      courseName: 'FAA Part 107 Remote Pilot Certification Course',
      completionDate: certificate.completionDate,
      finalScore: certificate.finalScore,
      issuedAt: certificate.createdAt,
      isValid: true,
    };
  }

  /**
   * Generate HTML certificate (can be converted to PDF)
   */
  async generateCertificateHtml(userId: string): Promise<string> {
    const certificate = await this.certificateRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
    }

    const completionDate = certificate.completionDate?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) || new Date().toLocaleDateString('en-US');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Completion</title>
        <style>
          body {
            font-family: Georgia, serif;
            margin: 0;
            padding: 0;
            background: #f0f0f0;
          }
          .certificate {
            width: 8.5in;
            height: 11in;
            margin: 20px auto;
            padding: 60px;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            position: relative;
            border: 3px solid #2c3e50;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 30px;
            left: 30px;
            right: 30px;
            bottom: 30px;
            border: 1px solid #2c3e50;
            pointer-events: none;
          }
          .content {
            position: relative;
            z-index: 1;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .title {
            font-size: 48px;
            font-weight: bold;
            color: #2c3e50;
            margin: 40px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .subtitle {
            font-size: 18px;
            color: #555;
            margin-bottom: 40px;
          }
          .message {
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 30px;
          }
          .recipient {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin: 30px 0;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 10px;
          }
          .course-name {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            font-style: italic;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 60px;
            padding-top: 40px;
            border-top: 1px solid #ccc;
          }
          .signature-block {
            text-align: center;
            width: 30%;
          }
          .signature-line {
            border-top: 2px solid #2c3e50;
            height: 0;
            margin-bottom: 10px;
          }
          .signature-name {
            font-size: 12px;
            color: #555;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 10px;
            color: #999;
          }
          .verification-id {
            color: #2c3e50;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="content">
            <div class="logo">Delaware Valley Drones</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This certifies that</div>
            
            <div class="recipient">${certificate.user.name}</div>
            
            <div class="message">
              has successfully completed the comprehensive online course
            </div>
            
            <div class="course-name">
              FAA Part 107 Remote Pilot Certification
            </div>
            
            <div class="message">
              with a final score of <strong>${certificate.finalScore}%</strong>
            </div>
            
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">James Grasell<br/>UAS Remote Pilot Certified</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Completion Date<br/>${completionDate}</div>
              </div>
            </div>
            
            <div class="footer">
              Verification ID: <span class="verification-id">${certificate.verificationId}</span><br/>
              This certificate is valid and can be verified at www.delawarevalleydrones.com/verify
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate HTML certificate by verification ID
   */
  async generateCertificateHtmlByVerificationId(verificationId: string): Promise<string> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationId },
      relations: ['user'],
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
    }

    return this.buildCertificateHtml(certificate);
  }

  /**
   * Helper: Build certificate HTML
   */
  private buildCertificateHtml(certificate: Certificate): string {
    const completionDate = certificate.completionDate?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) || new Date().toLocaleDateString('en-US');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Completion</title>
        <style>
          body {
            font-family: Georgia, serif;
            margin: 0;
            padding: 0;
            background: #f0f0f0;
          }
          .certificate {
            width: 8.5in;
            height: 11in;
            margin: 20px auto;
            padding: 60px;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            position: relative;
            border: 3px solid #2c3e50;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 30px;
            left: 30px;
            right: 30px;
            bottom: 30px;
            border: 1px solid #2c3e50;
            pointer-events: none;
          }
          .content {
            position: relative;
            z-index: 1;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .title {
            font-size: 48px;
            font-weight: bold;
            color: #2c3e50;
            margin: 40px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .subtitle {
            font-size: 18px;
            color: #555;
            margin-bottom: 40px;
          }
          .message {
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 30px;
          }
          .recipient {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin: 30px 0;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 10px;
          }
          .course-name {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            font-style: italic;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 60px;
            padding-top: 40px;
            border-top: 1px solid #ccc;
          }
          .signature-block {
            text-align: center;
            width: 30%;
          }
          .signature-line {
            border-top: 2px solid #2c3e50;
            height: 0;
            margin-bottom: 10px;
          }
          .signature-name {
            font-size: 12px;
            color: #555;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 10px;
            color: #999;
          }
          .verification-id {
            color: #2c3e50;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="content">
            <div class="logo">Delaware Valley Drones</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This certifies that</div>
            
            <div class="recipient">${certificate.user.name}</div>
            
            <div class="message">
              has successfully completed the comprehensive online course
            </div>
            
            <div class="course-name">
              FAA Part 107 Remote Pilot Certification
            </div>
            
            <div class="message">
              with a final score of <strong>${certificate.finalScore}%</strong>
            </div>
            
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">James Grasell<br/>UAS Remote Pilot Certified</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Completion Date<br/>${completionDate}</div>
              </div>
            </div>
            
            <div class="footer">
              Verification ID: <span class="verification-id">${certificate.verificationId}</span><br/>
              This certificate is valid and can be verified at www.delawarevalleydrones.com/verify
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper: Generate certificate URL
   */
  private generateCertificateUrl(verificationId: string): string {
    return `${process.env.FRONTEND_URL}/certificate/${verificationId}`;
  }
}

export const certificateService = new CertificateService();

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { certificateService } from '../services/CertificateService';
import { emailService } from '../services/EmailService';

const router = Router();

/**
 * POST /api/v1/certificates/generate
 * Generate certificate for completed course
 * @authenticated student
 * @returns {object} Certificate details with verification ID
 */
router.post(
  '/generate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const user = req.user!;

    const certificate = await certificateService.createCertificate(userId);

    // Send certificate email
    await emailService.sendCertificateEmail(
      user.email,
      user.name,
      certificate.certificateUrl || '',
      certificate.verificationId
    );

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        id: certificate.id,
        verificationId: certificate.verificationId,
        finalScore: certificate.finalScore,
        completionDate: certificate.completionDate,
        certificateUrl: certificate.certificateUrl,
      },
    });
  })
);

/**
 * GET /api/v1/certificates/my-certificate
 * Get certificate for authenticated user
 * @authenticated student
 * @returns {object} User's certificate details or null if not yet earned
 */
router.get(
  '/my-certificate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const certificate = await certificateService.getCertificate(userId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'No certificate found. Complete the course to earn a certificate.',
      });
    }

    res.json({
      success: true,
      data: {
        id: certificate.id,
        verificationId: certificate.verificationId,
        finalScore: certificate.finalScore,
        completionDate: certificate.completionDate,
        certificateUrl: certificate.certificateUrl,
        createdAt: certificate.createdAt,
      },
    });
  })
);

/**
 * GET /api/v1/certificates/verify/:verificationId
 * Verify certificate by verification ID (public endpoint)
 * @param {string} verificationId - Certificate verification ID
 * @returns {object} Certificate verification details
 */
router.get(
  '/verify/:verificationId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { verificationId } = req.params;

    const certificateData = await certificateService.verifyCertificate(verificationId);

    res.json({
      success: true,
      data: certificateData,
    });
  })
);

/**
 * GET /api/v1/certificates/download/:verificationId
 * Download certificate as HTML (can be converted to PDF by browser)
 * @param {string} verificationId - Certificate verification ID
 * @returns {html} Certificate HTML document
 */
router.get(
  '/download/:verificationId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { verificationId } = req.params;

    // Get HTML by verification ID
    const html = await certificateService.generateCertificateHtmlByVerificationId(verificationId);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${verificationId}.html"`);
    res.send(html);
  })
);

/**
 * GET /api/v1/certificates/:userId/html
 * Get certificate HTML for authenticated user
 * @authenticated student (their own certificate only)
 * @returns {html} Certificate HTML document
 */
router.get(
  '/:userId/html',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user!.id;

    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only download your own certificate',
      });
    }

    const html = await certificateService.generateCertificateHtml(authenticatedUserId);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  })
);

export default router;

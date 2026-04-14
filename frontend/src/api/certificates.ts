import { apiClient } from './client';

export interface Certificate {
  id: string;
  verificationId: string;
  finalScore: number;
  completionDate: string;
  certificateUrl: string | null;
  createdAt: string;
}

export interface CertificateVerification {
  verificationId: string;
  studentName: string;
  courseName: string;
  completionDate: string;
  finalScore: number;
  issuedAt: string;
  isValid: boolean;
}

export const certificatesApi = {
  getMyCertificate: async (): Promise<Certificate | null> => {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: Certificate }>(
        '/certificates/my-certificate'
      );
      return data.data;
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 404) return null;
      throw err;
    }
  },

  generate: async (): Promise<Certificate> => {
    const { data } = await apiClient.post<{ success: boolean; data: Certificate }>(
      '/certificates/generate'
    );
    return data.data;
  },

  verify: async (verificationId: string): Promise<CertificateVerification> => {
    const { data } = await apiClient.get<{ success: boolean; data: CertificateVerification }>(
      `/certificates/verify/${verificationId}`
    );
    return data.data;
  },
};

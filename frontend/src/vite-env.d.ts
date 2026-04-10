/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_SUPPORT_EMAIL: string;
  readonly VITE_COURSE_PRICE: string;
  readonly VITE_COURSE_NAME: string;
  readonly VITE_COURSE_CHAPTERS: string;
  readonly VITE_COURSE_QUESTIONS: string;
  readonly VITE_FEATURE_FORUM: string;
  readonly VITE_FEATURE_CERTIFICATES: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

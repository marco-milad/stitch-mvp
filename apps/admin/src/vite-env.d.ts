/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Preferred name. */
  readonly VITE_WS_URL?: string;
  /** Deprecated alias — still read so existing dev .env files keep working. */
  readonly VITE_API_WS_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APIGATEWAY_URL: string;
  readonly VITE_WEBHOOK_URL: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

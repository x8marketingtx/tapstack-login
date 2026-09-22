/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_API_URL?: string
  readonly VITE_APP_URL?: string
  readonly VITE_LOCATION_VERIFICATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

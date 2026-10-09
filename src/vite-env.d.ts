/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_API_URL?: string
  readonly VITE_APP_URL?: string
  readonly VITE_LOCATION_VERIFICATION?: string
  readonly VITE_NITROPAY_SITE_ID?: string
  readonly VITE_NITROPAY_PLACEMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

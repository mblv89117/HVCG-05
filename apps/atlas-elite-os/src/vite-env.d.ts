/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ATLAS_ENV?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_REDIRECT_URI?: string;
  readonly VITE_POST_LOGOUT_REDIRECT_URI?: string;
  readonly VITE_DATAVERSE_URL?: string;
  readonly VITE_DATAVERSE_API_VERSION?: string;
  readonly VITE_GRAPH_URL?: string;
  readonly VITE_SHAREPOINT_SITE_URL?: string;
  readonly VITE_POWER_AUTOMATE_BASE_URL?: string;
  readonly VITE_HOSTED_APP_URL?: string;
  readonly VITE_ALLOW_SAMPLE_FALLBACK?: string;
  readonly VITE_BLOCK_LIVE_CLIENT_COMMS?: string;
  readonly VITE_ATLAS_ROLE?: string;
  readonly VITE_ATLAS_ROLE_FORCE?: string;
  readonly VITE_ENTRA_GROUP_HVCG_OWNER?: string;
  readonly VITE_ENTRA_GROUP_ADMINISTRATOR?: string;
  readonly VITE_ENTRA_GROUP_HVCG_TEAM?: string;
  readonly VITE_ENTRA_GROUP_CLIENT_EXECUTIVE?: string;
  readonly VITE_ENTRA_GROUP_CLIENT_TEAM?: string;
  readonly VITE_ENTRA_GROUP_READ_ONLY_ADVISOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

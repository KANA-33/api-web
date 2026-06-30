interface LegacyAdminUrlOptions {
  apiBaseUrl?: string;
  configuredUrl?: string;
}

const legacyAdminPath = "/channels";

export function resolveLegacyAdminUrl({
  apiBaseUrl,
  configuredUrl,
}: LegacyAdminUrlOptions) {
  const trimmedConfiguredUrl = configuredUrl?.trim();

  if (trimmedConfiguredUrl) {
    return trimmedConfiguredUrl;
  }

  const trimmedApiBaseUrl = apiBaseUrl?.trim();

  if (trimmedApiBaseUrl) {
    return new URL(legacyAdminPath, trimmedApiBaseUrl).toString();
  }

  return legacyAdminPath;
}

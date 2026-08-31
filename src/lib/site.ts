export function getSiteUrl(): URL {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl) return new URL(explicitUrl);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return new URL(vercelHost ? `https://${vercelHost}` : "http://localhost:3001");
}

export function getPeerSiteUrl(): string | undefined {
  const configuredUrl = process.env.NEXT_PUBLIC_PEER_SITE_URL;
  if (!configuredUrl) return undefined;

  const peerSiteUrl = new URL(configuredUrl);
  if (peerSiteUrl.protocol !== "https:" && peerSiteUrl.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_PEER_SITE_URL must use http or https");
  }
  return peerSiteUrl.toString().replace(/\/$/, "");
}

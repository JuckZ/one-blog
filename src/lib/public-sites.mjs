const productionPeers = new Map([
  ["ihave.cool", "blog.ihave.cool"],
  ["blog.ihave.cool", "ihave.cool"],
]);

export function getVercelPublicSite(env = process.env) {
  // Vercel also sets the production hostname in previews.
  const host = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (env.VERCEL_ENV !== "production" || !host) return undefined;

  const peer = productionPeers.get(host);
  if (!peer) return undefined;

  return { url: `https://${host}`, peerUrl: `https://${peer}` };
}

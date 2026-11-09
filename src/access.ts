/**
 * Cloudflare Access (Zero Trust) JWT validation for the admin area.
 *
 * Access sits in front of `/admin` on the custom domain, but the Worker is also
 * reachable through workers.dev, so every admin request must carry a valid
 * `Cf-Access-Jwt-Assertion` signed by the team's keys for our application AUD.
 */

type Jwk = JsonWebKey & { kid?: string };

const CERTS_TTL_MS = 60 * 60 * 1000;
/** Minimum gap between refetches triggered by an unknown `kid` (key rotation). */
const REFETCH_MIN_MS = 60 * 1000;
const CLOCK_SKEW_S = 60;

let certs: { team: string; keys: Map<string, CryptoKey>; fetchedAt: number } | undefined;

async function fetchKeys(team: string): Promise<Map<string, CryptoKey>> {
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`access_certs_http_${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== "RSA") continue;
    keys.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      ),
    );
  }
  return keys;
}

async function signingKey(team: string, kid: string): Promise<CryptoKey | undefined> {
  const now = Date.now();
  const stale = !certs || certs.team !== team || now - certs.fetchedAt > CERTS_TTL_MS;
  const unknown = certs !== undefined && !certs.keys.has(kid) && now - certs.fetchedAt > REFETCH_MIN_MS;
  if (stale || unknown) {
    certs = { team, keys: await fetchKeys(team), fetchedAt: now };
  }
  return certs?.keys.get(kid);
}

function b64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson(s: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64url(s))) as Record<string, unknown>;
}

/** Returns the authenticated email, or null when the token is missing or invalid. */
export async function verifyAccessJwt(
  token: string | null,
  team: string,
  aud: string,
): Promise<string | null> {
  if (!token || !team || !aud) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = b64urlJson(parts[0]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const key = await signingKey(team, header.kid);
    if (!key) return null;
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const claims = b64urlJson(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== `https://${team}`) return null;
    if (!audiences.includes(aud)) return null;
    if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < now) return null;
    if (typeof claims.nbf === "number" && claims.nbf - CLOCK_SKEW_S > now) return null;
    return typeof claims.email === "string" && claims.email ? claims.email : null;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "access_jwt_error",
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}

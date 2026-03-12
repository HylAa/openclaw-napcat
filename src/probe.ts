import type { BaseProbeResult } from "openclaw/plugin-sdk";
import { getLoginInfo } from "./api.js";
import type { OneBotLoginInfo } from "./types.js";

export type NapCatProbeResult = BaseProbeResult<string> & {
  bot?: OneBotLoginInfo;
  elapsedMs: number;
};

/**
 * Probe NapCat HTTP API to verify connectivity and get bot info.
 */
export async function probeNapCat(
  httpApi: string,
  accessToken?: string,
  timeoutMs = 5000,
): Promise<NapCatProbeResult> {
  if (!httpApi) {
    return { ok: false, error: "No NapCat HTTP API URL configured", elapsedMs: 0 };
  }

  const start = Date.now();
  try {
    const bot = await getLoginInfo(httpApi, accessToken);
    return {
      ok: true,
      bot,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - start,
    };
  }
}

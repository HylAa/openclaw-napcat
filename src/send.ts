import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { resolveNapCatAccount } from "./accounts.js";
import {
  sendPrivateMsg,
  sendGroupMsg,
  textSegment,
  imageSegment,
} from "./api.js";
import type { OneBotSegment } from "./types.js";

export type NapCatSendOptions = {
  httpApi?: string;
  accessToken?: string;
  accountId?: string;
  cfg?: OpenClawConfig;
  mediaUrl?: string;
};

export type NapCatSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

const QQ_TEXT_LIMIT = 4500;

function resolveSendContext(options: NapCatSendOptions): {
  httpApi: string;
  accessToken: string;
} {
  if (options.cfg) {
    const account = resolveNapCatAccount({
      cfg: options.cfg,
      accountId: options.accountId,
    });
    return {
      httpApi: options.httpApi || account.httpApi,
      accessToken: options.accessToken || account.accessToken,
    };
  }
  return {
    httpApi: options.httpApi ?? "",
    accessToken: options.accessToken ?? "",
  };
}

/**
 * Send a message to a QQ user or group.
 * Target format: "private:<userId>" or "group:<groupId>"
 */
export async function sendMessageNapCat(
  target: string,
  text: string,
  options: NapCatSendOptions = {},
): Promise<NapCatSendResult> {
  const { httpApi, accessToken } = resolveSendContext(options);
  if (!httpApi) {
    return { ok: false, error: "No NapCat HTTP API URL configured" };
  }

  const trimmedTarget = target?.trim();
  if (!trimmedTarget) {
    return { ok: false, error: "No target provided" };
  }

  // Build message segments
  const segments: OneBotSegment[] = [];

  if (options.mediaUrl?.trim()) {
    segments.push(imageSegment(options.mediaUrl.trim()));
  }
  if (text?.trim()) {
    segments.push(textSegment(text.slice(0, QQ_TEXT_LIMIT)));
  }
  if (segments.length === 0) {
    return { ok: false, error: "Empty message" };
  }

  try {
    const isGroup = trimmedTarget.startsWith("group:");
    const id = Number(trimmedTarget.replace(/^(private|group):/, ""));

    if (Number.isNaN(id)) {
      return { ok: false, error: `Invalid target ID: ${trimmedTarget}` };
    }

    const result = isGroup
      ? await sendGroupMsg(httpApi, id, segments, accessToken)
      : await sendPrivateMsg(httpApi, id, segments, accessToken);

    return { ok: true, messageId: String(result.message_id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

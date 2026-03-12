import type {
  OneBotApiResponse,
  OneBotLoginInfo,
  OneBotSegment,
  OneBotSendMsgResult,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export class OneBotApiError extends Error {
  constructor(
    public readonly retcode: number,
    message: string,
  ) {
    super(message);
    this.name = "OneBotApiError";
  }
}

/**
 * Call OneBot 11 HTTP API.
 * NapCat exposes HTTP endpoints at `{baseUrl}/{action}`.
 */
export async function callOneBotApi<T>(
  baseUrl: string,
  action: string,
  params: Record<string, unknown> = {},
  options?: { accessToken?: string; timeoutMs?: number },
): Promise<OneBotApiResponse<T>> {
  const url = `${baseUrl.replace(/\/+$/, "")}/${action}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.accessToken) {
    headers["Authorization"] = `Bearer ${options.accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new OneBotApiError(res.status, `HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as OneBotApiResponse<T>;
    if (data.retcode !== 0) {
      throw new OneBotApiError(
        data.retcode,
        `OneBot API error: retcode=${data.retcode} status=${data.status}`,
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/** Get bot login info (QQ number + nickname). */
export async function getLoginInfo(
  baseUrl: string,
  accessToken?: string,
): Promise<OneBotLoginInfo> {
  const resp = await callOneBotApi<OneBotLoginInfo>(baseUrl, "get_login_info", {}, { accessToken });
  return resp.data;
}

/** Send a private message. */
export async function sendPrivateMsg(
  baseUrl: string,
  userId: number,
  message: OneBotSegment[],
  accessToken?: string,
): Promise<OneBotSendMsgResult> {
  const resp = await callOneBotApi<OneBotSendMsgResult>(
    baseUrl,
    "send_private_msg",
    { user_id: userId, message },
    { accessToken },
  );
  return resp.data;
}

/** Send a group message. */
export async function sendGroupMsg(
  baseUrl: string,
  groupId: number,
  message: OneBotSegment[],
  accessToken?: string,
): Promise<OneBotSendMsgResult> {
  const resp = await callOneBotApi<OneBotSendMsgResult>(
    baseUrl,
    "send_group_msg",
    { group_id: groupId, message },
    { accessToken },
  );
  return resp.data;
}

/** Build a text message segment. */
export function textSegment(text: string): OneBotSegment {
  return { type: "text", data: { text } };
}

/** Build an image message segment. */
export function imageSegment(fileUrl: string): OneBotSegment {
  return { type: "image", data: { file: fileUrl } };
}

/** Build an @mention segment. */
export function atSegment(qq: string | number): OneBotSegment {
  return { type: "at", data: { qq: String(qq) } };
}

/** Build a reply (quote) segment referencing an earlier message. */
export function replySegment(messageId: number | string): OneBotSegment {
  return { type: "reply", data: { id: String(messageId) } };
}

/** Build a voice/record message segment. */
export function recordSegment(fileUrl: string): OneBotSegment {
  return { type: "record", data: { file: fileUrl } };
}

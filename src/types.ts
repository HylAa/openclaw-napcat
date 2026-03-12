import type { SecretInput } from "openclaw/plugin-sdk";

/** OneBot 11 message segment (array format). */
export type OneBotSegment = {
  type: string;
  data: Record<string, string | undefined>;
};

/** OneBot 11 message event (private or group). */
export type OneBotMessageEvent = {
  time: number;
  self_id: number;
  post_type: "message";
  message_type: "private" | "group";
  sub_type: string;
  message_id: number;
  user_id: number;
  group_id?: number;
  message: OneBotSegment[];
  raw_message: string;
  font: number;
  sender: {
    user_id: number;
    nickname: string;
    card?: string;
    sex?: string;
    age?: number;
    role?: "owner" | "admin" | "member";
  };
};

/** OneBot 11 meta event (lifecycle, heartbeat). */
export type OneBotMetaEvent = {
  time: number;
  self_id: number;
  post_type: "meta_event";
  meta_event_type: "lifecycle" | "heartbeat";
  sub_type?: string;
};

/** Any OneBot 11 event. */
export type OneBotEvent = OneBotMessageEvent | OneBotMetaEvent | Record<string, unknown>;

/** OneBot 11 API response via WebSocket. */
export type OneBotApiResponse<T = unknown> = {
  status: "ok" | "failed";
  retcode: number;
  data: T;
  echo?: string;
};

/** get_login_info result. */
export type OneBotLoginInfo = {
  user_id: number;
  nickname: string;
};

/** send_msg result. */
export type OneBotSendMsgResult = {
  message_id: number;
};

/** NapCat account configuration in openclaw.json. */
export type NapCatAccountConfig = {
  /** Display name for this account. */
  name?: string;
  /** Disable this account without removing config. */
  enabled?: boolean;
  /** NapCat OneBot 11 HTTP API base URL for sending messages (e.g. http://127.0.0.1:3000). */
  httpApi?: string;
  /** Access token for OneBot 11 API authentication. */
  accessToken?: SecretInput;
  /** The bot's QQ number (self_id). Used to detect @bot mentions. */
  selfId?: string | number;
  /** DM access policy. */
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
  /** Allowlist for DM senders (QQ numbers). */
  allowFrom?: Array<string | number>;
  /** Group message policy. */
  groupPolicy?: "open" | "allowlist" | "disabled";
  /** Allowlist for group senders (falls back to allowFrom). */
  groupAllowFrom?: Array<string | number>;
  /** Max inbound media size in MB. */
  mediaMaxMb?: number;
  /** Outbound response prefix. */
  responsePrefix?: string;
};

export type NapCatConfig = {
  /** Multi-account support. */
  accounts?: Record<string, NapCatAccountConfig>;
  /** Default account ID. */
  defaultAccount?: string;
} & NapCatAccountConfig;

export type ResolvedNapCatAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  httpApi: string;
  accessToken: string;
  selfId: string;
  config: NapCatAccountConfig;
};

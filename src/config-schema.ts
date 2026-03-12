// Direct JSON Schema — bypasses zod to avoid version/instance mismatch at runtime.

export const NapCatChannelConfigSchema = {
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      enabled: { type: "boolean" },
      httpApi: { type: "string" },
      accessToken: { type: "string" },
      selfId: { type: "string" },
      dmPolicy: { type: "string", enum: ["open", "pairing", "allowlist", "disabled"] },
      allowFrom: {
        type: "array",
        items: { type: ["string", "number"] },
      },
      groupPolicy: { type: "string", enum: ["open", "allowlist", "disabled"] },
      groupAllowFrom: {
        type: "array",
        items: { type: ["string", "number"] },
      },
      mediaMaxMb: { type: "number" },
      responsePrefix: { type: "string" },
      accounts: {
        type: "object",
        additionalProperties: true,
      },
      defaultAccount: { type: "string" },
    },
    additionalProperties: true,
  },
  uiHints: {
    httpApi: {
      label: "NapCat HTTP API",
      help: "NapCat OneBot 11 HTTP API 地址 (例: http://127.0.0.1:3000)",
      placeholder: "http://127.0.0.1:3000",
    },
    accessToken: {
      label: "Access Token",
      sensitive: true,
      help: "OneBot 11 API 鉴权 token (可选)",
    },
    selfId: {
      label: "机器人 QQ 号",
      help: "机器人的 QQ 号码，用于检测 @机器人",
    },
    dmPolicy: {
      label: "私聊策略",
      help: "allowlist=白名单, pairing=配对, open=开放, disabled=禁用",
    },
    allowFrom: {
      label: "私聊白名单",
      help: "允许私聊的 QQ 号列表",
    },
    groupPolicy: {
      label: "群聊策略",
      help: "allowlist=白名单, open=开放, disabled=禁用",
    },
    groupAllowFrom: {
      label: "群聊白名单",
      help: "允许在群聊中触发的 QQ 号列表",
    },
    mediaMaxMb: {
      label: "最大媒体大小 (MB)",
      advanced: true,
    },
    responsePrefix: {
      label: "回复前缀",
      advanced: true,
    },
  },
} as const;

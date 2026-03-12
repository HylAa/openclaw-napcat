import {
  buildAccountScopedDmSecurityPolicy,
  buildChannelSendResult,
  buildBaseAccountStatusSnapshot,
  buildTokenChannelStatusSummary,
  DEFAULT_ACCOUNT_ID,
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
  chunkTextForOutbound,
  formatAllowFromLowercase,
  isNumericTargetId,
  listDirectoryUserEntriesFromAllowFrom,
  mapAllowFromEntries,
  normalizeAccountId,
  sendPayloadWithChunkedTextAndMedia,
  collectOpenProviderGroupPolicyWarnings,
  buildOpenGroupPolicyRestrictSendersWarning,
  buildOpenGroupPolicyWarning,
  PAIRING_APPROVED_MESSAGE,
} from "openclaw/plugin-sdk";
import type {
  ChannelAccountSnapshot,
  ChannelDock,
  ChannelPlugin,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
// Inline — avoids SDK export resolution issues at runtime.
function createAccountStatusSink(params: {
  accountId: string;
  setStatus: (next: Record<string, unknown>) => void;
}): (patch: Record<string, unknown>) => void {
  return (patch) => {
    params.setStatus({ accountId: params.accountId, ...patch });
  };
}

import {
  listNapCatAccountIds,
  resolveDefaultNapCatAccountId,
  resolveNapCatAccount,
  type ResolvedNapCatAccount,
} from "./accounts.js";
import { NapCatChannelConfigSchema } from "./config-schema.js";
import { createNapCatAgentTools } from "./tools.js";
import { probeNapCat } from "./probe.js";
import { sendMessageNapCat } from "./send.js";
import { sendPrivateMsg, textSegment } from "./api.js";

const meta = {
  id: "napcat" as const,
  label: "QQ (NapCat)",
  selectionLabel: "QQ via NapCat (OneBot 11)",
  docsPath: "/channels/napcat",
  docsLabel: "napcat",
  blurb: "QQ messaging via NapCat OneBot 11 reverse WebSocket.",
  aliases: ["qq", "onebot"],
  order: 90,
  quickstartAllowFrom: true,
};

function normalizeNapCatMessagingTarget(raw: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  // Strip prefixes like "napcat:", "qq:", "onebot:"
  return trimmed.replace(/^(napcat|qq|onebot):/i, "");
}

export const napCatDock: ChannelDock = {
  id: "napcat",
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
    blockStreaming: true,
  },
  outbound: { textChunkLimit: 4500 },
  config: {
    resolveAllowFrom: ({ cfg, accountId }) =>
      mapAllowFromEntries(resolveNapCatAccount({ cfg, accountId }).config.allowFrom),
    formatAllowFrom: ({ allowFrom }) =>
      formatAllowFromLowercase({ allowFrom, stripPrefixRe: /^(napcat|qq|onebot):/i }),
  },
  groups: {
    resolveRequireMention: () => true,
  },
  threading: {
    resolveReplyToMode: () => "off",
  },
};

export const napCatPlugin: ChannelPlugin<ResolvedNapCatAccount> = {
  id: "napcat",
  meta,
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
    reactions: false,
    threads: false,
    polls: false,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.napcat"] },
  configSchema: NapCatChannelConfigSchema,
  agentTools: ({ cfg }) => (cfg ? createNapCatAgentTools(cfg) : []),
  config: {
    listAccountIds: (cfg) => listNapCatAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveNapCatAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultNapCatAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "napcat",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "napcat",
        accountId,
        clearBaseFields: ["httpApi", "accessToken", "selfId", "name"],
      }),
    isConfigured: (account) => Boolean(account.httpApi?.trim()),
    describeAccount: (account): ChannelAccountSnapshot => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.httpApi?.trim()),
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      mapAllowFromEntries(resolveNapCatAccount({ cfg, accountId }).config.allowFrom),
    formatAllowFrom: ({ allowFrom }) =>
      formatAllowFromLowercase({ allowFrom, stripPrefixRe: /^(napcat|qq|onebot):/i }),
  },
  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      return buildAccountScopedDmSecurityPolicy({
        cfg,
        channelKey: "napcat",
        accountId,
        fallbackAccountId: account.accountId ?? DEFAULT_ACCOUNT_ID,
        policy: account.config.dmPolicy,
        allowFrom: account.config.allowFrom ?? [],
        policyPathSuffix: "dmPolicy",
        normalizeEntry: (raw) => raw.replace(/^(napcat|qq|onebot):/i, ""),
      });
    },
    collectWarnings: ({ account, cfg }) => {
      return collectOpenProviderGroupPolicyWarnings({
        cfg,
        providerConfigPresent: (cfg as Record<string, unknown>).channels?.napcat !== undefined,
        configuredGroupPolicy: account.config.groupPolicy,
        collect: (groupPolicy) => {
          if (groupPolicy !== "open") return [];
          const explicitGroupAllowFrom = mapAllowFromEntries(account.config.groupAllowFrom);
          const dmAllowFrom = mapAllowFromEntries(account.config.allowFrom);
          const effectiveAllowFrom =
            explicitGroupAllowFrom.length > 0 ? explicitGroupAllowFrom : dmAllowFrom;
          if (effectiveAllowFrom.length > 0) {
            return [
              buildOpenGroupPolicyRestrictSendersWarning({
                surface: "QQ groups",
                openScope: "any member",
                groupPolicyPath: "channels.napcat.groupPolicy",
                groupAllowFromPath: "channels.napcat.groupAllowFrom",
              }),
            ];
          }
          return [
            buildOpenGroupPolicyWarning({
              surface: "QQ groups",
              openBehavior:
                "with no groupAllowFrom/allowFrom allowlist; any member can trigger (mention-gated)",
              remediation:
                'Set channels.napcat.groupPolicy="allowlist" + channels.napcat.groupAllowFrom',
            }),
          ];
        },
      });
    },
  },
  groups: {
    resolveRequireMention: () => true,
  },
  threading: {
    resolveReplyToMode: () => "off",
  },
  messaging: {
    normalizeTarget: normalizeNapCatMessagingTarget,
    targetResolver: {
      looksLikeId: isNumericTargetId,
      hint: "<qqNumber> or group:<groupId>",
    },
  },
  directory: {
    self: async () => null,
    listPeers: async ({ cfg, accountId, query, limit }) => {
      const account = resolveNapCatAccount({ cfg, accountId });
      return listDirectoryUserEntriesFromAllowFrom({
        allowFrom: account.config.allowFrom,
        query,
        limit,
        normalizeId: (entry) => entry.replace(/^(napcat|qq|onebot):/i, ""),
      });
    },
    listGroups: async () => [],
  },
  setup: {
    resolveAccountId: ({ accountId }) => normalizeAccountId(accountId),
    applyAccountName: ({ cfg, accountId, name }) =>
      applyAccountNameToChannelSection({
        cfg,
        channelKey: "napcat",
        accountId,
        name,
      }),
    validateInput: ({ input }) => {
      if (!input.token && !input.useEnv) {
        return "NapCat requires httpApi URL. Set channels.napcat.httpApi in config.";
      }
      return null;
    },
    applyAccountConfig: ({ cfg, accountId, input }) => {
      const namedConfig = applyAccountNameToChannelSection({
        cfg,
        channelKey: "napcat",
        accountId,
        name: input.name,
      });
      const next =
        accountId !== DEFAULT_ACCOUNT_ID
          ? migrateBaseNameToDefaultAccount({ cfg: namedConfig, channelKey: "napcat" })
          : namedConfig;
      const patch = input.token ? { httpApi: input.token } : {};
      return applySetupAccountConfigPatch({
        cfg: next,
        channelKey: "napcat",
        accountId,
        patch,
      });
    },
  },
  pairing: {
    idLabel: "qqNumber",
    normalizeAllowEntry: (entry) => entry.replace(/^(napcat|qq|onebot):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveNapCatAccount({ cfg });
      if (!account.httpApi) {
        throw new Error("NapCat httpApi not configured");
      }
      await sendPrivateMsg(
        account.httpApi,
        Number(id),
        [textSegment(PAIRING_APPROVED_MESSAGE)],
        account.accessToken,
      );
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: chunkTextForOutbound,
    chunkerMode: "text",
    textChunkLimit: 4500,
    sendPayload: async (ctx) =>
      await sendPayloadWithChunkedTextAndMedia({
        ctx,
        textChunkLimit: napCatPlugin.outbound!.textChunkLimit,
        chunker: napCatPlugin.outbound!.chunker,
        sendText: (nextCtx) => napCatPlugin.outbound!.sendText!(nextCtx),
        sendMedia: (nextCtx) => napCatPlugin.outbound!.sendMedia!(nextCtx),
        emptyResult: { channel: "napcat", messageId: "" },
      }),
    sendText: async ({ to, text, accountId, cfg }) => {
      const result = await sendMessageNapCat(to, text, { accountId, cfg });
      return buildChannelSendResult("napcat", result);
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const result = await sendMessageNapCat(to, text, { accountId, cfg, mediaUrl });
      return buildChannelSendResult("napcat", result);
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    collectStatusIssues: () => [],
    buildChannelSummary: ({ snapshot }) => buildTokenChannelStatusSummary(snapshot),
    probeAccount: async ({ account, timeoutMs }) =>
      probeNapCat(account.httpApi, account.accessToken, timeoutMs),
    buildAccountSnapshot: ({ account, runtime }) => {
      const configured = Boolean(account.httpApi?.trim());
      const base = buildBaseAccountStatusSnapshot({
        account: {
          accountId: account.accountId,
          name: account.name,
          enabled: account.enabled,
          configured,
        },
        runtime,
      });
      return {
        ...base,
        mode: "reverse-ws",
        dmPolicy: account.config.dmPolicy ?? "allowlist",
      };
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      const httpApi = account.httpApi.trim();

      let botLabel = "";
      try {
        const probe = await probeNapCat(httpApi, account.accessToken, 3000);
        const name = probe.ok ? probe.bot?.nickname?.trim() : null;
        if (name) botLabel = ` (${name}, QQ:${probe.bot?.user_id})`;
        if (!probe.ok) {
          ctx.log?.warn?.(
            `[${account.accountId}] NapCat probe failed: ${probe.error}`,
          );
        }
        ctx.setStatus({
          accountId: account.accountId,
          bot: probe.bot,
        });
      } catch (err) {
        ctx.log?.warn?.(
          `[${account.accountId}] NapCat probe threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const statusSink = createAccountStatusSink({
        accountId: ctx.accountId,
        setStatus: ctx.setStatus,
      });

      // Determine WS port for reverse connection.
      // Use gateway port + 100 + account index offset to avoid conflicts.
      const wsPort = 18800 + listNapCatAccountIds(ctx.cfg).indexOf(account.accountId);

      ctx.log?.info(`[${account.accountId}] starting NapCat provider${botLabel} mode=reverse-ws wsPort=${wsPort}`);

      const { monitorNapCatProvider } = await import("./monitor.js");
      return monitorNapCatProvider({
        account,
        config: ctx.cfg,
        runtime: {
          log: (msg) => ctx.log?.info(msg),
          error: (msg) => ctx.log?.error?.(msg),
        },
        abortSignal: ctx.abortSignal,
        wsPort,
        statusSink,
      });
    },
  },
};

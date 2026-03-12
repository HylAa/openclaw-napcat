import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import type { OpenClawConfig } from "openclaw/plugin-sdk";
import {
  createTypingCallbacks,
  createScopedPairingAccess,
  createReplyPrefixOptions,
  issuePairingChallenge,
  resolveDirectDmAuthorizationOutcome,
  resolveSenderCommandAuthorizationWithRuntime,
  resolveOutboundMediaUrls,
  resolveDefaultGroupPolicy,
  resolveInboundRouteEnvelopeBuilderWithRuntime,
  waitUntilAbort,
} from "openclaw/plugin-sdk";
import type { ResolvedNapCatAccount } from "./types.js";
import type { OneBotMessageEvent, OneBotSegment } from "./types.js";
import { sendGroupMsg, sendPrivateMsg, textSegment, replySegment } from "./api.js";
import { getNapCatRuntime } from "./runtime.js";

export type NapCatRuntimeEnv = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type NapCatMonitorOptions = {
  account: ResolvedNapCatAccount;
  config: OpenClawConfig;
  runtime: NapCatRuntimeEnv;
  abortSignal: AbortSignal;
  /** Port for the reverse WS server that NapCat connects to. */
  wsPort: number;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};

type NapCatCoreRuntime = ReturnType<typeof getNapCatRuntime>;

const QQ_TEXT_LIMIT = 4500;

/** Extract plain text from OneBot message segments, converting @mentions to readable form. */
function extractText(segments: OneBotSegment[]): string {
  return segments
    .map((s) => {
      if (s.type === "text") return s.data.text ?? "";
      if (s.type === "at") return `@${s.data.qq}`;
      return "";
    })
    .join("")
    .trim();
}

/** Extract image URLs from OneBot message segments. */
function extractImageUrls(segments: OneBotSegment[]): string[] {
  return segments
    .filter((s) => s.type === "image")
    .map((s) => s.data.url ?? s.data.file ?? "")
    .filter(Boolean);
}

/** Extract voice/record URL from OneBot message segments. */
function extractRecordUrl(segments: OneBotSegment[]): string | undefined {
  const record = segments.find((s) => s.type === "record");
  if (!record) return undefined;
  return record.data.url ?? record.data.file ?? undefined;
}

/** Download a URL and convert to wav using ffmpeg. Returns the wav file path. */
async function downloadAndConvertToWav(
  url: string,
  fetcher: (params: { url: string; maxBytes: number }) => Promise<{ buffer: Buffer; contentType: string }>,
  maxBytes: number,
): Promise<string | undefined> {
  const fetched = await fetcher({ url, maxBytes });
  const ts = Date.now();
  const inputPath = join(tmpdir(), `napcat-voice-${ts}.silk`);
  const outputPath = join(tmpdir(), `napcat-voice-${ts}.wav`);

  await writeFile(inputPath, fetched.buffer);

  return new Promise<string | undefined>((resolve) => {
    execFile(
      "ffmpeg",
      ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", outputPath],
      { timeout: 15_000 },
      async (err) => {
        // Clean up input file
        await unlink(inputPath).catch(() => {});
        if (err) {
          await unlink(outputPath).catch(() => {});
          resolve(undefined);
        } else {
          resolve(outputPath);
        }
      },
    );
  });
}

/** Check if the message contains an @bot mention. */
function hasBotMention(segments: OneBotSegment[], selfId: string): boolean {
  return segments.some(
    (s) => s.type === "at" && s.data.qq === selfId,
  );
}

/** Strip @bot mention segments and leading whitespace from text. */
function stripBotMention(segments: OneBotSegment[], selfId: string): OneBotSegment[] {
  return segments.filter(
    (s) => !(s.type === "at" && s.data.qq === selfId),
  );
}

/** Determine if sender is allowed based on allowlist. */
function isNapCatSenderAllowed(
  senderId: string,
  allowFrom: Array<string | number>,
): boolean {
  return allowFrom.some((entry) => String(entry) === senderId);
}

/**
 * Start a reverse WebSocket server for NapCat to connect to.
 * NapCat will initiate the connection to this server.
 */
export async function monitorNapCatProvider(options: NapCatMonitorOptions): Promise<void> {
  const { account, config, runtime, abortSignal, wsPort, statusSink } = options;
  const core = getNapCatRuntime();

  runtime.log?.(`[${account.accountId}] NapCat starting reverse WS server on port ${wsPort}`);

  const server = createServer();
  const wss = new WebSocketServer({ server });

  let activeWs: WebSocket | null = null;

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const selfId = req.headers["x-self-id"];
    runtime.log?.(`[${account.accountId}] NapCat connected, self_id=${selfId ?? "unknown"}`);
    activeWs = ws;

    ws.on("message", (raw: Buffer) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        runtime.error?.(`[${account.accountId}] NapCat: invalid JSON from WS`);
        return;
      }

      // Ignore meta events (heartbeat, lifecycle)
      if (data.post_type === "meta_event") return;

      // Only handle message events
      if (data.post_type !== "message") return;

      const event = data as unknown as OneBotMessageEvent;
      processMessage(event, account, config, runtime, core, statusSink).catch((err) => {
        runtime.error?.(`[${account.accountId}] NapCat message processing error: ${String(err)}`);
      });
    });

    ws.on("close", () => {
      runtime.log?.(`[${account.accountId}] NapCat WS disconnected`);
      if (activeWs === ws) activeWs = null;
    });

    ws.on("error", (err) => {
      runtime.error?.(`[${account.accountId}] NapCat WS error: ${String(err)}`);
    });
  });

  return new Promise<void>((resolve, reject) => {
    server.listen(wsPort, "0.0.0.0", () => {
      runtime.log?.(`[${account.accountId}] NapCat reverse WS server listening on ws://0.0.0.0:${wsPort}`);
    });

    server.on("error", (err) => {
      runtime.error?.(`[${account.accountId}] NapCat WS server error: ${String(err)}`);
      reject(err);
    });

    // Cleanup on abort
    const onAbort = () => {
      runtime.log?.(`[${account.accountId}] NapCat stopping WS server`);
      wss.clients.forEach((client) => client.close());
      wss.close();
      server.close();
      resolve();
    };

    if (abortSignal.aborted) {
      onAbort();
      return;
    }
    abortSignal.addEventListener("abort", onAbort, { once: true });
  });
}

async function processMessage(
  event: OneBotMessageEvent,
  account: ResolvedNapCatAccount,
  config: OpenClawConfig,
  runtime: NapCatRuntimeEnv,
  core: NapCatCoreRuntime,
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void,
): Promise<void> {
  const isGroup = event.message_type === "group";
  const senderId = String(event.user_id);
  const senderName = event.sender.card || event.sender.nickname;
  const chatId = isGroup ? String(event.group_id) : senderId;
  const selfId = account.selfId || String(event.self_id);

  // In group chats, require @bot mention
  if (isGroup && !hasBotMention(event.message, selfId)) {
    return;
  }

  // Strip @bot mention from message for processing
  const cleanSegments = isGroup
    ? stripBotMention(event.message, selfId)
    : event.message;

  const text = extractText(cleanSegments);
  const imageUrls = extractImageUrls(cleanSegments);
  const recordUrl = extractRecordUrl(cleanSegments);

  // Skip empty messages
  if (!text && imageUrls.length === 0 && !recordUrl) return;

  // Will be set if voice STT succeeds.
  let voiceTranscript: string | undefined;

  statusSink?.({ lastInboundAt: Date.now() });

  // Download first image if present
  let mediaPath: string | undefined;
  let mediaType: string | undefined;
  if (imageUrls.length > 0) {
    try {
      const mediaMaxMb = account.config.mediaMaxMb ?? 5;
      const maxBytes = mediaMaxMb * 1024 * 1024;
      const fetched = await core.channel.media.fetchRemoteMedia({
        url: imageUrls[0],
        maxBytes,
      });
      const saved = await core.channel.media.saveMediaBuffer(
        fetched.buffer,
        fetched.contentType,
        "inbound",
        maxBytes,
      );
      mediaPath = saved.path;
      mediaType = saved.contentType;
    } catch (err) {
      runtime.error?.(`[${account.accountId}] Failed to download QQ image: ${String(err)}`);
    }
  } else if (recordUrl) {
    // Voice message: download → ffmpeg wav → STT transcribe → text
    try {
      const mediaMaxMb = account.config.mediaMaxMb ?? 5;
      const maxBytes = mediaMaxMb * 1024 * 1024;
      const wavPath = await downloadAndConvertToWav(
        recordUrl,
        core.channel.media.fetchRemoteMedia,
        maxBytes,
      );
      if (wavPath) {
        try {
          const result = await core.stt.transcribeAudioFile({
            filePath: wavPath,
            cfg: config,
            mime: "audio/wav",
          });
          if (result.text) {
            // Transcription succeeded — use text instead of raw audio.
            voiceTranscript = result.text;
            await unlink(wavPath).catch(() => {});
            runtime.log?.(`[${account.accountId}] Voice transcribed: ${result.text.slice(0, 80)}`);
          } else {
            // STT returned empty; fall back to passing audio file.
            mediaPath = wavPath;
            mediaType = "audio/wav";
          }
        } catch (sttErr) {
          runtime.error?.(`[${account.accountId}] STT failed, falling back to audio: ${String(sttErr)}`);
          mediaPath = wavPath;
          mediaType = "audio/wav";
        }
      } else {
        runtime.error?.(`[${account.accountId}] ffmpeg voice conversion failed`);
      }
    } catch (err) {
      runtime.error?.(`[${account.accountId}] Failed to process QQ voice: ${String(err)}`);
    }
  }

  // Authorization pipeline
  const pairing = createScopedPairingAccess({
    core,
    channel: "napcat",
    accountId: account.accountId,
  });

  const dmPolicy = account.config.dmPolicy ?? "allowlist";
  const configAllowFrom = (account.config.allowFrom ?? []).map((v) => String(v));
  const configuredGroupAllowFrom = (account.config.groupAllowFrom ?? []).map((v) => String(v));
  const groupAllowFrom =
    configuredGroupAllowFrom.length > 0 ? configuredGroupAllowFrom : configAllowFrom;

  // Group access control
  if (isGroup) {
    const groupPolicy = account.config.groupPolicy ?? resolveDefaultGroupPolicy(config);
    if (groupPolicy === "disabled") {
      return;
    }
    if (groupPolicy === "allowlist") {
      if (!isNapCatSenderAllowed(senderId, groupAllowFrom)) {
        return;
      }
    }
  }

  // Merge voice transcript into message body when available.
  const effectiveText = voiceTranscript
    ? (text ? `${text}\n[语音转文字] ${voiceTranscript}` : `[语音转文字] ${voiceTranscript}`)
    : text;
  const rawBody = effectiveText || (mediaPath ? "<media:image>" : "");
  const { senderAllowedForCommands, commandAuthorized } =
    await resolveSenderCommandAuthorizationWithRuntime({
      cfg: config,
      rawBody,
      isGroup,
      dmPolicy,
      configuredAllowFrom: configAllowFrom,
      configuredGroupAllowFrom: groupAllowFrom,
      senderId,
      isSenderAllowed: isNapCatSenderAllowed,
      readAllowFromStore: pairing.readAllowFromStore,
      runtime: core.channel.commands,
    });

  // DM authorization
  const directDmOutcome = resolveDirectDmAuthorizationOutcome({
    isGroup,
    dmPolicy,
    senderAllowedForCommands,
  });
  if (directDmOutcome === "disabled") return;
  if (directDmOutcome === "unauthorized") {
    if (dmPolicy === "pairing") {
      await issuePairingChallenge({
        channel: "napcat",
        senderId,
        senderIdLine: `Your QQ number: ${senderId}`,
        meta: { name: senderName ?? undefined },
        upsertPairingRequest: pairing.upsertPairingRequest,
        onCreated: () => {
          runtime.log?.(`[${account.accountId}] napcat pairing request sender=${senderId}`);
        },
        sendPairingReply: async (replyText) => {
          try {
            await sendPrivateMsg(
              account.httpApi,
              Number(senderId),
              [textSegment(replyText)],
              account.accessToken,
            );
            statusSink?.({ lastOutboundAt: Date.now() });
          } catch (err) {
            runtime.error?.(`[${account.accountId}] pairing reply failed: ${String(err)}`);
          }
        },
        onReplyError: (err) => {
          runtime.error?.(`[${account.accountId}] pairing reply error: ${String(err)}`);
        },
      });
    }
    return;
  }

  // Route resolution — group sessions are per-user so each sender has isolated context.
  const fromLabel = isGroup ? `group:${chatId}` : senderName || `user:${senderId}`;
  const { route, buildEnvelope } = resolveInboundRouteEnvelopeBuilderWithRuntime({
    cfg: config,
    channel: "napcat",
    accountId: account.accountId,
    peer: {
      kind: isGroup ? "group" : "direct",
      id: isGroup ? `${chatId}:${senderId}` : chatId,
    },
    runtime: core.channel,
    sessionStore: config.session?.store,
  });

  // Block unauthorized control commands in groups
  if (
    isGroup &&
    core.channel.commands.isControlCommandMessage(rawBody, config) &&
    commandAuthorized !== true
  ) {
    return;
  }

  const { storePath, body } = buildEnvelope({
    channel: "QQ",
    from: fromLabel,
    timestamp: event.time ? event.time * 1000 : undefined,
    body: rawBody,
  });

  const targetPrefix = isGroup ? `napcat:group:${chatId}` : `napcat:${senderId}`;
  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    BodyForAgent: rawBody,
    RawBody: rawBody,
    CommandBody: rawBody,
    From: targetPrefix,
    To: isGroup ? `napcat:group:${chatId}` : `napcat:${chatId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: fromLabel,
    SenderName: senderName || undefined,
    SenderId: senderId,
    CommandAuthorized: commandAuthorized,
    Provider: "napcat",
    Surface: "napcat",
    MessageSid: String(event.message_id),
    MediaPath: mediaPath,
    MediaType: mediaType,
    MediaUrl: mediaPath,
    OriginatingChannel: "napcat",
    OriginatingTo: isGroup ? `napcat:group:${chatId}` : `napcat:${chatId}`,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => {
      runtime.error?.(`napcat: failed updating session meta: ${String(err)}`);
    },
  });

  const tableMode = core.channel.text.resolveMarkdownTableMode({
    cfg: config,
    channel: "napcat",
    accountId: account.accountId,
  });

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg: config,
    agentId: route.agentId,
    channel: "napcat",
    accountId: account.accountId,
  });

  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      // QQ doesn't have a "typing" indicator via OneBot, no-op
    },
    onStartError: () => {},
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config,
    dispatcherOptions: {
      ...prefixOptions,
      typingCallbacks,
      deliver: async (payload) => {
        await deliverNapCatReply({
          payload,
          account,
          chatId,
          isGroup,
          runtime,
          core,
          config,
          statusSink,
          tableMode,
          replyToMessageId: event.message_id,
        });
      },
      onError: (err, info) => {
        runtime.error?.(`[${account.accountId}] NapCat ${info.kind} reply failed: ${String(err)}`);
      },
    },
    replyOptions: {
      onModelSelected,
    },
  });
}

async function deliverNapCatReply(params: {
  payload: { text?: string; mediaUrls?: string[] };
  account: ResolvedNapCatAccount;
  chatId: string;
  isGroup: boolean;
  runtime: NapCatRuntimeEnv;
  core: NapCatCoreRuntime;
  config: OpenClawConfig;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  tableMode?: string;
  /** Original message ID to quote-reply in group chats. */
  replyToMessageId?: number;
}): Promise<void> {
  const { payload, account, chatId, isGroup, runtime, core, config, statusSink } = params;
  const tableMode = params.tableMode ?? "code";
  const text = core.channel.text.convertMarkdownTables(payload.text ?? "", tableMode);
  const mediaUrls = resolveOutboundMediaUrls(payload);

  // In group chats, prepend a reply segment to quote the original message.
  const replyPrefix: OneBotSegment[] =
    isGroup && params.replyToMessageId
      ? [replySegment(params.replyToMessageId)]
      : [];

  const mediaSegments: OneBotSegment[] = [];
  for (const url of mediaUrls) {
    mediaSegments.push({ type: "image", data: { file: url } });
  }

  // Add text (chunked if needed)
  if (text) {
    const chunkMode = core.channel.text.resolveChunkMode(config, "napcat", account.accountId);
    const chunks = core.channel.text.chunkMarkdownTextWithMode(text, QQ_TEXT_LIMIT, chunkMode);
    for (let i = 0; i < chunks.length; i++) {
      // First chunk gets reply-quote + images; subsequent chunks are plain text.
      const toSend =
        i === 0
          ? [...replyPrefix, ...mediaSegments, textSegment(chunks[i])]
          : [textSegment(chunks[i])];

      try {
        if (isGroup) {
          await sendGroupMsg(account.httpApi, Number(chatId), toSend, account.accessToken);
        } else {
          await sendPrivateMsg(account.httpApi, Number(chatId), toSend, account.accessToken);
        }
        statusSink?.({ lastOutboundAt: Date.now() });
      } catch (err) {
        runtime.error?.(`NapCat message send failed: ${String(err)}`);
      }
    }
  } else if (mediaSegments.length > 0) {
    // Media only, no text — still quote the original message.
    const toSend = [...replyPrefix, ...mediaSegments];
    try {
      if (isGroup) {
        await sendGroupMsg(account.httpApi, Number(chatId), toSend, account.accessToken);
      } else {
        await sendPrivateMsg(account.httpApi, Number(chatId), toSend, account.accessToken);
      }
      statusSink?.({ lastOutboundAt: Date.now() });
    } catch (err) {
      runtime.error?.(`NapCat media send failed: ${String(err)}`);
    }
  }
}

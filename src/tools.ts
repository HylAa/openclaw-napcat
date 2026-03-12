import type { ChannelAgentTool } from "openclaw/plugin-sdk";
import { callOneBotApi } from "./api.js";
import { resolveNapCatAccount } from "./accounts.js";
import type { OpenClawConfig } from "openclaw/plugin-sdk";

// ---------------------------------------------------------------------------
// Helpers — plain JSON Schema objects (no typebox to avoid jiti dual-instance)
// ---------------------------------------------------------------------------

function resolveHttpApi(cfg: OpenClawConfig): { httpApi: string; accessToken?: string } {
  const account = resolveNapCatAccount({ cfg });
  return { httpApi: account.httpApi, accessToken: account.accessToken };
}

function numberProp(description: string, extra?: Record<string, unknown>) {
  return { type: "number" as const, description, ...extra };
}

function optionalNumberProp(description: string, extra?: Record<string, unknown>) {
  return { type: "number" as const, description, ...extra };
}

function stringProp(description: string) {
  return { type: "string" as const, description };
}

function booleanProp(description: string) {
  return { type: "boolean" as const, description };
}

function objectSchema(
  properties: Record<string, unknown>,
  required: string[],
) {
  return { type: "object" as const, properties, required };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/** Give a QQ user a "like" (thumbs-up). */
export function createQQLikeTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Like User",
    name: "qq_like_user",
    ownerOnly: false,
    description:
      "Give a QQ user a thumbs-up (like/praise). Provide the target QQ number and how many times to like (1-10). When a user @mentions someone, extract the QQ number from @QQNumber in the message.",
    parameters: objectSchema(
      {
        user_id: numberProp("Target QQ number"),
        times: optionalNumberProp("Number of likes, 1-10, default 10", { minimum: 1, maximum: 10 }),
      },
      ["user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { user_id, times = 10 } = args as { user_id: number; times?: number };
      await callOneBotApi(httpApi, "send_like", { user_id, times }, { accessToken });
      return {
        content: [{ type: "text" as const, text: `Successfully liked user ${user_id} ${times} time(s).` }],
      };
    },
  };
}

/** Get a QQ user's profile info (stranger info). */
export function createQQGetUserInfoTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get User Info",
    name: "qq_get_user_info",
    ownerOnly: false,
    description:
      "Get a QQ user's profile information including nickname, age, sex, signature, level, etc. Useful for analyzing a person's profile. When a user @mentions someone, extract the QQ number from @QQNumber in the message.",
    parameters: objectSchema(
      { user_id: numberProp("Target QQ number") },
      ["user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { user_id } = args as { user_id: number };
      const resp = await callOneBotApi<Record<string, unknown>>(
        httpApi,
        "get_stranger_info",
        { user_id, no_cache: true },
        { accessToken },
      );
      const info = resp.data;
      const lines = [
        `QQ: ${info.user_id}`,
        `Nickname: ${info.nickname ?? "unknown"}`,
        info.sex ? `Sex: ${info.sex}` : null,
        info.age ? `Age: ${info.age}` : null,
        info.sign ? `Signature: ${info.sign}` : null,
        info.level ? `Level: ${info.level}` : null,
        info.login_days ? `Login days: ${info.login_days}` : null,
        info.qid ? `QID: ${info.qid}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [{ type: "text" as const, text: lines }] };
    },
  };
}

/** Get group info. */
export function createQQGetGroupInfoTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Group Info",
    name: "qq_get_group_info",
    ownerOnly: false,
    description: "Get QQ group information including name, member count, etc.",
    parameters: objectSchema(
      { group_id: numberProp("Target group number") },
      ["group_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id } = args as { group_id: number };
      const resp = await callOneBotApi<Record<string, unknown>>(
        httpApi,
        "get_group_info",
        { group_id, no_cache: true },
        { accessToken },
      );
      const g = resp.data;
      const lines = [
        `Group: ${g.group_id}`,
        `Name: ${g.group_name ?? "unknown"}`,
        g.member_count ? `Members: ${g.member_count}` : null,
        g.max_member_count ? `Max members: ${g.max_member_count}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [{ type: "text" as const, text: lines }] };
    },
  };
}

/** Get group member info. */
export function createQQGetGroupMemberInfoTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Group Member Info",
    name: "qq_get_group_member_info",
    ownerOnly: false,
    description:
      "Get a specific member's info within a QQ group, including card name, role, join time, last active time, title, etc. When a user @mentions someone, extract the QQ number from @QQNumber in the message.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        user_id: numberProp("Target QQ number"),
      },
      ["group_id", "user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, user_id } = args as { group_id: number; user_id: number };
      const resp = await callOneBotApi<Record<string, unknown>>(
        httpApi,
        "get_group_member_info",
        { group_id, user_id, no_cache: true },
        { accessToken },
      );
      const m = resp.data;
      const lines = [
        `QQ: ${m.user_id}`,
        `Nickname: ${m.nickname ?? "unknown"}`,
        m.card ? `Card: ${m.card}` : null,
        m.role ? `Role: ${m.role}` : null,
        m.title ? `Title: ${m.title}` : null,
        m.join_time ? `Joined: ${new Date((m.join_time as number) * 1000).toISOString()}` : null,
        m.last_sent_time
          ? `Last active: ${new Date((m.last_sent_time as number) * 1000).toISOString()}`
          : null,
        m.level ? `Level: ${m.level}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [{ type: "text" as const, text: lines }] };
    },
  };
}

/** Mute a group member. */
export function createQQMuteGroupMemberTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Mute Group Member",
    name: "qq_mute_group_member",
    ownerOnly: true,
    description:
      "Mute (ban) a member in a QQ group for a specified duration. Set duration to 0 to unmute. The user_id can come from an @QQNumber mention in the conversation.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        user_id: numberProp("Target QQ number to mute"),
        duration: optionalNumberProp("Mute duration in seconds (0 = unmute, default 600)", { minimum: 0 }),
      },
      ["group_id", "user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, user_id, duration = 600 } = args as {
        group_id: number;
        user_id: number;
        duration?: number;
      };
      await callOneBotApi(
        httpApi,
        "set_group_ban",
        { group_id, user_id, duration },
        { accessToken },
      );
      const action = duration === 0 ? "unmuted" : `muted for ${duration}s`;
      return {
        content: [{ type: "text" as const, text: `User ${user_id} has been ${action} in group ${group_id}.` }],
      };
    },
  };
}

/** Kick a member from a group. */
export function createQQKickGroupMemberTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Kick Group Member",
    name: "qq_kick_group_member",
    ownerOnly: true,
    description: "Remove (kick) a member from a QQ group. The user_id can come from an @QQNumber mention in the conversation.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        user_id: numberProp("Target QQ number to kick"),
        reject_add_request: booleanProp("Whether to reject future join requests from this user"),
      },
      ["group_id", "user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, user_id, reject_add_request = false } = args as {
        group_id: number;
        user_id: number;
        reject_add_request?: boolean;
      };
      await callOneBotApi(
        httpApi,
        "set_group_kick",
        { group_id, user_id, reject_add_request },
        { accessToken },
      );
      return {
        content: [{ type: "text" as const, text: `User ${user_id} has been kicked from group ${group_id}.` }],
      };
    },
  };
}

/** Send a poke/nudge to a user. */
export function createQQPokeTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Poke",
    name: "qq_poke",
    ownerOnly: false,
    description: "Send a poke (nudge) to a QQ user in a group or private chat. The user_id can come from an @QQNumber mention in the conversation.",
    parameters: objectSchema(
      {
        user_id: numberProp("Target QQ number to poke"),
        group_id: optionalNumberProp("Group number (omit for private poke)"),
      },
      ["user_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { user_id, group_id } = args as { user_id: number; group_id?: number };
      if (group_id) {
        await callOneBotApi(httpApi, "group_poke", { group_id, user_id }, { accessToken });
      } else {
        await callOneBotApi(httpApi, "friend_poke", { user_id }, { accessToken });
      }
      return {
        content: [{ type: "text" as const, text: `Poked user ${user_id}${group_id ? ` in group ${group_id}` : ""}.` }],
      };
    },
  };
}

/** Recall (delete) a sent message. */
export function createQQRecallMessageTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Recall Message",
    name: "qq_recall_message",
    ownerOnly: true,
    description: "Recall (unsend/delete) a message by its message ID.",
    parameters: objectSchema(
      { message_id: numberProp("Message ID to recall") },
      ["message_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { message_id } = args as { message_id: number };
      await callOneBotApi(httpApi, "delete_msg", { message_id }, { accessToken });
      return {
        content: [{ type: "text" as const, text: `Message ${message_id} has been recalled.` }],
      };
    },
  };
}

/** Set group member card (nickname in group). */
export function createQQSetGroupCardTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Set Group Card",
    name: "qq_set_group_card",
    ownerOnly: true,
    description: "Set a member's card (display name) in a QQ group. The user_id can come from an @QQNumber mention in the conversation.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        user_id: numberProp("Target QQ number"),
        card: stringProp("New card name (empty string to clear)"),
      },
      ["group_id", "user_id", "card"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, user_id, card } = args as { group_id: number; user_id: number; card: string };
      await callOneBotApi(
        httpApi,
        "set_group_card",
        { group_id, user_id, card },
        { accessToken },
      );
      return {
        content: [
          { type: "text" as const, text: `Set user ${user_id}'s card to "${card}" in group ${group_id}.` },
        ],
      };
    },
  };
}

/** Get bot's friend list. */
export function createQQGetFriendListTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Friend List",
    name: "qq_get_friend_list",
    ownerOnly: false,
    description:
      "Get the bot's full friend list. Returns each friend's QQ number, nickname, and remark. When a user mentions someone by @QQNumber, you can use this to find matching friends.",
    parameters: objectSchema({}, []),
    execute: async (_toolCallId, _args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const resp = await callOneBotApi<Array<Record<string, unknown>>>(
        httpApi,
        "get_friend_list",
        {},
        { accessToken },
      );
      const friends = resp.data;
      const lines = friends.map(
        (f) => `${f.user_id} | ${f.nickname ?? ""}${f.remark ? ` (${f.remark})` : ""}`,
      );
      return {
        content: [{ type: "text" as const, text: `Friends (${friends.length}):\n${lines.join("\n")}` }],
      };
    },
  };
}

/** Get bot's group list. */
export function createQQGetGroupListTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Group List",
    name: "qq_get_group_list",
    ownerOnly: false,
    description:
      "Get the bot's full group list. Returns each group's ID, name, and member count.",
    parameters: objectSchema({}, []),
    execute: async (_toolCallId, _args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const resp = await callOneBotApi<Array<Record<string, unknown>>>(
        httpApi,
        "get_group_list",
        {},
        { accessToken },
      );
      const groups = resp.data;
      const lines = groups.map(
        (g) => `${g.group_id} | ${g.group_name ?? "unknown"} | ${g.member_count ?? "?"} members`,
      );
      return {
        content: [{ type: "text" as const, text: `Groups (${groups.length}):\n${lines.join("\n")}` }],
      };
    },
  };
}

/** Get all members of a group. */
export function createQQGetGroupMemberListTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Group Member List",
    name: "qq_get_group_member_list",
    ownerOnly: false,
    description:
      "Get the full member list of a QQ group. Returns each member's QQ number, nickname, card, and role. Useful for resolving @QQNumber mentions to real names.",
    parameters: objectSchema(
      { group_id: numberProp("Group number") },
      ["group_id"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id } = args as { group_id: number };
      const resp = await callOneBotApi<Array<Record<string, unknown>>>(
        httpApi,
        "get_group_member_list",
        { group_id },
        { accessToken },
      );
      const members = resp.data;
      const lines = members.map(
        (m) =>
          `${m.user_id} | ${m.card || m.nickname || "unknown"} | ${m.role ?? "member"}`,
      );
      return {
        content: [
          { type: "text" as const, text: `Group ${group_id} members (${members.length}):\n${lines.join("\n")}` },
        ],
      };
    },
  };
}

/** Set/unset group admin. */
export function createQQSetGroupAdminTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Set Group Admin",
    name: "qq_set_group_admin",
    ownerOnly: true,
    description:
      "Set or unset a member as group admin in a QQ group. The user_id can come from an @QQNumber mention in the conversation.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        user_id: numberProp("Target QQ number"),
        enable: booleanProp("true = set as admin, false = remove admin"),
      },
      ["group_id", "user_id", "enable"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, user_id, enable } = args as {
        group_id: number;
        user_id: number;
        enable: boolean;
      };
      await callOneBotApi(
        httpApi,
        "set_group_admin",
        { group_id, user_id, enable },
        { accessToken },
      );
      const action = enable ? "promoted to admin" : "removed from admin";
      return {
        content: [{ type: "text" as const, text: `User ${user_id} has been ${action} in group ${group_id}.` }],
      };
    },
  };
}

/** Change group name. */
export function createQQSetGroupNameTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Set Group Name",
    name: "qq_set_group_name",
    ownerOnly: true,
    description: "Change the name of a QQ group.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        group_name: stringProp("New group name"),
      },
      ["group_id", "group_name"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, group_name } = args as { group_id: number; group_name: string };
      await callOneBotApi(
        httpApi,
        "set_group_name",
        { group_id, group_name },
        { accessToken },
      );
      return {
        content: [{ type: "text" as const, text: `Group ${group_id} name changed to "${group_name}".` }],
      };
    },
  };
}

/** Toggle whole-group mute. */
export function createQQSetGroupWholeBanTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Set Group Whole Ban",
    name: "qq_set_group_whole_ban",
    ownerOnly: true,
    description: "Enable or disable whole-group mute (all members muted). Only admins/owners can speak when enabled.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        enable: booleanProp("true = mute all, false = unmute all"),
      },
      ["group_id", "enable"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, enable } = args as { group_id: number; enable: boolean };
      await callOneBotApi(
        httpApi,
        "set_group_whole_ban",
        { group_id, enable },
        { accessToken },
      );
      const action = enable ? "enabled" : "disabled";
      return {
        content: [{ type: "text" as const, text: `Whole-group mute ${action} for group ${group_id}.` }],
      };
    },
  };
}

/** Send a group announcement/notice. */
export function createQQSendGroupNoticeTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Send Group Notice",
    name: "qq_send_group_notice",
    ownerOnly: true,
    description: "Send a group announcement/notice in a QQ group. Requires admin or owner permission.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        content: stringProp("Announcement content text"),
      },
      ["group_id", "content"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, content } = args as { group_id: number; content: string };
      await callOneBotApi(
        httpApi,
        "_send_group_notice",
        { group_id, content },
        { accessToken },
      );
      return {
        content: [{ type: "text" as const, text: `Group notice sent to group ${group_id}.` }],
      };
    },
  };
}

/** Get group honor/achievements info. */
export function createQQGetGroupHonorInfoTool(cfg: OpenClawConfig): ChannelAgentTool {
  return {
    label: "QQ Get Group Honor Info",
    name: "qq_get_group_honor_info",
    ownerOnly: false,
    description:
      "Get group honor/achievement info (talkative, performer, legend, strong newbie, emotion). Use type='all' for everything.",
    parameters: objectSchema(
      {
        group_id: numberProp("Group number"),
        type: stringProp("Honor type: talkative, performer, legend, strong_newbie, emotion, or all"),
      },
      ["group_id", "type"],
    ),
    execute: async (_toolCallId, args) => {
      const { httpApi, accessToken } = resolveHttpApi(cfg);
      const { group_id, type } = args as { group_id: number; type: string };
      const resp = await callOneBotApi<Record<string, unknown>>(
        httpApi,
        "get_group_honor_info",
        { group_id, type },
        { accessToken },
      );
      const data = resp.data;
      const sections: string[] = [`Group ${group_id} Honor Info:`];
      // Current talkative
      if (data.current_talkative) {
        const t = data.current_talkative as Record<string, unknown>;
        sections.push(`Dragon King: ${t.nickname ?? t.user_id} (${t.day_count} days)`);
      }
      // List-type honors
      for (const key of ["talkative_list", "performer_list", "legend_list", "strong_newbie_list", "emotion_list"]) {
        const list = data[key] as Array<Record<string, unknown>> | undefined;
        if (list && list.length > 0) {
          const label = key.replace(/_list$/, "").replace(/_/g, " ");
          sections.push(`\n${label}:`);
          for (const entry of list.slice(0, 10)) {
            sections.push(`  ${entry.nickname ?? entry.user_id} — ${entry.description ?? ""}`);
          }
        }
      }
      return {
        content: [{ type: "text" as const, text: sections.join("\n") }],
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

/** Build all NapCat agent tools. */
export function createNapCatAgentTools(cfg: OpenClawConfig): ChannelAgentTool[] {
  return [
    createQQLikeTool(cfg),
    createQQGetUserInfoTool(cfg),
    createQQGetGroupInfoTool(cfg),
    createQQGetGroupMemberInfoTool(cfg),
    createQQMuteGroupMemberTool(cfg),
    createQQKickGroupMemberTool(cfg),
    createQQPokeTool(cfg),
    createQQRecallMessageTool(cfg),
    createQQSetGroupCardTool(cfg),
    // First-batch expansion
    createQQGetFriendListTool(cfg),
    createQQGetGroupListTool(cfg),
    createQQGetGroupMemberListTool(cfg),
    createQQSetGroupAdminTool(cfg),
    createQQSetGroupNameTool(cfg),
    createQQSetGroupWholeBanTool(cfg),
    createQQSendGroupNoticeTool(cfg),
    createQQGetGroupHonorInfoTool(cfg),
  ];
}

# openclaw-napcat

English | [中文](./README.md)

OpenClaw extension for QQ messaging via [NapCat](https://github.com/NapNeko/NapCatQQ) (OneBot 11 reverse WebSocket).

Let your AI assistant fully control QQ interactions through natural language -- like, poke, mute, kick, query user profiles, manage groups, and more.

## Features

- **17 AI Agent Tools** -- AI can execute QQ actions via natural language commands
- **Voice-to-Text (STT)** -- Auto-transcribes voice messages before sending to AI
- **@Mention Resolution** -- Recognizes `@QQNumber` in messages and maps to user IDs
- **Group Management** -- Full admin toolkit: mute, kick, set admin, rename group, announcements
- **Multi-Account** -- Supports multiple NapCat bot accounts

## Agent Tools

| Tool | Description | Owner Only |
|------|-------------|:----------:|
| `qq_like_user` | Give a user thumbs-up (like) | |
| `qq_get_user_info` | Get user profile (nickname, age, signature, etc.) | |
| `qq_get_group_info` | Get group info (name, member count) | |
| `qq_get_group_member_info` | Get a member's info within a group | |
| `qq_get_friend_list` | Get bot's friend list | |
| `qq_get_group_list` | Get bot's group list | |
| `qq_get_group_member_list` | Get all members of a group | |
| `qq_get_group_honor_info` | Get group honor/achievements (Dragon King, etc.) | |
| `qq_poke` | Send a poke/nudge to a user | |
| `qq_mute_group_member` | Mute a member for specified duration | Yes |
| `qq_kick_group_member` | Kick a member from a group | Yes |
| `qq_recall_message` | Recall (delete) a sent message | Yes |
| `qq_set_group_card` | Set member's display name in group | Yes |
| `qq_set_group_admin` | Set/unset group admin | Yes |
| `qq_set_group_name` | Change group name | Yes |
| `qq_set_group_whole_ban` | Toggle whole-group mute | Yes |
| `qq_send_group_notice` | Send group announcement | Yes |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- [NapCat](https://github.com/NapNeko/NapCatQQ) running with HTTP API enabled
- Node.js 22+

## Installation

```bash
openclaw install extensions/napcat
```

Or clone this repo into your OpenClaw extensions directory:

```bash
cd ~/.openclaw/extensions
git clone https://github.com/HylAa/openclaw-napcat.git napcat
cd napcat && npm install --omit=dev
```

## Configuration

Add to your OpenClaw config (`openclaw config edit`):

```json
{
  "channels": {
    "napcat": {
      "httpApi": "http://127.0.0.1:3000",
      "accessToken": "your-token-here",
      "selfId": "123456789",
      "dmPolicy": "allowlist",
      "allowFrom": ["friend_qq_number"],
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group_number"]
    }
  }
}
```

### Config Fields

| Field | Description |
|-------|-------------|
| `httpApi` | NapCat OneBot 11 HTTP API address |
| `accessToken` | API auth token (optional) |
| `selfId` | Bot's own QQ number (for @mention detection) |
| `dmPolicy` | DM policy: `allowlist` / `pairing` / `open` / `disabled` |
| `allowFrom` | Allowed QQ numbers for DM |
| `groupPolicy` | Group policy: `allowlist` / `open` / `disabled` |
| `groupAllowFrom` | Allowed QQ numbers in groups |

**Important:** Set `tools.profile` to `"full"` in your OpenClaw config, otherwise `qq_*` tools will be filtered out by the default `"coding"` profile.

## Usage Examples

Once configured, just talk to your AI in QQ:

- "Help me like user 3870871935" -- AI calls `qq_like_user`
- "Analyze @someone's signature" -- AI extracts QQ number from @mention, calls `qq_get_user_info`
- "Show group member list" -- AI calls `qq_get_group_member_list`
- "Mute @someone for 10 minutes" -- AI calls `qq_mute_group_member` (owner only)
- "Post a group announcement: meeting tomorrow" -- AI calls `qq_send_group_notice` (owner only)

## Voice Messages

When voice STT is enabled (`tools.media.audio.enabled: true`), voice messages are automatically transcribed to text before being sent to the AI model.

## Project Structure

```
.
├── index.ts                 # Plugin entry point
├── package.json
├── openclaw.plugin.json     # Plugin metadata
└── src/
    ├── accounts.ts          # Multi-account resolution
    ├── api.ts               # OneBot 11 HTTP API client
    ├── channel.ts           # Channel plugin & dock definition
    ├── config-schema.ts     # Config JSON Schema + UI hints
    ├── monitor.ts           # WebSocket message monitor + STT
    ├── probe.ts             # Connection probe / health check
    ├── runtime.ts           # Runtime context
    ├── send.ts              # Outbound message sending
    ├── tools.ts             # 17 AI agent tools
    └── types.ts             # TypeScript type definitions
```

## License

MIT

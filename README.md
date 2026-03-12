# openclaw-napcat

[English](./README_EN.md) | 中文

OpenClaw 的 QQ 消息通道插件，基于 [NapCat](https://github.com/NapNeko/NapCatQQ) 的 OneBot 11 反向 WebSocket 协议。

让 AI 助手通过自然语言完全控制 QQ 交互 —— 点赞、戳一戳、禁言、踢人、查看用户资料、管理群组等。

## 功能特性

- **17 个 AI Agent 工具** —— AI 通过自然语言指令执行 QQ 操作
- **语音转文字 (STT)** —— 自动将语音消息转录为文字后发送给 AI
- **@提及识别** —— 自动识别消息中的 `@QQ号` 并映射到用户 ID
- **群管理** —— 完整的管理工具集：禁言、踢人、设置管理员、改群名、发公告
- **多账号支持** —— 支持配置多个 NapCat 机器人账号

## Agent 工具列表

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_like_user` | 给用户点赞 | |
| `qq_get_user_info` | 获取用户资料（昵称、年龄、签名等） | |
| `qq_get_group_info` | 获取群信息（群名、成员数） | |
| `qq_get_group_member_info` | 获取群内某成员的详细信息 | |
| `qq_get_friend_list` | 获取机器人好友列表 | |
| `qq_get_group_list` | 获取机器人群列表 | |
| `qq_get_group_member_list` | 获取群全部成员列表 | |
| `qq_get_group_honor_info` | 获取群荣誉信息（龙王等） | |
| `qq_poke` | 戳一戳 | |
| `qq_mute_group_member` | 禁言群成员 | Yes |
| `qq_kick_group_member` | 踢出群成员 | Yes |
| `qq_recall_message` | 撤回消息 | Yes |
| `qq_set_group_card` | 设置群名片 | Yes |
| `qq_set_group_admin` | 设置/取消群管理员 | Yes |
| `qq_set_group_name` | 修改群名称 | Yes |
| `qq_set_group_whole_ban` | 全员禁言开关 | Yes |
| `qq_send_group_notice` | 发送群公告 | Yes |

## 前置要求

- 已安装并运行 [OpenClaw](https://github.com/openclaw/openclaw)
- 已运行 [NapCat](https://github.com/NapNeko/NapCatQQ) 并开启 HTTP API
- Node.js 22+

## 安装

```bash
openclaw install extensions/napcat
```

或者手动克隆到 OpenClaw 扩展目录：

```bash
cd ~/.openclaw/extensions
git clone https://github.com/HylAa/openclaw-napcat.git napcat
cd napcat && npm install --omit=dev
```

## 配置

在 OpenClaw 配置中添加（`openclaw config edit`）：

```json
{
  "channels": {
    "napcat": {
      "httpApi": "http://127.0.0.1:3000",
      "accessToken": "你的token",
      "selfId": "123456789",
      "dmPolicy": "allowlist",
      "allowFrom": ["好友QQ号"],
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["群号"]
    }
  }
}
```

### 配置字段说明

| 字段 | 说明 |
|------|------|
| `httpApi` | NapCat OneBot 11 HTTP API 地址 |
| `accessToken` | API 鉴权 token（可选） |
| `selfId` | 机器人自身 QQ 号（用于 @机器人检测） |
| `dmPolicy` | 私聊策略：`allowlist` / `pairing` / `open` / `disabled` |
| `allowFrom` | 允许私聊的 QQ 号列表 |
| `groupPolicy` | 群聊策略：`allowlist` / `open` / `disabled` |
| `groupAllowFrom` | 允许在群聊中触发的 QQ 号列表 |

**重要：** 需要在 OpenClaw 配置中将 `tools.profile` 设置为 `"full"`，否则 `qq_*` 工具会被默认的 `"coding"` profile 过滤掉。

## 使用示例

配置完成后，直接在 QQ 中与 AI 对话即可：

- "帮我给 3870871935 点赞" —— AI 调用 `qq_like_user`
- "帮我分析 @某人 的签名" —— AI 从 @提及中提取 QQ 号，调用 `qq_get_user_info`
- "查看群成员列表" —— AI 调用 `qq_get_group_member_list`
- "把 @某人 禁言10分钟" —— AI 调用 `qq_mute_group_member`（仅群主）
- "发个群公告：明天开会" —— AI 调用 `qq_send_group_notice`（仅群主）

## 语音消息

启用语音 STT 后（`tools.media.audio.enabled: true`），语音消息会自动转录为文字再发送给 AI 模型。

## 项目结构

```
.
├── index.ts                 # 插件入口
├── package.json
├── openclaw.plugin.json     # 插件元数据
└── src/
    ├── accounts.ts          # 多账号解析
    ├── api.ts               # OneBot 11 HTTP API 客户端
    ├── channel.ts           # Channel 插件与 Dock 定义
    ├── config-schema.ts     # 配置 JSON Schema + UI 提示
    ├── monitor.ts           # WebSocket 消息监听 + STT
    ├── probe.ts             # 连接探测 / 健康检查
    ├── runtime.ts           # 运行时上下文
    ├── send.ts              # 消息发送
    ├── tools.ts             # 17 个 AI Agent 工具
    └── types.ts             # TypeScript 类型定义
```

## 许可证

MIT

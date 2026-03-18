# openclaw-napcat

[English](./README_EN.md) | 中文

OpenClaw 的 QQ 消息通道插件，基于 [NapCat](https://github.com/NapNeko/NapCatQQ) 的 OneBot 11 反向 WebSocket 协议。

让 AI 助手通过自然语言完全控制 QQ 交互 —— 点赞、戳一戳、禁言、踢人、查看用户资料、管理群组等。

## 功能特性

- **45 个 AI Agent 工具** —— AI 通过自然语言指令执行 QQ 操作
- **语音转文字 (STT)** —— 自动将语音消息转录为文字后发送给 AI
- **@提及识别** —— 自动识别消息中的 `@QQ号` 并映射到用户 ID
- **群管理** —— 完整的管理工具集：禁言、踢人、设置管理员、改群名、发公告
- **多账号支持** —— 支持配置多个 NapCat 机器人账号

## Agent 工具列表

### 查询工具

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

### 消息历史与上下文

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_get_group_msg_history` | 获取群聊历史消息 | |
| `qq_get_friend_msg_history` | 获取私聊历史消息 | |
| `qq_get_essence_msg_list` | 获取群精华消息列表 | |

### 互动工具

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_poke` | 戳一戳 | |
| `qq_recall_message` | 撤回消息 | Yes |
| `qq_set_msg_emoji_like` | 给消息添加表情回应 | |
| `qq_ocr_image` | OCR 图片文字识别 | |
| `qq_translate_en2zh` | 英译中翻译 | |
| `qq_mark_msg_as_read` | 标记消息为已读 | |

### 消息发送

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_send_message` | 发送文本/图片/语音/视频消息 | |
| `qq_upload_file` | 上传文件到群聊或私聊 | |
| `qq_forward_message` | 转发消息 | |
| `qq_send_group_forward_msg` | 发送群合并转发消息 | |
| `qq_send_private_forward_msg` | 发送私聊合并转发消息 | |
| `qq_download_file` | 下载文件到机器人本地 | Yes |

### 精华消息管理

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_set_essence_msg` | 设置精华消息 | Yes |
| `qq_delete_essence_msg` | 移除精华消息 | Yes |

### 好友管理

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_set_friend_remark` | 设置好友备注 | Yes |
| `qq_delete_friend` | 删除好友 | Yes |

### 群管理工具

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_mute_group_member` | 禁言群成员 | Yes |
| `qq_kick_group_member` | 踢出群成员 | Yes |
| `qq_set_group_card` | 设置群名片 | Yes |
| `qq_set_group_admin` | 设置/取消群管理员 | Yes |
| `qq_set_group_name` | 修改群名称 | Yes |
| `qq_set_group_whole_ban` | 全员禁言开关 | Yes |
| `qq_set_group_special_title` | 设置群成员专属头衔 | Yes |
| `qq_set_group_leave` | 退出群聊 | Yes |
| `qq_set_group_portrait` | 设置群头像 | Yes |
| `qq_set_group_sign` | 群签到打卡 | |
| `qq_set_group_remark` | 设置群备注 | Yes |
| `qq_get_group_at_all_remain` | 查询 @全体成员 剩余次数 | |

### 群公告管理

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_send_group_notice` | 发送群公告 | Yes |
| `qq_get_group_notice` | 获取群公告列表 | |
| `qq_delete_group_notice` | 删除群公告 | Yes |

### 群文件管理

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_get_group_root_files` | 获取群文件根目录列表 | |
| `qq_get_group_file_url` | 获取群文件下载链接 | |
| `qq_create_group_file_folder` | 创建群文件夹 | Yes |
| `qq_delete_group_file` | 删除群文件 | Yes |

### 请求处理

| 工具 | 功能 | 仅群主 |
|------|------|:------:|
| `qq_handle_friend_request` | 处理好友请求 | Yes |
| `qq_handle_group_request` | 处理加群请求 | Yes |

## 前置要求

- 已安装并运行 [OpenClaw](https://github.com/openclaw/openclaw)
- 已运行 [NapCat](https://github.com/NapNeko/NapCatQQ) 并开启 HTTP API
- Node.js 22+

## 安装

**方式一：从 npm 安装（推荐）**

```bash
openclaw plugins install @hyl_aa/openclaw-napcat
```

**方式二：手动克隆**

```bash
cd ~/.openclaw/extensions
git clone https://github.com/Aliang1337/openclaw-napcat.git napcat
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
- "查看群里最近的聊天记录" —— AI 调用 `qq_get_group_msg_history`
- "把这条消息设为精华" —— AI 调用 `qq_set_essence_msg`（仅群主）
- "识别一下这张图上的文字" —— AI 调用 `qq_ocr_image`
- "看看群文件里有什么" —— AI 调用 `qq_get_group_root_files`

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
    ├── tools.ts             # 45 个 AI Agent 工具
    └── types.ts             # TypeScript 类型定义
```

## 许可证

MIT

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Aliang1337/openclaw-napcat&type=date&legend=top-left)](https://www.star-history.com/#Aliang1337/openclaw-napcat&type=date&legend=top-left)

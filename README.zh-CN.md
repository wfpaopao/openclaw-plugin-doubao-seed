# OpenClaw 豆包 Seed 插件

[English](./README.md) | [中文](./README.zh-CN.md)

这是一个面向 OpenClaw 的 Doubao Seed 插件，支持：

- `seed2.0`：文本/图片/视频理解
- `seedream5.0`：图片生成
- `seedance2.0`：视频生成

插件面向火山引擎 ARK 设计，默认使用 `ARK_API_KEY` 鉴权。

## 快速示例（安装后可以做什么）

安装完成后，可在飞书（或其他 channel）直接使用这些提示词：

- 文本理解：
  - `请用 3 条要点总结 OpenClaw 的核心能力。`
- 图片理解（发送图片并附带这句话）：
  - `请详细描述这张图片：主体、场景、以及可见文字。`
- 视频理解（发送视频并附带这句话）：
  - `请总结这段视频内容，并按时间顺序列出 5 个关键片段。`
- 图片生成：
  - `生成一张赛博朋克夜景街道图，地面有霓虹倒影，电影感构图。`
- 视频生成：
  - `生成一个 5 秒视频：一只橘猫在木桌前看书，暖光，镜头稳定。`

## 前置要求

- 已安装并可正常运行 OpenClaw
- 已开通火山引擎 ARK 服务
- 有可用的 ARK API Key

在火山引擎控制台获取 API Key 后，先导出环境变量：

```bash
export ARK_API_KEY="your_ark_api_key"
```

## 安装

将本插件放到 OpenClaw 扩展目录中：

1. 将插件文件放到：
   - `~/.openclaw/extensions/doubao-seed/`
2. 在 `~/.openclaw/openclaw.json` 里启用 `doubao-seed`：

```json
{
  "plugins": {
    "allow": ["doubao-seed"],
    "entries": {
      "doubao-seed": {
        "enabled": true
      }
    }
  }
}
```

3. 重启网关：
   - `openclaw gateway restart`

## 最小配置

建议在 `~/.openclaw/openclaw.json` 中使用如下最小配置：

- 只保留框架校验和运行必需字段
- 其余参数交给插件默认值处理
- 在当前 OpenClaw 配置 schema 下，建议（实际等同要求）显式配置 `models.providers.doubao-seed.baseUrl`，否则 `openclaw config validate` 可能失败。
- 插件内部虽然有默认值回退（`https://ark.cn-beijing.volces.com/api/v3`），但配置校验先于运行时回退发生。

```json
{
  "models": {
    "providers": {
      "doubao-seed": {
        "apiKey": "YOUR_ARK_API_KEY",
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "models": [
          {
            "id": "doubao-seed-2-0-pro-260215",
            "name": "Doubao Seed 2.0 Pro",
            "input": ["text", "image"]
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "doubao-seed/doubao-seed-2-0-pro-260215",
        "fallbacks": ["doubao-seed/doubao-seed-2-0-pro-260215"]
      }
    }
  },
  "tools": {
    "media": {
      "image": {
        "enabled": true,
        "models": [
          {
            "provider": "doubao-seed",
            "model": "doubao-seed-2-0-pro-260215",
            "capabilities": ["image"]
          }
        ]
      },
      "video": {
        "enabled": true,
        "models": [
          {
            "provider": "doubao-seed",
            "model": "doubao-seed-2-0-pro-260215",
            "capabilities": ["video"]
          }
        ]
      }
    }
  }
}
```

## 插件配置项

高级默认参数可配置在：

- `plugins.entries.doubao-seed.config`

支持项：

- `apiKey`：可选插件级 API Key（通常用 `ARK_API_KEY` 即可）
- `baseUrl`：API 基础地址（在当前 OpenClaw 配置校验下，建议/实际需要显式配置）
- `seedModel`：Seed 理解默认模型
- `seedreamModel`：Seedream 图片生成默认模型
- `seedanceModel`：Seedance 视频生成默认模型
- `seedreamSize`：Seedream 默认尺寸（例如 `1920x1920`）
- `seedreamResponseFormat`：`b64_json` 或 `url`
- `seedreamSequentialImageGeneration`：默认顺序生成模式
- `seedreamStream`：图片生成默认流式开关
- `seedreamWatermark`：图片默认水印开关
- `seedanceAspectRatio`：默认宽高比（例如 `16:9`）
- `seedanceResolution`：默认分辨率
- `seedanceDurationSeconds`：默认时长（秒）
- `seedanceAudio`：默认是否生成音频
- `seedanceWatermark`：默认视频水印开关
- `seedanceTimeoutMs`：Seedance 任务轮询超时毫秒数（默认 `300000`）

## 支持的模型 ID

你可以在 `plugins.entries.doubao-seed.config` 中设置默认模型，也可以在 CLI 中使用 `--model` 单次覆盖。

### Seed（理解 / 文本）

默认项：

- `seedModel`

支持 ID：

- `doubao-seed-2-0-pro-260215`
- `doubao-seed-2-0-lite-260215`
- `doubao-seed-2-0-mini-260215`
- `doubao-seed-2-0-code-preview-260215`（偏文本）

示例：

- 配置默认值：`"seedModel": "doubao-seed-2-0-lite-260215"`
- 单次命令覆盖：
  - `openclaw infer model run --model doubao-seed/doubao-seed-2-0-pro-260215 ...`
  - `openclaw infer image describe --model doubao-seed/doubao-seed-2-0-mini-260215 ...`
  - `openclaw infer video describe --model doubao-seed/doubao-seed-2-0-pro-260215 ...`

### Seedream（图片生成）

默认项：

- `seedreamModel`

本插件当前支持 ID：

- `doubao-seedream-5-0-260128`

示例：

- 配置默认值：`"seedreamModel": "doubao-seedream-5-0-260128"`
- 单次命令覆盖：
  - `openclaw infer image generate --model doubao-seed/doubao-seedream-5-0-260128 ...`

### Seedance（视频生成）

默认项：

- `seedanceModel`

本插件当前支持 ID：

- `doubao-seedance-2-0-260128`
- `doubao-seedance-2-0-fast-260128`

示例：

- 配置默认值：`"seedanceModel": "doubao-seedance-2-0-fast-260128"`
- 单次命令覆盖：
  - `openclaw infer video generate --model doubao-seed/doubao-seedance-2-0-260128 ...`

## 完整配置（高级）

如果你希望显式声明模型与生成默认参数，可使用完整配置：

```json
{
  "models": {
    "providers": {
      "doubao-seed": {
        "api": "openai-completions",
        "apiKey": "YOUR_ARK_API_KEY",
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "models": [
          {
            "id": "doubao-seed-2-0-pro-260215",
            "name": "Doubao Seed 2.0 Pro",
            "api": "openai-completions",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            }
          }
        ]
      }
    }
  },
  "plugins": {
    "entries": {
      "doubao-seed": {
        "enabled": true,
        "config": {
          "seedModel": "doubao-seed-2-0-pro-260215",
          "seedreamModel": "doubao-seedream-5-0-260128",
          "seedanceModel": "doubao-seedance-2-0-260128",
          "seedreamSize": "1920x1920",
          "seedreamResponseFormat": "b64_json",
          "seedreamSequentialImageGeneration": "disabled",
          "seedreamStream": false,
          "seedreamWatermark": true,
          "seedanceAspectRatio": "16:9",
          "seedanceResolution": "1080p",
          "seedanceDurationSeconds": 5,
          "seedanceAudio": true,
          "seedanceWatermark": true,
          "seedanceTimeoutMs": 300000
        }
      }
    }
  }
}
```

仅插件配置示例：

```json
{
  "plugins": {
    "entries": {
      "doubao-seed": {
        "enabled": true,
        "config": {
          "seedModel": "doubao-seed-2-0-pro-260215",
          "seedreamModel": "doubao-seedream-5-0-260128",
          "seedanceModel": "doubao-seedance-2-0-260128",
          "seedreamSize": "1920x1920",
          "seedreamResponseFormat": "b64_json",
          "seedreamSequentialImageGeneration": "disabled",
          "seedreamStream": false,
          "seedreamWatermark": true,
          "seedanceAspectRatio": "16:9",
          "seedanceResolution": "1080p",
          "seedanceDurationSeconds": 5,
          "seedanceAudio": true,
          "seedanceWatermark": true,
          "seedanceTimeoutMs": 300000
        }
      }
    }
  }
}
```

## 验证命令

先校验并重启：

```bash
openclaw config validate
openclaw gateway restart
```

文本生成：

```bash
openclaw infer model run --prompt "Reply OK" --json
```

图片理解：

```bash
openclaw infer image describe --file "/path/to/image.jpg" --json
```

视频理解：

```bash
openclaw infer video describe --file "/path/to/video.mp4" --json
```

图片生成（Seedream）：

```bash
openclaw infer image generate \
  --model doubao-seed/doubao-seedream-5-0-260128 \
  --prompt "A cute orange cat reading a book, simple illustration style" \
  --size 1920x1920 \
  --output "/tmp/seedream.jpg" \
  --json
```

视频生成（Seedance）：

```bash
openclaw infer video generate \
  --model doubao-seed/doubao-seedance-2-0-260128 \
  --prompt "An orange cat reading a book on a wooden desk, warm light, 5 seconds" \
  --output "/tmp/seedance.mp4" \
  --json
```

## Agent / Channel 提示词示例

下面这些提示词可直接在飞书（或其他 channel）里使用，快速验证路由是否正确：

- 文本理解：
  - `请用 3 条要点总结 OpenClaw 的核心能力。`
- 图片理解（发送图片并附带这句话）：
  - `请详细描述这张图片：主体、场景、以及可见文字。`
- 视频理解（发送视频并附带这句话）：
  - `请总结这段视频内容，并按时间顺序列出 5 个关键片段。`
- 图片生成：
  - `生成一张赛博朋克夜景街道图，地面有霓虹倒影，电影感构图。`
- 视频生成：
  - `生成一个 5 秒视频：一只橘猫在木桌前看书，暖光，镜头稳定。`

推荐快速自测流程：

- 在一个新会话里依次执行上面 5 个提示词。
- 如果图片/视频生成提示能力不可用，先重启 gateway，再检查 `models.providers.doubao-seed.apiKey`。

## 说明

- 为了文本推理稳定，建议在 `openclaw.json` 里保留 `models.providers.doubao-seed` 配置块。
- 如果不配置 `agents.defaults.imageModel`，请确保 `models.providers.doubao-seed.models[*].input` 包含 `"image"`，这样 agent 的 `image` 工具才能把 `doubao-seed` 识别为可用候选。
- `models.providers.*.models[*].input` 当前只支持 `"text"`/`"image"`（不支持 `"video"`）。视频理解/生成请继续通过 `tools.media.video.models` 与插件能力路由。
- `seedream`/`seedance` 不必写进 `models.providers.*.models`，由插件的生成能力提供。
- 视频生成耗时可能较长，超时时可增加超时或重试。
- 对于 Feishu 等长期复用会话，历史失败结论可能污染上下文；若出现“持续复读旧错误”，请先重置/新开会话再重试。
- 命令行与 channel 常驻进程的环境变量可能不一致：终端里 `export ARK_API_KEY` 后 CLI 可用，不代表 gateway/channel 进程也拿到同样环境。为避免差异，建议在 `openclaw.json` 明确配置 `models.providers.doubao-seed.apiKey`（或确保服务进程也有 `ARK_API_KEY`），并在修改后重启 gateway。

### Feishu 排障清单

- 确认插件已启用：`plugins.allow` 包含 `doubao-seed`，且 `plugins.entries.doubao-seed.enabled` 为 `true`。
- 确认 provider key 来源：建议在 `models.providers.doubao-seed.apiKey` 明确配置（对常驻服务进程更稳定）。
- 确认图片理解可发现：`models.providers.doubao-seed.models[*].input` 包含 `"image"`。
- 确认媒体路由：`tools.media.image.models` 与 `tools.media.video.models` 指向 `doubao-seed/doubao-seed-2-0-pro-260215`。
- 重启并新会话复测：执行 `openclaw gateway restart` 后，先在 Feishu 里通过 `/new` 或 `/reset` 开新会话，再重试，避免旧上下文污染。

## License

MIT

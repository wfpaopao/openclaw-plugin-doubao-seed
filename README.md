# OpenClaw Plugin: Doubao Seed

[English](./README.md) | [中文](./README.zh-CN.md)

Doubao Seed plugin for OpenClaw, providing:

- `seed2.0` for text/image/video understanding
- `seedream5.0` for image generation
- `seedance2.0` for video generation

This plugin is designed for Volcano Engine ARK and uses `ARK_API_KEY` by default.

## Quick Examples (What This Plugin Can Do)

Use these prompts directly in Feishu (or other channels) after installation:

- Text understanding:
  - `Summarize the core idea of OpenClaw in 3 bullet points.`
- Image understanding (send an image with this text):
  - `Please describe this image in detail: main subject, scene, and any visible text.`
- Video understanding (send a video with this text):
  - `Please summarize this video and list 5 key moments in time order.`
- Image generation:
  - `Generate an image of a cyberpunk street at night with neon reflections, cinematic style.`
- Video generation:
  - `Generate a 5-second video of an orange cat reading a book at a wooden desk, warm light, stable camera.`

## Requirements

- OpenClaw installed and working
- Volcano Engine ARK service enabled
- A valid ARK API key

Get your API key from Volcano Engine console and export it:

```bash
export ARK_API_KEY="your_ark_api_key"
```

## Installation

Install this plugin by placing it under your OpenClaw extensions directory:

1. Place plugin files under:
   - `~/.openclaw/extensions/doubao-seed/`
2. Enable `doubao-seed` in `~/.openclaw/openclaw.json`:

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

3. Restart gateway:
   - `openclaw gateway restart`

## Minimal Configuration

Recommended minimal config in `~/.openclaw/openclaw.json`:

- Keep only required fields for framework validation and runtime wiring.
- Everything else can stay on plugin defaults.
- In current OpenClaw config schema, `models.providers.doubao-seed.baseUrl` should be explicitly set, or `openclaw config validate` may fail.
- This plugin still has an internal default (`https://ark.cn-beijing.volces.com/api/v3`), but schema validation happens before runtime fallback.

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

## Plugin Config Options

You can place advanced defaults under:

- `plugins.entries.doubao-seed.config`

Supported options:

- `apiKey`: optional plugin-level key (normally `ARK_API_KEY` is enough)
- `baseUrl`: API base URL (recommended/required by current OpenClaw config validation for this provider)
- `seedModel`: default Seed understanding model
- `seedreamModel`: default image generation model
- `seedanceModel`: default video generation model
- `seedreamSize`: default Seedream image size (example: `1920x1920`)
- `seedreamResponseFormat`: `b64_json` or `url`
- `seedreamSequentialImageGeneration`: default sequential mode
- `seedreamStream`: default stream mode for image generation
- `seedreamWatermark`: default image watermark toggle
- `seedanceAspectRatio`: default aspect ratio (example: `16:9`)
- `seedanceResolution`: default resolution value
- `seedanceDurationSeconds`: default duration in seconds
- `seedanceAudio`: default audio generation toggle
- `seedanceWatermark`: default video watermark toggle
- `seedanceTimeoutMs`: timeout for Seedance task polling in milliseconds (default `600000`)

## Supported Model IDs

Use `plugins.entries.doubao-seed.config` to set plugin-level defaults, and use CLI `--model` to override per request.

### Seed (understanding / text)

Configure default with:

- `seedModel`

Supported IDs:

- `doubao-seed-2-0-pro-260215`
- `doubao-seed-2-0-lite-260215`
- `doubao-seed-2-0-mini-260215`
- `doubao-seed-2-0-code-preview-260215` (text-focused)

Examples:

- Default in config: `"seedModel": "doubao-seed-2-0-lite-260215"`
- Per command override:
  - `openclaw infer model run --model doubao-seed/doubao-seed-2-0-pro-260215 ...`
  - `openclaw infer image describe --model doubao-seed/doubao-seed-2-0-mini-260215 ...`
  - `openclaw infer video describe --model doubao-seed/doubao-seed-2-0-pro-260215 ...`

### Seedream (image generation)

Configure default with:

- `seedreamModel`

Supported IDs in this plugin:

- `doubao-seedream-5-0-260128`

Example:

- Default in config: `"seedreamModel": "doubao-seedream-5-0-260128"`
- Per command override:
  - `openclaw infer image generate --model doubao-seed/doubao-seedream-5-0-260128 ...`

### Seedance (video generation)

Configure default with:

- `seedanceModel`

Supported IDs in this plugin:

- `doubao-seedance-2-0-260128`
- `doubao-seedance-2-0-fast-260128`

Examples:

- Default in config: `"seedanceModel": "doubao-seedance-2-0-fast-260128"`
- Per command override:
  - `openclaw infer video generate --model doubao-seed/doubao-seedance-2-0-260128 ...`

## Full Configuration (Advanced)

Use this when you want explicit model and generation defaults in plugin config:

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
          "seedanceTimeoutMs": 600000
        }
      }
    }
  }
}
```

Plugin config example only:

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
          "seedanceTimeoutMs": 600000
        }
      }
    }
  }
}
```

## Verification Commands

Validate config and restart gateway:

```bash
openclaw config validate
openclaw gateway restart
```

Text generation:

```bash
openclaw infer model run --prompt "Reply OK" --json
```

Image understanding:

```bash
openclaw infer image describe --file "/path/to/image.jpg" --json
```

Video understanding:

```bash
openclaw infer video describe --file "/path/to/video.mp4" --json
```

Image generation (Seedream):

```bash
openclaw infer image generate \
  --model doubao-seed/doubao-seedream-5-0-260128 \
  --prompt "A cute orange cat reading a book, simple illustration style" \
  --size 1920x1920 \
  --output "/tmp/seedream.jpg" \
  --json
```

Video generation (Seedance):

```bash
openclaw infer video generate \
  --model doubao-seed/doubao-seedance-2-0-260128 \
  --prompt "An orange cat reading a book on a wooden desk, warm light, 5 seconds" \
  --output "/tmp/seedance.mp4" \
  --json
```

## Agent/Channel Prompt Examples

Use these prompts directly in Feishu (or other channels) to quickly verify routing:

- Text understanding:
  - `Summarize the core idea of OpenClaw in 3 bullet points.`
- Image understanding (send an image with this text):
  - `Please describe this image in detail: main subject, scene, and any visible text.`
- Video understanding (send a video with this text):
  - `Please summarize this video and list 5 key moments in time order.`
- Image generation:
  - `Generate an image of a cyberpunk street at night with neon reflections, cinematic style.`
- Video generation:
  - `Generate a 5-second video of an orange cat reading a book at a wooden desk, warm light, stable camera.`

Recommended quick check:

- Run the 5 prompts above in a fresh channel session.
- If image/video generation says capability is unavailable, restart gateway and recheck `models.providers.doubao-seed.apiKey`.

## Notes

- For text inference stability, keep a `models.providers.doubao-seed` entry in `openclaw.json`.
- If you do not configure `agents.defaults.imageModel`, make sure `models.providers.doubao-seed.models[*].input` includes `"image"` so the agent `image` tool can discover `doubao-seed` as an image-capable candidate.
- `models.providers.*.models[*].input` currently accepts `"text"`/`"image"` only (no `"video"`). Video understanding/generation should still be routed through `tools.media.video.models` + plugin capabilities.
- `seedream`/`seedance` do not have to be listed under `models.providers.*.models`; they are provided by plugin generation capabilities.
- If generation times out, increase command timeout or retry (video generation can take longer).
- For long-lived channel sessions (for example Feishu DM threads), stale failures can pollute context. If model behavior looks stuck on old errors, reset/start a fresh session and retry.
- CLI and channel runtimes can use different environments. A command may work in your terminal (with exported `ARK_API_KEY`) while a long-running gateway/channel process still fails. For stable behavior, configure `models.providers.doubao-seed.apiKey` in `openclaw.json` (or ensure the service process also has `ARK_API_KEY`) and restart the gateway.

### Feishu Troubleshooting Checklist

- Confirm plugin enabled: `plugins.allow` includes `doubao-seed` and `plugins.entries.doubao-seed.enabled` is `true`.
- Confirm provider key source: set `models.providers.doubao-seed.apiKey` (recommended for service processes).
- Confirm image understanding discovery: `models.providers.doubao-seed.models[*].input` contains `"image"`.
- Confirm media tool routing: `tools.media.image.models` and `tools.media.video.models` point to `doubao-seed/doubao-seed-2-0-pro-260215`.
- Restart and retry in a fresh chat: run `openclaw gateway restart`, then create a new Feishu session (for example `/new` or `/reset`) before retesting, to avoid stale context pollution.

## License

MIT

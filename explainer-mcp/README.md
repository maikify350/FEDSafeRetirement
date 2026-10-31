# FEDSafe Explainer Studio — MCP server

Exposes the Explainer Studio pipeline (`App/src/app/api/explainer/*`) as MCP tools so Claude Code can
research → script → storyboard → check → generate clips → hand off to the Video Studio without the browser UI.

## Setup

```bash
cd explainer-mcp && npm install
```

Set in the **app** (`App/.env` and Vercel): `EXPLAINER_SERVICE_KEY=<long random string>`.

Claude Code — add to `.mcp.json` at the repo root (or `~/.claude.json`):

```json
{
  "mcpServers": {
    "fedsafe-explainer": {
      "command": "node",
      "args": ["explainer-mcp/server.mjs"],
      "env": {
        "EXPLAINER_APP_URL": "https://fedsafe-retirement.vercel.app",
        "EXPLAINER_SERVICE_KEY": "<same value as the app>"
      }
    }
  }
}
```

## Tools

| Tool | Does |
| --- | --- |
| `explainer_list_presets` | Platforms, lengths, engines, Krea models, animation modes, 3D asset slots |
| `explainer_fetch_transcript` | Reference transcript (SerpApi → SearchApi → YouTube) |
| `explainer_generate_plan` | Brief → full plan with QA |
| `explainer_validate_plan` | Re-run checks on an edited plan |
| `explainer_krea_clip` | Generate / poll a Krea clip for a shot |
| `explainer_voice` | ElevenLabs take with word timestamps; shots re-timed to spoken words |
| `explainer_render` | Local Remotion render (DRAFT or final + checks) via `remotion/scripts/render_explainer.mjs` |
| `explainer_stills` | Half-size frames at chosen seconds, optional safe-zone guides |
| `explainer_check_render` | freeze / cut / speed / jump / short-shot + loudness checks on an MP4 |
| `explainer_create_video` | Create the `videos` row (ExplainerReel) for the Video Studio |

The local tools (`explainer_render`, `explainer_stills`, `explainer_check_render`) run in `remotion/` on the machine
hosting the MCP server and need Node 20+, ffmpeg, python3 with numpy, and Chrome. Without a GPU set `REMOTION_GL=swangle`.

## Example Claude Code session

> "Make a 60-second YouTube Short on the evolution of trains, 3D mode, Krea Seedance 2.5, voice Max.
> Fix any errors the checks report, then create the video."

Claude Code calls `explainer_generate_plan`, then `explainer_voice` (the take sets the real timing), reads `qa`,
edits shots and calls `explainer_validate_plan` until `ok: true`, looks at `explainer_stills` on the word cues that
change the picture, watches the `explainer_render` draft, renders the final (checks run automatically), fixes any
FAIL in its shot and renders again, then `explainer_create_video` to file it in the Video Studio.

Test locally: `npm run inspect` opens the MCP Inspector against the server.

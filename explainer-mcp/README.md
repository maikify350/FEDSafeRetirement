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
| `explainer_create_video` | Create the `videos` row (ExplainerReel) for voice + render |

## Example Claude Code session

> "Make a 60-second YouTube Short on the evolution of trains, 3D mode, Krea Seedance 2.5, voice Max.
> Fix any errors the checks report, then create the video."

Claude Code calls `explainer_generate_plan`, reads `qa`, edits shots, calls `explainer_validate_plan`
until `ok: true`, optionally `explainer_krea_clip` per shot, then `explainer_create_video`.

Test locally: `npm run inspect` opens the MCP Inspector against the server.

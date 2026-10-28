# PHANTOM ARCHIVE: The Haunting Engine

An investigation game for the DEV Hacktoberfest Open-Source AI Challenge, Week 4 (*Ghost in the Machine*).
You question an AI ghost that lives in an abandoned archive in 2049. The ghost is open-weight **Gemma 4**. It must cite
evidence for everything it says, and you can catch it lying.

> Work in progress. See [docs/PRD.md](docs/PRD.md).

## Run it locally

```bash
pnpm install
cp .env.example .env          # defaults to Gemma 4 E4B on Ollama
ollama pull gemma4:e4b
pnpm dev                      # web on :5173, api on :3030
pnpm smoke                    # 10 ghost turns: tool calls, JSON, citations
```

All people, places and events in the case are fictional.

MIT licensed.

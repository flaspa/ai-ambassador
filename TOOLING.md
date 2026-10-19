# Parallel tooling assessment

Reviewed **2026-10-18** against the [official overview](https://docs.parallel.ai/getting-started/overview) and linked API documentation. Product selection is pending; `PLAN.md` and `ARCHITECTURE.md` are placeholders. These are recommendations for review, not approved architecture.

## Recommended minimum

**Use Web Search alone, with `mode: "fast"`, through a direct server-side REST call.** Search already returns URLs and excerpts; the application's model can synthesize a useful brief with source links. Add **Web Extract only if the chosen workflow needs to read supplied URLs or inspect sources in depth**. Defer Deep Research and Monitor. Consider single-record Enrichment only if structured research becomes the product's central feature.

An illustrative demo, without selecting the product: user requests a meeting/company brief → agent searches → model summarizes with links → an approved Composio action saves the result. This makes Parallel's contribution visible with one API endpoint.

## Capability comparison

All rows use the shared authentication and SDK options below. REST paths are relative to `https://api.parallel.ai`. Timing is documented guidance, not a guarantee; prices are USD from [Parallel pricing](https://docs.parallel.ai/getting-started/pricing).

| Capability | What it does and possible demo use | Runtime interface | Published timing and cost | Fit for 3.5 hours |
|---|---|---|---|---|
| **Web Search** | Finds pages and returns titles, URLs and relevant excerpts. Useful for current questions or a short personal briefing. [Quickstart](https://docs.parallel.ai/search/search-quickstart) | Synchronous `POST /v1/search`; SDK `search`. | `fast`: ~700 ms, $1/1,000 requests ($0.001 each). `turbo`: ~200 ms, same price. `basic`/`advanced`: ~1/~3 s, $5/1,000. Includes 10 results; extra results cost $1/1,000. [Modes](https://docs.parallel.ai/search/modes) | **Best default.** One request; the app's model handles synthesis. Explicitly set `fast`; API default is `advanced`. |
| **Web Extract** | Reads known URLs into markdown excerpts or explicitly requested full content; supports JavaScript pages and PDFs, up to 20 URLs/request. Useful for summarizing a provided article. [Quickstart](https://docs.parallel.ai/extract/extract-quickstart) | Synchronous `POST /v1/extract`; SDK `extract`. | 1–20 s; $1/1,000 URLs ($0.001/URL). | **Good optional addition.** Search excerpts may already be sufficient. |
| **Deep Research** | Multi-step research produces a cited report or structured output. Useful for a detailed comparison or preparation brief. [Example](https://docs.parallel.ai/task-api/examples/task-deep-research) | Asynchronous Task API: `POST /v1/tasks/runs`, then `GET /v1/tasks/runs/{run_id}/result`; polling or webhooks. | `pro`: 2–10 min, $100/1,000 successful runs ($0.10 each). `ultra`: 3–25 min, $300/1,000 ($0.30 each); largest tier reaches 2 hours/$2.40 per run. | **Defer.** Easy to start, harder to fit into a reliable live demo. |
| **Data Enrichment** | Starts with a known company/contact and fills fields defined by a JSON output schema, with field-level evidence. Useful for enriching one meeting company. [Example](https://docs.parallel.ai/task-api/examples/task-enrichment) | **Same Task API**, with an output schema; not a separate enrichment SDK. | `lite`: 10 s–2 min, $5/1,000 successful runs ($0.005 each); `base`: 15 s–3 min, $10/1,000 ($0.01 each). Charged per run, not per field. | **Conditional.** One record and ~2 simple fields (`lite`) or ~5 (`base`); avoid batches unless central to the product. |
| **Monitor** | Repeatedly checks a natural-language query for new developments and deduplicates updates. Useful for a personal topic/company watchlist. [Quickstart](https://docs.parallel.ai/monitor-api/monitor-quickstart) | Asynchronous `POST /v1/monitors`; receive webhooks or read `GET /v1/monitors/{monitor_id}/events`. | Runs immediately at creation, then on a 1-hour–30-day schedule. No fixed completion/event latency documented. `lite`: $3/1,000 checks ($0.003 each); `base`: $10/1,000 ($0.01 each). Recurring executions incur usage. [Frequency reference](https://docs.parallel.ai/api-reference/monitor/create-monitor) | **Defer.** Setup and event retrieval add work; a real new event may not appear during judging. |

Task timings above follow the [processor guide](https://docs.parallel.ai/task-api/guides/choose-a-processor) and exclude queue time. The pricing page lists narrower `lite`/`base` ranges and a 5-minute `ultra` lower bound; budget conservatively. Only successful Task runs are billed.

## Runtime integration, authentication and installed skills

- **All five capabilities:** obtain a [Parallel Platform API key](https://platform.parallel.ai); keep it server-side in `PARALLEL_API_KEY` and send `x-api-key` plus JSON content type. Never put it in browser code or Git. [Task setup](https://docs.parallel.ai/task-api/task-quickstart)
- **SDK optional:** official Python and TypeScript packages are both named `parallel-web`. Use the application's existing HTTP client for the smallest dependency footprint. Neither CLI nor MCP is required for REST integration. [SDK setup](https://docs.parallel.ai/task-api/task-quickstart)
- **CLI:** the documented executable is `parallel-cli`, with OAuth login or API-key authentication. It is valid for shell-driven agents, but its reported absence from Git Bash PATH need not block an application's REST calls. Availability has not been independently verified. [CLI docs](https://docs.parallel.ai/integrations/cli)
- **Five installed Claude Code skills:** user-reported development-agent instructions, not proof of an executable, credentials, SDK, or registered application tools. Most Parallel skills require the CLI separately. [Skills prerequisites](https://docs.parallel.ai/integrations/agent-skills)

## Implementation notes for later approval

Register one application tool handler for Search; send `search_queries`, an optional `objective`, and explicit `fast` mode. Use current `/v1/search` and `/v1/extract` endpoints. Extract full content requires `advanced_settings.full_content`; omitting the objective does not enable it. These details follow the formal [Search](https://docs.parallel.ai/api-reference/search/search) and [Extract](https://docs.parallel.ai/api-reference/extract/extract) references where overview examples differ.

Estimated Parallel usage for 100 `fast` searches within the included result limit plus 100 extracted URLs: **$0.20**, excluding the application's model and hosting costs. No free credits assumed.

**Status:** documentation research only. No authenticated Parallel call, credential/balance check, package installation, application code, or architecture change was performed. Stop here for product and integration review.

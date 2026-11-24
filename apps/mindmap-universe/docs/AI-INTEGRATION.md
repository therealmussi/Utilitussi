# AI integration

MindMap Universe has an `ai/` module with two interchangeable engines.

## 1. Remote provider (optional)

Any OpenAI-compatible chat completions endpoint works.

Configure in **Settings → AI provider** (stored locally in the browser) or via environment variables (defaults):

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_AI_BASE_URL` | Base URL of the provider | `https://api.openai.com/v1` |
| `VITE_AI_API_KEY` | Bearer key (optional for local gateways like Ollama) | `sk-…` |
| `VITE_AI_MODEL` | Model name | `gpt-4o-mini` |

```bash
cp .env.example .env   # then edit
```

Request shape: `POST {BASE_URL}/chat/completions` with `response_format: { type: "json_object" }`. The system prompt fixes a strict JSON schema per skill; the orchestrator (`src/ai/index.ts`) **validates** the shape and rejects malformed output.

Failures (network, auth, malformed JSON) degrade gracefully to the local engine, and the UI badges every answer with the engine that produced it (`provider` vs `local fallback`).

## 2. Local engine (always available, deterministic)

`src/ai/localEngine.ts` implements every skill without any network:

| Skill | Method |
| --- | --- |
| Generate map | Built-in domain profiles (climate, urban planning, WWII, AI, economics) when the topic matches; otherwise a generic decomposition scaffold (definition → history → mechanisms → open questions). Every node is created with an explicit proposed connection to the root. |
| Expand concept | Keyword overlap with the node's own vocabulary; proposals referencing existing siblings are filtered out. |
| Find hidden connections | `knowledge/discovery.ts` — keyword + tag + common-neighbour scoring, relation-type inference, templated explanations. |
| Gaps | Missing core concepts from matched domain profiles, each with a reason. |
| Ask your universe | Retrieval-lite: keyword-scores every entry, answers with extracts from matched entries, lists which saved entries support the answer. |
| Quizzes | Multiple-choice built from entry titles and contents. |
| Learning paths | BFS over the user's actual connections from a chosen root. |

**Principle:** the local engine never pretends to be an LLM. Its output is labelled as a deterministic local suggestion so users know what needs verification.

## Prompt contracts

```
map:    {"nodes": [{"title", "concept", "content", "tags", "connectTo", "relation"}]}
gaps:   {"gaps": [{"title", "concept", "reason"}]}
expand: {"nodes": [{"title", "concept", "content", "tags", "relation"}]}
answer: {"answer", "concept", "usedNodes"}
```

Non-negotiable rules in the system prompt:
- reply with a single valid JSON object;
- be concise and factual;
- never invent citations, authors, dates or sources.

## Design guarantees

1. **Never automatic.** Refresh, expansion and connections arrive as proposals with Add/Reject controls; the graph is only mutated by explicit user actions.
2. **Provenance.** Nodes created from suggestions carry `metadata.origin: "ai"`; the Insights panel and library expose it.
3. **Grounding.** Chat answers using stored entries always list them; ungrounded general knowledge is flagged as such.

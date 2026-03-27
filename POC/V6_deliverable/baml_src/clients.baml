// BAML Clients Configuration
//
// Architecture-spec named clients (Pluggable AI — TOR §4.3):
//   GPT4o          → OpenAI GPT-4o (cloud)
//   Claude35Sonnet → Anthropic Claude 3.5 Sonnet (cloud)
//   LocalLlama     → Llama 3.1 70B via Ollama (on-premise / air-gapped)
//   ActiveModel    → Runtime-selected client; resolves to AI_ACTIVE_CLIENT config value
//
// Working POC implementation uses NavaveijClient (custom OpenAI-compatible proxy).
// ActiveModel falls back through the chain: NavaveijClient → GPT4o → Claude35Sonnet → LocalLlama → OpenRouterClient.
// Model switching for demo: change AI_ACTIVE_CLIENT in .env (no code deployment needed).

// ── POC Implementation Client ────────────────────────────────────────────────
// Primary Orchestrator Client — openai-generic for TrollLLM / any custom OpenAI-compatible proxy
// Use openai-generic (not openai) to bypass model validation and support non-OpenAI model names
client<llm> NavaveijClient {
  provider openai-generic
  options {
    base_url env.LLM_BASE_URL
    api_key env.LLM_API_KEY
    model env.LLM_MODEL
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Fallback Client — OpenRouter (broad model access, used when NavaveijClient fails)
client<llm> OpenRouterClient {
  provider openai-generic
  options {
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    model env.OPENROUTER_MODEL
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// ── Architecture-Spec Named Clients (TOR §4.3 — Pluggable AI) ───────────────

// GPT-4o — OpenAI cloud model (default cloud choice)
client<llm> GPT4o {
  provider openai
  options {
    model "gpt-4o"
    api_key env.OPENAI_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Claude 3.5 Sonnet — Anthropic cloud model (alternative cloud choice)
client<llm> Claude35Sonnet {
  provider anthropic
  options {
    model "claude-3-5-sonnet-20241022"
    api_key env.ANTHROPIC_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Local Llama 3.1 70B — On-premise via Ollama (air-gapped / data-sovereign deployment)
client<llm> LocalLlama {
  provider openai-generic
  options {
    base_url "http://localhost:11434/v1"
    api_key "ollama"
    model "llama3.1:70b"
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// ── Fallback Strategies ──────────────────────────────────────────────────────

// NavaveijWithFallback — legacy strategy (NavaveijClient → OpenRouter)
client<llm> NavaveijWithFallback {
  provider fallback
  options {
    strategy [NavaveijClient, OpenRouterClient]
  }
}

// ActiveModel — Primary strategy for all clinical functions (TOR §4.3).
// Resolves NavaveijClient first (POC implementation), then falls through to named clients.
// OpenRouterClient is always the final fallback regardless of AI_ACTIVE_CLIENT value.
// To switch active model: set AI_ACTIVE_CLIENT in .env (no code deployment needed).
client<llm> ActiveModel {
  provider fallback
  options {
    strategy [NavaveijClient, GPT4o, Claude35Sonnet, LocalLlama, OpenRouterClient]
  }
}

// AnnotationModel — Dedicated client for AnnotateReasoningLines (Agent 2c).
// Uses the same NavaveijClient proxy so it can be independently pointed at a smaller/faster
// model (e.g. gemini-1.5-flash-8b, gpt-4o-mini, claude-haiku) by setting a separate env var,
// without affecting the frontier model used by Agents 1, 2a, and 2b.
// For POC: shares the same endpoint as NavaveijClient; swap LLM_ANNOTATION_MODEL in .env.
client<llm> AnnotationModel {
  provider openai-generic
  options {
    base_url env.LLM_BASE_URL
    api_key env.LLM_API_KEY
    model env.LLM_ANNOTATION_MODEL
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

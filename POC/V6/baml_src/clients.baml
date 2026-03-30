// BAML Clients Configuration
//
// Architecture-spec named clients (Pluggable AI — TOR §4.3):
//   GeminiClient      → Google Gemini 3 Flash (primary; OpenAI-compatible endpoint)
//   OpenAIClient      → OpenAI GPT-5.4 Mini (cloud)
//   AnthropicClient   → Anthropic Claude Haiku 4.5 (cloud)
//   OpenRouterClient  → OpenRouter — openai/gpt-oss-120b (broad model access fallback)
//   LocalHostedClient → Llama 3.3 70B via Ollama (on-premise / air-gapped)
//   ActiveModel       → Runtime-selected client; resolves to AI_ACTIVE_CLIENT config value
//   AnnotationModel   → Same fallback chain as ActiveModel (Agent 2c — AnnotateReasoningLines)
//
// Model switching for demo: change AI_ACTIVE_CLIENT in .env (no code deployment needed).
// Valid values: GeminiClient | OpenAIClient | AnthropicClient | OpenRouterClient | LocalHostedClient

// ── Primary Client — Google Gemini ───────────────────────────────────────────
// Uses openai-generic provider to talk to the Gemini OpenAI-compatible endpoint.
client<llm> GeminiClient {
  provider openai-generic
  options {
    base_url env.LLM_BASE_URL
    api_key env.LLM_API_KEY
    model env.LLM_MODEL
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// ── Architecture-Spec Named Clients (TOR §4.3 — Pluggable AI) ───────────────

// OpenAI GPT-5.4 Mini — OpenAI cloud model
client<llm> OpenAIClient {
  provider openai
  options {
    model "gpt-5.4-mini"
    api_key env.OPENAI_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Anthropic Claude Haiku 4.5 — Anthropic cloud model
client<llm> AnthropicClient {
  provider anthropic
  options {
    model "claude-haiku-4-5"
    api_key env.ANTHROPIC_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Local Llama 3.3 70B — On-premise via Ollama (air-gapped / data-sovereign deployment)
client<llm> LocalHostedClient {
  provider openai-generic
  options {
    base_url "http://localhost:11434/v1"
    api_key "ollama"
    model "llama-3.3-70b-instruct"
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// OpenRouter — broad model access, final fallback in the chain
client<llm> OpenRouterClient {
  provider openai-generic
  options {
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    model "openai/gpt-oss-120b"
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// ── Fallback Strategies ──────────────────────────────────────────────────────

// ActiveModel — Primary strategy for all clinical functions (TOR §4.3).
// Chain: GeminiClient → OpenAIClient → AnthropicClient → LocalHostedClient → OpenRouterClient.
// To switch active model: set AI_ACTIVE_CLIENT in .env (no code deployment needed).
client<llm> ActiveModel {
  provider fallback
  options {
    strategy [GeminiClient, OpenAIClient, AnthropicClient, LocalHostedClient, OpenRouterClient]
  }
}

// AnnotationModel — Dedicated client for AnnotateReasoningLines (Agent 2c).
// Uses the same fallback chain as ActiveModel so annotation always resolves to
// the same model as clinical inference — no separate env var needed.
client<llm> AnnotationModel {
  provider fallback
  options {
    strategy [GeminiClient, OpenAIClient, AnthropicClient, LocalHostedClient, OpenRouterClient]
  }
}

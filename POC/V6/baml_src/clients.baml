// BAML Clients Configuration
//
// Architecture-spec named clients (Pluggable AI — TOR §4.3):
//   GeminiClient      → Google Gemini 3 Flash (primary; Google AI provider)
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
// Uses BAML's native Google AI Gemini provider and provider-native env names.
client<llm> GeminiClient {
  provider google-ai
  options {
    api_key env.GOOGLE_API_KEY
    model env.GEMINI_MODEL
  }
}

// ── Architecture-Spec Named Clients (TOR §4.3 — Pluggable AI) ───────────────

// OpenAI GPT-5.4 Mini — OpenAI cloud model
client<llm> OpenAIClient {
  provider openai
  options {
    model env.OPENAI_MODEL
    api_key env.OPENAI_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Anthropic Claude Haiku 4.5 — Anthropic cloud model
client<llm> AnthropicClient {
  provider anthropic
  options {
    model env.ANTHROPIC_MODEL
    api_key env.ANTHROPIC_API_KEY
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// Local Llama 3.3 70B — On-premise via Ollama (air-gapped / data-sovereign deployment)
client<llm> LocalHostedClient {
  provider openai-generic
  options {
    base_url env.LOCALHOSTED_BASE_URL
    api_key env.LOCALHOSTED_API_KEY
    model env.LOCALHOSTED_MODEL
    timeout_ms env.LLM_TIMEOUT_MS
  }
}

// OpenRouter — broad model access, final fallback in the chain
client<llm> OpenRouterClient {
  provider openai-generic
  options {
    base_url env.OPENROUTER_BASE_URL
    api_key env.OPENROUTER_API_KEY
    model env.OPENROUTER_MODEL
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

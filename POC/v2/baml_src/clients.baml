// BAML Clients Configuration

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

// Retry policy: try NavaveijClient first, fall back to OpenRouterClient on failure
client<llm> NavaveijWithFallback {
  provider fallback
  options {
    strategy [NavaveijClient, OpenRouterClient]
  }
}

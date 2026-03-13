// BAML Clients Configuration

client<llm> NavaveijClient {
  provider openai
  options {
    // envVars are mapped to what's in your .env
    base_url env.LLM_BASE_URL
    api_key env.LLM_API_KEY
    model env.LLM_MODEL
  }
}
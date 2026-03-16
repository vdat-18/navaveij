// BAML Clients Configuration

client<llm> NavaveijClient {
  provider google-ai
  options {
    api_key env.GOOGLE_API_KEY
    model env.LLM_MODEL
  }
}
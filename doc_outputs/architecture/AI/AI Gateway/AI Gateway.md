graph LR
    REQUEST([📨 Recommendation Request])

    subgraph ADMIN["🛠️ Admin / Config UI"]
        direction TB
        DASH["📊 Admin Dashboard"]
        ROUTE_CFG["🧭 Routing Rules Config"]
        PROMPT_CFG["📋 Prompt Template Manager"]
        MODEL_CFG["🤖 Model Config"]
    end

    subgraph GW["🔀 AI Gateway"]
        direction TB
        ROUTER["🧭 AI Router"]
        PROMPT["📋 Prompt Template Vault"]
        BAML["⚙️ BAML AI Framework"]
        RESPONSE["✅ Unified Response"]

        ROUTER --> PROMPT
        PROMPT --> BAML
        ROUTER --> BAML
        BAML --> RESPONSE
    end

    subgraph MODELS["AI Models"]
        direction TB
        GPT["🟢 GPT OpenAI"]
        CLAUDE["🟠 Claude Anthropic"]
        GEMINI["🔵 Gemini Google"]
        LOCAL["⚫ Self-Hosted LLM"]
    end

    REQUEST --> ROUTER
    BAML --> MODELS
    RESPONSE -->|returns result| REQUEST

    %% Admin connections
    DASH --> ROUTE_CFG
    DASH --> PROMPT_CFG
    DASH --> MODEL_CFG

    ROUTE_CFG -.-> ROUTER
    PROMPT_CFG -.-> PROMPT
    MODEL_CFG -.-> BAML
# ADR-006: AI Provider Abstraction

## Status

Accepted

## Context

FusionOS integrates AI capabilities through Ollama for local inference. The system must:
- Support the current Ollama provider
- Allow future providers (OpenAI, Anthropic, etc.)
- Not couple business logic to any specific provider

## Decision

Implement a **provider-agnostic AI abstraction** with Ollama as the first-class implementation.

```
AIProvider (abstract)
  └── OllamaProvider
  └── FutureOpenAIProvider
  └── FutureGeminiProvider
```

All AI calls go through the abstraction. Business modules never call Ollama directly.

## Consequences

### Positive
- Future providers can be added without rewriting business logic
- AI features can be disabled gracefully
- Testing can use mock providers
- Configuration is centralized

### Negative
- Additional abstraction layer
- Must maintain provider-agnostic interfaces

## Configuration

```
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434
AI_MODEL=llama3.2
```

## Security

- Provider credentials never exposed to frontend
- All AI requests go through RBAC and tenant isolation
- AI output is validated before use
- No eval() or dynamic code execution

import type { Preferences } from '@/types'

export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export function resolveAIConfig(prefs: Preferences): AIConfig {
  const env = {
    baseUrl: import.meta.env.VITE_AI_BASE_URL as string | undefined,
    apiKey: import.meta.env.VITE_AI_API_KEY as string | undefined,
    model: import.meta.env.VITE_AI_MODEL as string | undefined,
  }
  return {
    baseUrl: prefs.ai.baseUrl || env.baseUrl || '',
    apiKey: prefs.ai.apiKey || env.apiKey || '',
    model: prefs.ai.model || env.model || 'gpt-4o-mini',
  }
}

export function isAIConfigured(config: AIConfig): boolean {
  return Boolean(config.baseUrl && config.model)
}

export async function chatJSON(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<unknown> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      detail = body?.error?.message ?? detail
    } catch {
      /* keep default */
    }
    throw new Error(`AI request failed: ${detail}`)
  }
  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI returned an empty response')
  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI response was not valid JSON')
    return JSON.parse(match[0])
  }
}

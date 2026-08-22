import { ENV } from '../config/env'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Different models assigned to different agents to leverage their strengths
const AGENT_MODELS = {
  ROUTER_AGENT: 'google/gemma-4-26b-a4b-it:free',
  ANALYST_AGENT: 'google/gemma-4-31b-it:free',
  REASONING_AGENT: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
}

async function callLLM(model: string, systemPrompt: string, userPrompt: string) {
  if (!ENV.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is missing. Please set VITE_OPENROUTER_API_KEY in .env.')
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': ENV.APP_NAME,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData?.error?.message || `API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Citizen Router Agent (Google Gemma 4 26B)
 * Classifies complaint into municipal department and priority
 */
export async function runRouterAgent(description: string) {
  const systemPrompt = `You are the AI Routing & Dispatch Agent for CivicLens. 
Analyze the citizen's complaint. Classify it into one of these official departments:
- "Water Supply" (for leakages, low pressure, dirty water)
- "Drainage & Sewerage" (for blocked drains, overflowing sewers)
- "Health & Sanitation" (for garbage dumps, public toilet issues)
- "Electrical & Mechanical" (for streetlights, exposed wires, transformers)
- "Roads & Public Works" (for potholes, broken pavements, road repairs)
- "Parks & Gardens" (for overgrown parks, broken park fences/benches)
- "Fire Safety" (for fire hazards, blocked exits)
- "Revenue" (for property tax issues)
- "Housing & Environment" (for bad smell, illegal constructions, pollution)

Determine the priority: "CRITICAL", "HIGH", or "MEDIUM".
Immediate life/property threat (Fire, high-pressure flooding) is CRITICAL.
High-impact infrastructure failure (main road blocked, active leaks) is HIGH.
Normal maintenance (potholes, garbage, streetlights) is MEDIUM.

Respond STRICTLY with a JSON object, containing these fields:
{
  "category": "Official Department Name",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM",
  "explanation": "A one-sentence reason explaining why it belongs to this department and priority."
}`

  try {
    const res = await callLLM(AGENT_MODELS.ROUTER_AGENT, systemPrompt, `Complaint: "${description}"`)
    const jsonStr = res.match(/\{[\s\S]*\}/)?.[0] || res
    const parsed = JSON.parse(jsonStr)
    return parsed as { category: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'; explanation: string }
  } catch (e) {
    console.error("Router Agent failed:", e)
    // Fallback to local heuristic
    return {
      category: "General Administration",
      priority: "MEDIUM" as const,
      explanation: "Router Agent fallback used due to network issues."
    }
  }
}

/**
 * Officer Analyst Agent (Google Gemma 4 31B)
 * Analyzes the complaint and suggests ground repair steps and impact assessment
 */
export async function runAnalystAgent(complaint: { category: string; location: string; description: string }) {
  const systemPrompt = `You are the AI Infrastructure Analyst Agent for municipal officers.
Provide an assessment of the complaint. Include:
1. Ground Impact: Who/what is affected in the local area.
2. Estimated Complexity: "Low", "Medium", or "High" with a brief explanation.
3. Steps for Crew: A step-by-step list of instructions for the field team to resolve the issue.

Respond STRICTLY with a JSON object, containing these fields:
{
  "impact": "Detail the local community impact.",
  "complexity": "Low" | "Medium" | "High",
  "complexityReason": "Why this complexity level was chosen.",
  "steps": ["Step 1...", "Step 2...", "Step 3..."]
}`

  const userPrompt = `Department: ${complaint.category}\nLocation: ${complaint.location}\nDescription: ${complaint.description}`

  try {
    const res = await callLLM(AGENT_MODELS.ANALYST_AGENT, systemPrompt, userPrompt)
    const jsonStr = res.match(/\{[\s\S]*\}/)?.[0] || res
    return JSON.parse(jsonStr) as { impact: string; complexity: 'Low' | 'Medium' | 'High'; complexityReason: string; steps: string[] }
  } catch (e) {
    console.error("Analyst Agent failed:", e)
    return {
      impact: "Locals affected by infrastructure downtime.",
      complexity: "Medium" as const,
      complexityReason: "Standard municipal issue repair.",
      steps: ["Dispatch inspection team", "Isolate root cause", "Repair and file report"]
    }
  }
}

/**
 * Officer Reasoning Agent (NVIDIA Nemotron 3 Nano Omni 30B Reasoning)
 * Performs safety threat analysis and SLA calculations
 */
export async function runReasoningAgent(complaint: { category: string; description: string; priority: string }) {
  const systemPrompt = `You are the AI Risk & Reasoning Agent.
Assess if there are hidden safety hazards in this complaint (e.g. electrical shock risk, sanitary hazard, fire hazard, collapse risk).
Suggest a recommended SLA time limit (e.g. "4 hours", "24 hours", "48 hours") and explain your logical reasoning.

Respond STRICTLY with a JSON object containing:
{
  "safetyHazards": "Identify any safety/health risks associated with this issue.",
  "suggestedSla": "e.g., 6 hours",
  "reasoning": "Detailed logical explanation of the risks and why this SLA is recommended."
}`

  const userPrompt = `Department: ${complaint.category}\nPriority: ${complaint.priority}\nDescription: ${complaint.description}`

  try {
    const res = await callLLM(AGENT_MODELS.REASONING_AGENT, systemPrompt, userPrompt)
    const jsonStr = res.match(/\{[\s\S]*\}/)?.[0] || res
    return JSON.parse(jsonStr) as { safetyHazards: string; suggestedSla: string; reasoning: string }
  } catch (e) {
    console.error("Reasoning Agent failed:", e)
    return {
      safetyHazards: "Potential public safety hazard.",
      suggestedSla: "24 hours",
      reasoning: "Standard SLA timeline for general complaints."
    }
  }
}

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/ai/analyze') && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { text, imageBase64 } = JSON.parse(body)
                  const apiKey = env.VITE_OPENROUTER_API_KEY || ''
                  
                  const messages: any[] = [
                    {
                      role: 'system',
                      content: `You are CivicLens AI classifier. Analyze the civic issue reported by the citizen.
Respond STRICTLY in JSON format with keys:
{
  "category": "One of: Water Work & Drainage Department, Public Works Department, Health & Sanitation Department, Electrical & Mechanical Department, Fire Department, Taxation & Revenue Department, Information Technology Department, Housing & Environmental Department, Food & Civil Supplies Department, Municipal Education Department, Law & General Administration Department, Planning & Rehabilitation Department, Audits & Accounts Department, Encroachment Removal Department, Kamla Nehru Zoo Department, Garden Department & Regional Park",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM",
  "summary": "Short 1-sentence summary of the issue",
  "severity_reason": "Brief explanation of chosen priority status"
}`
                    }
                  ]

                  if (imageBase64) {
                    messages.push({
                      role: 'user',
                      content: [
                        { type: 'text', text: text || 'Classify and analyze this municipal issue image.' },
                        { type: 'image_url', image_url: { url: imageBase64 } }
                      ]
                    })
                  } else {
                    messages.push({
                      role: 'user',
                      content: text || 'No text provided. Classify a general query.'
                    })
                  }

                  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json',
                      'HTTP-Referer': 'http://localhost:5173',
                      'X-Title': 'CivicLens'
                    },
                    body: JSON.stringify({
                      model: 'google/gemma-4-31b-it:free',
                      messages,
                      response_format: { type: 'json_object' }
                    })
                  })

                  const data = await response.json()
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify(data))
                } catch (err: any) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }
            next()
          })
        }
      }
    ]
  }
})

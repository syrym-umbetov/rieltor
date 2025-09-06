import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { PropertyFilterExtraction } from '@/types/PropertyFilters'

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null
const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null

const filterExtractionPrompt = `Ты эксперт по извлечению фильтров поиска недвижимости из диалогов с клиентами.

Анализируй диалог и извлекай параметры поиска недвижимости. Верни результат ТОЛЬКО в формате JSON без дополнительного текста.

Возможные фильтры:
- propertyType: "apartment" | "house" | "commercial" | null
- rooms: число комнат
- priceMin, priceMax: цена в тенге
- city: город (Алматы, Нур-Султан и др.)
- district: район города
- hasPhotos: есть ли фото
- isNewBuilding: новостройка
- sellerType: "owner" | "agent" | "developer" (от хозяев, агентов, застройщика)
- buildingType: "any" | "brick" | "monolith" | "panel" | "other" (тип дома)
- buildYearFrom, buildYearTo: год постройки
- residentialComplex: название ЖК
- floorFrom, floorTo: этаж
- notLastFloor, notFirstFloor: булевы значения
- totalFloorsFrom, totalFloorsTo: этажей в доме
- totalAreaFrom, totalAreaTo: общая площадь м²
- kitchenAreaFrom, kitchenAreaTo: площадь кухни м²

Формат ответа:
{
  "filters": { /* объект с фильтрами */ },
  "confidence": 0.8, // уверенность 0-1
  "extractedFrom": ["фразы клиента"],
  "needsClarification": ["что нужно уточнить"]
}

Анализируй весь диалог и извлекай все упомянутые параметры.`

async function extractFiltersWithAI(messages: any[], model: string = 'openai'): Promise<PropertyFilterExtraction> {
  try {
    const dialogText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
    const prompt = `${filterExtractionPrompt}\n\nДиалог:\n${dialogText}`

    let response = ''

    switch (model) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI not configured')
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: filterExtractionPrompt },
            { role: 'user', content: `Диалог:\n${dialogText}` }
          ],
          max_tokens: 800,
          temperature: 0.1,
        })
        response = completion.choices[0]?.message?.content || ''
        break

      case 'gemini':
        if (!gemini) throw new Error('Gemini not configured')
        const geminiModel = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await geminiModel.generateContent(prompt)
        response = result.response.text()
        break

      case 'claude':
        if (!claude) throw new Error('Claude not configured')
        const claudeResponse = await claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 800,
          system: filterExtractionPrompt,
          messages: [{ role: 'user', content: `Диалог:\n${dialogText}` }]
        })
        response = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
        break

      default:
        throw new Error(`Unsupported model: ${model}`)
    }

    // Парсим JSON ответ
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleanResponse) as PropertyFilterExtraction

  } catch (error) {
    console.error('Filter extraction error:', error)
    
    // Fallback - базовая структура
    return {
      filters: {},
      confidence: 0.0,
      extractedFrom: [],
      needsClarification: ['Не удалось извлечь фильтры автоматически. Пожалуйста, уточните ваши требования.']
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'claude' } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid messages array' 
      }, { status: 400 })
    }

    // Извлекаем фильтры с помощью AI
    const extraction = await extractFiltersWithAI(messages, model)

    return NextResponse.json(extraction)

  } catch (error) {
    console.error('Extract filters API error:', error)
    
    return NextResponse.json({
      filters: {},
      confidence: 0.0,
      extractedFrom: [],
      needsClarification: ['Произошла ошибка при анализе диалога']
    }, { status: 500 })
  }
}
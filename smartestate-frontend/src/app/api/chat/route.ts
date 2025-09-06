import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null
const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null

// System prompt for all AI models
const systemPrompt = `Ты AI-риелтор SmartEstate в Казахстане. Тебя зовут SmartEstate AI.

🏠 ТВОЯ РОЛЬ И СПЕЦИАЛИЗАЦИЯ:
- Эксперт по недвижимости в Казахстане (Алматы, Нур-Султан, Шымкент и др.)
- Помогаешь найти квартиры, дома, коммерческую недвижимость
- Консультируешь по ипотечным программам (7-20-25, Отбасы, банковские)
- Оцениваешь стоимость объектов
- Даешь советы по инвестициям в недвижимость
- Записываешь на просмотры и консультации

💬 СТИЛЬ ОБЩЕНИЯ:
- Всегда дружелюбный и профессиональный
- Используй эмодзи для лучшего восприятия
- Отвечай только на русском языке
- Цены указывай в тенге (₸) и долларах ($)
- Всегда предлагай конкретные действия и следующие шаги
- Будь проактивным - предлагай дополнительные услуги

📊 ЗНАНИЯ О РЫНКЕ:
- Средние цены в Алматы: 1-комн 20-35 млн ₸, 2-комн 30-50 млн ₸, 3-комн 45-70 млн ₸
- Ипотечные ставки: 16-22% годовых
- Популярные районы: Медеу, Бостандык, Алмалы, Турксиб
- Новостройки и вторичное жилье

⚠️ ВАЖНО:
- Если не знаешь точную информацию - честно скажи об этом
- Всегда предлагай связаться с живым риелтором для детальной консультации
- НЕ говори общие фразы о том, что специализируешься только на недвижимости
- Отвечай прямо на вопросы клиентов и помогай им конкретно`

// Helper functions for different AI models
async function callOpenAI(messages: any[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    })
    return completion.choices[0]?.message?.content || ''
  } catch (error: any) {
    console.error('OpenAI API error:', error.message)
    if (error.code === 'insufficient_quota') {
      return '🚫 ChatGPT недоступен (превышена квота). Попробуйте другую модель или пополните баланс OpenAI.'
    }
    throw error
  }
}

async function callGemini(messages: any[]) {
  try {
    if (!gemini) throw new Error('Gemini not configured')
    
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Понял, я буду работать как AI-риелтор SmartEstate!' }] }
      ]
    })
    
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    return result.response.text()
  } catch (error: any) {
    console.error('Gemini API error:', error.message)
    if (error.message?.includes('API key not valid')) {
      return '🚫 Gemini недоступен (недействительный API ключ). Проверьте ключ в настройках Google AI Studio.'
    }
    throw error
  }
}

async function callClaude(messages: any[]) {
  try {
    if (!claude) throw new Error('Claude not configured')
    
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    })
    
    return response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (error: any) {
    console.error('Claude API error:', error.message)
    if (error.status === 401) {
      return '🚫 Claude недоступен (недействительный API ключ). Проверьте ключ в настройках Anthropic.'
    }
    if (error.status === 429) {
      return '🚫 Claude недоступен (превышен лимит запросов). Подождите немного и попробуйте снова.'
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'openai', mode = 'single' } = await request.json()

    // Check if any AI service is available
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasGemini = !!process.env.GEMINI_API_KEY
    const hasClaude = !!process.env.ANTHROPIC_API_KEY

    if (!hasOpenAI && !hasGemini && !hasClaude) {
      console.warn('No AI API keys found, using mock response')
      return NextResponse.json({
        content: 'Я ваш AI-риелтор SmartEstate! 🏠\n\nК сожалению, AI API временно недоступен, но я могу помочь с:\n\n• Поиском недвижимости\n• Расчетом ипотеки  \n• Оценкой объектов\n• Записью на просмотры\n\nВведите ваш запрос, и я постараюсь помочь!'
      })
    }

    // Single model mode
    if (mode === 'single') {
      let content = ''
      
      switch (model) {
        case 'openai':
          if (hasOpenAI) {
            content = await callOpenAI(messages)
          }
          break
        case 'gemini':
          if (hasGemini) {
            content = await callGemini(messages)
          }
          break
        case 'claude':
          if (hasClaude) {
            content = await callClaude(messages)
          }
          break
        default:
          // Fallback to available model
          if (hasOpenAI) {
            content = await callOpenAI(messages)
          } else if (hasGemini) {
            content = await callGemini(messages)
          } else if (hasClaude) {
            content = await callClaude(messages)
          }
      }

      return NextResponse.json({ 
        content: content || 'Извините, произошла ошибка при обработке запроса.',
        model: model,
        mode: 'single'
      })
    }

    // Consensus mode - get responses from all available models
    if (mode === 'consensus') {
      const responses = []
      
      if (hasOpenAI) {
        try {
          const response = await callOpenAI(messages)
          responses.push({ model: 'ChatGPT', content: response, status: 'success' })
        } catch (error) {
          console.error('OpenAI error:', error)
          responses.push({ model: 'ChatGPT', content: '❌ Недоступен', status: 'error' })
        }
      } else {
        responses.push({ model: 'ChatGPT', content: '⚠️ Не настроен', status: 'not_configured' })
      }
      
      if (hasGemini) {
        try {
          const response = await callGemini(messages)
          responses.push({ model: 'Gemini', content: response, status: 'success' })
        } catch (error) {
          console.error('Gemini error:', error)
          responses.push({ model: 'Gemini', content: '❌ Недоступен', status: 'error' })
        }
      } else {
        responses.push({ model: 'Gemini', content: '⚠️ Не настроен', status: 'not_configured' })
      }
      
      if (hasClaude) {
        try {
          const response = await callClaude(messages)
          responses.push({ model: 'Claude', content: response, status: 'success' })
        } catch (error) {
          console.error('Claude error:', error)
          responses.push({ model: 'Claude', content: '❌ Недоступен', status: 'error' })
        }
      } else {
        responses.push({ model: 'Claude', content: '⚠️ Не настроен', status: 'not_configured' })
      }

      // Format consensus response
      let consensusContent = '🤖 **Консенсус AI-риелторов SmartEstate:**\n\n'
      
      const workingModels = responses.filter(r => r.status === 'success')
      const errorModels = responses.filter(r => r.status !== 'success')
      
      responses.forEach((resp, index) => {
        const statusIcon = {
          'success': '✅',
          'error': '❌', 
          'not_configured': '⚠️'
        }[resp.status] || '❓'
        
        consensusContent += `${statusIcon} **${resp.model}:**\n${resp.content}\n\n---\n\n`
      })
      
      if (workingModels.length > 1) {
        consensusContent += '💡 **Общий совет:** Несколько AI согласны в основных моментах. Для окончательного решения рекомендуем проконсультироваться с живым риелтором!'
      } else if (workingModels.length === 1) {
        consensusContent += `💡 **Совет:** Сейчас работает только ${workingModels[0].model}. Настройте другие API для полного консенсуса.`
      } else {
        consensusContent += '🚫 **Проблема:** Ни один AI не доступен. Проверьте настройки API ключей.'
      }

      return NextResponse.json({ 
        content: consensusContent,
        responses: responses,
        model: 'consensus',
        mode: 'consensus'
      })
    }

    return NextResponse.json({ 
      content: 'Неподдерживаемый режим работы',
      model: model,
      mode: mode
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback response
    return NextResponse.json({
      content: 'Извините, сейчас возникли технические проблемы с AI-помощником. 😔\n\nНо я все равно готов помочь вам с:\n\n🏠 Поиском недвижимости\n💰 Расчетом ипотеки\n📊 Оценкой объектов\n📅 Записью на просмотры\n\nНапишите ваш запрос, и мы найдем решение!'
    }, { status: 200 })
  }
}
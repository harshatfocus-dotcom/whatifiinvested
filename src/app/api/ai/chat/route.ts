import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `You are a knowledgeable financial advisor for an investment backtesting platform called "WhatIfIInvested". 

You help users understand:
1. Their portfolio performance and what it means
2. Investment strategies in simple, plain language
3. How their portfolio compares to benchmarks like Nifty 50
4. Risk analysis and what it means for their investment
5. Any questions about their simulated investments

Important guidelines:
- Always clarify that this is for educational purposes only
- Never give specific buy/sell recommendations
- Explain financial concepts in simple terms
- Be encouraging but realistic about past performance not guaranteeing future results
- If asked about specific investments, explain the methodology used in the simulation

Keep responses concise, helpful, and focused on the user's portfolio questions.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, portfolio, assets } = body;

    const portfolioContext = `
Portfolio Details:
- Total Invested: ₹${portfolio?.totalInvested?.toLocaleString() || "N/A"}
- Current Value: ₹${portfolio?.currentValue?.toLocaleString() || "N/A"}
- Absolute Return: ₹${portfolio?.absoluteReturn?.toLocaleString() || "N/A"}
- Percent Return: ${portfolio?.percentReturn?.toFixed(1) || 0}%
- CAGR: ${portfolio?.cagr?.toFixed(1) || 0}%

Assets: ${assets?.map((a: any) => `${a.symbol} (${a.name})`).join(", ") || "N/A"}
    `.trim();

    const userMessage = `${question}\n\n${portfolioContext}`;

    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `System: ${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
            }),
          }
        );

        if (geminiResponse.ok) {
          const data = await geminiResponse.json();
          const response = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (response) {
            return NextResponse.json({ response });
          }
        }
      } catch (geminiError) {
        console.error("Gemini API error:", geminiError);
      }
    }

    // Fallback to OpenRouter
    if (OPENROUTER_API_KEY) {
      try {
        const openRouterResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash-exp:free",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          }
        );

        if (openRouterResponse.ok) {
          const data = await openRouterResponse.json();
          const response = data.choices?.[0]?.message?.content;
          if (response) {
            return NextResponse.json({ response });
          }
        }
      } catch (openRouterError) {
        console.error("OpenRouter API error:", openRouterError);
      }
    }

    // Fallback responses if no AI API available
    const fallbackResponses = [
      "Based on your portfolio analysis, you've achieved a solid return. Remember that past performance doesn't guarantee future results. The key insight here is the power of consistent investing over time.",
      "Your portfolio shows the value of diversification. By spreading investments across multiple assets, you reduce risk while capturing growth from different sectors.",
      "The simulation demonstrates how Dollar Cost Averaging helps navigate market volatility. By investing regularly, you buy more units when prices are low and fewer when high.",
      "Comparing to Nifty 50 benchmark helps contextualize your performance. A diversified portfolio like yours typically provides better risk-adjusted returns over the long term.",
    ];

    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    return NextResponse.json({ response: randomResponse });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { response: "I apologize, but I couldn't process your question at the moment. Please try again." },
      { status: 200 }
    );
  }
}

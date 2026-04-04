import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

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

    // Try Sarvam AI
    if (SARVAM_API_KEY && SARVAM_API_KEY !== "your_sarvam_api_key") {
      try {
        const sarvamResponse = await fetch(
          "https://api.sarvam.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SARVAM_API_KEY}`,
            },
            body: JSON.stringify({
              model: "sarvam-m",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          }
        );

        if (sarvamResponse.ok) {
          const data = await sarvamResponse.json();
          const response = data.choices?.[0]?.message?.content;
          if (response) {
            return NextResponse.json({ response });
          }
        }
      } catch (sarvamError) {
        console.error("Sarvam AI API error:", sarvamError);
      }
    }

    // Smart fallback responses based on actual portfolio data
    const totalInvested = portfolio?.totalInvested || 0;
    const currentValue = portfolio?.currentValue || 0;
    const percentReturn = portfolio?.percentReturn || 0;
    const cagr = portfolio?.cagr || 0;
    const assetsList = assets?.map((a: any) => a.symbol).join(", ") || "N/A";
    
    const getFallbackResponse = () => {
      const responses = [];
      
      if (percentReturn > 20) {
        responses.push(`Your portfolio has delivered an excellent ${percentReturn.toFixed(1)}% return! This significantly outperforms many traditional savings options.`);
      } else if (percentReturn > 10) {
        responses.push(`Your portfolio returned ${percentReturn.toFixed(1)}%, which is a solid performance. The CAGR of ${cagr.toFixed(1)}% shows consistent growth.`);
      } else if (percentReturn > 0) {
        responses.push(`Your portfolio is up ${percentReturn.toFixed(1)}%. While modest, remember that steady returns compound over time.`);
      } else {
        responses.push(`Your portfolio is currently down ${Math.abs(percentReturn).toFixed(1)}%. Market downturns are normal - historically markets recover.`);
      }
      
      if (cagr > 15) {
        responses.push(` The ${cagr.toFixed(1)}% CAGR is impressive and shows strong annualized growth.`);
      }
      
      responses.push(` Your portfolio contains: ${assetsList}.`);
      
      if (percentReturn > 15) {
        responses.push(" Consider that this is past performance - future results may differ.");
      }
      
      return responses.join(" ");
    };

    const response = getFallbackResponse();
    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { response: "I apologize, but I couldn't process your question at the moment. Please try again." },
      { status: 200 }
    );
  }
}

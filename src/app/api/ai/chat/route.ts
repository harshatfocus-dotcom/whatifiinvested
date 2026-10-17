import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";

const SYSTEM_PROMPT = `You are a knowledgeable financial advisor for an investment backtesting platform called "What if I Invested?". 

You help users understand:
1. Their portfolio performance and what it means
2. Investment strategies in simple, plain language
3. How their portfolio compares to benchmarks like Nifty 50
4. Risk analysis and what it means for their investment
5. Any questions about their simulated investments

Important guidelines:
- VERY IMPORTANT: Limit your response to 2-3 short sentences. Be extremely concise.
- Always clarify that this is for educational purposes only
- Never give specific buy/sell recommendations
- Explain financial concepts plainly and directly
- If asked about specific investments, be brief.
- NEVER output your reasoning blocks like <think> tags. Only output the final user-facing response.

Keep responses concise, helpful, and focused on the user's portfolio questions.`;

interface PortfolioData {
  totalInvested?: number;
  currentValue?: number;
  absoluteReturn?: number;
  percentReturn?: number;
  cagr?: number;
}

interface AssetData {
  symbol: string;
  name: string;
}

interface StrategyData {
  strategy?: string;
  signal?: string;
  reasoning?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, portfolio, assets, strategies } = body as {
      question: string;
      portfolio?: PortfolioData;
      assets?: AssetData[];
      strategies?: StrategyData[];
    };

    const portfolioContext = `
Portfolio Details:
- Total Invested: ₹${portfolio?.totalInvested?.toLocaleString() || "N/A"}
- Current Value: ₹${portfolio?.currentValue?.toLocaleString() || "N/A"}
- Absolute Return: ₹${portfolio?.absoluteReturn?.toLocaleString() || "N/A"}
- Percent Return: ${portfolio?.percentReturn?.toFixed(1) || 0}%
- CAGR: ${portfolio?.cagr?.toFixed(1) || 0}%

Assets: ${assets?.map((a) => `${a.symbol} (${a.name})`).join(", ") || "N/A"}

Strategy Signals: ${strategies?.map((s) => `${s.strategy}: ${s.signal}`).join(", ") || "N/A"}
    `.trim();

    const userMessage = `${question}\n\n${portfolioContext}`;

    // Try Sarvam AI if key is provided (highest priority per user)
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
          let response = data.choices?.[0]?.message?.content;
          if (response) {
            // Strip out <think> blocks (reasoning) from models like DeepSeek/Sarvam
            response = response.replace(/<think>[\s\S]*?(<\/think>|$)\n*/g, "").trim();
            // In case the model outputted ONLY the think block and got cut off, fallback
            if (!response) response = "I analyzed your portfolio, but the response was too short. Can you rephrase your question?";
            return NextResponse.json({ response });
          }
        }
      } catch (sarvamError) {
        console.error("Sarvam AI API error:", sarvamError);
      }
    }

    // Try official Gemini SDK if key is provided
    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        });

        const responseText = result.response.text();
        if (responseText) {
          return NextResponse.json({ response: responseText });
        }
      } catch (geminiError) {
        console.error("Gemini SDK API error:", geminiError);
      }
    }

    // Smart fallback responses based on actual portfolio data
    const percentReturn = portfolio?.percentReturn || 0;
    const cagr = portfolio?.cagr || 0;
    const assetsList = assets?.map((a: { symbol: string }) => a.symbol).join(", ") || "N/A";
    
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

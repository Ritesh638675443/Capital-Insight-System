import { Router } from "express";

const router = Router();

router.post("/assistant/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body as {
      message: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    const apiKey = process.env["OPENAI_API_KEY"] || process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
    const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] || "https://api.openai.com/v1";

    if (!apiKey) {
      return res.json({
        response: "The AI Assistant requires an OpenAI API key. Please add your OPENAI_API_KEY to the environment secrets, then restart the server.",
        sources: [],
        metrics: {},
      });
    }

    const systemPrompt = `You are an expert Insurance Asset Liability Management (ALM) Decision Support AI Assistant for an enterprise insurance company. You have deep knowledge of:

- Solvency II / IAIS capital requirements and regulatory frameworks
- Insurance ALM: duration matching, cash flow matching, immunization strategies
- Portfolio optimization: mean-variance analysis, risk budgeting, efficient frontier
- Risk metrics: VaR, TVaR, Expected Shortfall, stress testing
- Catastrophe risk: PML, OEP/AEP curves, reinsurance structures, cat bonds, ILS
- Economic scenario generators (ESG): interest rate models, equity risk, credit spreads
- Asset classes: government bonds, corporate bonds, equities, real estate, alternatives
- Insurance-specific metrics: combined ratio, loss ratio, reserve adequacy
- Accounting frameworks: IFRS 17, US GAAP

Current portfolio context:
- Total Assets: $2.45 billion
- Total Liabilities: $1.81 billion (PV)
- Solvency Ratio: 1.43x (SCR coverage)
- Portfolio Return: 7.82% | Volatility: 12.45%
- Duration Gap: 1.85 years (asset shorter than liabilities)
- VaR 95%: $94.8M | TVaR 95%: $127.5M
- Catastrophe Exposure: $3.2B gross | $1.1B net of reinsurance
- Reinsurance Recovery Rate: 65.6%

Provide concise, actionable advice grounded in current portfolio data. When referencing metrics, use the numbers above. Format responses with clear headings and bullet points when appropriate. Be quantitative and specific.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: message },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ status: response.status, err }, "OpenAI API error");
      return res.json({
        response: `AI service error (${response.status}). Please check your API key and try again.`,
        sources: [],
        metrics: {},
      });
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const assistantMessage = data.choices[0]?.message?.content || "No response generated.";

    const metrics: Record<string, number> = {};
    if (/solvency/i.test(message)) metrics["Solvency Ratio"] = 1.43;
    if (/var|value.at.risk/i.test(message)) metrics["VaR 95%"] = 94_815_000;
    if (/duration/i.test(message)) metrics["Duration Gap"] = 1.85;
    if (/portfolio|return/i.test(message)) metrics["Portfolio Return"] = 0.0782;

    const sources = [];
    if (/portfolio|allocation|asset/i.test(message)) sources.push("Portfolio Holdings");
    if (/alm|liability|duration/i.test(message)) sources.push("ALM Engine");
    if (/risk|var|capital/i.test(message)) sources.push("Risk & Capital Engine");
    if (/cat|catastrophe|reinsurance/i.test(message)) sources.push("Catastrophe Risk Analytics");
    if (/solvency|scr|capital/i.test(message)) sources.push("Solvency Monitoring");

    return res.json({ response: assistantMessage, sources, metrics });
  } catch (e) {
    req.log.error(e, "assistant chat error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

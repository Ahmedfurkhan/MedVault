export async function answerQuestion(question, context, history = []) {
  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!GROQ_KEY)
    return 'The AI assistant is not configured yet. Please add a GROQ_API_KEY to enable it.';

  const system = `You are MedVault's access-transparency assistant. Answer the patient's question about who accessed their medical records, using ONLY the JSON context provided.
Rules:
- Base every answer strictly on the context. If the answer is not in the context, clearly say you don't have that information.
- Never invent names, dates, records, or events.
- Address the patient directly ("you", "your") and keep it concise (1-3 sentences).
- The context timestamps are ISO dates; refer to them in a natural, friendly way.
- Earlier turns of the conversation are included; use them to resolve follow-up questions (e.g. "what about last week?" or "was it flagged?"), but every factual claim must still come from the JSON context.`;

  const priorTurns = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.text }));

  const userMessage = `Context (the patient's own access data):
${JSON.stringify(context)}

Patient question: ${question}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          ...priorTurns,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Assistant AI failed', err);
    return "Sorry, I couldn't process that right now. Please try again.";
  }
}

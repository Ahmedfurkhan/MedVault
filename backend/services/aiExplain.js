const SEVERITIES = ['low', 'medium', 'high'];

const FALLBACK = {
  explanation: 'Automated flags detected unusual activity (e.g., off-hours or rapid views).',
  severity: 'medium',
  action: 'Review this access event and contact your provider if it looks unfamiliar.',
};

export async function explainAnomaly(logEntry) {
  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!GROQ_KEY) return { ...FALLBACK, generated: false };

  const prompt = `You are writing directly TO the patient whose medical record was accessed. This access was flagged by our security rules engine. Address the patient in the second person ("you", "your"). Never write as the clinic or provider (do NOT say "our office", "we", or "contact us"); the patient's recommended action should tell THEM what to do (e.g. "contact your provider's privacy office", "review this access in your log"). Return a JSON object with exactly these keys:
- "explanation": one plain-English sentence, addressed to the patient, describing what happened. Do NOT invent information.
- "severity": one of "low", "medium", or "high" reflecting how concerning this access is for the patient.
- "action": one short, concrete next step the patient can take, phrased as an instruction to them.
Details: Accessed by ${logEntry.accessorName} (${logEntry.accessorRole}) at ${logEntry.timestamp}. Flags: ${logEntry.flags.join(', ')}.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      explanation: parsed.explanation || FALLBACK.explanation,
      severity: SEVERITIES.includes(parsed.severity) ? parsed.severity : FALLBACK.severity,
      action: parsed.action || FALLBACK.action,
      generated: true,
    };
  } catch (err) {
    console.error('AI service failed', err);
    return { ...FALLBACK, generated: false };
  }
}

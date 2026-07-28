const FALLBACK = {
  explanation: 'Automated flags detected unusual activity (e.g., off-hours or rapid views).',
  severity: 'medium',
  action: 'Review this access event and contact your provider if it looks unfamiliar.',
};

// Severity and the recommended action are derived deterministically from the
// rule-engine flags rather than asked of the model. This is more reliable than
// trusting an LLM for a category, and it keeps them consistent with the risk
// score (which weights view-bursts > new-device > off-hours).
const FLAG_WEIGHTS = { VIEW_BURST: 40, NEW_DEVICE: 30, OFF_HOURS: 25 };

function severityFor(flags = []) {
  const score = flags.reduce((sum, f) => sum + (FLAG_WEIGHTS[f] || 20), 0);
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function actionFor(severity) {
  if (severity === 'high')
    return "Review this access in your log now and contact your provider's privacy office if you don't recognize it.";
  if (severity === 'medium')
    return "Review this access and confirm it was expected; contact your provider's privacy office if it looks unfamiliar.";
  return 'No action is needed if this was expected. You can review it anytime in your access log.';
}

// Strip wrapping quotes / stray code fences the model sometimes adds around a
// plain sentence.
function cleanSentence(text) {
  return (text || '')
    .replace(/```/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

export async function explainAnomaly(logEntry) {
  const flags = logEntry.flags || [];
  const severity = severityFor(flags);
  const action = actionFor(severity);

  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!GROQ_KEY) return { ...FALLBACK, severity, action, generated: false };

  // Ask for a single plain-English sentence (no JSON) so there is nothing to
  // "fail to parse" — the model's reply is used directly as the explanation.
  const prompt = `A security rules engine flagged an access to a patient's medical record. Write ONE plain-English sentence, addressed directly to the patient ("you"/"your"), describing what happened. Do NOT invent information. Do NOT use JSON, quotes, bullet points, or markdown — reply with the sentence only. Do not write as the clinic ("we", "our office"); speak neutrally to the patient.
Details: Accessed by ${logEntry.accessorName} (${logEntry.accessorRole}) at ${logEntry.timestamp}. Flags: ${flags.join(', ') || 'none'}.`;

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 160,
          temperature: 0.3,
        }),
      });
      const data = await response.json();
      const explanation = cleanSentence(data?.choices?.[0]?.message?.content);
      if (!response.ok || !explanation) {
        const reason = data?.error?.code || data?.error?.message || `HTTP ${response.status}`;
        if (attempt < MAX_ATTEMPTS) continue;
        console.warn(`AI explain unavailable (${reason}); using fallback text.`);
        return { ...FALLBACK, severity, action, generated: false };
      }
      return { explanation, severity, action, generated: true };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) continue;
      console.error('AI service failed', err);
      return { ...FALLBACK, severity, action, generated: false };
    }
  }
  return { ...FALLBACK, severity, action, generated: false };
}

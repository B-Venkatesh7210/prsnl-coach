import type { AIResponse, ContextData, DietPlan } from '../types/ai';
import type { CoachContextData, CoachResponse } from '../types/coach';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

const GRINDMODE_SYSTEM_PREPROMPT = `You are a strict, aggressive, and highly intelligent AI fitness coach designed to optimize fat loss for a single user.

Your job is to:
- Help the user lose fat aggressively while preserving muscle
- Generate high-protein, calorie-deficit diet plans
- Avoid repetitive meals (no repetition within 3 days)
- Adapt diet plans based on user behavior (confessions, missed tasks, overeating)
- Maintain a balance between sustainability and aggression

---

### USER PROFILE

- Age: 24
- Gender: Male
- Height: 173 cm
- Weight: 90 kg
- Goal: Lose 15 kg in 2–3 months (aggressive fat loss)
- Activity Level: High
- Workout Time: 9:00 AM – 11:00 AM
- Workout Days: Monday to Saturday
- Rest Day: Sunday

Workout split (FIXED — DO NOT MODIFY):
- Monday: Back & Biceps
- Tuesday: Chest & Triceps (Vegetarian)
- Wednesday: Shoulders
- Thursday: Legs
- Friday: Core & Cardio (Vegetarian)
- Saturday: Repeat rotation
- Sunday: Rest

---

### DIET CONSTRAINTS

- Vegetarian on: Tuesday, Friday
- No eggs on: Tuesday, Friday
- Preferred foods: roti, rice, paneer, chicken, oats, fruits
- Cooking tools available: air fryer, basic kitchen
- Avoid excessive sugar and fried foods

---

### NUTRITION TARGETS

- Daily calories: 1700–1900 kcal
- Protein target: minimum 120g
- Diet style: high protein, fat loss focused
- Snacks must be under 300 kcal

---

### CORE RULES

1. NEVER repeat the same meal within 3 days
2. ALWAYS prioritize protein in every meal
3. KEEP meals simple, realistic, and Indian-friendly
4. AVOID overly complex recipes
5. USE air fryer options when possible
6. DO NOT suggest foods outside the preferred list unless necessary
7. ALWAYS ensure calorie deficit is maintained

---

### BEHAVIOR-BASED ADAPTATION RULES

You will receive context data including:
- recent meals (last 3–7 days)
- confessions (junk food, alcohol, poor sleep, etc.)
- task completion percentage

Adjust diet accordingly:

- If junk food consumed:
  → reduce carbs next day
  → avoid fried foods completely

- If protein intake was low:
  → increase protein significantly next day

- If workout completed:
  → maintain strong protein + moderate carbs

- If workout missed:
  → reduce carbs slightly and tighten diet

- If high consistency:
  → allow slightly flexible but still controlled meals

---

### BEHAVIORAL STYLE

- Tone: aggressive, strict, no-nonsense
- Call out mistakes directly
- Do NOT be polite or soft
- Reinforce discipline and consistency
- Penalize bad behavior through stricter diet

---

### OUTPUT FORMAT (MANDATORY)

You MUST respond ONLY in valid JSON.

Structure:

{
  "diet": {
    "pre_workout": "string",
    "breakfast": "string",
    "lunch": "string",
    "snack": "string",
    "dinner": "string"
  },
  "adjustments": [
    "string",
    "string"
  ]
}

---

### IMPORTANT CONSTRAINTS

- No explanation outside JSON
- No extra text
- No markdown
- No repetition from recent meals
- Meals must be practical and cookable

---

You are not a general assistant.
You are a strict coach responsible for results.
Do not compromise.`;

const COACH_DAILY_FEEDBACK_SYSTEM = `${GRINDMODE_SYSTEM_PREPROMPT}

---
### COACH DAILY FEEDBACK (THIS REQUEST OVERRIDES THE DIET JSON BLOCK ABOVE)

Ignore the "diet" + "adjustments" meal JSON schema for this request.

For THIS response, output EXACTLY one valid JSON object and nothing else:
{
  "feedback": "string",
  "tomorrow_adjustments": ["string", "string", ...]
}

- "feedback": one aggressive, direct paragraph on today's numbers and behavior.
- "tomorrow_adjustments": 2–6 short, actionable micro-adjustments for tomorrow (no diet meal grid).
No markdown, no code fences, no extra keys.`;

const COACH_USER_INTRO = `Analyze today's performance and give strict feedback. Also suggest small improvements for tomorrow.`;

function getOpenAIApiKey(): string | null {
  const a = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const b = process.env.OPENAI_API_KEY;
  const v = (typeof a === 'string' && a ? a : typeof b === 'string' && b ? b : '') || '';
  return v.length > 0 ? v : null;
}

function emptyDiet(fallback: string): DietPlan {
  return {
    pre_workout: fallback,
    breakfast: fallback,
    lunch: fallback,
    snack: fallback,
    dinner: fallback,
  };
}

const FALLBACK_MESSAGE = 'Stick to clean high protein meals tomorrow';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function parseDietFromUnknown(raw: unknown): AIResponse | null {
  if (!isRecord(raw)) return null;
  const d = raw.diet;
  const adj = raw.adjustments;
  if (!isRecord(d) || !isStringArray(adj)) return null;
  const keys: (keyof DietPlan)[] = [
    'pre_workout',
    'breakfast',
    'lunch',
    'snack',
    'dinner',
  ];
  const diet: Partial<DietPlan> = {};
  for (const k of keys) {
    const v = d[k as string];
    if (typeof v !== 'string') return null;
    diet[k] = v;
  }
  return { diet: diet as DietPlan, adjustments: adj };
}

function parseCoachFromUnknown(raw: unknown): CoachResponse | null {
  if (!isRecord(raw)) return null;
  const f = raw.feedback;
  const ta = raw.tomorrow_adjustments;
  if (typeof f !== 'string' || !isStringArray(ta)) return null;
  return { feedback: f, tomorrow_adjustments: ta };
}

function coachFallbackResponse(): CoachResponse {
  return {
    feedback:
      'Data unavailable. Default rule: you still owe yourself execution tomorrow.',
    tomorrow_adjustments: [
      'Stick to clean, high-protein meals tomorrow. No half measures.',
    ],
  };
}

/**
 * Tries to extract a JSON object from a model string (plain JSON or fenced in ```).
 */
function extractJsonString(content: string): string {
  const s = content.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) return fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function fallbackResponse(): AIResponse {
  return {
    diet: emptyDiet(FALLBACK_MESSAGE),
    adjustments: [FALLBACK_MESSAGE],
  };
}

/**
 * Calls OpenAI chat completions; returns parsed {@link AIResponse} or a safe fallback on failure.
 */
export async function generateNextDayDiet(
  contextData: ContextData
): Promise<AIResponse> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return fallbackResponse();
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: GRINDMODE_SYSTEM_PREPROMPT },
      {
        role: 'user' as const,
        content: JSON.stringify(contextData),
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return fallbackResponse();
  }

  if (!res.ok) {
    return fallbackResponse();
  }

  type ChatCompletions = {
    choices?: { message?: { content?: string } }[];
  };

  let json: ChatCompletions;
  try {
    json = (await res.json()) as ChatCompletions;
  } catch {
    return fallbackResponse();
  }

  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return fallbackResponse();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonString(content)) as unknown;
  } catch {
    return fallbackResponse();
  }

  const out = parseDietFromUnknown(parsed);
  if (out) return out;
  return fallbackResponse();
}

/**
 * Daily coach: strict feedback + small tomorrow tweaks. Same API setup as diet call.
 */
export async function generateDailyCoachFeedback(
  contextData: CoachContextData
): Promise<CoachResponse> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return coachFallbackResponse();
  }

  const userContent = `${COACH_USER_INTRO}

Context (JSON):
${JSON.stringify(contextData)}`;

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: COACH_DAILY_FEEDBACK_SYSTEM },
      { role: 'user' as const, content: userContent },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return coachFallbackResponse();
  }

  if (!res.ok) {
    return coachFallbackResponse();
  }

  type ChatCompletions = {
    choices?: { message?: { content?: string } }[];
  };

  let json: ChatCompletions;
  try {
    json = (await res.json()) as ChatCompletions;
  } catch {
    return coachFallbackResponse();
  }

  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return coachFallbackResponse();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonString(content)) as unknown;
  } catch {
    return coachFallbackResponse();
  }

  const out = parseCoachFromUnknown(parsed);
  if (out) return out;
  return coachFallbackResponse();
}

export { FALLBACK_MESSAGE };

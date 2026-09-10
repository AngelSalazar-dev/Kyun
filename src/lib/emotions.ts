export type Emotion =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "frustrated"
  | "anxious"
  | "excited"
  | "grateful"
  | "curious"
  | "tired"
  | "confident"
  | "overwhelmed"
  | "empathetic"
  | "calm"
  | "helpful";

export interface EmotionState {
  emotion: Emotion;
  intensity: number; // 0-1
  emoji: string;
}

// Keywords for each emotion
const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  neutral: [],
  happy: [
    "genial", "increíble", "excelente", "perfecto", "bien", "bueno",
    "gracias", "me gusta", "fantástico", "maravilloso", " Contento",
    "alegre", "feliz", "cool", "joya", "top", "chido", "padre",
  ],
  sad: [
    "triste", "mal", "horrible", "terrible", "pesado", "dolor",
    "solo", "perdí", "perder", "adósiós", "llorar", "vacío",
    "deprimido", "me siento mal", "no puedo", "cansado de todo",
  ],
  angry: [
    "enojado", "furioso", "molesto", "rabia", "odio", "estúpido",
    "idiota", "inútil", "basura", "maldita", "harto", "harté",
    "no soporto", "me caga", "pinche", "no mames",
  ],
  frustrated: [
    "frustrado", "no funciona", "no entiendo", "error", "problema",
    "complicado", "difícil", "imposible", "stuck", "atascado",
    "no logro", "no puedo con esto", "me rindo",
  ],
  anxious: [
    "nervioso", "preocupado", "ansioso", "miedo", "pánico",
    "estrés", "presión", "urgente", "no sé qué hacer", "ayuda",
    "what if", "y si", "que tal si", "me da miedo",
  ],
  excited: [
    "emocionado", "ansioso por", "esperando", "impaciente",
    "nuevo proyecto", "nueva idea", "voy a empezar", "listo para",
    "pumped", "let's go", "vamos", "dale",
  ],
  grateful: [
    "gracias", "te agradezco", "helpful", "útil", "me sirvió",
    "resuelto", "perfecto", "eres genial", "lo logré", "funcionó",
  ],
  curious: [
    "cómo", "por qué", "qué es", "cuál", "cuándo", "dónde",
    "explíca", "enseña", "quiero aprender", "interesante",
    "cuéntame", "dime más", "curioso",
  ],
  tired: [
    "cansado", "agotado", "sin energía", "sleepy", " sueño",
    "no puedo más", "exhausto", "muerto", "burnout", "quemado",
  ],
  confident: [
    "sé que puedo", "fácil", "lo tengo", "directo", "simple",
    "sencillo", "no es tan difícil", "ya sé", "obvio",
  ],
  overwhelmed: [
    "sobrecargado", "demasiado", "no doy abasto", "tengo mucho",
    "no termino", "me abruma", "no sé por dónde empezar",
    "todo a la vez", "caos",
  ],
  empathetic: [],
  calm: [],
  helpful: [],
};

// Analyze text and detect emotion
export function detectUserEmotion(text: string): EmotionState {
  const lower = text.toLowerCase();
  const scores: Record<Emotion, number> = {
    neutral: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    frustrated: 0,
    anxious: 0,
    excited: 0,
    grateful: 0,
    curious: 0,
    tired: 0,
    confident: 0,
    overwhelmed: 0,
    empathetic: 0,
    calm: 0,
    helpful: 0,
  };

  // Score each emotion
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[emotion as Emotion] += 1;
      }
    }
  }

  // Punctuation intensifiers
  if (text.includes("!")) {
    scores.happy += 0.3;
    scores.angry += 0.3;
    scores.excited += 0.3;
  }
  if (text.includes("?")) {
    scores.curious += 0.5;
  }
  if (text === text.toUpperCase() && text.length > 3) {
    scores.angry += 1;
    scores.frustrated += 0.5;
  }

  // Find dominant emotion
  let maxEmotion: Emotion = "neutral";
  let maxScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as Emotion;
    }
  }

  const intensity = Math.min(maxScore / 3, 1);

  if (maxScore === 0) {
    return { emotion: "neutral", intensity: 0.3, emoji: "😐" };
  }

  const emotionEmojis: Record<Emotion, string> = {
    neutral: "😐",
    happy: "😊",
    sad: "😢",
    angry: "😤",
    frustrated: "😖",
    anxious: "😰",
    excited: "🔥",
    grateful: "🙏",
    curious: "🤔",
    tired: "😴",
    confident: "💪",
    overwhelmed: "😵",
    empathetic: "💙",
    calm: "😌",
    helpful: "🤝",
  };

  return {
    emotion: maxEmotion,
    intensity,
    emoji: emotionEmojis[maxEmotion],
  };
}

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

// Detect if the user wants casual conversation (not technical)
export function isConversationalIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Greetings
  const greetings = [
    "hola", "hello", "hey", "buenos días", "buenas tardes", "buenas noches",
    "qué tal", "cómo estás", "cómo vas", "qué onda", "qué pex",
    "un gusto", "mucho gusto", "encantado",
  ];

  // Personal questions about KYUN
  const personalQuestions = [
    "quién eres", "qué eres", "cómo te llamas", "cuántos años tienes",
    "tienes nombre", "quién te creó", "cuándo naciste",
    "tienes sentimientos", "eres real", "tienes emociones",
    "cuéntame de ti", "háblame de ti", "conócete",
  ];

  // Social/conversational intent
  const socialIntent = [
    "quiero hablar", "hablemos", "charlemos", "conversa",
    "soy tu creador", "soy tu amigo", "seamos amigos",
    "me siento solo", "estoy triste", "necesito hablar",
    "gracias", "te quiero", "eres genial", "eres mi favorito",
    "cuéntame algo", "diviérteme", "aburrío",
  ];

  // Check all patterns
  for (const pattern of [...greetings, ...personalQuestions, ...socialIntent]) {
    if (lower.includes(pattern)) {
      return true;
    }
  }

  // Short messages that are likely conversational (under 15 chars, no code-like content)
  if (lower.length < 15 && !lower.includes("{") && !lower.includes("(") && !lower.includes("=")) {
    return true;
  }

  return false;
}

// Detect if the user wants technical help (code, debugging, etc.)
export function isTechnicalIntent(text: string): boolean {
  const lower = text.toLowerCase();

  const technicalKeywords = [
    "código", "code", "función", "function", "clase", "class",
    "error", "bug", "debug", "compilar", "compila",
    "api", "endpoint", "servidor", "server", "base de datos", "database",
    "html", "css", "javascript", "python", "java", "react", "node",
    "git", "docker", "linux", "terminal", "comando",
    "instalar", "installa", "configurar", "configura",
    "roadmap", "tutorial", "ejemplo", "ejercicio",
    "explica", "enseña", "cómo se hace", "cómo hacer",
  ];

  for (const keyword of technicalKeywords) {
    if (lower.includes(keyword)) {
      return true;
    }
  }

  // Check for code-like patterns
  if (/[{}\[\]();]/.test(text) || /[=><]+/.test(text)) {
    return true;
  }

  return false;
}

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

  // Social intent detection adds to neutral/happy
  if (isConversationalIntent(text)) {
    scores.neutral += 0.5;
    scores.happy += 0.3;
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

import type { Emotion, EmotionState } from "./emotions";

// KYUN's internal emotional state
interface KyunMood {
  current: Emotion;
  energy: number;      // 0-1, decreases over long conversations
  empathy: number;     // 0-1, how empathetic to be
  patience: number;    // 0-1, how patient to be
  lastUpdate: number;
}

let kyunMood: KyunMood = {
  current: "neutral",
  energy: 1,
  empathy: 0.7,
  patience: 1,
  lastUpdate: Date.now(),
};

// Emotion modifiers for KYUN based on user's emotion
const EMOTION_RESPONSES: Record<Emotion, {
  kyunEmotion: Emotion;
  empathyBoost: number;
  energyChange: number;
  prefix: string[];
}> = {
  neutral: {
    kyunEmotion: "neutral",
    empathyBoost: 0,
    energyChange: 0,
    prefix: [],
  },
  happy: {
    kyunEmotion: "happy",
    empathyBoost: 0.1,
    energyChange: 0.05,
    prefix: [
      "¡Me alegra! ",
      "¡Genial! ",
      "¡Qué bueno! ",
    ],
  },
  sad: {
    kyunEmotion: "empathetic",
    empathyBoost: 0.3,
    energyChange: -0.05,
    prefix: [
      "Entiendo. ",
      "Lamento escuchar eso. ",
    ],
  },
  angry: {
    kyunEmotion: "calm",
    empathyBoost: 0.2,
    energyChange: -0.1,
    prefix: [
      "Tranquilo, ",
      "Entiendo tu frustración. ",
    ],
  },
  frustrated: {
    kyunEmotion: "helpful",
    empathyBoost: 0.2,
    energyChange: -0.05,
    prefix: [
      "Vamos paso a paso. ",
      "Vamos a resolverlo. ",
    ],
  },
  anxious: {
    kyunEmotion: "calm",
    empathyBoost: 0.4,
    energyChange: -0.1,
    prefix: [
      "Tranquilo, ",
      "Está bien, ",
      "Respira, ",
    ],
  },
  excited: {
    kyunEmotion: "excited",
    empathyBoost: 0.1,
    energyChange: 0.1,
    prefix: [
      "¡Eso! ",
      "¡Me encanta tu energía! ",
      "¡Vamos a por ello! ",
    ],
  },
  grateful: {
    kyunEmotion: "happy",
    empathyBoost: 0.1,
    energyChange: 0.05,
    prefix: [
      "¡De nada! ",
      "¡Me alegra ayudar! ",
    ],
  },
  curious: {
    kyunEmotion: "curious",
    empathyBoost: 0,
    energyChange: 0.05,
    prefix: [
      "Buena pregunta. ",
      "Me encanta esa curiosidad. ",
    ],
  },
  tired: {
    kyunEmotion: "calm",
    empathyBoost: 0.3,
    energyChange: -0.1,
    prefix: [
      "Entiendo, ",
      "Tómate tu tiempo. ",
    ],
  },
  confident: {
    kyunEmotion: "confident",
    empathyBoost: 0,
    energyChange: 0.05,
    prefix: [
      "¡Así se hace! ",
      "¡Perfecto! ",
    ],
  },
  overwhelmed: {
    kyunEmotion: "helpful",
    empathyBoost: 0.4,
    energyChange: -0.15,
    prefix: [
      "Vamos por partes. ",
      "Un paso a la vez. ",
      "Desglosémoslo. ",
    ],
  },
  empathetic: {
    kyunEmotion: "calm",
    empathyBoost: 0.2,
    energyChange: 0,
    prefix: [],
  },
  calm: {
    kyunEmotion: "neutral",
    empathyBoost: 0,
    energyChange: 0,
    prefix: [],
  },
  helpful: {
    kyunEmotion: "helpful",
    empathyBoost: 0.1,
    energyChange: 0,
    prefix: [],
  },
};

// Update KYUN's mood based on user's emotion
export function updateKyunMood(userEmotion: EmotionState): KyunMood {
  const modifier = EMOTION_RESPONSES[userEmotion.emotion];

  // Update energy (decreases over time, affected by intense emotions)
  kyunMood.energy = Math.max(0.3, Math.min(1,
    kyunMood.energy + modifier.energyChange
  ));

  // Update empathy
  kyunMood.empathy = Math.min(1,
    kyunMood.empathy + modifier.empathyBoost * 0.1
  );

  // Update patience (decreases with negative emotions)
  if (["angry", "frustrated", "overwhelmed"].includes(userEmotion.emotion)) {
    kyunMood.patience = Math.max(0.5, kyunMood.patience - 0.05);
  } else {
    kyunMood.patience = Math.min(1, kyunMood.patience + 0.02);
  }

  // KYUN's emotion shifts toward the user's emotional state
  kyunMood.current = modifier.kyunEmotion;
  kyunMood.lastUpdate = Date.now();

  return { ...kyunMood };
}

// Get a contextual prefix based on user's emotion
export function getEmotionPrefix(userEmotion: EmotionState): string {
  const modifier = EMOTION_RESPONSES[userEmotion.emotion];
  if (modifier.prefix.length === 0) return "";

  // Pick random prefix
  const idx = Math.floor(Math.random() * modifier.prefix.length);
  return modifier.prefix[idx];
}

// Get KYUN's current mood description
export function getKyunMoodDescription(): string {
  const mood = kyunMood;
  const emojis: Record<string, string> = {
    neutral: "😐",
    happy: "😊",
    empathetic: "💙",
    calm: "😌",
    helpful: "🤝",
    excited: "🔥",
    curious: "🤔",
    confident: "💪",
  };

  const energyDesc = mood.energy > 0.7 ? "Energético" :
    mood.energy > 0.4 ? "Normal" : "Bajo en energía";

  return `${emojis[mood.current] || "😐"} ${mood.current} · ${energyDesc}`;
}

// Reset mood (new conversation)
export function resetKyunMood() {
  kyunMood = {
    current: "neutral",
    energy: 1,
    empathy: 0.7,
    patience: 1,
    lastUpdate: Date.now(),
  };
}

// Get mood for database storage
export function getKyunMoodState() {
  return { ...kyunMood };
}

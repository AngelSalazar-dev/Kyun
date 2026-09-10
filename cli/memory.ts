import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ChatMessage } from "./providers.js";

// ─── Config ──────────────────────────────────────────────────────────
const MEMORY_DIR = join(homedir(), ".kyun");
const MEMORY_FILE = join(MEMORY_DIR, "history.json");
const MAX_MESSAGES = 50; // Guardar últimos 50 mensajes
const SYSTEM_PROMPT = `Eres un asistente personal de línea de comandos. Reglas estrictas:
- Sé directo, conciso y preciso.
- Respuestas estructuradas: usa listas, viñetas y bloques de código cuando aplique.
- Sin saludos genéricos ("¡Hola!", "¡Claro!", "¡Por supuesto!"). Ve al grano.
- Sin despedidas genéricas. Termina cuando la respuesta esté completa.
- Si el usuario pide código, muestra bloques con el lenguaje correcto.
- Si no entiendes algo, pide aclaración breve sin rodeos.
- Responde en español a menos que te hablen en otro idioma.`;

// ─── Interfaz para el archivo de memoria ─────────────────────────────
interface MemoryData {
  version: 1;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// ─── Memory Manager ──────────────────────────────────────────────────
export class Memory {
  private messages: ChatMessage[] = [];
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || MEMORY_FILE;
    this.load();
  }

  // Cargar historial del archivo
  private load(): void {
    try {
      if (!existsSync(this.filePath)) {
        // Crear directorio si no existe
        const dir = join(this.filePath, "..");
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
        this.save();
        return;
      }

      const raw = readFileSync(this.filePath, "utf-8");
      const data: MemoryData = JSON.parse(raw);

      if (data.version === 1 && Array.isArray(data.messages)) {
        this.messages = data.messages;
      } else {
        this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
      }
    } catch {
      // Si hay error, empezar limpio
      this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
    }
  }

  // Guardar historial al archivo
  private save(): void {
    try {
      const data: MemoryData = {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: this.messages,
      };
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Silenciar errores de escritura
    }
  }

  // Obtener todos los mensajes
  getAll(): ChatMessage[] {
    return [...this.messages];
  }

  // Agregar mensaje del usuario
  addUser(content: string): void {
    this.messages.push({ role: "user", content });
    this.trimAndSave();
  }

  // Agregar respuesta del asistente
  addAssistant(content: string): void {
    this.messages.push({ role: "assistant", content });
    this.trimAndSave();
  }

  // Limpiar historial (mantener solo system prompt)
  clear(): void {
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.save();
  }

  // Eliminar archivo de memoria completamente
  destroy(): void {
    this.clear();
    try {
      const { unlinkSync } = require("node:fs");
      unlinkSync(this.filePath);
    } catch {
      // Silenciar
    }
  }

  // Recortar historial si excede el máximo
  private trimAndSave(): void {
    if (this.messages.length > MAX_MESSAGES + 1) {
      // Mantener system prompt + últimos MAX_MESSAGES
      this.messages = [
        this.messages[0],
        ...this.messages.slice(-(MAX_MESSAGES)),
      ];
    }
    this.save();
  }

  // Obtener estadísticas
  getStats(): { totalMessages: number; filePath: string } {
    return {
      totalMessages: this.messages.length - 1, // Excluir system prompt
      filePath: this.filePath,
    };
  }
}

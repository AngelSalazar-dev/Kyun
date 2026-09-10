import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ProviderManager } from "./providers.js";
import { Memory } from "./memory.js";
import { ContextManager } from "./context.js";
import {
  getCurrentPersonality,
  setPersonality,
  listPersonalities,
  type Personality,
} from "./personalities.js";
import {
  c,
  showBanner,
  showHelp,
  providerBadge,
  tokenBadge,
  formatProviderStatus,
} from "./ui.js";

// ─── Inicializar módulos ─────────────────────────────────────────────
const memory = new Memory();
const providers = new ProviderManager();
const context = new ContextManager();

// Cargar historial previo en el contexto
context.setHistory(memory.getAll());

// ─── Actualizar system prompt según personalidad ─────────────────────
function updateSystemPrompt(personality: Personality): void {
  const history = context.getFullHistory();
  const systemIndex = history.findIndex((m) => m.role === "system");

  if (systemIndex >= 0) {
    history[systemIndex] = { role: "system", content: personality.systemPrompt };
  } else {
    context.addUser(""); // dummy
    const newHistory = [{ role: "system" as const, content: personality.systemPrompt }, ...history.filter((m) => m.role !== "system")];
    context.clear();
    for (const msg of newHistory) {
      if (msg.role === "user") context.addUser(msg.content);
      if (msg.role === "assistant") context.addAssistant(msg.content);
    }
  }
}

// ─── Spinner manual ──────────────────────────────────────────────────
function showSpinner(text: string): NodeJS.Timeout {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  process.stdout.write(`  ${frames[0]} ${text}`);
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${frames[i++ % frames.length]} ${text}`);
  }, 80);
  return interval;
}

function stopSpinner(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  process.stdout.write("\r" + " ".repeat(50) + "\r");
}

// ─── Handler de comandos ─────────────────────────────────────────────
function handleCommand(input: string): boolean {
  const parts = input.trim().toLowerCase().split(/\s+/);
  const cmd = parts[0];
  const arg = parts[1];

  switch (cmd) {
    case "/help":
      showHelp();
      return true;

    case "/clear":
      memory.clear();
      context.clear();
      const p1 = getCurrentPersonality();
      context.addUser("");
      context.getFullHistory().splice(0, context.getFullHistory().length, {
        role: "system",
        content: p1.systemPrompt,
      });
      console.log(c.success("  Historial limpiado.\n"));
      return true;

    case "/forget":
      memory.clear();
      context.clear();
      const p2 = getCurrentPersonality();
      context.addUser("");
      context.getFullHistory().splice(0, context.getFullHistory().length, {
        role: "system",
        content: p2.systemPrompt,
      });
      console.log(c.success("  Memoria borrada permanentemente.\n"));
      return true;

    case "/provider":
      formatProviderStatus(providers.getStatus());
      return true;

    case "/personality": {
      if (arg) {
        const found = setPersonality(arg);
        if (found) {
          updateSystemPrompt(found);
          memory.clear();
          const msgs = context.getFullHistory();
          for (const msg of msgs) {
            if (msg.role === "user") memory.addUser(msg.content);
            if (msg.role === "assistant") memory.addAssistant(msg.content);
          }
          console.log(c.success(`  ${found.emoji} Personalidad: ${found.name}\n`));
        } else {
          console.log(c.error(`  Personalidad "${arg}" no encontrada.\n`));
        }
      } else {
        console.log();
        console.log(c.bold("  Personalidades disponibles:"));
        console.log(listPersonalities());
        console.log();
        console.log(c.dim("  Uso: /personality <id>"));
        console.log();
      }
      return true;
    }

    case "/history": {
      const msgs = context.getFullHistory();
      console.log();
      if (msgs.length <= 1) {
        console.log(c.dim("  Sin mensajes en el historial."));
      } else {
        const recent = msgs.slice(-10);
        for (const msg of recent) {
          if (msg.role === "system") continue;
          const prefix = msg.role === "user" ? c.green("tú") : c.primary("kyun");
          const preview =
            msg.content.length > 60
              ? msg.content.slice(0, 60) + "..."
              : msg.content;
          console.log(`  ${prefix} ▸ ${c.dim(preview)}`);
        }
      }
      console.log();
      return true;
    }

    case "/stats": {
      const memStats = memory.getStats();
      const ctxStats = context.getStats();
      const personality = getCurrentPersonality();
      console.log();
      console.log(c.bold("  Estadísticas:"));
      console.log(`  Personalidad:       ${personality.emoji} ${personality.name}`);
      console.log(`  Mensajes totales:   ${c.cyan(String(ctxStats.totalMessages))}`);
      console.log(`  Tokens estimados:   ${c.cyan(String(ctxStats.estimatedTokens))}`);
      console.log(`  Tokens en contexto: ${c.cyan(String(ctxStats.contextTokens))} / ${c.dim(ctxStats.contextLimit + " límite")}`);
      console.log(`  Archivo:            ${c.dim(memStats.filePath)}`);
      console.log();
      return true;
    }

    case "/exit":
    case "/quit":
      return false;

    default:
      console.log(c.dim(`  Comando no reconocido. Escribe /help para ver comandos.\n`));
      return true;
  }
}

// ─── Bucle Interactivo con Streaming ─────────────────────────────────
async function main(): Promise<void> {
  // Validar API keys
  if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.error(c.error("  Error: Configura al menos una API key en .env"));
    console.error(c.dim("  Variables: GROQ_API_KEY, OPENROUTER_API_KEY\n"));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const personality = getCurrentPersonality();
  showBanner();
  console.log(c.dim(`  Personalidad: ${personality.emoji} ${personality.name}\n`));

  // Mostrar si hay historial previo
  const stats = context.getStats();
  if (stats.totalMessages > 0) {
    console.log(c.dim(`  Historial cargado: ${stats.totalMessages} mensajes, ~${stats.estimatedTokens} tokens\n`));
  }

  while (true) {
    try {
      const input = await rl.question(c.green(" tú ▸ "));
      const trimmed = input.trim();

      // Ignorar líneas vacías
      if (!trimmed) continue;

      // Comandos especiales
      if (trimmed.startsWith("/")) {
        const shouldContinue = handleCommand(trimmed);
        if (shouldContinue === false) break;
        continue;
      }

      // Agregar mensaje del usuario al contexto y memoria
      context.addUser(trimmed);
      memory.addUser(trimmed);

      // Construir contexto optimizado para la llamada
      const apiContext = context.buildContext();

      // Mostrar spinner mientras se establece conexión
      const spinner = showSpinner("Conectando...");

      // Usar streaming para mostrar tokens en tiempo real
      let fullResponse = "";
      let provider = "";
      let firstChunk = true;

      try {
        for await (const { chunk, provider: prov } of providers.stream(apiContext)) {
          if (firstChunk) {
            stopSpinner(spinner);
            process.stdout.write(c.primary(` ${personality.emoji} kyun ▸ `));
            provider = prov;
            firstChunk = false;
          }
          process.stdout.write(chunk);
          fullResponse += chunk;
        }
      } catch (streamError: any) {
        stopSpinner(spinner);
        console.error(c.error(`  ✖ ${streamError.message}`));
        context.popLastUser();
        memory.clear();
        const msgs = context.getFullHistory();
        for (const msg of msgs) {
          if (msg.role === "user") memory.addUser(msg.content);
          if (msg.role === "assistant") memory.addAssistant(msg.content);
        }
        context.setHistory(memory.getAll());
        console.log();
        continue;
      }

      if (!firstChunk) {
        console.log();
        const ctxStats = context.getStats();
        console.log(c.dim(`  ${providerBadge(provider)} | contexto: ${ctxStats.contextTokens} tokens`));
        console.log();
      }

      // Guardar respuesta en contexto y memoria
      context.addAssistant(fullResponse);
      memory.addAssistant(fullResponse);
    } catch (error: any) {
      if (error.message === "readline was closed") break;
      console.error(c.error(`  ✖ ${error.message}\n`));
    }
  }

  rl.close();
  console.log(c.dim("\n  Saliendo...\n"));
}

main();

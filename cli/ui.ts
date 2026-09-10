import chalk from "chalk";
import ora from "ora";

// ─── Colores del tema ────────────────────────────────────────────────
export const c = {
  primary: chalk.hex("#6C63FF"),
  secondary: chalk.hex("#FF6584"),
  success: chalk.hex("#4CAF50"),
  warning: chalk.hex("#FFC107"),
  error: chalk.hex("#F44336"),
  muted: chalk.hex("#9E9E9E"),
  dim: chalk.hex("#616161"),
  bold: chalk.bold,
  cyan: chalk.cyan,
  green: chalk.green,
  yellow: chalk.yellow,
  red: chalk.red,
  white: chalk.white,
  gray: chalk.gray,
};

// ─── Banner ──────────────────────────────────────────────────────────
export function showBanner(): void {
  const line = c.dim("─".repeat(44));
  console.log();
  console.log(c.primary("  ╔═══════════════════════════════════════════╗"));
  console.log(c.primary("  ║") + c.bold.white("           KYUN v2.0 — Asistente CLI      ") + c.primary("║"));
  console.log(c.primary("  ║") + c.dim("  Streaming • Fallback • Markdown           ") + c.primary("║"));
  console.log(c.primary("  ╚═══════════════════════════════════════════╝"));
  console.log();
  console.log(`  ${c.dim("Comandos:")} /help  /clear  /provider  /history  /exit`);
  console.log(line);
  console.log();
}

// ─── Ayuda ───────────────────────────────────────────────────────────
export function showHelp(): void {
  console.log();
  console.log(c.bold("  Comandos disponibles:"));
  console.log();
  console.log(`  ${c.cyan("/help")}           Mostrar esta ayuda`);
  console.log(`  ${c.cyan("/personality")}    Ver/cambiar personalidad`);
  console.log(`  ${c.cyan("/clear")}          Limpiar historial de la sesión`);
  console.log(`  ${c.cyan("/forget")}         Borrar memoria permanentemente`);
  console.log(`  ${c.cyan("/provider")}       Ver estado de los providers`);
  console.log(`  ${c.cyan("/history")}        Ver últimos 10 mensajes`);
  console.log(`  ${c.cyan("/stats")}          Ver estadísticas de uso`);
  console.log(`  ${c.cyan("/exit")}           Salir de la CLI`);
  console.log();
  console.log(c.dim("  La memoria se guarda en ~/.kyun/history.json"));
  console.log(c.dim("  Atajos: Ctrl+C para salir"));
  console.log();
}

// ─── Spinner ─────────────────────────────────────────────────────────
export function createSpinner(text: string) {
  return ora({
    text,
    color: "cyan",
    spinner: "dots",
  });
}

// ─── Formateo de respuesta ───────────────────────────────────────────
export function formatResponse(text: string, provider: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    // Bloques de código
    if (line.startsWith("```")) {
      formatted.push(c.dim(line));
      continue;
    }
    // Headers markdown
    if (line.startsWith("# ")) {
      formatted.push(c.bold.cyan(line));
      continue;
    }
    if (line.startsWith("## ")) {
      formatted.push(c.primary.bold(line));
      continue;
    }
    // Listas
    if (/^\s*[-*]\s/.test(line)) {
      formatted.push(c.green("  •") + line.replace(/^\s*[-*]\s/, ""));
      continue;
    }
    // Listas numeradas
    if (/^\s*\d+\.\s/.test(line)) {
      formatted.push(c.cyan(line));
      continue;
    }
    // Texto normal
    formatted.push(line);
  }

  return formatted.join("\n");
}

// ─── Formatear provider badge ────────────────────────────────────────
export function providerBadge(provider: string): string {
  const colors: Record<string, typeof chalk> = {
    groq: chalk.hex("#6C63FF"),
    openrouter: chalk.hex("#FF6584"),
  };
  const color = colors[provider] || chalk.white;
  return color(`[via ${provider}]`);
}

// ─── Formatear tokens ────────────────────────────────────────────────
export function tokenBadge(tokens?: { prompt: number; completion: number }): string {
  if (!tokens) return "";
  const total = tokens.prompt + tokens.completion;
  return c.dim(`(${total} tokens)`);
}

// ─── Formatear provider status ───────────────────────────────────────
export function formatProviderStatus(
  status: Record<string, { enabled: boolean; inCooldown: boolean }>
): void {
  console.log();
  console.log(c.bold("  Estado de providers:"));
  console.log();

  for (const [name, s] of Object.entries(status)) {
    const icon = !s.enabled
      ? c.red("✖")
      : s.inCooldown
      ? c.yellow("⚠ cooldown")
      : c.green("●");

    const label = name === "groq" ? "Groq (primario)" : "OpenRouter (fallback)";
    console.log(`  ${icon}  ${c.bold(label)}`);
  }
  console.log();
}

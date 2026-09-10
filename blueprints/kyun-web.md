# KYUN Web App — Blueprint de Arquitectura

## Visión General
Migrar KYUN de CLI a una web app responsiva que funcione en celular, tablet y desktop.

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| **Framework** | Next.js | 15.x | App Router, Server Actions, API Routes |
| **UI** | Tailwind CSS + shadcn/ui | latest | Estilos rápidos, componentes accesibles |
| **Backend** | Next.js API Routes | - | Sin servidor separado, deploy simplificado |
| **Streaming** | Server-Sent Events (SSE) | - | Streaming de tokens sin WebSocket |
| **State** | React hooks (useState/useReducer) | - | Sin dependencias externas |
| **Memoria** | SQLite (better-sqlite3) | - | Persistencia local, sin setup |
| **Personalidades** | JSON config | - | Mismo sistema de la CLI |

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                       │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Chat   │  │ Sidebar  │  │  Personality   │  │
│  │  View   │  │  Menu    │  │    Picker      │  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │             │                │            │
│       └─────────────┼────────────────┘            │
│                     │                             │
│              fetch('/api/chat')                    │
│              + SSE streaming                       │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│                    BACKEND                        │
│  ┌──────────┐  ┌────┴────┐  ┌────────────────┐  │
│  │ /api/chat│  │ Context │  │   Providers    │  │
│  │  (SSE)   │──│ Manager │──│ (Groq+OpenRtr) │  │
│  └──────────┘  └─────────┘  └────────────────┘  │
│                     │                             │
│              ┌──────┴──────┐                      │
│              │   SQLite    │                      │
│              │  (memory)   │                      │
│              └─────────────┘                      │
└─────────────────────────────────────────────────┘
```

---

## Estructura de Archivos

```
kyun-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout raíz
│   │   ├── page.tsx             # Página principal (chat)
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts     # Endpoint SSE para streaming
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatView.tsx     # Vista principal del chat
│   │   │   ├── MessageBubble.tsx # Burbuja de mensaje
│   │   │   └── InputBar.tsx     # Barra de envío
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx      # Menú lateral
│   │   │   └── PersonalityPicker.tsx
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── providers.ts         # Mismo providers.ts de CLI
│   │   ├── context.ts           # Mismo context.ts de CLI
│   │   ├── memory.ts            # Adaptado a SQLite
│   │   └── personalities.ts     # Mismo personalities.ts
│   └── types/
│       └── index.ts             # Tipos compartidos
├── prisma/
│   └── schema.prisma            # Schema de SQLite
├── package.json
└── tailwind.config.ts
```

---

## Endpoints API

### POST /api/chat
Recibe mensaje, retorna SSE stream.

```
Request:
{
  "message": "¿Qué es React?",
  "personality": "default",
  "historyId": "abc123"
}

Response: text/event-stream
data: {"chunk":"React","provider":"groq"}
data: {"chunk":" es","provider":"groq"}
data: {"chunk":" una","provider":"groq"}
...
data: {"done":true,"contextTokens":1850}
```

### GET /api/history
Retorna historial de conversaciones.

### DELETE /api/history/:id
Elimina una conversación.

### GET /api/personalities
Lista personalidades disponibles.

---

## Componentes UI

### ChatView (página principal)
```
┌──────────────────────────────────────┐
│  ☰  KYUN                    🌙 Jose │  ← Header con personalidad
├──────────────────────────────────────┤
│                                      │
│         ┌─────────────┐              │
│         │  ¿Qué es    │              │  ← Mensaje usuario
│         │  React?     │              │
│         └─────────────┘              │
│                                      │
│    ┌───────────────────────┐         │
│    │ React es una librería │         │  ← Respuesta asistente
│    │ para construir UI...  │         │
│    │                       │         │
│    │ ```javascript         │         │
│    │ const App = () => {}  │         │
│    │ ```                   │         │
│    │                       │         │
│    │ [via groq] 1850 tokens│         │
│    └───────────────────────┘         │
│                                      │
├──────────────────────────────────────┤
│  Escribe tu mensaje...        [Enviar]│  ← Input bar
└──────────────────────────────────────┘
```

### Sidebar (colapsable en móvil)
```
┌──────────────┐
│  KYUN v3.0   │
├──────────────┤
│  + Nueva chat │
│              │
│  Historial:  │
│  • React...  │
│  • Python... │
│  • Docker... │
│              │
├──────────────┤
│  Personalidad│
│  🤖 Default  │
│  👨‍💻 José      │
│  🌙 Luna     │
│  ⚡ Max      │
│  🎓 Profesor │
│  👨‍🍳 Chef     │
├──────────────┤
│  ⚙️ Config   │
└──────────────┘
```

---

## Flujo de Streaming

```
1. Usuario escribe mensaje
2. Frontend POST /api/chat con message + personality
3. Backend construye contexto (ContextManager)
4. Backend retorna SSE stream
5. Frontend lee chunks y los muestra en tiempo real
6. Al terminar, backend guarda en SQLite
7. Frontend actualiza sidebar con nueva conversación
```

---

## Responsive Design

| Breakpoint | Comportamiento |
|------------|---------------|
| < 768px (móvil) | Sidebar oculto,汉堡 menu toggle |
| 768-1024px (tablet) | Sidebar colapsado, toggle |
| > 1024px (desktop) | Sidebar siempre visible |

---

## Deploy

### Opción 1: Vercel (recomendado)
```bash
npx vercel
```
- Gratis para hobby projects
- Deploy automático desde Git
- SQLite no funciona en Vercel → usar Turso (SQLite serverless)

### Opción 2: Railway
```bash
railway init
railway up
```
- $5/mes
- Soporta SQLite
- Custom domain

### Opción 3: Local (lan)
```bash
npm run dev -- --hostname 0.0.0.0
```
- Accesible en red local (celular同一 WiFi)

---

## Orden de Construcción

1. Setup Next.js + Tailwind + shadcn/ui
2. Migrar providers.ts, context.ts, personalities.ts
3. Crear API route con SSE streaming
4. Construir ChatView + MessageBubble + InputBar
5. Construir Sidebar + PersonalityPicker
6. Agregar SQLite para persistencia
7. Responsive design (mobile-first)
8. Testing y optimización

---

## Acceptance Criteria

- [ ] Streaming funciona en celular y desktop
- [ ] Personalidades se cambian en tiempo real
- [ ] Historial persiste entre sesiones
- [ ] UI responsive en 3 breakpoints
- [ ] Tiempo de carga < 2s en 3G
- [ ] Streaming latency < 500ms primer token

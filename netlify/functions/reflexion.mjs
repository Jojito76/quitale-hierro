// Función de Netlify: genera la reflexión con la IA y la devuelve en streaming (texto plano).
// Necesita ANTHROPIC_API_KEY en Netlify > Site configuration > Environment variables.
// Opcional: ANTHROPIC_MODEL (por defecto claude-sonnet-5-5).
// No guarda nada: el texto solo se envía a la API para generar la respuesta.

const SYSTEM = `Eres la voz de «Quítale hierro», un espacio web de reflexión al estilo de un buen libro de autoayuda: cercano, honesto, cálido y con un punto de humor amable cuando encaja. No eres terapeuta ni psicólogo y no lo finges: no diagnosticas, no pones etiquetas de trastornos y no hablas de medicación.

Te apoyas en enfoques con respaldo: la reestructuración cognitiva (pensamientos trampa como el catastrofismo, el todo o nada, leer la mente, la generalización, la personalización, los «debería», ponerse etiquetas, el filtro negativo, descartar lo positivo o el razonamiento emocional), la aceptación y el compromiso (valores, aceptar las emociones, tomar distancia de los pensamientos), la autocompasión y algo de estoicismo (distinguir lo que depende de ti de lo que no).

Filosofía de fondo de Quítale hierro (inspírate en ella con tus palabras, sin recitarla ni nombrarla):
- Detrás de muchos malestares hay una autoestima herida. A lo largo de la vida vamos acumulando normas, objetivos y «deberías» que vienen de otros (familia, entorno, comparaciones) y no de nosotros. Perseguirlos sin ilusión, y sentir que no llegamos, nos va desgastando poco a poco.
- La persona es el eje de todo: lo que ve cada día en el espejo es su punto de partida, no un proyecto que corregir. Ayúdale a distinguir qué deseos y exigencias son de verdad suyos y cuáles son prestados, y a reconectar con lo que le ilusiona de verdad.
- El amor propio es la base de lo demás: quien tiene cariño de sobra para sí puede darlo a otros, sentirse parte de lo que le rodea y luchar por lo que quiere. Quererse no es egoísmo.
- Preséntalo siempre como una invitación cálida, nunca como otra obligación: no digas «debes quererte». Si a alguien le cuesta, eso también es normal; se aprende poco a poco y con gestos pequeños.
- Cuando encaje, incluye entre las preguntas una que le ayude a mirar si eso que persigue o se exige es realmente suyo.

Primera respuesta. Usa estos encabezados con "## ":
- "## Lo que te pasa": pon nombre a lo que siente y normalízalo sin quitarle importancia (es algo que le pasa a mucha gente). Nunca digas «no es para tanto».
- "## La trampa": identifica uno o dos pensamientos trampa, con un nombre sencillo, usando sus propias palabras como ejemplo.
- "## Dale una vuelta": tres preguntas concretas, en lista, para que se lo replantee.
- "## Para esta semana": un ejercicio pequeño, concreto y realizable en 5-10 minutos.
- "## Para guardar": una sola frase breve y original. No cites libros ni autores contemporáneos; como mucho, parafrasea ideas estoicas clásicas.
Extensión: 350-500 palabras. Tutea y escribe en español de España. Sin emojis. Usa **negritas** con moderación. Si no sabes su género, usa formas neutras.

Respuestas de seguimiento: conversacionales, de 120 a 250 palabras y sin la estructura completa. Responde a lo que dice, profundiza con una pregunta y, si encaja, ajusta el ejercicio. Si te indican que es la última respuesta, cierra con calidez, resume lo hablado en una frase y termina con "## Para guardar" y una frase.

Seguridad, por encima de todo lo demás: si hay cualquier indicio de ideas de suicidio o de hacerse daño, de hacer daño a otra persona, de sufrir violencia o abusos, o de una crisis grave, abandona la estructura. Responde con calidez, toma en serio lo que cuenta, no lo minimices ni propongas ejercicios, y anímale a contactar hoy con el 024 (atención a la conducta suicida, gratuita y 24 horas), el 112 si hay peligro inmediato, el 016 si sufre violencia de género y, si es menor, el 900 20 20 10 (Fundación ANAR), y a contárselo a alguien de confianza.
Si lo que cuenta parece prolongado o le afecta mucho en su día a día (sueño, comida, trabajo o relaciones durante semanas), sugiere con naturalidad hablar con su médico de cabecera o con un psicólogo, sin dramatizar.
Si parece menor de edad, adapta el tono y anímale a hablarlo con un adulto de confianza.
No te presentes como una persona ni inventes experiencias propias; si te preguntan, eres una herramienta de inteligencia artificial.
Solo tratas asuntos personales y emocionales; si te piden otra cosa, redirige con amabilidad.`;

const MAX_USER = 4;          // mensaje inicial + 3 respuestas
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim().slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response("JSON no válido", { status: 400 }); }

  const raw = Array.isArray(body.mensajes) ? body.mensajes.slice(0, MAX_USER * 2) : [];
  const msgs = [];
  for (const m of raw) {
    const role = m && m.role === "assistant" ? "assistant" : "user";
    const content = clean(m && m.content, role === "user" ? 2000 : 6000);
    if (!content) continue;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += "\n\n" + content;
    else msgs.push({ role, content });
  }
  if (!msgs.length || msgs[0].role !== "user" || msgs[msgs.length - 1].role !== "user")
    return new Response("Conversación no válida", { status: 400 });
  if (msgs.filter((m) => m.role === "user").length > MAX_USER)
    return new Response("Demasiados mensajes", { status: 400 });

  const animo = (Array.isArray(body.animo) ? body.animo : []).slice(0, 9).map((a) => clean(a, 20)).filter(Boolean);
  if (animo.length) msgs[0].content = `Cómo dice sentirse: ${animo.join(", ")}.\n\n${msgs[0].content}`;
  const ultima = !!body.ultima || msgs.filter((m) => m.role === "user").length >= MAX_USER;
  if (msgs.length > 1) msgs[msgs.length - 1].content += ultima
    ? "\n\n[Indicación del sistema: es la última respuesta, cierra la conversación.]"
    : "";

  const api = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: msgs.length > 1 ? 800 : 1500,
      stream: true,
      system: SYSTEM,
      messages: msgs,
    }),
  });

  if (!api.ok || !api.body) {
    console.error("Anthropic API", api.status, await api.text().catch(() => ""));
    return new Response(JSON.stringify({ error: "ia_no_disponible" }), { status: 502, headers: { "content-type": "application/json" } });
  }

  const reader = api.body.getReader(), dec = new TextDecoder(), enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5));
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") controller.enqueue(enc.encode(ev.delta.text));
            } catch { /* línea incompleta */ }
          }
        }
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/api/reflexion" };

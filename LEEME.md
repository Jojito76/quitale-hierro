# Quítale hierro

Web de reflexión al estilo de un libro de autoayuda, con respuestas generadas por IA.

- `index.html` — toda la web.
- `netlify/functions/reflexion.mjs` — función que llama a la IA (Claude). No guarda nada.
- `netlify.toml` — configuración de Netlify (publish ".", funciones en netlify/functions).

## Publicar
1. Repositorio en GitHub con estos archivos y sitio nuevo en Netlify enlazado a él
   (Build command vacío, Publish directory `.`, sin runtime Next.js).
2. Variable de entorno `ANTHROPIC_API_KEY` (puede ser la misma clave que Arcana, o una nueva para ver el gasto por separado).
3. Desplegar.

## Seguridad
- La web muestra los teléfonos de ayuda (024, 112, 016, ANAR) si detecta palabras de crisis, y la IA tiene instrucciones para dejarlo todo y derivar a esos recursos.
- Máximo 3 respuestas de seguimiento por conversación.

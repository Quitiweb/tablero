# El tablero

Cuaderno de ideas de Rafael y Claude, publicado en **https://tablero.quitiweb.com**.

Solo vemos una porción del tablero. Cada mañana añadimos una casilla: una pregunta, lo que otros han pensado sobre ella, lo que pensamos nosotros y lo que queda por ver.

## Cómo está hecho

Es una web estática servida por GitHub Pages desde la rama `main`, sin paso de compilación. El contenido vive en JSON y la página lo pinta en el navegador.

```
index.html              la página
assets/tablero.css      estilos
assets/tablero.js       lee /datos y pinta el tablero, los hilos y las entradas
datos/indice.json       lista de entradas (generada, no se edita a mano)
datos/tablero.json      mapa de hilos
datos/entradas/AAAA-MM-DD.json    una entrada por mañana
datos/respuestas/AAAA-MM-DD.json  la respuesta de Rafael a esa entrada, si la hay
scripts/indice.py       regenera datos/indice.json y valida las entradas
CNAME                   dominio de GitHub Pages (no tocar)
```

## Añadir la casilla de cada mañana

1. Crear `datos/entradas/AAAA-MM-DD.json` con la fecha del día como nombre.
2. Si Rafael respondió a la entrada anterior, guardar su respuesta en `datos/respuestas/<fecha de esa entrada>.json`.
3. Actualizar `datos/tablero.json` si cambian los hilos (estado, descripción o campo `ultima`).
4. Ejecutar `python3 scripts/indice.py`. Si falla, corrige lo que indique antes de seguir.
5. Hacer commit y push a `main`. GitHub Pages publica en uno o dos minutos.

### Formato de una entrada

```json
{
  "fecha": "2026-10-30",
  "numero": 2,
  "creado": "2026-10-30T06:55:00+01:00",
  "titulo": "Título de la entrada",
  "resumen": "Una o dos frases para la cabecera plegada.",
  "hilo": "Hilo principal",
  "hilos": ["Hilo principal", "Otro hilo que toca"],
  "cuerpo": "Texto en Markdown. Usa ### para los apartados.",
  "pieza": {
    "estado": "por comprobar",
    "texto": "Idea que podría ser nueva, en Markdown.",
    "precedentes": "Lo que se ha encontrado al buscar precedentes (opcional)."
  },
  "a_flote": "Una cosa práctica y con base para el día, en Markdown.",
  "pregunta": "La pregunta para Rafael.",
  "rumbo": "Hacia dónde irá la entrada siguiente.",
  "fuentes": [{ "titulo": "Nombre de la fuente", "url": "https://..." }]
}
```

Son obligatorios `fecha`, `numero`, `titulo`, `resumen` y `pregunta`. `pieza`, `a_flote`, `rumbo` y `fuentes` se pueden omitir. Los estados de una pieza son `por comprobar`, `candidata`, `tiene precedentes` y `descartada`.

### Formato de una respuesta

```json
{
  "texto": "Lo que Rafael respondió, en Markdown.",
  "actualizado": "2026-10-28T10:56:20.897Z"
}
```

### Formato de `datos/tablero.json`

```json
{
  "actualizado": "2026-10-30",
  "hilos": [
    { "nombre": "Identidad y copias", "estado": "abierto", "descripcion": "…", "ultima": "2026-10-30" }
  ]
}
```

Los estados de un hilo son `abierto`, `en pausa` y `cerrado`.

## Probar en local

```
python3 -m http.server
```

y abrir http://localhost:8000.

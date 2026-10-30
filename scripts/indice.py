#!/usr/bin/env python3
"""Regenera datos/indice.json a partir de datos/entradas y datos/respuestas.

GitHub Pages no lista carpetas, así que la web necesita este índice para
saber qué entradas existen. Ejecútalo después de añadir o cambiar una casilla:

    python3 scripts/indice.py
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DATOS = RAIZ / "datos"
CAMPOS = ("fecha", "numero", "titulo", "resumen", "pregunta")


def main():
    entradas = []
    errores = []
    for ruta in sorted((DATOS / "entradas").glob("*.json")):
        try:
            e = json.loads(ruta.read_text(encoding="utf-8"))
        except json.JSONDecodeError as err:
            errores.append(f"{ruta.name}: JSON no válido ({err})")
            continue
        falta = [c for c in CAMPOS if not e.get(c) and e.get(c) != 0]
        if falta:
            errores.append(f"{ruta.name}: faltan campos {', '.join(falta)}")
        if e.get("fecha") and e["fecha"] != ruta.stem:
            errores.append(f"{ruta.name}: la fecha {e['fecha']} no coincide con el nombre del archivo")
        entradas.append({
            "id": ruta.stem,
            "numero": e.get("numero"),
            "titulo": e.get("titulo"),
            "respuesta": (DATOS / "respuestas" / ruta.name).exists(),
        })

    if errores:
        print("\n".join(errores), file=sys.stderr)
        sys.exit(1)

    entradas.sort(key=lambda x: x["id"], reverse=True)
    indice = {"entradas": entradas}
    (DATOS / "indice.json").write_text(
        json.dumps(indice, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"indice.json: {len(entradas)} entradas")


if __name__ == "__main__":
    main()

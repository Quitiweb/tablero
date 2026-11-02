#!/usr/bin/env python3
"""Copia a datos/ lo exportado del cuaderno (el artifact de claude.ai).

El cuaderno se exporta con ArtifactData (action "list" con out_dir) de las
colecciones entradas, respuestas y tablero, todas al mismo directorio. Queda:

    <dir>/entradas/AAAA-MM-DD.json
    <dir>/respuestas/AAAA-MM-DD.json
    <dir>/tablero/actual.json

Uso:

    python3 scripts/importar.py <dir>

Escribe datos/entradas, datos/respuestas y datos/tablero.json, y después
regenera datos/indice.json con scripts/indice.py.
"""
import json
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DATOS = RAIZ / "datos"


def escribir(ruta, datos):
    datos.pop("id", None)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if len(sys.argv) != 2:
        sys.exit("Uso: python3 scripts/importar.py <dir>")
    origen = pathlib.Path(sys.argv[1])

    cuenta = {}
    for coleccion in ("entradas", "respuestas"):
        archivos = sorted((origen / coleccion).glob("*.json"))
        for archivo in archivos:
            escribir(DATOS / coleccion / archivo.name, json.loads(archivo.read_text(encoding="utf-8")))
        cuenta[coleccion] = len(archivos)

    tablero = origen / "tablero" / "actual.json"
    if tablero.exists():
        escribir(DATOS / "tablero.json", json.loads(tablero.read_text(encoding="utf-8")))

    print(f"Importadas {cuenta['entradas']} entradas y {cuenta['respuestas']} respuestas")
    subprocess.run([sys.executable, str(RAIZ / "scripts" / "indice.py")], check=True)


if __name__ == "__main__":
    main()

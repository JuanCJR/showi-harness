"""AC-10, AC-11 y AC-12 — el adaptador de payload y los hooks.

Este es el fichero más importante de la instrumentación, porque la instrumentación es lo que
convierte una regla del método en algo comprobable. Una medida inventada no es un dato peor: es
peor que no tener dato, porque se cita con la misma confianza.

Dos conclusiones de una retrospectiva anterior salieron de ceros de instrumentos desconectados. Lo
que se prueba aquí es que eso no pueda repetirse en silencio.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "instrumentacion"))

import _payload  # noqa: E402

CLAUDECODE = {
    "tool_name": "Write",
    "tool_input": {"file_path": "/p/apps/web/x.tsx"},
    "agent_type": "frontend",
    "session_id": "s-1",
}


class EsquemaConocido(unittest.TestCase):
    def test_lee_el_contrato_de_claude_code(self):
        c = _payload.leer(json.dumps(CLAUDECODE))
        self.assertEqual(c["_esquema"], "claudecode")
        self.assertEqual(c["file"], "/p/apps/web/x.tsx")
        self.assertEqual(c["agent"], "frontend")
        self.assertEqual(c["tool"], "Write")
        self.assertEqual(c["session"], "s-1")

    def test_lee_una_variante_en_camelCase(self):
        # Varias herramientas usan camelCase. Es la misma información con otro nombre, no un
        # esquema desconocido.
        c = _payload.leer(json.dumps({"toolName": "Edit", "toolInput": {"filePath": "/p/a.ts"}}))
        self.assertEqual(c["file"], "/p/a.ts")
        self.assertEqual(c["tool"], "Edit")
        self.assertNotEqual(c["_esquema"], "desconocido")

    def test_lee_la_skill_invocada(self):
        c = _payload.leer(json.dumps({"tool_name": "Skill", "tool_input": {"skill": "tdd"}}))
        self.assertEqual(c["skill"], "tdd")


class AC10_EsquemaDesconocido(unittest.TestCase):
    def test_lo_marca_como_desconocido(self):
        c = _payload.leer(json.dumps({"algo": "raro", "otra": 1}))
        self.assertEqual(c["_esquema"], "desconocido")

    def test_adjunta_las_claves_reales_que_traia(self):
        # Sin esto la sonda no sirve de nada: son las claves las que permiten añadir la ruta y
        # publicar un parche, en vez de adivinar.
        c = _payload.leer(json.dumps({"zeta": 1, "alfa": 2}))
        self.assertEqual(sorted(c["_claves"]), ["alfa", "zeta"])

    def test_no_adjunta_claves_cuando_si_reconoce_el_esquema(self):
        self.assertNotIn("_claves", _payload.leer(json.dumps(CLAUDECODE)))


class AC11_NuncaInventa(unittest.TestCase):
    def test_el_agente_ausente_queda_nulo_y_no_pasa_a_ser_el_principal(self):
        # LA aserción de este fichero. `agent_type` solo existe en una de las seis herramientas.
        # Rellenarlo con «main» produciría un ratio de delegación que mide al adaptador, no al
        # repositorio — que es exactamente el cero falso que costó dos conclusiones equivocadas.
        c = _payload.leer(json.dumps({"tool_name": "Write", "tool_input": {"file_path": "/p/a"}}))
        self.assertIsNone(c["agent"])
        self.assertNotEqual(c["agent"], "main")

    def test_los_demas_campos_ausentes_tambien_quedan_nulos(self):
        c = _payload.leer(json.dumps({"tool_name": "Write"}))
        for campo in ("file", "skill", "session"):
            self.assertIsNone(c[campo], campo)

    def test_ningun_campo_toma_un_interrogante_ni_una_cadena_vacia(self):
        c = _payload.leer(json.dumps({}))
        for clave, valor in c.items():
            if clave.startswith("_"):
                continue
            self.assertIsNone(valor, f"{clave} = {valor!r}")

    def test_una_entrada_ilegible_no_se_convierte_en_datos(self):
        c = _payload.leer("esto no es json")
        self.assertEqual(c["_esquema"], "desconocido")
        self.assertIsNone(c["agent"])


class AC12_LosHooksNoRompenLaLlamada(unittest.TestCase):
    ENTRADAS = ["", "no es json", "null", "[1,2,3]", '"cadena"', "{}", '{"tool_input": null}']

    def _correr(self, hook, entrada, destino):
        return subprocess.run(
            [sys.executable, os.path.join(RAIZ, "instrumentacion", hook)],
            input=entrada, capture_output=True, text=True, timeout=10,
            env={**os.environ, "SHOWI_DESTINO": destino},
        )

    def test_salen_cero_ante_cualquier_entrada(self):
        # Un hook que rompe la llamada que observa cuesta más que el dato que recoge.
        with tempfile.TemporaryDirectory() as d:
            for hook in ("log-skill-usage.py", "delegation-watch.py"):
                for entrada in self.ENTRADAS:
                    r = self._correr(hook, entrada, d)
                    self.assertEqual(r.returncode, 0, f"{hook} con {entrada!r}: {r.stderr}")

    def test_salen_cero_aunque_no_puedan_escribir(self):
        # Este caso existe porque el de arriba **no probaba lo que decía**: ninguna de sus entradas
        # llegaba a lanzar, así que quitar el `try/except` de un hook lo dejaba verde. Lo descubrió
        # una mutación. Aquí el destino es un fichero, no un directorio: escribir ahí sí lanza, y lo
        # único que puede salvar el código de salida es la red de seguridad.
        with tempfile.TemporaryDirectory() as d:
            destino = os.path.join(d, "no-soy-un-directorio")
            with open(destino, "w") as fh:
                fh.write("x")
            # Ruta **relativa** a propósito: con una absoluta de otro árbol, el vigía de delegación
            # sale antes de intentar escribir y la mutación no lo tocaría. El payload tiene que
            # llegar hasta el punto que puede lanzar, o el caso no prueba nada.
            payload = json.dumps(
                {"tool_name": "Write", "tool_input": {"file_path": "x.tsx", "skill": "s"},
                 "agent_type": "frontend", "session_id": "s-1"}
            )
            for hook in ("log-skill-usage.py", "delegation-watch.py"):
                r = self._correr(hook, payload, destino)
                self.assertEqual(r.returncode, 0, f"{hook}: {r.stderr}")

    def test_registran_lo_que_reconocen(self):
        with tempfile.TemporaryDirectory() as d:
            self._correr("log-skill-usage.py", json.dumps(
                {"tool_name": "Skill", "tool_input": {"skill": "tdd"}, "session_id": "s"}), d)
            lineas = open(os.path.join(d, "skill-usage.jsonl"), encoding="utf-8").readlines()
            self.assertEqual(json.loads(lineas[0])["skill"], "tdd")

    def test_lo_que_no_reconocen_queda_registrado_como_desconocido(self):
        # La sonda: en una herramienta nueva, esta línea es el mapa del payload real.
        with tempfile.TemporaryDirectory() as d:
            self._correr("log-skill-usage.py", json.dumps({"raro": 1, "otro": 2}), d)
            entrada = json.loads(open(os.path.join(d, "skill-usage.jsonl"), encoding="utf-8").read())
            self.assertEqual(entrada["_esquema"], "desconocido")
            self.assertEqual(sorted(entrada["_claves"]), ["otro", "raro"])


if __name__ == "__main__":
    unittest.main()

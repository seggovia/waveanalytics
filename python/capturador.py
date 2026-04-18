"""
WaveAnalytics - Capturador OWON SDS1202
=======================================
Captura señal del osciloscopio y envía los datos al backend Express.

Instalación:
    pip install pyusb numpy requests openpyxl

Requisito: driver WinUSB con Zadig (VID=0x5345, PID=0x1234)
"""

import usb.core
import usb.util
import struct
import time
import numpy as np
import requests
import json
from datetime import datetime

VID          = 0x5345
PID          = 0x1234
BACKEND_URL  = "http://localhost:3001/api"


# ─────────────────────────────────────────────
#  CONEXIÓN USB
# ─────────────────────────────────────────────

def conectar():
    print(f"  Buscando OWON SDS1202 (VID=0x{VID:04X}, PID=0x{PID:04X})...")
    dev = usb.core.find(idVendor=VID, idProduct=PID)
    if dev is None:
        raise Exception(
            "Dispositivo no encontrado.\n"
            "  → Cable USB conectado y osciloscopio encendido?\n"
            "  → Driver WinUSB instalado con Zadig?"
        )
    try:
        if dev.is_kernel_driver_active(0):
            dev.detach_kernel_driver(0)
    except Exception:
        pass

    dev.set_configuration()
    usb.util.claim_interface(dev, 0)
    cfg  = dev.get_active_configuration()
    intf = cfg[(0, 0)]

    ep_out = usb.util.find_descriptor(intf, custom_match=lambda e:
        usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT)
    ep_in  = usb.util.find_descriptor(intf, custom_match=lambda e:
        usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_IN)

    if not ep_out or not ep_in:
        raise Exception("Endpoints USB no encontrados.")

    print(f"  Conectado  OUT:0x{ep_out.bEndpointAddress:02X}  IN:0x{ep_in.bEndpointAddress:02X}")
    return dev, ep_out, ep_in


# ─────────────────────────────────────────────
#  COMUNICACIÓN
# ─────────────────────────────────────────────

def escribir(ep_out, cmd):
    ep_out.write((cmd + "\n").encode("ascii"))
    time.sleep(0.3)

def leer_texto(ep_in, timeout=2500):
    try:
        raw = ep_in.read(4096, timeout=timeout)
        return bytes(raw).decode("ascii", errors="ignore").strip().rstrip("->").strip()
    except usb.core.USBTimeoutError:
        return None

def query(ep_out, ep_in, cmd, timeout=2500):
    escribir(ep_out, cmd)
    return leer_texto(ep_in, timeout)

def leer_binario_completo(ep_in, timeout=5000):
    buffer = bytearray()
    while True:
        try:
            chunk = ep_in.read(65536, timeout=timeout)
            if chunk:
                buffer.extend(bytes(chunk))
            else:
                break
        except usb.core.USBTimeoutError:
            break
    return bytes(buffer)

def parse_float(texto):
    if not texto:
        return None
    t = texto.strip().rstrip("->").strip()
    multiplicadores = {
        'G': 1e9, 'M': 1e6, 'k': 1e3, 'K': 1e3,
        'm': 1e-3, 'u': 1e-6, 'n': 1e-9, 'p': 1e-12
    }
    try:
        import re
        match = re.match(r'^([+-]?\d+\.?\d*)\s*([GMkKmunp]?)\s*[VsHz%]?$', t)
        if match:
            valor = float(match.group(1))
            prefijo = match.group(2)
            return valor * multiplicadores.get(prefijo, 1.0)
        return float(t)
    except Exception:
        return None


# ─────────────────────────────────────────────
#  CONFIGURACIÓN Y MEDICIONES
# ─────────────────────────────────────────────

def capturar_config(ep_out, ep_in):
    print("\n  Leyendo configuración...")
    query(ep_out, ep_in, ":SCPI ON", timeout=1000)
    time.sleep(0.3)

    consultas = [
        ("Identificación",           "*IDN?"),
        ("Escala tiempo (s/div)",    ":HOR:SCAL?"),
        ("Offset tiempo (s)",        ":HOR:POS?"),
        ("CH1 — Escala (V/div)",     ":CH1:SCAL?"),
        ("CH1 — Offset (V)",         ":CH1:OFFS?"),
        ("CH1 — Acoplamiento",       ":CH1:COUP?"),
        ("CH1 — Visible",            ":CH1:DISP?"),
        ("CH1 — Sonda (x)",          ":CH1:PROB?"),
        ("CH2 — Escala (V/div)",     ":CH2:SCAL?"),
        ("CH2 — Offset (V)",         ":CH2:OFFS?"),
        ("CH2 — Acoplamiento",       ":CH2:COUP?"),
        ("CH2 — Visible",            ":CH2:DISP?"),
        ("CH2 — Sonda (x)",          ":CH2:PROB?"),
        ("Trigger — Tipo",           ":TRIG:TYPE?"),
        ("Trigger — Modo",           ":TRIG:RUNN?"),
        ("Trigger — Fuente",         ":TRIG:EDGE:SOUR?"),
        ("Trigger — Nivel (V)",      ":TRIG:EDGE:LEV?"),
        ("Adquisición — Modo",       ":ACQ:MODE?"),
        ("Adquisición — Memoria",    ":ACQ:DEPM?"),
        ("CH1 — Frecuencia (Hz)",    ":MEAS:CH1:FREQ?"),
        ("CH1 — Periodo (s)",        ":MEAS:CH1:PERI?"),
        ("CH1 — Vpico-pico (V)",     ":MEAS:CH1:VPP?"),
        ("CH1 — Vmax (V)",           ":MEAS:CH1:VMAX?"),
        ("CH1 — Vmin (V)",           ":MEAS:CH1:VMIN?"),
        ("CH1 — Vrms (V)",           ":MEAS:CH1:VRMS?"),
        ("CH1 — Vmedio (V)",         ":MEAS:CH1:VAVG?"),
        ("CH1 — Amplitud (V)",       ":MEAS:CH1:VAMP?"),
        ("CH2 — Frecuencia (Hz)",    ":MEAS:CH2:FREQ?"),
        ("CH2 — Vpico-pico (V)",     ":MEAS:CH2:VPP?"),
        ("CH2 — Vrms (V)",           ":MEAS:CH2:VRMS?"),
    ]

    config = {}
    for nombre, cmd in consultas:
        resp  = query(ep_out, ep_in, cmd, timeout=2500)
        valor = resp if resp else "N/D"
        print(f"    {'✓' if resp else '✗'} {nombre:35s}: {valor}")
        config[nombre] = (cmd, valor)

    return config


# ─────────────────────────────────────────────
#  FORMA DE ONDA
# ─────────────────────────────────────────────

def parsear_waveform(raw_bytes, escala_vdiv, offset_v, factor_sonda, escala_t):
    if not raw_bytes or len(raw_bytes) < 20:
        return None, None, None
    for offset in [0, 4, 8]:
        try:
            n = (len(raw_bytes) - offset) // 2
            if n < 10:
                continue
            muestras = np.array(
                struct.unpack_from(f"<{n}h", raw_bytes, offset), dtype=float
            )
            if np.std(muestras) < 1:
                continue
            voltios_por_bit = (escala_vdiv * 8) / 65536.0
            voltajes = muestras * voltios_por_bit * factor_sonda - offset_v
            tiempos  = np.linspace(0, escala_t * 10, n)
            return tiempos.tolist(), voltajes.tolist(), n
        except Exception:
            continue
    return None, None, None


def capturar_waveform(ep_out, ep_in, config):
    print("\n  Capturando forma de onda...")
    resultados = {}
    escala_t = parse_float(config.get("Escala tiempo (s/div)", ("", "500u"))[1]) or 500e-6

    for canal in ["CH1", "CH2"]:
        visible = config.get(f"{canal} — Visible", ("", "OFF"))[1]
        if visible == "OFF":
            print(f"    {canal}: desactivado, omitiendo")
            resultados[canal] = None
            continue

        escala_v     = parse_float(config.get(f"{canal} — Escala (V/div)", ("", "1"))[1]) or 0.5
        offset_v     = parse_float(config.get(f"{canal} — Offset (V)",     ("", "0"))[1]) or 0.0
        sonda_str    = config.get(f"{canal} — Sonda (x)", ("", "1X"))[1]
        try:
            factor_sonda = float(sonda_str.replace("X","").replace("x","").strip())
        except Exception:
            factor_sonda = 1.0

        num = canal.replace("CH", "")
        escribir(ep_out, f":DATA:WAVE:DEPMem:CH{num}?")
        time.sleep(0.8)
        raw = leer_binario_completo(ep_in, timeout=5000)

        if raw and len(raw) > 20:
            t, v, n = parsear_waveform(raw, escala_v, offset_v, factor_sonda, escala_t)
            if t and v:
                resultados[canal] = (t, v)
                print(f"    {canal}: {n} puntos  Vpp={max(v)-min(v):.3f}V")
            else:
                resultados[canal] = None
        else:
            resultados[canal] = None

    return resultados


# ─────────────────────────────────────────────
#  ENVÍO AL BACKEND
# ─────────────────────────────────────────────

def enviar_al_backend(config, waveforms, nombre_sesion):
    print("\n  Enviando datos al backend...")

    # Preparar configuración como lista
    config_list = [
        {"parametro": k, "comando_scpi": v[0], "valor": v[1]}
        for k, v in config.items()
    ]

    # Preparar mediciones CH1 y CH2
    mediciones = []
    for canal in ["CH1", "CH2"]:
        visible = config.get(f"{canal} — Visible", ("", "OFF"))[1]
        if visible == "OFF":
            continue
        mediciones.append({
            "canal":        canal,
            "frecuencia_hz": parse_float(config.get(f"{canal} — Frecuencia (Hz)", ("",""))[1]),
            "periodo_s":     parse_float(config.get(f"{canal} — Periodo (s)",     ("",""))[1]),
            "vpp":           parse_float(config.get(f"{canal} — Vpico-pico (V)",  ("",""))[1]),
            "vmax":          parse_float(config.get(f"{canal} — Vmax (V)",        ("",""))[1]),
            "vmin":          parse_float(config.get(f"{canal} — Vmin (V)",        ("",""))[1]),
            "vrms":          parse_float(config.get(f"{canal} — Vrms (V)",        ("",""))[1]),
            "vmedio":        parse_float(config.get(f"{canal} — Vmedio (V)",      ("",""))[1]),
            "amplitud":      parse_float(config.get(f"{canal} — Amplitud (V)",    ("",""))[1]),
        })

    # Preparar puntos de onda (máx 5000 por canal para no sobrecargar)
    waveform_data = {}
    for canal, data in waveforms.items():
        if data:
            t, v = data
            paso = max(1, len(t) // 5000)
            waveform_data[canal] = {
                "tiempos":  t[::paso],
                "voltajes": v[::paso]
            }

    payload = {
        "nombre":        nombre_sesion,
        "descripcion":   f"Captura automática {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "configuracion": config_list,
        "mediciones":    mediciones,
        "waveforms":     waveform_data,
    }

    try:
        resp = requests.post(f"{BACKEND_URL}/capturas", json=payload, timeout=15)
        if resp.status_code == 201:
            data = resp.json()
            print(f"  ✓ Datos enviados correctamente. Sesión ID: {data.get('sesion_id')}")
            return True
        else:
            print(f"  ✗ Error del backend: {resp.status_code} - {resp.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("  ✗ No se pudo conectar al backend. ¿Está corriendo en puerto 3001?")
        return False


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  WaveAnalytics — Capturador OWON SDS1202")
    print("=" * 60)

    nombre = input("\nNombre de esta sesión (ej: 'Prueba señal 1kHz'): ").strip()
    if not nombre:
        nombre = f"Captura {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    print("\n[1/4] Conectando al osciloscopio...")
    try:
        dev, ep_out, ep_in = conectar()
    except Exception as e:
        print(f"\n  ✗ {e}")
        input("\nPresiona Enter para salir...")
        return

    print("\n[2/4] Capturando configuración y mediciones...")
    config = capturar_config(ep_out, ep_in)

    print("\n[3/4] Capturando forma de onda...")
    input("  → Presiona Enter cuando estés listo (señal estable en pantalla)...")
    waveforms = capturar_waveform(ep_out, ep_in, config)

    try:
        usb.util.release_interface(dev, 0)
        usb.util.dispose_resources(dev)
    except Exception:
        pass

    print("\n[4/4] Enviando al backend...")
    enviar_al_backend(config, waveforms, nombre)

    print("\n" + "=" * 60)
    print("  ¡Listo! Datos disponibles en el dashboard.")
    print(f"  → http://localhost:3000")
    print("=" * 60)
    input("\nPresiona Enter para salir...")


if __name__ == "__main__":
    main()

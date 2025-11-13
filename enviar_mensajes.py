import pywhatkit
import time

numeros = [
    "+528143912103",  # Número 1
    "+529381290026",  # Número 2
]

# Mensaje a enviar
MENSAJE = """¡Hola! 👋

Te invitamos a nuestro evento especial.
¡Esperamos verte allí! 🎉

Fecha:
Lugar:"""

def enviar_a_varios_numeros(numeros, mensaje):
    print(f"📤 Iniciando envío a {len(numeros)} números...")

    for i, numero in enumerate(numeros, 1):
        try:
            print(f"\n[{i}/{len(numeros)}] Enviando a {numero}...")

            pywhatkit.sendwhatmsg_instantly(
                phone_no=numero,
                message=mensaje,
                wait_time=15,
                tab_close=True
            )

            print(f"✅ Enviado a {numero}")

            # Esperar entre envíos para evitar bloqueos
            if i < len(numeros):
                print("⏳ Esperando 15 segundos...")
                time.sleep(15)

        except Exception as e:
            print(f"❌ Error con {numero}: {e}")
            continue

    print("\n🎉 ¡Envío completado!")

# Ejecutar
enviar_a_varios_numeros(numeros, MENSAJE)
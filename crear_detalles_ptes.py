# crear_pasos_automaticos.py
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bme_subtec.settings')
django.setup()

from operaciones.models import PTEHeader, PTEDetalle, Paso, Estatus

def crear_pasos_para_pte_sin_detalle():
    """
    Función que obtiene todos los PTEHeader y crea los pasos en PTEDetalle
    para aquellos que no tienen detalles asociados.
    """
    try:
        # Obtener todos los PTEHeader
        pte_headers = PTEHeader.objects.all()
        
        pte_sin_detalle = []
        pte_con_detalle = []
        pasos_creados = 0
        errores = []
        
        print(f"🔍 Buscando PTEHeader sin detalles...")
        print(f"📊 Total de PTEHeader encontrados: {pte_headers.count()}")
        
        for pte in pte_headers:
            # Verificar si este PTEHeader ya tiene detalles
            tiene_detalles = PTEDetalle.objects.filter(id_pte_header=pte).exists()
            
            if not tiene_detalles:
                pte_sin_detalle.append(pte)
                print(f"⚠️  PTE {pte.oficio_pte} (ID: {pte.id}) no tiene detalles")
                
                # Crear detalles para este PTE
                creados = _crear_detalles_para_pte(pte)
                if creados > 0:
                    pasos_creados += creados
                    print(f"✅ Creados {creados} pasos para PTE {pte.oficio_pte}")
                else:
                    errores.append(f"No se pudieron crear pasos para PTE {pte.oficio_pte}")
            else:
                pte_con_detalle.append(pte)
        
        # Mostrar resumen
        print(f"\n🎉 RESUMEN:")
        print(f"📋 PTEHeader procesados: {pte_headers.count()}")
        print(f"✅ PTE con detalles existentes: {len(pte_con_detalle)}")
        print(f"⚠️  PTE sin detalles encontrados: {len(pte_sin_detalle)}")
        print(f"🆕 Pasos creados: {pasos_creados}")
        
        if pte_sin_detalle:
            print(f"\n📝 PTEHeader que recibieron detalles:")
            for pte in pte_sin_detalle:
                detalles_count = PTEDetalle.objects.filter(id_pte_header=pte).count()
                print(f"   - {pte.oficio_pte}: {detalles_count} pasos creados")
        
        if errores:
            print(f"\n❌ Errores encontrados: {len(errores)}")
            for error in errores:
                print(f"   - {error}")
                
        return pasos_creados
        
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        return 0

def _crear_detalles_para_pte(pte_header):
    """
    Función auxiliar que crea los detalles (pasos) para un PTEHeader específico
    """
    try:
        # Obtener todos los pasos activos ordenados
        pasos = Paso.objects.filter(activo=True).order_by('id')
        
        if not pasos.exists():
            print(f"❌ No hay pasos configurados en la base de datos")
            return 0
        
        # Mapear el estatus del PTE header al estatus de paso
        # Asumiendo que nivel_afectacion=4 corresponde a estatus de pasos PTE
        estatus_pte_a_paso = {
            1: 1,  # Activo -> PENDIENTE
            2: 2,  # En Proceso -> PROCESO  
            3: 3,  # Terminado -> COMPLETADO
            4: 4,  # Cancelado -> CANCELADO
        }
        
        # Obtener el estatus correspondiente al estatus del PTE header
        estatus_pte = pte_header.estatus
        estatus_paso_id = estatus_pte_a_paso.get(estatus_pte, 1)  # Default a PENDIENTE
        
        try:
            estatus_paso = Estatus.objects.get(
                nivel_afectacion=1, 
                id=estatus_paso_id
            )
        except Estatus.DoesNotExist:
            # Fallback: usar el primer estatus disponible con nivel_afectacion=4
            estatus_paso = Estatus.objects.filter(nivel_afectacion=1).first()
            if not estatus_paso:
                estatus_paso = Estatus.objects.first()
        
        detalles_creados = 0
        
        for paso in pasos:
            # Verificar si ya existe este detalle (por si acaso)
            detalle_existente = PTEDetalle.objects.filter(
                id_pte_header=pte_header,
                id_paso=paso
            ).exists()
            
            if not detalle_existente:
                # Crear el detalle con el estatus del PTE header
                PTEDetalle.objects.create(
                    id_pte_header=pte_header,
                    estatus_paso=estatus_paso,
                    id_paso=paso,
                    comentario=f"Paso creado automáticamente - {paso.descripcion}"
                )
                detalles_creados += 1
                print(f"   ↳ Paso '{paso.descripcion}' creado con estatus: {estatus_paso.descripcion}")
        
        return detalles_creados
        
    except Exception as e:
        print(f"❌ Error creando detalles para PTE {pte_header.oficio_pte}: {str(e)}")
        return 0
def verificar_estado_pte():
    """
    Función para verificar el estado actual de todos los PTEHeader
    """
    print(f"\n📊 ESTADO ACTUAL DE PTEHEADER:")
    
    pte_headers = PTEHeader.objects.all()
    
    for pte in pte_headers:
        detalles_count = PTEDetalle.objects.filter(id_pte_header=pte).count()
        pasos_totales = Paso.objects.filter(activo=True).count()
        
        estado = "✅ CON DETALLES" if detalles_count > 0 else "⚠️ SIN DETALLES"
        
        print(f"   - {pte.oficio_pte}: {detalles_count}/{pasos_totales} pasos - {estado}")

if __name__ == "__main__":
    print("🚀 Iniciando creación automática de pasos para PTE...")
    
    # Primero verificar el estado actual
    verificar_estado_pte()
    
    # Ejecutar la creación de pasos
    pasos_creados = crear_pasos_para_pte_sin_detalle()
    
    if pasos_creados > 0:
        print(f"\n🎉 Proceso completado. Se crearon {pasos_creados} pasos en total.")
    else:
        print(f"\nℹ️  No se crearon nuevos pasos. Todos los PTE ya tienen detalles.")
    
    # Verificar estado final
    verificar_estado_pte()
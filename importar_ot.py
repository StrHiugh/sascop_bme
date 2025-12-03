# importar_ot_historico.py
import os
import sys
import django
import pandas as pd
from datetime import datetime, date
import traceback

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bme_subtec.settings')
django.setup()

from operaciones.models import (
    OTE, PTEHeader, PasoOt, OTDetalle, 
    Estatus, Tipo, ResponsableProyecto, Cliente
)

def mapear_estatus_paso(estatus_ot_id):
    """
    Mapea estatus de OT a estatus de paso según tus reglas:
    - 5, 11, 8 → 2 (PROCESO)
    - 6 → 4 (CANCELADO)
    - 10 → 3 (COMPLETADO)
    - 16 → 1 (PENDIENTE)
    """
    estatus_map = {
        5: 2,   # ASIGNADA → PROCESO
        11: 2,  # POR CANCELAR → PROCESO
        8: 2,   # EN EJECUCION → PROCESO
        6: 4,   # CANCELADA → CANCELADO
        10: 3,  # TERMINADA → COMPLETADO
        16: 1,  # (desconocido) → PENDIENTE
    }
    return estatus_map.get(estatus_ot_id, 1)  # Default: PENDIENTE

def obtener_pte_por_oficio(oficio_pte):
    """
    Busca PTE por oficio (ej: BME-3801-015-2023)
    Si no existe, crea una PTE placeholder
    """
    try:
        pte = PTEHeader.objects.get(oficio_pte=oficio_pte, estatus__gt=0)
        print(f"✓ PTE encontrado: {oficio_pte} (ID: {pte.id})")
        return pte
    except PTEHeader.DoesNotExist:
        print(f"⚠ PTE no encontrado: {oficio_pte}. Creando placeholder...")
        # Crear PTE placeholder
        try:
            print("---------------------------------------------")
            # tipo_default = Tipo.objects.filter(nivel_afectacion=2).first()
            # responsable_default = ResponsableProyecto.objects.first()
            # cliente_default = Cliente.objects.first()
            
            # pte = PTEHeader.objects.create(
            #     oficio_pte=oficio_pte,
            #     descripcion_trabajo=f"PTE placeholder para OT histórica ({oficio_pte})",
            #     id_tipo=tipo_default,
            #     id_responsable_proyecto=responsable_default,
            #     id_cliente=cliente_default,
            #     estatus=3,  # ENTREGADA
            #     fecha_solicitud=date.today(),
            #     oficio_solicitud=oficio_pte,
            #     comentario="Creada automáticamente para importación histórica de OT"
            # )
            print("---------------------------------------------")
            return pte
        except Exception as e:
            print(f"✗ Error creando PTE placeholder: {e}")
            return None
    except Exception as e:
        print(f"✗ Error buscando PTE: {e}")
        return None

def crear_pasos_para_ot(ot, tipo_paso=4):
    """
    Crea los pasos para una OT basado en el tipo de paso
    """
    try:
        # Buscar pasos activos del tipo especificado
        pasos = PasoOt.objects.filter(
            tipo_id=tipo_paso,
            activo=True
        ).order_by('orden')
        
        if not pasos.exists():
            print(f"⚠ No hay pasos configurados para tipo {tipo_paso}")
            return 0
        
        pasos_creados = 0
        for paso in pasos:
            # Determinar estatus del paso basado en estatus de OT
            estatus_paso_id = mapear_estatus_paso(ot.id_estatus_ot_id)
            
            # Si la OT está terminada, usar fechas reales
            fecha_inicio = ot.fecha_inicio_real if ot.fecha_inicio_real else None
            fecha_termino = ot.fecha_termino_real if ot.fecha_termino_real else None
            fecha_entrega = ot.fecha_termino_real if ot.estatus == 1 and ot.id_estatus_ot_id == 10 else None
            
            # Crear detalle del paso
            OTDetalle.objects.create(
                id_ot=ot,
                id_paso=paso,
                estatus_paso_id=estatus_paso_id,
                fecha_inicio=fecha_inicio,
                fecha_termino=fecha_termino,
                fecha_entrega=fecha_entrega,
                comentario=f""
            )
            pasos_creados += 1
        
        print(f"✓ Creados {pasos_creados} pasos para OT {ot.orden_trabajo}")
        return pasos_creados
        
    except Exception as e:
        print(f"✗ Error creando pasos para OT {ot.orden_trabajo}: {e}")
        traceback.print_exc()
        return 0

def procesar_fila(fila, contador):
    """
    Procesa una fila del Excel y crea/actualiza la OT
    """
    try:
        # 1. Obtener PTE por oficio
        oficio_pte = str(fila['id_pte_header_id']).strip()
        if pd.isna(oficio_pte) or not oficio_pte:
            print(f"✗ Fila {contador}: Sin oficio PTE")
            return False, "Sin oficio PTE"
        
        pte = obtener_pte_por_oficio(oficio_pte)
        if not pte:
            return False, f"No se pudo obtener/crear PTE: {oficio_pte}"
        
        # 2. Obtener objetos relacionados
        tipo_ot = None
        if not pd.isna(fila['id_tipo_id']):
            try:
                tipo_ot = Tipo.objects.get(id=int(fila['id_tipo_id']))
            except (Tipo.DoesNotExist, ValueError):
                # Usar tipo por defecto para OTs
                tipo_ot = Tipo.objects.filter(
                    nivel_afectacion=2,
                    descripcion__icontains="INICIAL"
                ).first()
                if not tipo_ot:
                    tipo_ot = Tipo.objects.filter(nivel_afectacion=2).first()
        
        estatus_ot = None
        if not pd.isna(fila['id_estatus_ot_id']):
            try:
                estatus_ot = Estatus.objects.get(
                    id=int(fila['id_estatus_ot_id']),
                    nivel_afectacion=2
                )
            except (Estatus.DoesNotExist, ValueError):
                # Usar estatus por defecto: ASIGNADA (5)
                estatus_ot = Estatus.objects.filter(
                    nivel_afectacion=2,
                    descripcion__icontains="ASIGNADA"
                ).first()
        
        responsable_proyecto = None
        if not pd.isna(fila['id_responsable_proyecto_id']):
            try:
                responsable_proyecto = ResponsableProyecto.objects.get(
                    id=int(fila['id_responsable_proyecto_id'])
                )
            except (ResponsableProyecto.DoesNotExist, ValueError):
                responsable_proyecto = ResponsableProyecto.objects.first()
        
        cliente = None
        if not pd.isna(fila['id_cliente_id']):
            try:
                cliente = Cliente.objects.get(id=int(fila['id_cliente_id']))
            except (Cliente.DoesNotExist, ValueError):
                cliente = None
        
        # 3. Crear/actualizar OT
        orden_trabajo = str(fila['orden_trabajo']).strip()
        oficio_ot = str(fila['oficio_ot']).strip()
        
        # Verificar si ya existe
        ot_existente = OTE.objects.filter(
            orden_trabajo=orden_trabajo,
            oficio_ot=oficio_ot
        ).first()
        
        if ot_existente:
            print(f"⚠ OT ya existe: {orden_trabajo} - {oficio_ot}. Actualizando...")
            ot = ot_existente
            es_nuevo = False
        else:
            ot = OTE()
            es_nuevo = True
        
        # Asignar campos
        ot.id_tipo = tipo_ot
        ot.id_pte_header = pte
        ot.orden_trabajo = orden_trabajo
        ot.descripcion_trabajo = str(fila['descripcion_trabajo']).strip() if not pd.isna(fila['descripcion_trabajo']) else ""
        ot.id_responsable_proyecto = responsable_proyecto
        ot.responsable_cliente = str(fila['responsable_cliente']).strip() if not pd.isna(fila['responsable_cliente']) else ""
        ot.oficio_ot = oficio_ot
        ot.id_estatus_ot = estatus_ot
        ot.comentario = str(fila['comentario']).strip() if not pd.isna(fila['comentario']) else ""
        ot.id_cliente = cliente
        
        # Campos opcionales
        for campo in [
            'fecha_inicio_programado', 'fecha_inicio_real',
            'fecha_termino_programado', 'fecha_termino_real',
            'num_reprogramacion', 'ot_principal',
            'monto_mxn', 'monto_usd', 'id_frente',
            'id_embarcacion', 'id_plataforma', 'id_intercom',
            'id_patio', 'plazo_dias'
        ]:
            if campo in fila and not pd.isna(fila[campo]):
                valor = fila[campo]
                # Convertir fechas de string si es necesario
                if 'fecha' in campo and isinstance(valor, str):
                    try:
                        valor = datetime.strptime(valor, '%Y-%m-%d').date()
                    except:
                        valor = None
                
                if valor is not None:
                    setattr(ot, campo, valor)
        
        # Estatus general (1 = activo, -1 = por definir)
        if not pd.isna(fila['estatus']):
            ot.estatus = int(fila['estatus'])
        else:
            ot.estatus = 1  # Default activo
        
        # Guardar OT
        ot.save()
        
        # 4. Crear pasos para la OT (solo si es nueva)
        if es_nuevo:
            tipo_paso_ot = 4  # Tipo de paso para OTs (según tu requerimiento)
            pasos_creados = crear_pasos_para_ot(ot, tipo_paso_ot)
            print(f"✓ OT {'creada' if es_nuevo else 'actualizada'}: {orden_trabajo} - {oficio_ot} (ID: {ot.id}) - {pasos_creados} pasos creados")
        else:
            print(f"✓ OT actualizada: {orden_trabajo} - {oficio_ot} (ID: {ot.id})")
        
        return True, f"OT procesada: {orden_trabajo}"
        
    except Exception as e:
        print(f"✗ Error procesando fila {contador}: {e}")
        traceback.print_exc()
        return False, str(e)

def importar_ots_desde_excel(archivo_excel):
    """
    Función principal para importar OTs desde Excel
    """
    try:
        # Leer Excel
        print(f"📖 Leyendo archivo: {archivo_excel}")
        df = pd.read_excel(archivo_excel, dtype=str)  # Leer todo como string primero
        
        # Verificar columnas requeridas
        columnas_requeridas = [
            'orden_trabajo', 'oficio_ot', 'descripcion_trabajo',
            'id_pte_header_id', 'id_tipo_id', 'id_estatus_ot_id'
        ]
        
        for col in columnas_requeridas:
            if col not in df.columns:
                print(f"✗ Columna requerida no encontrada: {col}")
                return False
        
        print(f"✅ Archivo cargado. {len(df)} registros encontrados.")
        print(f"📋 Columnas: {', '.join(df.columns.tolist())}")
        
        # Estadísticas
        total_procesados = 0
        total_exitosos = 0
        total_fallidos = 0
        errores = []
        
        # Procesar cada fila
        for idx, fila in df.iterrows():
            contador = idx + 2  # +2 porque Excel empieza en fila 1 y header en fila 1
            total_procesados += 1
            
            print(f"\n--- Procesando fila {contador} ---")
            
            # Convertir fila a dict para procesamiento
            fila_dict = fila.to_dict()
            
            # Procesar fila
            exito, mensaje = procesar_fila(fila_dict, contador)
            
            if exito:
                total_exitosos += 1
            else:
                total_fallidos += 1
                errores.append(f"Fila {contador}: {mensaje}")
            
            # Mostrar progreso cada 10 registros
            if total_procesados % 10 == 0:
                print(f"\n📊 Progreso: {total_procesados}/{len(df)} procesados")
        
        # Resumen final
        print("\n" + "="*50)
        print("📋 RESUMEN DE IMPORTACIÓN")
        print("="*50)
        print(f"Total registros en Excel: {len(df)}")
        print(f"Total procesados: {total_procesados}")
        print(f"✅ Exitosos: {total_exitosos}")
        print(f"❌ Fallidos: {total_fallidos}")
        
        if errores:
            print("\n🚨 Errores encontrados:")
            for error in errores[:10]:  # Mostrar solo primeros 10 errores
                print(f"  - {error}")
            if len(errores) > 10:
                print(f"  ... y {len(errores) - 10} errores más")
        
        return total_exitosos > 0
        
    except FileNotFoundError:
        print(f"✗ Archivo no encontrado: {archivo_excel}")
        return False
    except Exception as e:
        print(f"✗ Error general: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Configurar archivo
    archivo_excel = "OT_IMPORTAR.xlsx"
    
    # Verificar que el archivo existe
    if not os.path.exists(archivo_excel):
        print(f"✗ El archivo {archivo_excel} no existe en el directorio actual.")
        print(f"📂 Directorio actual: {os.getcwd()}")
        print("📋 Archivos disponibles:")
        for f in os.listdir('.'):
            if f.endswith('.xlsx'):
                print(f"  - {f}")
        sys.exit(1)
    
    # Confirmación del usuario
    print("="*60)
    print("IMPORTADOR DE OTs HISTÓRICAS")
    print("="*60)
    print(f"📁 Archivo: {archivo_excel}")
    print(f"🗂️ Base de datos: {os.environ.get('DJANGO_SETTINGS_MODULE', 'Desconocida')}")
    print("\n⚠ ADVERTENCIA: Este proceso modificará la base de datos.")
    
    respuesta = input("\n¿Continuar con la importación? (sí/no): ").lower().strip()
    
    if respuesta not in ['sí', 'si', 's', 'yes', 'y']:
        print("❌ Importación cancelada.")
        sys.exit(0)
    
    # Ejecutar importación
    print("\n" + "="*60)
    print("🚀 INICIANDO IMPORTACIÓN...")
    print("="*60)
    
    inicio = datetime.now()
    exito = importar_ots_desde_excel(archivo_excel)
    fin = datetime.now()
    
    duracion = fin - inicio
    
    print("\n" + "="*60)
    if exito:
        print(f"✅ IMPORTACIÓN COMPLETADA")
    else:
        print(f"⚠ IMPORTACIÓN FINALIZADA CON ERRORES")
    print(f"⏱️ Duración: {duracion.total_seconds():.2f} segundos")
    print("="*60)
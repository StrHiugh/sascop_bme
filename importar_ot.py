# importar_ot_historico_con_reprogramadas_modificado.py
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
        7: 2,   # DIFERIDA → PROCESO
        6: 4,   # CANCELADA → CANCELADO
        10: 3,  # TERMINADA → COMPLETADO
        16: 1,  # DIFERIDA SIN INICIAR → PENDIENTE
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
        print(f"⚠ PTE no encontrado: {oficio_pte}")
        return None
    except Exception as e:
        print(f"✗ Error buscando PTE: {e}")
        return None

def obtener_ot_principal_por_orden_trabajo(orden_trabajo_principal, tipo_ot_actual):
    """
    Busca OT principal (tipo 4) por orden_trabajo para las reprogramadas (tipo 5)
    """
    if tipo_ot_actual != 5:
        return None
    
    try:
        # Buscar OT inicial (tipo 4) con el mismo orden_trabajo
        ot_principal = OTE.objects.filter(
            orden_trabajo=orden_trabajo_principal,
            id_tipo_id=4  # Solo OTs iniciales
        ).first()
        
        if ot_principal:
            print(f"✓ OT principal encontrada: {orden_trabajo_principal} (ID: {ot_principal.id})")
            return ot_principal
        else:
            print(f"⚠ OT principal NO encontrada para reprogramación: {orden_trabajo_principal}")
            return None
    except Exception as e:
        print(f"✗ Error buscando OT principal: {e}")
        return None

def determinar_tipo_paso_para_ot(tipo_ot_id):
    """
    Determina el tipo de paso según el tipo de OT:
    - Tipo 4 (INICIAL) → Paso tipo 4
    - Tipo 5 (REPROGRAMACIÓN) → Paso tipo 5
    """
    if tipo_ot_id == 5:
        return 5  # Pasos para reprogramaciones
    else:
        return 4  # Pasos para OTs iniciales (default)

def crear_pasos_para_ot(ot, tipo_ot_id):
    """
    Crea los pasos para una OT basado en el tipo de OT
    """
    try:
        # Determinar tipo de paso según tipo de OT
        tipo_paso = determinar_tipo_paso_para_ot(tipo_ot_id)
        
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
        
        print(f"✓ Creados {pasos_creados} pasos (tipo {tipo_paso}) para OT {ot.orden_trabajo}")
        return pasos_creados
        
    except Exception as e:
        print(f"✗ Error creando pasos para OT {ot.orden_trabajo}: {e}")
        traceback.print_exc()
        return 0

def procesar_ot_inicial(fila, contador):
    """
    Procesa una OT inicial (tipo 4)
    """
    try:
        # 1. Obtener PTE por oficio (solo para OTs iniciales)
        oficio_pte = str(fila['id_pte_header_id']).strip()
        if pd.isna(oficio_pte) or not oficio_pte:
            print(f"✗ Fila {contador}: Sin oficio PTE para OT inicial")
            return False, "Sin oficio PTE"
        
        pte = obtener_pte_por_oficio(oficio_pte)
        if not pte:
            return False, f"No se pudo obtener PTE: {oficio_pte}"
        
        # 2. Obtener tipo de OT (debe ser 4 para inicial)
        tipo_ot = None
        tipo_ot_id = 4  # Siempre 4 para iniciales
        
        try:
            tipo_ot = Tipo.objects.get(id=4)  # Forzar tipo 4
        except Tipo.DoesNotExist:
            tipo_ot = Tipo.objects.filter(
                nivel_afectacion=2,
                descripcion__icontains="INICIAL"
            ).first()
            if not tipo_ot:
                tipo_ot = Tipo.objects.filter(nivel_afectacion=2).first()
        
        # 3. Obtener estatus OT
        estatus_ot = None
        if not pd.isna(fila['id_estatus_ot_id']):
            try:
                estatus_ot = Estatus.objects.get(
                    id=int(fila['id_estatus_ot_id']),
                    nivel_afectacion=2
                )
            except (Estatus.DoesNotExist, ValueError):
                estatus_ot = Estatus.objects.filter(
                    nivel_afectacion=2,
                    descripcion__icontains="ASIGNADA"
                ).first()
        
        # 4. Obtener responsable proyecto
        responsable_proyecto = None
        if not pd.isna(fila['id_responsable_proyecto_id']):
            try:
                responsable_proyecto = ResponsableProyecto.objects.get(
                    id=int(fila['id_responsable_proyecto_id'])
                )
            except (ResponsableProyecto.DoesNotExist, ValueError):
                responsable_proyecto = ResponsableProyecto.objects.first()
        
        # 5. Obtener cliente
        cliente = None
        if not pd.isna(fila['id_cliente_id']):
            try:
                cliente = Cliente.objects.get(id=int(fila['id_cliente_id']))
            except (Cliente.DoesNotExist, ValueError):
                cliente = None
        
        # 6. Crear/actualizar OT
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
        
        # Asignar campos básicos
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
            'monto_mxn', 'monto_usd', 'id_frente',
            'id_embarcacion', 'id_plataforma', 'id_intercom',
            'id_patio', 'plazo_dias'
        ]:
            if campo in fila and not pd.isna(fila[campo]):
                valor = fila[campo]
                if 'fecha' in campo and isinstance(valor, str):
                    try:
                        valor = datetime.strptime(valor, '%Y-%m-%d').date()
                    except:
                        try:
                            valor = datetime.strptime(valor, '%d/%m/%Y').date()
                        except:
                            valor = None
                
                if valor is not None:
                    setattr(ot, campo, valor)
        
        # Estatus general
        if not pd.isna(fila['estatus']):
            ot.estatus = int(fila['estatus'])
        else:
            ot.estatus = 1
        
        # Guardar OT
        ot.save()
        
        # 7. Crear pasos para la OT (solo si es nueva)
        if es_nuevo:
            pasos_creados = crear_pasos_para_ot(ot, tipo_ot_id)
            print(f"✓ OT INICIAL creada: {orden_trabajo} - {oficio_ot}")
            print(f"  ID: {ot.id}, Pasos creados: {pasos_creados}, PTE: {pte.oficio_pte}")
        else:
            print(f"✓ OT INICIAL actualizada: {orden_trabajo} - {oficio_ot} (ID: {ot.id})")
        
        return True, f"OT inicial procesada: {orden_trabajo}"
        
    except Exception as e:
        print(f"✗ Error procesando OT inicial fila {contador}: {e}")
        traceback.print_exc()
        return False, str(e)

def procesar_reprogramacion(fila, contador):
    """
    Procesa una reprogramación (tipo 5)
    """
    try:
        # 1. Obtener tipo de OT (debe ser 5 para reprogramación)
        tipo_ot = None
        tipo_ot_id = 5  # Siempre 5 para reprogramaciones
        
        try:
            tipo_ot = Tipo.objects.get(id=5)  # Forzar tipo 5
        except Tipo.DoesNotExist:
            tipo_ot = Tipo.objects.filter(
                nivel_afectacion=2,
                descripcion__icontains="REPROGRAMACION"
            ).first()
            if not tipo_ot:
                tipo_ot = Tipo.objects.filter(nivel_afectacion=2).first()
        
        # 2. Buscar OT principal
        ot_principal = None
        ot_principal_id = None
        
        if not pd.isna(fila['ot_principal']) and fila['ot_principal']:
            # Buscar OT principal por orden_trabajo
            orden_trabajo_principal = str(fila['ot_principal']).strip()
            ot_principal = obtener_ot_principal_por_orden_trabajo(
                orden_trabajo_principal, 
                tipo_ot_id
            )
            
            if ot_principal:
                ot_principal_id = ot_principal.id
                # Obtener PTE de la OT principal para la reprogramación
                pte_principal = ot_principal.id_pte_header
                print(f"✓ Usando PTE de OT principal: {pte_principal.oficio_pte}")
            else:
                print(f"⚠ No se encontró OT principal: {orden_trabajo_principal}")
                return False, f"No se encontró OT principal: {orden_trabajo_principal}"
        
        if not ot_principal:
            return False, "Reprogramación sin OT principal especificada"
        
        # 3. Obtener estatus OT
        estatus_ot = None
        if not pd.isna(fila['id_estatus_ot_id']):
            try:
                estatus_ot = Estatus.objects.get(
                    id=int(fila['id_estatus_ot_id']),
                    nivel_afectacion=2
                )
            except (Estatus.DoesNotExist, ValueError):
                estatus_ot = Estatus.objects.filter(
                    nivel_afectacion=2,
                    descripcion__icontains="ASIGNADA"
                ).first()
        
        # 4. Obtener responsable proyecto (usar el de la OT principal si no viene)
        responsable_proyecto = ot_principal.id_responsable_proyecto
        if not pd.isna(fila['id_responsable_proyecto_id']):
            try:
                responsable_proyecto = ResponsableProyecto.objects.get(
                    id=int(fila['id_responsable_proyecto_id'])
                )
            except (ResponsableProyecto.DoesNotExist, ValueError):
                pass  # Mantener el de la OT principal
        
        # 5. Obtener cliente (usar el de la OT principal si no viene)
        cliente = ot_principal.id_cliente
        if not pd.isna(fila['id_cliente_id']):
            try:
                cliente = Cliente.objects.get(id=int(fila['id_cliente_id']))
            except (Cliente.DoesNotExist, ValueError):
                pass  # Mantener el de la OT principal
        
        # 6. Crear/actualizar OT reprogramación
        orden_trabajo = str(fila['orden_trabajo']).strip()
        oficio_ot = str(fila['oficio_ot']).strip()
        
        # Verificar si ya existe
        ot_existente = False
        
        if ot_existente:
            print(f"⚠ Reprogramación ya existe: {orden_trabajo} - {oficio_ot}. Actualizando...")
            ot = ot_existente
            es_nuevo = False
        else:
            ot = OTE()
            es_nuevo = True
        
        # Asignar campos básicos para reprogramación
        ot.id_tipo = tipo_ot
        ot.id_pte_header = pte_principal  # Usar PTE de la OT principal
        ot.orden_trabajo = orden_trabajo
        ot.descripcion_trabajo = str(fila['descripcion_trabajo']).strip() if not pd.isna(fila['descripcion_trabajo']) else ""
        ot.id_responsable_proyecto = responsable_proyecto
        ot.responsable_cliente = str(fila['responsable_cliente']).strip() if not pd.isna(fila['responsable_cliente']) else ""
        ot.oficio_ot = oficio_ot
        ot.id_estatus_ot = estatus_ot
        ot.comentario = str(fila['comentario']).strip() if not pd.isna(fila['comentario']) else ""
        ot.id_cliente = cliente
        ot.ot_principal = ot_principal_id  # ID de la OT principal
        
        # Número de reprogramación
        if not pd.isna(fila['num_reprogramacion']):
            try:
                ot.num_reprogramacion = int(fila['num_reprogramacion'])
            except (ValueError, TypeError):
                # Asignar secuencia automática
                if ot_principal_id:
                    reprogramaciones = OTE.objects.filter(
                        ot_principal=ot_principal_id,
                        id_tipo_id=5
                    ).count()
                    ot.num_reprogramacion = reprogramaciones + 1
                else:
                    ot.num_reprogramacion = 1
        
        # Campos opcionales
        for campo in [
            'fecha_inicio_programado', 'fecha_inicio_real',
            'fecha_termino_programado', 'fecha_termino_real',
            'monto_mxn', 'monto_usd', 'id_frente',
            'id_embarcacion', 'id_plataforma', 'id_intercom',
            'id_patio', 'plazo_dias'
        ]:
            if campo in fila and not pd.isna(fila[campo]):
                valor = fila[campo]
                if 'fecha' in campo and isinstance(valor, str):
                    try:
                        valor = datetime.strptime(valor, '%Y-%m-%d').date()
                    except:
                        try:
                            valor = datetime.strptime(valor, '%d/%m/%Y').date()
                        except:
                            valor = None
                
                if valor is not None:
                    setattr(ot, campo, valor)
        
        # Estatus general
        if not pd.isna(fila['estatus']):
            ot.estatus = int(fila['estatus'])
        else:
            ot.estatus = 1
        
        # Guardar OT
        ot.save()
        
        # 7. Crear pasos para la reprogramación (solo si es nueva)
        if es_nuevo:
            pasos_creados = crear_pasos_para_ot(ot, tipo_ot_id)
            print(f"✓ REPROGRAMACIÓN creada: {orden_trabajo} - {oficio_ot}")
            print(f"  ID: {ot.id}, Pasos creados: {pasos_creados}")
            print(f"  OT Principal: {ot_principal.orden_trabajo} (ID: {ot_principal_id})")
            print(f"  N° Reprogramación: {ot.num_reprogramacion}")
            print(f"  PTE (heredado): {pte_principal.oficio_pte}")
        else:
            print(f"✓ REPROGRAMACIÓN actualizada: {orden_trabajo} - {oficio_ot} (ID: {ot.id})")
        
        return True, f"Reprogramación procesada: {orden_trabajo}"
        
    except Exception as e:
        print(f"✗ Error procesando reprogramación fila {contador}: {e}")
        traceback.print_exc()
        return False, str(e)

def procesar_fila(fila, contador, es_reprogramacion=False):
    """
    Función wrapper que decide si procesar como OT inicial o reprogramación
    """
    if es_reprogramacion:
        return procesar_reprogramacion(fila, contador)
    else:
        return procesar_ot_inicial(fila, contador)

def analizar_datos_excel(archivo_excel):
    """
    Analiza los datos del Excel antes de importar
    """
    print(f"📊 ANALIZANDO DATOS DEL ARCHIVO: {archivo_excel}")
    
    try:
        df = pd.read_excel(archivo_excel, dtype=str)
        
        print(f"📈 Total registros: {len(df)}")
        
        # Contar por tipo de OT
        if 'id_tipo_id' in df.columns:
            tipos = df['id_tipo_id'].value_counts()
            print("\n📋 Distribución por tipo de OT:")
            for tipo_id, cantidad in tipos.items():
                tipo_desc = "INICIAL" if str(tipo_id) == "4" else "REPROGRAMACIÓN" if str(tipo_id) == "5" else f"Tipo {tipo_id}"
                print(f"  {tipo_desc}: {cantidad} registros")
        
        # Contar reprogramaciones
        if 'id_tipo_id' in df.columns and 'ot_principal' in df.columns:
            reprogramaciones = df[df['id_tipo_id'] == '5']
            print(f"\n🔄 Reprogramaciones encontradas: {len(reprogramaciones)}")
            
            if len(reprogramaciones) > 0:
                print("  Ejemplos de ot_principal en reprogramaciones:")
                for i, (idx, row) in enumerate(reprogramaciones.head(5).iterrows()):
                    print(f"    - {row.get('orden_trabajo', 'N/A')} → ot_principal: {row.get('ot_principal', 'N/A')}")
        
        # Verificar PTEs solo para OTs iniciales
        if 'id_tipo_id' in df.columns and 'id_pte_header_id' in df.columns:
            ots_iniciales = df[df['id_tipo_id'] == '4']
            ptes_unicos_iniciales = ots_iniciales['id_pte_header_id'].nunique()
            print(f"\n📄 PTEs únicos para OTs iniciales: {ptes_unicos_iniciales}")
            
            reprogramaciones = df[df['id_tipo_id'] == '5']
            print(f"📄 Reprogramaciones (sin PTE propio): {len(reprogramaciones)}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error analizando datos: {e}")
        return False

def importar_ots_desde_excel(archivo_excel):
    """
    Función principal para importar OTs desde Excel
    """
    try:
        # Leer Excel
        print(f"📖 Leyendo archivo: {archivo_excel}")
        df = pd.read_excel(archivo_excel, dtype=str)
        
        # Verificar columnas requeridas
        columnas_requeridas = [
            'orden_trabajo', 'oficio_ot', 'descripcion_trabajo',
            'id_tipo_id', 'id_estatus_ot_id'
        ]
        
        for col in columnas_requeridas:
            if col not in df.columns:
                print(f"✗ Columna requerida no encontrada: {col}")
                return False
        
        # Columnas requeridas específicas por tipo
        ots_iniciales = df[df['id_tipo_id'] == '4']
        reprogramaciones = df[df['id_tipo_id'] == '5']
        
        print(f"✅ Archivo cargado. {len(df)} registros encontrados.")
        print(f"📊 Distribución:")
        print(f"  OTs Iniciales (tipo 4): {len(ots_iniciales)}")
        print(f"  Reprogramaciones (tipo 5): {len(reprogramaciones)}")
        
        # Verificar columnas para OTs iniciales
        if len(ots_iniciales) > 0 and 'id_pte_header_id' not in df.columns:
            print("✗ OTs iniciales requieren columna 'id_pte_header_id'")
            return False
        
        # Verificar columnas para reprogramaciones
        if len(reprogramaciones) > 0 and 'ot_principal' not in df.columns:
            print("✗ Reprogramaciones requieren columna 'ot_principal'")
            return False
        
        # Estadísticas
        total_procesados = 0
        total_exitosos = 0
        total_fallidos = 0
        errores = []
        
        # Procesar PRIMERO las OTs iniciales
        print("\n" + "="*50)
        print("🚀 PROCESANDO OTs INICIALES (TIPO 4)")
        print("="*50)
        
        for idx, fila in ots_iniciales.iterrows():
            contador = idx + 2
            total_procesados += 1
            
            print(f"\n--- Procesando OT inicial fila {contador} ---")
            
            fila_dict = fila.to_dict()
            exito, mensaje = procesar_fila(fila_dict, contador, es_reprogramacion=False)
            
            if exito:
                total_exitosos += 1
            else:
                total_fallidos += 1
                errores.append(f"Fila {contador} (inicial): {mensaje}")
            
            if total_procesados % 10 == 0:
                print(f"\n📊 Progreso: {total_procesados}/{len(df)} procesados")
        
        # Procesar las reprogramaciones
        print("\n" + "="*50)
        print("🚀 PROCESANDO REPROGRAMACIONES (TIPO 5)")
        print("="*50)
        
        for idx, fila in reprogramaciones.iterrows():
            contador = idx + 2
            total_procesados += 1
            
            print(f"\n--- Procesando reprogramación fila {contador} ---")
            
            fila_dict = fila.to_dict()
            exito, mensaje = procesar_fila(fila_dict, contador, es_reprogramacion=True)
            
            if exito:
                total_exitosos += 1
            else:
                total_fallidos += 1
                errores.append(f"Fila {contador} (reprogramación): {mensaje}")
            
            if total_procesados % 10 == 0:
                print(f"\n📊 Progreso: {total_procesados}/{len(df)} procesados")
        
        # Resumen final
        print("\n" + "="*50)
        print("📋 RESUMEN DE IMPORTACIÓN")
        print("="*50)
        print(f"Total registros en Excel: {len(df)}")
        print(f"  - OTs Iniciales: {len(ots_iniciales)}")
        print(f"  - Reprogramaciones: {len(reprogramaciones)}")
        print(f"Total procesados: {total_procesados}")
        print(f"✅ Exitosos: {total_exitosos}")
        print(f"❌ Fallidos: {total_fallidos}")
        
        if errores:
            print("\n🚨 Errores encontrados:")
            for error in errores[:10]:
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
    
    # Analizar datos primero
    analizar_datos_excel(archivo_excel)
    
    # Confirmación del usuario
    print("\n" + "="*60)
    print("IMPORTADOR DE OTs HISTÓRICAS CON REPROGRAMACIONES")
    print("="*60)
    print(f"📁 Archivo: {archivo_excel}")
    print(f"🗂️ Base de datos: {os.environ.get('DJANGO_SETTINGS_MODULE', 'Desconocida')}")
    print("\n⚠ ADVERTENCIA: Este proceso modificará la base de datos.")
    print("⚠ IMPORTANTE: Las reprogramaciones heredan PTE de la OT principal.")
    
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
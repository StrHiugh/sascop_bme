import os
import sys
import django
import pandas as pd
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

# ==========================================
# 1. CONFIGURACIÓN DEL ENTORNO DJANGO
# ==========================================
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bme_subtec.settings')
django.setup()

from operaciones.models import (
    AnexoContrato, SubAnexo, ConceptoMaestro,
    UnidadMedida, Tipo
)

# ==========================================
# 2. VARIABLES DE CONFIGURACIÓN
# ==========================================
ARCHIVO_EXCEL = 'ANEXO_C_PUES.xlsx'
ID_ANEXO_MAESTRO = 1 

HOJAS_OBJETIVO = [
    "PUE´s BME" 
]

COLUMNAS_REQUERIDAS = [
    'ANEXO',
    'PARTIDA', 
    'CONCEPTO', 
    'UNIDAD', 
    'CANTIDADES DE REFERENCIA',
    'P.U. M.N.',
    'P.U. USD',
    'PTE CREACION',
    'OT CREACION',
    'FECHA SANCION',
    'PARTIDA EXT',
    'ESTATUS',
    'COMENTARIO'
]

# ==========================================
# 3. FUNCIONES DE LIMPIEZA
# ==========================================

def limpiar_moneda(valor, contexto=""):
    """Convierte valores de Excel a Decimal de forma segura."""
    if pd.isna(valor) or str(valor).strip() in ['', '-']:
        return Decimal(0)
    
    if isinstance(valor, (int, float)):
        return Decimal(str(valor))

    val_str = str(valor).replace('$', '').replace(' ', '').strip()
    
    if ',' in val_str:
        val_str = val_str.replace(',', '')
        
    try:
        return Decimal(val_str)
    except (ValueError, InvalidOperation):
        return Decimal(0)

def limpiar_texto(valor):
    """Convierte nan o vacíos a None, o devuelve el string limpio."""
    if pd.isna(valor):
        return None
    val_str = str(valor).strip()
    if val_str == '' or val_str.lower() == 'nan':
        return None
    return val_str

def limpiar_fecha(valor):
    """Intenta convertir fechas de Excel a YYYY-MM-DD."""
    if pd.isna(valor) or str(valor).strip() in ['', '-']:
        return None
    
    try:
        fecha = pd.to_datetime(valor, errors='coerce')
        if pd.isna(fecha):
            return None
        return fecha.date()
    except:
        return None

def encontrar_fila_encabezados(xls, hoja, columnas_buscadas):
    """
    Escanea las primeras 50 filas para encontrar dónde están los encabezados.
    """
    try:
        df_temp = pd.read_excel(xls, sheet_name=hoja, header=None, nrows=50)
    except Exception:
        return None
    
    for idx, row in df_temp.iterrows():
        valores_fila = [str(val).strip().upper() for val in row.values if pd.notna(val)]
        columnas_clave = ['PARTIDA', 'CONCEPTO', 'UNIDAD']
        if set(columnas_clave).issubset(set(valores_fila)):
            return idx
    return None

def importar_conceptos():
    print("🚀 INICIANDO IMPORTACIÓN OPTIMIZADA (BULK) - PUE's BME")
    print(f"📂 Archivo: {ARCHIVO_EXCEL}")
    print("-" * 60)

    if not os.path.exists(ARCHIVO_EXCEL):
        print(f"❌ ERROR CRÍTICO: No existe el archivo '{ARCHIVO_EXCEL}'")
        return

    # ---------------------------------------------------------
    # PASO 1: CARGA DE CATÁLOGOS EN MEMORIA (CACHE)
    # ---------------------------------------------------------
    try:
        print("📥 Cargando catálogos en memoria...")
        anexo_maestro = AnexoContrato.objects.get(id=ID_ANEXO_MAESTRO)
        
        tipo_partida = Tipo.objects.get(id=7) 
        print(f"✅ Tipo Partida seleccionado: {tipo_partida} (ID: 7)")
        
        # 1. Cache de Unidades
        unidades_cache = {
            u.clave.strip().upper(): u 
            for u in UnidadMedida.objects.all()
        }

        # 2. Cache de SubAnexos
        subanexos_cache = {
            s.clave_anexo.strip().upper(): s 
            for s in SubAnexo.objects.filter(anexo_maestro=anexo_maestro)
        }

        # 3. Cache de Conceptos Existentes
        # Incluimos también los que tienen sub_anexo=None si fuera posible rastrearlos,
        # pero la query actual se limita a los hijos del anexo maestro.
        conceptos_existentes = {
            (c.sub_anexo_id, c.partida_ordinaria): c
            for c in ConceptoMaestro.objects.filter(
                sub_anexo__anexo_maestro=anexo_maestro
            ).exclude(partida_ordinaria__isnull=True)
        }

        print(f"✅ Cache listo: {len(unidades_cache)} Unidades, {len(subanexos_cache)} SubAnexos.")
        print(f"✅ Conceptos previos en BD: {len(conceptos_existentes)}")

    except ObjectDoesNotExist as e:
        print(f"❌ ERROR BD: {e}")
        return

    try:
        xls = pd.ExcelFile(ARCHIVO_EXCEL)
    except Exception as e:
        print(f"❌ Error Excel: {e}")
        return

    # ---------------------------------------------------------
    # PASO 2: PROCESAMIENTO DE ARCHIVO
    # ---------------------------------------------------------
    
    batch_crear = []
    batch_actualizar = []
    errores = []
    
    llaves_procesadas_hoy = set()
    total_leidos = 0

    for hoja in HOJAS_OBJETIVO:
        if hoja not in xls.sheet_names:
            print(f"⚠️  Hoja faltante: '{hoja}'")
            continue

        fila_header = encontrar_fila_encabezados(xls, hoja, COLUMNAS_REQUERIDAS)
        
        if fila_header is None:
            msg = f"⛔ HOJA '{hoja}' OMITIDA: No se encontraron encabezados válidos."
            print(f"   {msg}")
            errores.append(msg)
            continue

        print(f"\n📄 Procesando '{hoja}' (Encabezados en fila {fila_header + 1})...")
        
        df = pd.read_excel(xls, sheet_name=hoja, header=fila_header)
        df.columns = [str(col).strip().upper() for col in df.columns]

        conteo_hoja = 0
        
        for index, row in df.iterrows():
            fila_excel = fila_header + index + 2
            
            # --- Lectura y Limpieza de Campos Clave ---
            partida_ord_str = limpiar_texto(row.get('PARTIDA'))
            partida_ext_str = limpiar_texto(row.get('PARTIDA EXT'))
            concepto_str = limpiar_texto(row.get('CONCEPTO'))
            
            if not concepto_str: continue 
            if not partida_ord_str and not partida_ext_str: continue 
            if partida_ord_str and partida_ord_str.upper() == 'PARTIDA': continue 

            # --- Lógica de Anexo (DINÁMICA) ---
            clave_anexo = limpiar_texto(row.get('ANEXO'))
            sub_anexo_obj = None

            if clave_anexo:
                # 1. Si trae dato, lo buscamos en Cache
                clave_clean = clave_anexo.upper()
                sub_anexo_obj = subanexos_cache.get(clave_clean)
                
                if not sub_anexo_obj:
                    # 2. Si no existe, LO CREAMOS (como solicitaste)
                    try:
                        print(f"   ✨ Creando nuevo SubAnexo: {clave_clean}")
                        sub_anexo_obj, _ = SubAnexo.objects.get_or_create(
                            anexo_maestro=anexo_maestro,
                            clave_anexo=clave_clean,
                            defaults={
                                'descripcion': f"Auto-generado desde importación ({hoja})",
                                'activo': True
                            }
                        )
                        # Actualizamos el caché para que la siguiente fila no intente crearlo otra vez
                        subanexos_cache[clave_clean] = sub_anexo_obj
                    except Exception as e:
                        msg = f"Error creando SubAnexo '{clave_clean}': {e}"
                        if msg not in errores: errores.append(msg)
                        continue
            else:
                # 3. Si NO trae dato, se queda como None
                # Se guardará sin relación (huérfano)
                sub_anexo_obj = None

            # --- Resto de Campos ---
            unidad_raw = row.get('UNIDAD')
            unidad_str = str(unidad_raw).strip().upper() if pd.notna(unidad_raw) else ""
            unidad_obj = unidades_cache.get(unidad_str)
            
            if not unidad_obj:
                msg = f"Unidad '{unidad_str}' no existe (Fila {fila_excel})."
                if msg not in errores: errores.append(msg)
                continue

            # Valores Numéricos
            cantidad = limpiar_moneda(row.get('CANTIDADES DE REFERENCIA'))
            pu_mn = limpiar_moneda(row.get('P.U. MN') or row.get('P.U. M.N.') or row.get('P.U. PESOS'))
            pu_usd = limpiar_moneda(row.get('P.U. USD') or row.get('P.U. DOLARES'))
            
            # Campos Nuevos
            pte_creacion = limpiar_texto(row.get('PTE CREACION'))
            ot_creacion = limpiar_texto(row.get('OT CREACION'))
            fecha_auth = limpiar_fecha(row.get('FECHA SANCION'))
            estatus_str = limpiar_texto(row.get('ESTATUS'))
            comentario_str = limpiar_texto(row.get('COMENTARIO'))

            # --- Decidir CREATE o UPDATE ---
            
            if partida_ord_str:
                # La llave única incluye el ID del subanexo (que puede ser None)
                sub_anexo_id = sub_anexo_obj.id if sub_anexo_obj else None
                llave_unica = (sub_anexo_id, partida_ord_str)
                
                if llave_unica in llaves_procesadas_hoy:
                    continue
                llaves_procesadas_hoy.add(llave_unica)
                
                if llave_unica in conceptos_existentes:
                    # UPDATE
                    obj = conceptos_existentes[llave_unica]
                    obj.descripcion = concepto_str
                    obj.unidad_medida = unidad_obj
                    obj.cantidad = cantidad
                    obj.precio_unitario_mn = pu_mn
                    obj.precio_unitario_usd = pu_usd
                    obj.id_tipo_partida = tipo_partida
                    # Nuevos
                    obj.partida_extraordinaria = partida_ext_str
                    obj.pte_creacion = pte_creacion
                    obj.ot_creacion = ot_creacion
                    obj.fecha_autorizacion = fecha_auth
                    obj.estatus = estatus_str
                    obj.comentario = comentario_str
                    obj.activo = True
                    
                    batch_actualizar.append(obj)
                else:
                    # CREATE
                    nuevo_obj = ConceptoMaestro(
                        sub_anexo=sub_anexo_obj,
                        partida_ordinaria=partida_ord_str,
                        partida_extraordinaria=partida_ext_str,
                        descripcion=concepto_str,
                        unidad_medida=unidad_obj,
                        cantidad=cantidad,
                        precio_unitario_mn=pu_mn,
                        precio_unitario_usd=pu_usd,
                        id_tipo_partida=tipo_partida,
                        pte_creacion=pte_creacion,
                        ot_creacion=ot_creacion,
                        fecha_autorizacion=fecha_auth,
                        estatus=estatus_str,
                        comentario=comentario_str,
                        activo=True
                    )
                    batch_crear.append(nuevo_obj)
            else:
                # SOLO EXTRAORDINARIA (Siempre CREATE)
                nuevo_obj = ConceptoMaestro(
                    sub_anexo=sub_anexo_obj,
                    partida_ordinaria=None,
                    partida_extraordinaria=partida_ext_str,
                    descripcion=concepto_str,
                    unidad_medida=unidad_obj,
                    cantidad=cantidad,
                    precio_unitario_mn=pu_mn,
                    precio_unitario_usd=pu_usd,
                    id_tipo_partida=tipo_partida,
                    pte_creacion=pte_creacion,
                    ot_creacion=ot_creacion,
                    fecha_autorizacion=fecha_auth,
                    estatus=estatus_str,
                    comentario=comentario_str,
                    activo=True
                )
                batch_crear.append(nuevo_obj)

            conteo_hoja += 1
            total_leidos += 1
        
        print(f"   🔹 Leídos válidos en hoja: {conteo_hoja}")

    # ---------------------------------------------------------
    # PASO 3: ESCRITURA MASIVA (COMMIT)
    # ---------------------------------------------------------
    print("\n💾 GUARDANDO CAMBIOS EN BASE DE DATOS...")

    try:
        with transaction.atomic():
            if batch_crear:
                print(f"   🔨 Creando {len(batch_crear)} nuevas partidas...")
                ConceptoMaestro.objects.bulk_create(batch_crear)
            
            if batch_actualizar:
                print(f"   🔄 Actualizando {len(batch_actualizar)} partidas existentes...")
                ConceptoMaestro.objects.bulk_update(batch_actualizar, [
                    'descripcion', 'unidad_medida', 'cantidad', 
                    'precio_unitario_mn', 'precio_unitario_usd', 
                    'id_tipo_partida', 'partida_extraordinaria',
                    'pte_creacion', 'ot_creacion', 'fecha_autorizacion',
                    'estatus', 'comentario', 'activo', 
                    # Importante: Si cambia el subanexo en una actualización, habría que agregarlo aquí
                    # pero bulk_update no soporta FKs tan fácil si cambian de None a ID.
                    # Para este caso asumimos que la partida no cambia de anexo.
                ])
                
        print("\n" + "="*60)
        print(f"🏁 PROCESO TERMINADO CON ÉXITO")
        print(f"   Total Procesados: {total_leidos}")
        print(f"   Nuevos: {len(batch_crear)}")
        print(f"   Actualizados: {len(batch_actualizar)}")

    except Exception as e:
        print(f"❌ ERROR AL GUARDAR EN BD: {e}")

    if errores:
        print(f"\n⚠️  ERRORES ENCONTRADOS ({len(errores)}):")
        for i, err in enumerate(errores):
            if i < 20: print(f"   🔴 {err}")
        if len(errores) > 20: print(f"   ... y {len(errores)-20} más.")

if __name__ == "__main__":
    importar_conceptos()
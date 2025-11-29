# importar_excel.py
import os
import sys
import django
import pandas as pd

# Agregar el directorio actual al path para importar la app operaciones
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bme_subtec.settings')
django.setup()

from operaciones.models import Producto, Sitio, Tipo, UnidadMedida

def importar_productos():
    archivo = 'PRODUCTOS_IMPORTAR.xlsx'
    
    try:
        df = pd.read_excel(archivo)
        print(f"📖 Leyendo archivo: {archivo}")
        print(f"📊 Columnas encontradas: {list(df.columns)}")
        
        productos_creados = 0
        errores = []
        
        for index, row in df.iterrows():
            try:
                print(f"\n📝 Procesando fila {index + 2}: {row['id_partida'],row['anexo']}")
                
                sitio = Sitio.objects.get(id=row['id_sitio'])
                tipo = Tipo.objects.get(id=row['id_tipo_partida'])
                unidad = UnidadMedida.objects.get(id=row['id_unidad_medida'])
                
                print(f"   ✅ Sitio: {sitio.descripcion}")
                print(f"   ✅ Tipo: {tipo.descripcion}") 
                print(f"   ✅ Unidad: {unidad.descripcion}")
                
                producto, created = Producto.objects.get_or_create(
                    id_partida=row['id_partida'],
                    defaults={
                        'descripcion_concepto': row['descripcion_concepto'],
                        'anexo': row['anexo'],
                        'id_sitio': sitio,
                        'id_tipo_partida': tipo,
                        'id_unidad_medida': unidad,
                        'precio_unitario_mn': row['precio_unitario_mn'],
                        'precio_unitario_usd': row['precio_unitario_usd'],
                        'activo': True,  # Siempre activo
                        'comentario': 'Importado desde Excel'
                    }
                )
                
                if created:
                    productos_creados += 1
                    print(f"   ✅ PRODUCTO CREADO: {producto.id_partida}")
                else:
                    print(f"   ⚠️ YA EXISTÍA: {producto.id_partida}")
                    
            except Sitio.DoesNotExist:
                error_msg = f"Sitio con ID {row['id_sitio']} no existe"
                errores.append(error_msg)
                print(f"   ❌ {error_msg}")
            except Tipo.DoesNotExist:
                error_msg = f"Tipo con ID {row['id_tipo_partida']} no existe"
                errores.append(error_msg)
                print(f"   ❌ {error_msg}")
            except UnidadMedida.DoesNotExist:
                error_msg = f"UnidadMedida con ID {row['id_unidad_medida']} no existe"
                errores.append(error_msg)
                print(f"   ❌ {error_msg}")
            except Exception as e:
                error_msg = f"Error general: {str(e)}"
                errores.append(error_msg)
                print(f"   ❌ {error_msg}")
        
        print(f"\n🎉 RESUMEN: {productos_creados} productos creados")
        if errores:
            print(f"❌ {len(errores)} errores encontrados")
            for error in errores:
                print(f"   - {error}")
            
    except FileNotFoundError:
        print(f"❌ Archivo no encontrado: {archivo}")
    except Exception as e:
        print(f"❌ Error al leer archivo: {str(e)}")

if __name__ == "__main__":
    importar_productos()
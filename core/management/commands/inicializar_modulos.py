from django.core.management.base import BaseCommand
from core.models import Modulo

class Command(BaseCommand):
    help = 'Inicializa módulos sin afectar operaciones existente'

    def handle(self, *args, **options):
        modulos = [
            {
                'app_name': 'operaciones',
                'nombre': 'Sistema de Operaciones',
                'descripcion': 'Gestión de PTEs y procesos operativos',
                'orden': 1,
                'icono': 'engineering',
                'activo': True
            },
            {
                'app_name': 'costa_fuera',
                'nombre': 'Costa Fuera', 
                'descripcion': 'Reportes diarios de operaciones en costa fuera',
                'orden': 2,
                'icono': 'sailing',
                'activo': True
            },
            {
                'app_name': 'reportes',
                'nombre': 'Sistema de Reportes',
                'descripcion': 'Generación y visualización de reportes',
                'orden': 3,
                'icono': 'assessment',
                'activo': False  # No activo inicialmente
            },
        ]

        for modulo_data in modulos:
            modulo, created = Modulo.objects.get_or_create(
                app_name=modulo_data['app_name'],
                defaults=modulo_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Módulo {modulo.nombre} registrado')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'↻ Módulo {modulo.nombre} ya existe')
                )
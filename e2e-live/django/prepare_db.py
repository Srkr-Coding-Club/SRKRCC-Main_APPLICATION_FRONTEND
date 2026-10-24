"""
Create (or re-create) a throw-away database for the live run, using the connection details the project already uses,
and write its URL to a file (never printed) so the test processes can use it. The project's own database is untouched.
"""
import json
import os
import sys

import django
import psycopg2
from psycopg2 import sql

NAME = 'srkrcc_live_e2e'

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.conf import settings  # noqa: E402

db = settings.DATABASES['default']
host, port = db.get('HOST') or 'localhost', db.get('PORT') or 5432
connection = psycopg2.connect(dbname='postgres', user=db['USER'], password=db['PASSWORD'], host=host, port=port)
connection.autocommit = True
with connection.cursor() as cursor:
    cursor.execute('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()', [NAME])
    cursor.execute(sql.SQL('DROP DATABASE IF EXISTS {}').format(sql.Identifier(NAME)))
    cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(NAME)))
connection.close()

url = f"postgres://{db['USER']}:{db['PASSWORD']}@{host}:{port}/{NAME}"
with open(sys.argv[1], 'w', encoding='utf-8') as handle:
    json.dump({'DATABASE_URL': url}, handle)
print(f'created database {NAME}')

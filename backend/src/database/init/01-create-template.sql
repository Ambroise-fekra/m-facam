-- Docker auto-init: ensures the template DB exists so the backend can clone it.
SELECT 'CREATE DATABASE facam_template'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'facam_template')\gexec

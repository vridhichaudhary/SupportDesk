import re

with open("alembic/versions/a17473f40aba_seed_ticket_permissions.py", "r") as f:
    content = f.read()

# Replace bulk_insert with raw SQL INSERT ON CONFLICT DO NOTHING
content = content.replace("op.bulk_insert(permissions, new_permissions)", "for p in new_permissions:\n        op.execute(f\"\"\"INSERT INTO permissions (id, codename, display_name, description, module, created_at) VALUES ('{p['id']}', '{p['codename']}', '{p['display_name']}', '{p['description']}', '{p['module']}', '{p['created_at']}') ON CONFLICT (codename) DO NOTHING\"\"\")")

with open("alembic/versions/a17473f40aba_seed_ticket_permissions.py", "w") as f:
    f.write(content)

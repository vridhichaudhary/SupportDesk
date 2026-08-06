# SupportDesk AI Backup & Restore Guide

SupportDesk relies on two stateful components: PostgreSQL (primary data) and Redis (caching and Celery broker).

## 1. PostgreSQL Backups

All critical data (users, tickets, knowledge base, permissions) lives in Postgres.

### Automated Backups
It is highly recommended to configure a cron job to backup the database daily.

Create a backup script (`backup.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/supportdesk"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump the database
docker exec supportdesk_db pg_dump -U postgres supportdesk | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Delete backups older than 7 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
```

### Restoring a Backup

To restore from a `db_backup.sql.gz` file:

```bash
# 1. Stop the application containers to prevent new writes
docker-compose -f docker-compose.prod.yml stop backend celery-worker celery-beat frontend

# 2. Drop and recreate the database
docker exec -it supportdesk_db psql -U postgres -c "DROP DATABASE supportdesk;"
docker exec -it supportdesk_db psql -U postgres -c "CREATE DATABASE supportdesk;"

# 3. Restore the data
gunzip -c /path/to/db_backup.sql.gz | docker exec -i supportdesk_db psql -U postgres -d supportdesk

# 4. Restart the application
docker-compose -f docker-compose.prod.yml start
```

## 2. Redis Persistence

Redis is configured in `docker-compose.prod.yml` to save its dataset to disk every 60 seconds if at least 1 key changed (`--save 60 1`).
The data is stored in the `redis_data` Docker volume.

If Redis crashes, it will automatically reload the dataset from the `dump.rdb` file on restart. Note that Redis primarily holds ephemeral data (cache, sessions, active Celery tasks), so a full backup strategy is usually not required.

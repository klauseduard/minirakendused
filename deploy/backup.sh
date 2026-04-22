#!/bin/bash
# Garden Planner SQLite backup script
# Run via cron: 0 3 * * * /root/garden-planner/deploy/backup.sh
#
# Keeps 7 daily backups in /root/garden-planner-backups/

set -euo pipefail

BACKUP_DIR="/root/garden-planner-backups"
DB_PATH="/root/garden-planner/backend/data/garden.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

# Use SQLite's .backup for a consistent snapshot (safe even with WAL mode)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/garden-$TIMESTAMP.db'"

# Also back up photos directory
if [ -d "/root/garden-planner/backend/data/photos" ]; then
    tar -czf "$BACKUP_DIR/photos-$TIMESTAMP.tar.gz" \
        -C /root/garden-planner/backend/data photos/
fi

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "garden-*.db" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "photos-*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: garden-$TIMESTAMP.db"

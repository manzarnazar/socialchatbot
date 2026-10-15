#!/bin/sh
set -e

# Role of this container (app, queue, reverb, scheduler, or custom)
ROLE=${CONTAINER_ROLE:-app}
ENVIRONMENT=${APP_ENV:-production}

echo "Starting WhatsOmni Backend Container [Role: $ROLE] [Env: $ENVIRONMENT]..."

# Ensure required storage directories exist
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/app/public \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

# Only fix permissions and run migrations in the main app container to prevent concurrent I/O disk locking
if [ "$ROLE" = "app" ]; then
    chown -R www-data:www-data /var/www/html/storage/framework /var/www/html/storage/logs /var/www/html/bootstrap/cache 2>/dev/null || true
    chmod -R 775 /var/www/html/storage/framework /var/www/html/storage/logs /var/www/html/bootstrap/cache 2>/dev/null || true

    # Create storage symlink if it doesn't exist
    if [ ! -L /var/www/html/public/storage ]; then
        echo "Creating storage symlink..."
        php artisan storage:link || true
    fi

    if [ "$RUN_MIGRATIONS" = "true" ]; then
        echo "Waiting for MySQL database to become ready..."
        MAX_TRIES=20
        COUNT=0
        until php -r "try { \$h = getenv('DB_HOST') ?: 'mysql'; \$p = getenv('DB_PORT') ?: 3306; \$d = getenv('DB_DATABASE') ?: 'whatsomni'; \$u = getenv('DB_USERNAME') ?: 'whatsomni'; \$pw = getenv('DB_PASSWORD') ?: ''; new PDO(\"mysql:host={\$h};port={\$p};dbname={\$d}\", \$u, \$pw, [PDO::ATTR_TIMEOUT => 2]); echo 'Connected' . PHP_EOL; exit(0); } catch (Exception \$e) { exit(1); }" > /dev/null 2>&1; do
            COUNT=$((COUNT + 1))
            if [ $COUNT -gt $MAX_TRIES ]; then
                echo "Warning: Database connection timed out after $MAX_TRIES attempts."
                exit 1
            fi
            echo "Database unavailable, waiting 1 second (attempt $COUNT/$MAX_TRIES)..."
            sleep 1
        done

        if [ $COUNT -le $MAX_TRIES ]; then
            echo "Database connected. Running migrations..."
            php artisan migrate --force
        fi
    fi

    if [ "$ENVIRONMENT" = "production" ] && [ "$CACHE_ON_STARTUP" = "true" ]; then
        echo "Caching Laravel configuration and routes for production..."
        php artisan config:cache || true
        php artisan route:cache || true
        php artisan view:cache || true
        php artisan event:cache || true
    fi
fi

# Dispatch based on role
if [ "$ROLE" = "app" ]; then
    echo "Starting PHP-FPM server on port 9000..."
    exec php-fpm -F
elif [ "$ROLE" = "queue" ]; then
    echo "Starting Laravel Queue Worker..."
    exec php artisan queue:work --sleep=3 --tries=3 --max-time=3600 --timeout=60 --memory=128
elif [ "$ROLE" = "reverb" ]; then
    echo "Starting Laravel Reverb WebSocket Server on port 8080..."
    exec php artisan reverb:start --host=0.0.0.0 --port=8080
elif [ "$ROLE" = "scheduler" ]; then
    echo "Starting Laravel Task Scheduler Worker..."
    exec php artisan schedule:work
else
    # Execute any custom command passed to docker
    exec "$@"
fi

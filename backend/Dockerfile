# Production PHP 8.3-FPM Alpine Dockerfile for WhatsOmni Backend
FROM php:8.3-fpm-alpine

# Install system dependencies and extension installer helper
RUN apk add --no-cache \
    curl \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    libxml2-dev \
    oniguruma-dev \
    mysql-client \
    shadow

# Use docker-php-extension-installer for robust and lean extension builds
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions \
    pdo_mysql \
    bcmath \
    mbstring \
    xml \
    curl \
    zip \
    gd \
    intl \
    opcache \
    pcntl \
    posix \
    redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first for caching layers
COPY composer.json composer.lock* ./

# Install PHP dependencies without dev packages
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Copy backend source code
COPY . .

# Finish composer autoload generation
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Copy custom PHP and PHP-FPM configurations
COPY docker/php.ini $PHP_INI_DIR/conf.d/99-whatsomni.ini
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-whatsomni.conf

# Setup Entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Ensure storage & cache permissions
RUN mkdir -p storage/framework/cache/data \
             storage/framework/sessions \
             storage/framework/views \
             storage/app/public \
             storage/logs \
             bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 9000 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["app"]

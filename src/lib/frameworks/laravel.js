'use strict';

const path = require('path');
const fs = require('fs-extra');
const php = require('./common/php');

const laravel = {
  'id': 'laravel',
  'runtime': 'php',
  'website': 'http://www.laravel.cn/',
  'detectors': {
    'and': [
      {
        'type': 'regex',
        'path': 'composer.json',
        'content': '"laravel/framework":\\s*".+?"'
      }
    ]
  },
  'actions': [
    {
      'condition': true,
      'description': 'download nginx and php dependences',
      'processors': [
        {
          'type': 'function',
          'function': async (codeDir) => {
            const dotFunPath = path.join(codeDir, '.fun');
            await fs.ensureDir(dotFunPath);
            await php.downloadNginxAndPhp(codeDir);
          }
        },
        php.PHP_FPM_CONF,
        php.WWW_CONF,
        php.NGINX_CONF,
        php.LOGROTATE_D_NGINX,
        php.LOGROTATE_D_PHP_7_2_FPM,
        php.PHP_INI_PRODUCTION,
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'nginx', 'sites-enabled', 'laravel.conf'],
          'mode': '0755',
          'backup': false,
          'content': `
keepalive_timeout 1200s;
server {
  listen 9000;
  server_name localhost;
  root /code/public;

  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-XSS-Protection "1; mode=block";
  add_header X-Content-Type-Options "nosniff";

  index index.html index.htm index.php;

  charset utf-8;

  location / {
      try_files $uri $uri/ /index.php?$query_string;
  }

  location = /favicon.ico { access_log off; log_not_found off; }
  location = /robots.txt  { access_log off; log_not_found off; }

  error_page 404 /index.php;

  location ~ \\.php$ {
      fastcgi_pass             127.0.0.1:9527;
      fastcgi_index index.php;
      fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
      include fastcgi_params;
      proxy_read_timeout 180;
  }

  location ~ /\.(?!well-known).* {
      deny all;
  }
}
`
        },
        {
          'type': 'generateFile',
          'path': '.funignore',
          'mode': '0755',
          'content': `
!.env
`
        },
        {
          'type': 'generateFile',
          'path': 'laravel_bootstrap',
          'mode': '0755',
          'content': `#!/usr/bin/env bash
set +e

mkdir -p /tmp/log/nginx/
mkdir -p /tmp/var/nginx/
mkdir -p /tmp/var/sessions/
mkdir -p /tmp/storage/framework/views
mkdir -p /tmp/storage/framework/sessions

export STORAGE_PATH=/tmp/storage

echo "start php-fpm"
php-fpm7.2 -c /code/.fun/root/usr/lib/php/7.2/php.ini-production -y /code/.fun/root/etc/php/7.2/fpm/php-fpm.conf

echo "start nginx"
nginx -c /code/.fun/root/etc/nginx/nginx.conf

sleep 5

while true
do
    echo "check ...."
    nginx_server=\`ps aux | grep nginx | grep -v grep\`
    if [ ! "$nginx_server" ]; then
        echo "restart nginx ..."
        nginx -c /code/.fun/root/etc/nginx/nginx.conf
    fi
    php_fpm_server=\`ps aux | grep php-fpm | grep -v grep\`
    if [ ! "$php_fpm_server" ]; then
        echo "restart php-fpm ..."
        php-fpm7.2 -c /code/.fun/root/usr/lib/php/7.2/php.ini-production -y /code/.fun/root/etc/php/7.2/fpm/php-fpm.conf
    fi
    sleep 10
done
`
        }
      ]
    }
  ]
};

module.exports = laravel;

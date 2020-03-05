'use strict';

const path = require('path');
const fs = require('fs-extra');
const tmpDir = require('temp-dir');
const zip = require('../package/zip');
const httpx = require('httpx');

async function downloadNginxAndPhp(codeDir) {
  const dotFunPath = path.join(codeDir, '.fun');
  let zipName = await fs.readFile(path.join(__dirname, 'support', 'php', 'ZIPNAME'), 'utf8');
  zipName = zipName.split(/\r?\n/)[0]
  const url = `https://gosspublic.alicdn.com/fun/frameworks/support/${zipName}`;
  console.log(tmpDir, `aaa${zipName}aaa`);
  const downloadPath = path.join(tmpDir, zipName);
  
  console.log(`downloading nginx and php7.2 zip from ${url} to ${downloadPath}...`);

  if (!await fs.pathExists(downloadPath)) {
    const writeStream = fs.createWriteStream(downloadPath);
  
    const response = await httpx.request(url, { timeout: 36000000, method: 'GET' }); // 10 hours
    await new Promise((resolve, reject) => {
      response.pipe(writeStream).on('error', err => {
        fs.removeSync(downloadPath);
        reject(err);
      }).on('finish', resolve);
    });
  }

  console.log('extract nginx and php7.2 zip to custom runtime...');
  await zip.extractZipTo(downloadPath, dotFunPath);
}

const thinkphp = {
  'id': 'thinkphp',
  'runtime': 'php',
  'website': 'http://www.thinkphp.cn/',
  'detectors': {
    'or': [
      {
        'type': 'regex',
        'path': 'composer.json',
        'content': '"topthink/framework":\\s*".+?"'
      },
      {
        'type': 'dir',
        'paths': ['thinkphp', 'ThinkPHP'],
      },
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
            await downloadNginxAndPhp(codeDir);
          }
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'php', '7.2', 'fpm', 'php-fpm.conf'],
          'mode': '0755',
          'content': `[global]
pid = /tmp/php7.2-fpm.pid
error_log = /tmp/php7.2-fpm.log
include=/code/.fun/root/etc/php/7.2/fpm/pool.d/*.conf
`
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'php', '7.2', 'fpm', 'pool.d', 'www.conf'],
          'mode': '0755',
          'backup': false,
          'content': `[www]
user = www-data
group = www-data
listen = 127.0.0.1:9527
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3          
`
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'nginx', 'nginx.conf'],
          'mode': '0755',
          'backup': false,
          'content': `error_log /tmp/log/nginx/error.log error;
worker_processes auto;
pid /tmp/nginx.pid;
include /code/.fun/root/etc/nginx/modules-enabled/*.conf;

events {
  worker_connections 768;
}

http {
  client_body_temp_path /tmp/var/nginx/body;
  fastcgi_temp_path /tmp/var/nginx/fastcgi;
  proxy_temp_path /tmp/var/nginx/proxy;
  uwsgi_temp_path /tmp/var/nginx/uwsgi;
  scgi_temp_path /tmp/var/nginx/scgi;

  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;

  include /code/.fun/root/etc/nginx/mime.types;
  default_type application/octet-stream;

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # Dropping SSLv3, ref: POODLE
  ssl_prefer_server_ciphers on;

  access_log /tmp/log/nginx/access.log;
  error_log /tmp/log/nginx/error.log error;

  gzip on;
  gzip_disable "msie6";

  include /code/.fun/root/etc/nginx/conf.d/*.conf;
  include /code/.fun/root/etc/nginx/sites-enabled/*;
}    
`
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'logrotate.d', 'nginx'],
          'mode': '0755',
          'backup': false,
          'content': `/tmp/log/nginx/*.log {
daily
missingok
rotate 14
compress
delaycompress
notifempty
create 0640 www-data adm
sharedscripts
prerotate
  if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
    run-parts /etc/logrotate.d/httpd-prerotate; \
  fi \
endscript
postrotate
  invoke-rc.d nginx rotate >/dev/null 2>&1
endscript
}          
`
        },
        { // todo: postrotate
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'logrotate.d', 'php7.2-fpm'],
          'mode': '0755',
          'backup': false,
          'content': `/tmp/php7.2-fpm.log {
  rotate 12
  weekly
  missingok
  notifempty
  compress
  delaycompress
  postrotate
    /usr/lib/php/php7.2-fpm-reopenlogs
  endscript
}              
`
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'etc', 'nginx', 'sites-enabled', 'thinkphp.conf'],
          'mode': '0755',
          'backup': false,
          'content': `server {
  listen 9000;
  root /code/public;
  index  index.php index.html index.htm;
  server_name  localhost;

  client_max_body_size 100M;

  location / {
      # same as .htaccess used for apache in thinkphp public folder 
      # http://www.thinkphp.cn/topic/40391.html
      if ( -f $request_filename) {
          break;
      }
      if ( !-e $request_filename) {
          rewrite ^(.*)$ /index.php/$1 last;
          break;
      }  
  }

  location ~ .+\.php($|/) {
      include snippets/fastcgi-php.conf;
      fastcgi_pass             127.0.0.1:9527;
      fastcgi_param   SCRIPT_FILENAME $document_root$fastcgi_script_name;
  }
}     
`
        },
        {
          'type': 'generateFile',
          'path': ['.fun', 'root', 'usr', 'lib', 'php', '7.2', 'php.ini-production'],
          'mode': '0755',
          'backup': false,
          'content': `[PHP]
engine = On
short_open_tag = Off
precision = 14
output_buffering = 4096
zlib.output_compression = Off
implicit_flush = Off
unserialize_callback_func =
serialize_precision = -1
disable_functions = pcntl_alarm,pcntl_fork,pcntl_waitpid,pcntl_wait,pcntl_wifexited,pcntl_wifstopped,pcntl_wifsignaled,pcntl_wifcontinued,pcntl_wexitstatus,pcntl_wtermsig,pcntl_wstopsig,pcntl_signal,pcntl_signal_get_handler,pcntl_signal_dispatch,pcntl_get_last_error,pcntl_strerror,pcntl_sigprocmask,pcntl_sigwaitinfo,pcntl_sigtimedwait,pcntl_exec,pcntl_getpriority,pcntl_setpriority,pcntl_async_signals,
disable_classes =
zend.enable_gc = On
expose_php = Off
max_execution_time = 30
max_input_time = 60
memory_limit = 128M
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
display_errors = Off
display_startup_errors = Off
log_errors = On
log_errors_max_len = 1024
ignore_repeated_errors = Off
ignore_repeated_source = Off
report_memleaks = On
html_errors = On
variables_order = "GPCS"
request_order = "GP"
register_argc_argv = Off
auto_globals_jit = On
post_max_size = 8M
auto_prepend_file =
auto_append_file =
default_mimetype = "text/html"
default_charset = "UTF-8"
doc_root =
user_dir =
enable_dl = Off
file_uploads = On
upload_max_filesize = 2M
max_file_uploads = 20
allow_url_fopen = On
allow_url_include = Off
default_socket_timeout = 60

[CLI Server]
cli_server.color = On

[Pdo_mysql]
pdo_mysql.cache_size = 2000
pdo_mysql.default_socket=

[mail function]
SMTP = localhost
smtp_port = 25
mail.add_x_header = Off

[ODBC]
odbc.allow_persistent = On
odbc.check_persistent = On
odbc.max_persistent = -1
odbc.max_links = -1
odbc.defaultlrl = 4096
odbc.defaultbinmode = 1

[Interbase]
ibase.allow_persistent = 1
ibase.max_persistent = -1
ibase.max_links = -1
ibase.timestampformat = "%Y-%m-%d %H:%M:%S"
ibase.dateformat = "%Y-%m-%d"
ibase.timeformat = "%H:%M:%S"

[MySQLi]
mysqli.max_persistent = -1
mysqli.allow_persistent = On
mysqli.max_links = -1
mysqli.cache_size = 2000
mysqli.default_port = 3306
mysqli.default_socket =
mysqli.default_host =
mysqli.default_user =
mysqli.default_pw =
mysqli.reconnect = Off

[mysqlnd]
mysqlnd.collect_statistics = On
mysqlnd.collect_memory_statistics = Off

[PostgreSQL]
pgsql.allow_persistent = On
pgsql.auto_reset_persistent = Off
pgsql.max_persistent = -1
pgsql.max_links = -1
pgsql.ignore_notice = 0
pgsql.log_notice = 0

[bcmath]
bcmath.scale = 0

[Session]
session.save_handler = files
session.use_strict_mode = 0
session.use_cookies = 1
session.use_only_cookies = 1
session.name = PHPSESSID
session.auto_start = 0
session.cookie_lifetime = 0
session.cookie_path = /
session.cookie_domain =
session.cookie_httponly =
session.serialize_handler = php
session.gc_probability = 0
session.gc_divisor = 1000
session.gc_maxlifetime = 1440
session.referer_check =
session.cache_limiter = nocache
session.cache_expire = 180
session.use_trans_sid = 0
session.sid_length = 26
session.trans_sid_tags = "a=href,area=href,frame=src,form="
session.sid_bits_per_character = 5
[Assertion]
zend.assertions = -1
[Tidy]
tidy.clean_output = Off

[soap]
soap.wsdl_cache_enabled=1
soap.wsdl_cache_dir="/tmp"
soap.wsdl_cache_ttl=86400
soap.wsdl_cache_limit = 5

[ldap]
ldap.max_links = -1

extension_dir = "/code/.fun/root/usr/lib/php/20170718/"

extension=phar.so
extension=exif.so
extension=calendar.so
extension=tokenizer.so
extension=zip.so
extension=ctype.so
extension=mysqlnd.so
extension=simplexml.so
extension=shmop.so
extension=posix.so
extension=gd.so
extension=sysvsem.so
extension=sockets.so
extension=pdo.so
extension=dom.so
extension=xmlreader.so
extension=xmlwriter.so
extension=fileinfo.so
extension=pdo_mysql.so
extension=sysvmsg.so
extension=json.so
extension=ftp.so
extension=mysqli.so
extension=intl.so
extension=readline.so
extension=gettext.so
extension=sysvshm.so
extension=curl.so
extension=ldap.so
extension=mbstring.so
extension=xmlrpc.so
extension=soap.so
extension=xml.so
extension=iconv.so
extension=xsl.so
extension=wddx.so
extension=simplexml.so

zend_extension=opcache.so

session.save_path=/tmp/var/sessions 
`
        },  
        {
          'type': 'generateFile',
          'path': 'bootstrap',
          'mode': '0755',
          'content': `#!/usr/bin/env bash
set +e

mkdir -p /tmp/log/nginx/
mkdir -p /tmp/var/nginx/
mkdir -p /tmp/var/sessions/

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

module.exports = thinkphp;
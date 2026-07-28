# ECS 部署手册

本文说明大蓝树在单台 ECS 上的构建、发布、验证、回滚和备份流程。当前线上拓扑使用 Docker Compose 运行 Java 后端、React 用户端和 Vue 管理端，由 Nginx 统一暴露 HTTP 服务。

本文中的 `<...>` 均为需要按环境替换的值。密码、令牌、AccessKey、数据库完整连接串和私钥不得写入仓库、发布包、Shell 历史或本文档。

## 1. 架构与路由

```text
Internet / CDN / TLS 终止
        |
        v
Nginx :80
  |-- /              -> 用户端 SSR（Node，127.0.0.1:3000）
  |-- /api/          -> Java 后端（127.0.0.1:8080）
  |-- /admin/        -> 管理端静态文件
  `-- /admin-api/    -> Java 后端（移除 /admin-api 前缀）

Java 后端 -> MySQL（私网）
Java 后端 -> Redis（127.0.0.1:6379）
```

当前容器名称为 `dalanshu-nginx`、`dalanshu-web`、`dalanshu-backend` 和 `dalanshu-redis`。后端、用户端和 Redis 不应直接暴露到公网；安全组仅需按实际接入方式开放 `80`、`443` 和受限来源的 `22`。

仓库中的 [script/docker/dev-cloud/compose.yml](../../script/docker/dev-cloud/compose.yml) 与 [script/docker/dev-cloud/nginx.conf](../../script/docker/dev-cloud/nginx.conf) 是当前 ECS 部署结构的参考。`script/docker/docker-compose.yml` 是框架的本地组件示例，包含示例账号和 host 网络模式，不能直接用于生产。

## 2. 前置条件

构建机需要以下环境：

- JDK 17、Maven、Node.js 24（用户端运行时也使用 Node 24）和 npm。
- 可访问 Maven、npm 和容器镜像源。
- 可通过 SSH 访问 ECS 的专用部署账号。禁止使用共享 root 密码；使用独立账号和 SSH 密钥。

ECS 需要安装 Docker Engine 与 Docker Compose v2，并预先拉取或允许拉取以下镜像：

- `eclipse-temurin:17-jre-jammy`
- `node:24-alpine`
- `nginx:1.27-alpine`
- `redis:7.4-alpine`

在首次发布前确认：

```bash
docker --version
docker compose version
docker info >/dev/null
```

## 3. ECS 目录和私密配置

推荐在 ECS 上维护以下目录。`current` 始终是指向某个发布版本的符号链接，容器只挂载此链接所指向的构建产物。

```text
/opt/dalanshu/
  app/
    compose.yml
    nginx.conf
    current -> releases/<version>
    releases/<version>/
      backend/dalanshu-backend.jar
      web/.output/
      admin/dist/
    logs/backend/
    temp/
    uploads/
  redis/
    redis.conf
    users.acl
    data/
  backups/mysql/

/etc/dalanshu/
  app.env
  properties/
    database.properties
    mail.properties
    tos.properties
```

应用配置不进入发布目录。当前 `compose.yml` 通过 `env_file` 显式读取 `/etc/dalanshu/app.env`、`database.properties`、`mail.properties` 和 `tos.properties`。Redis、认证、VOD、内容安全和短信等其余环境变量统一放入 `app.env`，除非 Compose 已同步增加新的属性文件。所有私密配置只允许管理员读取：

```bash
sudo install -d -m 0750 /etc/dalanshu/properties
sudo chown -R root:root /etc/dalanshu
sudo chmod 0600 /etc/dalanshu/app.env /etc/dalanshu/properties/*.properties
```

至少应在私密配置中提供下列值：

| 分类 | 必需项 |
| --- | --- |
| 数据库 | `DALANSHU_DB_PASSWORD`，以及与目标环境对应的 URL、用户名 |
| Redis | `DALANSHU_REDIS_PASSWORD` |
| 认证 | `SA_TOKEN_JWT_SECRET` |
| 邮件 | `DALANSHU_MAIL_PASSWORD`；启用邮件时还需发件人和 SMTP 相关配置 |
| 对象存储 | 启用 TOS 时的 `VOLCENGINE_ACCESS_KEY_ID`、`VOLCENGINE_ACCESS_KEY_SECRET`、Bucket、Region、Endpoint |
| 视频 | 启用 VOD 时的 AK/SK、空间、工作流、回调和播放域名配置 |
| 内容安全与短信 | 仅在启用对应功能时配置各服务的凭据和开关 |

属性名可参照 `script/env/*.example` 与 `ruoyi-admin/src/main/resources/application-prod.yml`。正式发布必须使用 Maven `prod` Profile；不要依赖默认的 `dev` Profile。Java 配置文件会在构建时根据 Maven Profile 过滤并打入 JAR。

## 4. 首次部署

### 4.1 准备运行目录

在 ECS 上执行：

```bash
sudo install -d -m 0755 /opt/dalanshu/app/releases
sudo install -d -m 0755 /opt/dalanshu/app/logs/backend
sudo install -d -m 0755 /opt/dalanshu/app/temp
sudo install -d -m 0755 /opt/dalanshu/app/uploads
sudo install -d -m 0755 /opt/dalanshu/backups/mysql
sudo install -d -m 0750 /opt/dalanshu/redis/data
```

将经过环境核对的 `compose.yml` 与 `nginx.conf` 放到 `/opt/dalanshu/app/`。应以 `script/docker/dev-cloud/` 的结构为基础，逐项确认以下环境差异：

- 后端构建产物使用 `-Pprod`，数据库指向目标环境，数据库用户名和密码最小授权。
- `SERVER_ADDRESS` 保持 `127.0.0.1`，前端 Node 服务保持监听 `127.0.0.1:3000`。
- Redis 使用本机回环地址并开启认证；不要映射到公网接口。
- Nginx 保留 `/api/`、`/admin/`、`/admin-api/` 路由，并按域名接入方式配置 TLS。当前参考配置仅监听 HTTP `80`；TLS 可在 CDN、负载均衡或 Nginx 终止。
- Compose 中的 `env_file` 路径必须与 `/etc/dalanshu` 的私密配置一致。

首次部署也要写入 Redis 配置和 ACL，启动前进行配置检查：

```bash
cd /opt/dalanshu/app
docker compose config --quiet
```

## 5. 构建发布包

以下命令在干净的构建机或 CI 中执行。先使用当前分支对应的增量 SQL 完成数据库变更评审和备份，再构建应用；不要在应用上线后才执行不可逆 SQL。

```bash
# 后端：prod Profile 会将 application-prod.yml 的配置打入 JAR，且不跳过测试
mvn -pl ruoyi-admin -am clean verify -Pprod -DskipTests=false

# 用户端：生产构建会生成 dalanbook-frontend/.output
cd dalanbook-frontend
npm ci
npm run lint
NITRO_PRESET=node-server npm run build
cd ..

# 管理端：Nginx 路由使用 /admin-api，覆盖默认的 /prod-api
cd plus-ui
npm ci
npm run lint:eslint
VITE_APP_BASE_API=/admin-api npm run build:prod
cd ..
```

用户端对后端请求使用同源 `/api/v1/*`，不需要在构建时填入后端公网地址。若启用 VOD 播放，构建用户端前应在构建机受保护的 `.env.local` 中设置 `VITE_VOD_LICENSE_URL` 和 `VITE_VOD_APP_ID`；二者会被编译进公开前端资源，不能放入私钥。

构建后应存在以下产物：

```text
ruoyi-admin/target/ruoyi-admin.jar
dalanbook-frontend/.output/
plus-ui/dist/
```

## 6. 发布流程

发布版本使用提交短 SHA 加 UTC 时间，例如 `a1b2c3d-20260720T060000Z`。先上传到一个尚未被 `current` 引用的新目录，完成后再切换符号链接，避免容器读取到半成品。

在构建机设置变量：

```bash
export DEPLOY_SSH='<deploy-user>@<ecs-host>'
export VERSION="$(git rev-parse --short HEAD)-$(date -u +%Y%m%dT%H%M%SZ)"
```

创建远端版本目录并上传产物：

```bash
ssh "$DEPLOY_SSH" "mkdir -p /opt/dalanshu/app/releases/$VERSION/{backend,web,admin}"

rsync -az --delete ruoyi-admin/target/ruoyi-admin.jar \
  "$DEPLOY_SSH:/opt/dalanshu/app/releases/$VERSION/backend/dalanshu-backend.jar"
rsync -az --delete dalanbook-frontend/.output/ \
  "$DEPLOY_SSH:/opt/dalanshu/app/releases/$VERSION/web/.output/"
rsync -az --delete plus-ui/dist/ \
  "$DEPLOY_SSH:/opt/dalanshu/app/releases/$VERSION/admin/dist/"
```

远端先确认发布包完整，再切换版本并重建容器：

```bash
ssh "$DEPLOY_SSH" "
  set -eu
  test -f /opt/dalanshu/app/releases/$VERSION/backend/dalanshu-backend.jar
  test -f /opt/dalanshu/app/releases/$VERSION/web/.output/server/index.mjs
  test -f /opt/dalanshu/app/releases/$VERSION/admin/dist/index.html
  cd /opt/dalanshu/app
  ln -s releases/$VERSION current.next
  mv -Tf current.next current
  docker compose up -d --force-recreate
  docker compose ps
"
```

`docker compose up -d --force-recreate` 会短暂重启三个应用容器。单机部署无法做到无中断发布；需要无中断发布时，应增加第二实例和负载均衡健康检查。

## 7. 发布验证与观测

发布完成后，在 ECS 上执行：

```bash
cd /opt/dalanshu/app
docker compose ps
docker compose logs --tail=200 backend
docker exec dalanshu-nginx nginx -t
curl -fsS http://127.0.0.1:8080/actuator/health
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/admin/
```

从外部访问实际域名，至少验证：

- 用户端首页可加载，登录、注册和刷新令牌请求可正常调用 `/api/v1/*`。
- 管理端 `/admin/` 可加载，登录后接口请求使用 `/admin-api/`。
- 图片上传、对象存储访问、邮件验证码、短视频和内容安全等已启用能力可用。
- Nginx、后端、Redis 无持续重启，后端日志无连接数据库或 Redis 的异常。

后端日志位于 `/opt/dalanshu/app/logs/backend/`。OOM 时 JVM 会按容器参数在临时目录生成转储；保留足够磁盘空间并将转储作为受限诊断资料处理。

## 8. 数据库变更与备份

业务数据库的增量脚本位于 `script/sql/update/`。每次发布前：

1. 记录本次要执行的 SQL 文件、版本和校验结果。
2. 在维护窗口前完成 MySQL 逻辑备份并验证备份文件可读取。
3. 先在与生产版本一致的预发环境执行 SQL 与应用验证。
4. 生产执行后记录执行时间、操作者和影响行数。

MySQL 客户端凭据应存放在权限为 `0600` 的独立 defaults 文件中，而不是命令参数。示例：

```bash
umask 077
mysqldump --defaults-extra-file=/etc/dalanshu/backup.cnf \
  --single-transaction --routines --events --databases <database_name> \
  | gzip > "/opt/dalanshu/backups/mysql/<database_name>-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
gzip -t /opt/dalanshu/backups/mysql/<database_name>-<timestamp>.sql.gz
```

应用版本回退不能自动回退数据库。SQL 若涉及不可逆 DDL 或数据迁移，必须先提供经验证的回滚脚本或恢复方案；在方案明确前禁止发布。

## 9. 回滚与故障处理

先获取当前版本和历史版本：

```bash
cd /opt/dalanshu/app
readlink current
find releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r
```

仅当数据库变更向后兼容时，可将 `current` 指向上一可用版本并重启容器：

```bash
cd /opt/dalanshu/app
PREVIOUS='releases/<known-good-version>'
test -f "$PREVIOUS/backend/dalanshu-backend.jar"
ln -s "$PREVIOUS" current.rollback
mv -Tf current.rollback current
docker compose up -d --force-recreate
docker compose ps
```

常见排查命令：

```bash
cd /opt/dalanshu/app
docker compose logs --tail=200 backend
docker compose logs --tail=200 web
docker compose logs --tail=200 nginx
docker stats --no-stream
df -h
ss -ltnp
```

| 现象 | 优先检查项 |
| --- | --- |
| Nginx 返回 `502` | 容器状态、`127.0.0.1:3000` 与 `127.0.0.1:8080` 监听情况、对应容器日志 |
| 后端启动失败 | 私密配置权限、数据库和 Redis 连通性、JAR 是否以 `-Pprod` 构建 |
| 管理端接口 `404` | 管理端构建时是否设置 `VITE_APP_BASE_API=/admin-api`，Nginx 是否保留 `/admin-api/` 代理 |
| 用户端接口异常 | Nginx `/api/` 代理、后端 `/api/v1/*` 路由、浏览器请求状态与后端日志 |
| Redis 认证失败 | `DALANSHU_REDIS_PASSWORD` 与 Redis ACL 是否一致；不要用空字符串替代未认证模式 |
| 磁盘持续增长 | 后端日志、上传包、MySQL 备份、Redis RDB、JVM 转储；清理前先确认保留策略 |

## 10. 日常维护

- 每次发布记录 Git 提交、构建时间、发布版本、SQL、操作者和验证结果。
- 每日备份数据库，定期执行恢复演练；备份应异地保存并加密。
- 每月更新基础镜像并在预发环境验证，避免直接以浮动标签升级。
- 定期检查 `docker compose ps`、磁盘容量、日志、失败重启次数和登录审计。
- 生产环境应限制 Actuator、监控页和 SSH 的访问来源，轮换已暴露或长期未轮换的凭据。

## 11. 内网 Tailscale 测试部署

本节记录 `172.18.121.233` 上的实际测试环境。该环境不是前文的 Docker Compose 拓扑：Java 后端和 Node 用户端由 systemd 直接运行，宝塔 Nginx 仅监听回环地址 `127.0.0.1:18088`，Tailscale Funnel 在 `443` 终止 TLS 后转发到该端口。大蓝岛不监听或占用 `80` 端口。

### 11.1 端口、目录和服务

| 组件 | 实际位置或监听 | 管理方式 |
| --- | --- | --- |
| 发布根目录 | `/opt/dalanshu-test/` | `current` 链接到 `/opt/dalanshu-test/releases/<version>` |
| Java 后端 | `127.0.0.1:8080` | `dalan­shu-test-backend.service`（文件名实际为 `dalanshu-test-backend.service`） |
| React/TanStack 用户端 | `127.0.0.1:3000` | `dalan­shu-test-web.service`（文件名实际为 `dalanshu-test-web.service`） |
| Vue 管理端 | `/opt/dalanshu-test/current/admin/dist/` | Nginx 静态文件 |
| Nginx 测试入口 | `127.0.0.1:18088` | `/www/server/nginx/sbin/nginx` |
| 既有独立程序 | `0.0.0.0:56013` | 不属于大蓝岛，部署和回滚时禁止停止或改动 |
| Redis | `6379`，`redis-server.service` | 配置 `/etc/redis/redis.conf` |
| MySQL | `3306`，`mysql.service`/`mysqld.service` | 配置 `/etc/my.cnf`，数据目录 `/www/server/data/` |

后端 systemd 单元位于 `/etc/systemd/system/dalanshu-test-backend.service`，用户端单元位于 `/etc/systemd/system/dalanshu-test-web.service`。后端私密环境文件为 `/opt/dalanshu-test/shared/backend.env`，权限必须保持 `0600`，排查时只确认文件存在和变量名，不要输出变量值。

测试机当前 Redis 和 MySQL 监听所有地址，但它们不应通过 Nginx 或 Funnel 暴露。应由主机防火墙和内网访问控制限制来源；调整监听地址前要先核对现有调用方，不能在应用发布过程中顺带修改。

### 11.2 Nginx 与 Tailscale

实际 Nginx 虚拟主机配置为：

```text
/www/server/panel/vhost/nginx/dalanshu-test.conf
```

Tailscale 服务单元为 `/usr/lib/systemd/system/tailscaled.service`，运行状态保存在 `/var/lib/tailscale/tailscaled.state`。该状态文件只能由 tailscaled 管理，禁止手工编辑或输出内容。当前 Funnel 映射使用以下命令核对：

```bash
tailscale funnel status
```

预期映射为 `https://wxf-ubutu.tail8ebb72.ts.net/` 到 `http://127.0.0.1:18088`。增加或发布应用路径不需要修改 Funnel。

当前路由表如下：

| 外部路径 | 处理方式 | 上游实际路径 |
| --- | --- | --- |
| `/dalanshu` | `301` | `/dalanshu/` |
| `/dalanshu/` | 反向代理到用户端 | 保留 `/dalanshu/`，转到 `127.0.0.1:3000` |
| `/dalanshu/assets/` | 用户端静态资源代理 | 去掉 `/dalanshu` 后转到 `127.0.0.1:3000/assets/` |
| `/dalanshu/api/` | 反向代理到后端 | 转为 `127.0.0.1:8080/api/`，保留后端 `/api` 前缀 |
| `/dalanshu/admin` | `301` | `/dalanshu/admin/` |
| `/dalanshu/admin/` | 管理端静态 SPA | `/opt/dalanshu-test/current/admin/dist/` |
| `/dalanshu/admin-api/` | 反向代理到后端 | 转为 `127.0.0.1:8080/`，去掉外部管理 API 前缀 |
| `/api/` | 兼容路由 | `127.0.0.1:8080`，保留 `/api` 前缀 |
| `/` | 兼容路由 | `127.0.0.1:3000` |

用户端必须使用 Node preset 和 `/dalanshu/` Vite base 构建。TanStack Start 会据此生成 Router basepath 和 `/dalanshu/assets/` 资源 URL；默认构建会生成 Cloudflare worker，不能由当前 systemd 单元运行：

```bash
cd dalanbook-frontend
npm ci
NITRO_PRESET=node-server npm run build -- --base=/dalanshu/
```

Node 产物内部仍从 `/assets/` 提供静态文件，所以 Nginx 必须单独去掉资源路径的 `/dalanshu` 前缀，但用户页面代理必须保留该前缀。两条规则的 `proxy_pass` 末尾斜杠不可互换：

```nginx
location /dalanshu/assets/ {
    proxy_pass http://127.0.0.1:3000/assets/;
}

location /dalanshu/ {
    proxy_pass http://127.0.0.1:3000;
}
```

当前浏览器 API 调用和少量普通锚点仍使用根路径，因此 `/api/` 与 `/` 暂时保留为兼容路由；TanStack Router 生成的页面导航已经限定在 `/dalanshu/`。删除兼容路由前必须先改造并回归这些根路径调用。

管理端必须按对外路径构建，不修改 `plus-ui/.env.production`：

```bash
cd plus-ui
npm ci
VITE_APP_CONTEXT_PATH=/dalanshu/admin/ \
VITE_APP_BASE_API=/dalanshu/admin-api/ \
npm run build:prod
```

上传后统一静态文件权限，避免 rsync 保留构建机的限制性 umask：

```bash
find /opt/dalanshu-test/current/admin/dist -type d -exec chmod 0755 {} +
find /opt/dalanshu-test/current/admin/dist -type f -exec chmod 0644 {} +
```

管理 API 的 `proxy_pass` 必须带末尾斜杠：

```nginx
location /dalanshu/admin-api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}

location /dalanshu/admin/ {
    alias /opt/dalanshu-test/current/admin/dist/;
    try_files $uri $uri/ /dalanshu/admin/index.html;
}
```

### 11.3 增加路径服务的模板

新服务继续复用 `18088`，不增加公网监听端口。先为上游选择未占用的回环端口，再在 `dalanshu-test.conf` 中增加唯一前缀：

```nginx
location = /dalanshu/<service> {
    return 301 /dalanshu/<service>/;
}

location /dalanshu/<service>/ {
    proxy_pass http://127.0.0.1:<port>/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

`proxy_pass` 的末尾斜杠会去掉外部 location 前缀。若上游必须保留固定前缀，例如 `/api/`，则写成 `proxy_pass http://127.0.0.1:<port>/api/;`。静态 SPA 还必须让构建工具的 base 与外部路径完全一致，再使用独立 `alias` 和 `try_files`，不能让两个应用共享同一个静态目录。

### 11.4 验证和回滚

修改 Nginx 前先创建时间戳备份：

```bash
CONF=/www/server/panel/vhost/nginx/dalanshu-test.conf
BACKUP="${CONF}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$CONF" "$BACKUP"
```

只在配置检查通过后 reload：

```bash
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
```

本机至少执行：

```bash
curl -fsS -o /dev/null http://127.0.0.1:18088/dalanshu/
curl -fsS -o /dev/null http://127.0.0.1:18088/dalanshu/admin/
curl -fsS -o /dev/null http://127.0.0.1:18088/dalanshu/admin-api/auth/code
curl -fsS -o /dev/null 'http://127.0.0.1:18088/dalanshu/auth?tab=register'
curl -fsS -o /dev/null http://127.0.0.1:18088/dalanshu/api/v1/auth/code
curl -fsS -o /dev/null http://127.0.0.1:56013/
systemctl is-active dalanshu-test-backend.service dalanshu-test-web.service
tailscale funnel status
```

再从独立客户端将 `127.0.0.1:18088` 换为实际 Funnel 域名执行相同检查，并用浏览器确认管理端登录页加载、静态资源 URL 均以 `/dalanshu/admin/` 开头。

Nginx 检查或 reload 失败时立即恢复：

```bash
cp -a "$BACKUP" "$CONF"
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
```

若只需回滚管理端静态产物，将 `admin/dist` 恢复为上一个已验证目录即可；不要切换整个 `current` 链接，除非后端和用户端也需要一起回滚。回滚后必须重新执行上述 6 个 HTTP 检查，并确认 `56013` 仍为 `200`。

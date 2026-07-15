# Dalanbook API v1

Base URL: `/api/v1`. JSON fields use camelCase. Public read endpoints accept an optional
`Authorization: Bearer <accessToken>` header so personalized flags can still be returned.

## Authentication

The existing RuoYi authentication implementation is available under both `/auth` and
`/api/v1/auth`. Password login accepts an email, phone number, or username in `account`.

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh` — body: `{ "refreshToken": "..." }`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/sms/code?phonenumber=...`

Access tokens are Sa-Token JWTs. Refresh tokens are signed JWTs with a 30-day lifetime and
are rotated whenever `/auth/refresh` succeeds. Production must provide `SA_TOKEN_JWT_SECRET`.

## Home and discovery

- `GET /api/v1/home/categories`
- `GET /api/v1/home/feed?categoryId=recommend&cursor=&limit=20`
- `GET /api/v1/home/circle-recommend?categoryId=ai`
- `GET /api/v1/home/left-nav`
- `GET /api/v1/search/suggest?q=AI`
- `GET /api/v1/me/summary`
- `POST /api/v1/events/impression`

Feed ordering and cursors use `(createdAt, id)` descending, so inserting new posts does not
shift later pages. Invalid cursors return HTTP 400 with code `INVALID_CURSOR`.

## Users, circles, and posts

- `GET /api/v1/users/{id}`
- `GET /api/v1/circles`
- `GET /api/v1/circles/mine?ownedOnly=false`
- `GET /api/v1/circles/{id}`
- `GET /api/v1/circles/{id}/posts?cursor=&limit=20`
- `POST /api/v1/circles`
- `PUT /api/v1/circles/{id}/membership` — body: `{ "joined": true }`
- `GET /api/v1/posts/{id}`
- `POST /api/v1/posts` — limited to 10 posts per user per hour; accepts up to 5 topic names in `topics`
- `POST /api/v1/posts/{id}/useful` — body: `{ "liked": true }`
- `GET /api/v1/topics?limit=20`
- `GET /api/v1/topics/{slug}?cursor=&limit=20`

Publishing requires circle membership. Posts with `visibility: "circle"` are only returned to
members on detail and circle-feed endpoints. Topics are created on first use and linked to posts
through `dalan_post_topic`; topic feeds only expose public posts.

The useful reaction has a unique `(postId, userId, type)` key and updates its aggregate count
in the same database transaction, making retries idempotent.

## Notifications and uploads

- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications?cursor=&limit=20`
- `PUT /api/v1/notifications/{id}/read`
- `POST /api/v1/uploads` — multipart field `file`, maximum 10 MiB

Accepted image MIME types: JPEG, PNG, WebP, and GIF. Storage uses the existing RuoYi OSS
service and returns `{ url, ossId, contentType, size }`.

## Database migration

Run [`script/sql/update/dalanbook_api_v1.sql`](../../script/sql/update/dalanbook_api_v1.sql)
against MySQL 8.0 before starting the API. Authentication identities and global roles remain in
`sys_user` and `sys_user_role`; `dalan_user_profile` contains only product-specific profile and
counter fields.

All stored timestamps are UTC. Set the database/session timezone to UTC in each environment.

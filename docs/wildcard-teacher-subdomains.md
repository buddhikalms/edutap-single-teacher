# EduTap Wildcard Teacher Subdomains

EduTap uses one Next.js application and one shared database for:

- `edutap.lk` - public EduTap website
- `app.edutap.lk` - central LMS and institute administration
- `*.edutap.lk` - teacher public websites and teacher dashboards

Do not deploy one app per teacher. Teacher context is resolved from the request hostname and matched to `Teacher.slug`.

## DNS

Create these DNS records:

```text
edutap.lk       A/AAAA or CNAME -> production load balancer
app.edutap.lk   A/AAAA or CNAME -> production load balancer
*.edutap.lk     A/AAAA or CNAME -> production load balancer
```

Reserved subdomains cannot be assigned to teachers:

```text
www, app, admin, api, student, parent, support
```

## SSL

Use a certificate that covers:

```text
edutap.lk
*.edutap.lk
```

For Let's Encrypt, use DNS-01 validation for wildcard issuance. HTTP-01 validation cannot issue wildcard certificates.

## Nginx

Example reverse proxy:

```nginx
server {
  listen 443 ssl http2;
  server_name edutap.lk *.edutap.lk;

  ssl_certificate /etc/letsencrypt/live/edutap.lk/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/edutap.lk/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Next.js Request Flow

`proxy.ts` reads `Host` / `X-Forwarded-Host`.

If the hostname is a non-reserved `*.edutap.lk` subdomain, it sets:

```text
x-edutap-teacher-slug: {subdomain}
```

Server code then resolves the teacher through `lib/teacher-tenancy.ts` and public catalog queries filter by that teacher.

## Slug Changes

Changing `Teacher.slug` changes the public URL immediately:

```text
oldslug.edutap.lk -> no longer resolves to that teacher
newslug.edutap.lk -> active teacher portal
```

If public SEO continuity is required, add a separate slug redirect table before allowing arbitrary slug changes.

## Caching

Teacher lookup must be request-scoped. Do not globally cache a `Teacher` object without a key that includes the slug and status.

Safe cache key shape:

```text
teacher-context:{slug}:{updatedAt}
```

Invalidate or revalidate public pages when a teacher's slug, status, branding, classes, or courses change.

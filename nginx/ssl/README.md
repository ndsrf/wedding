# SSL Configuration

## SSL Termination Options

This deployment supports two SSL termination strategies:

### Option 1: External SSL Termination (Default)

SSL is handled by an upstream service (load balancer, Cloudflare, etc.):
- No certificates needed in this directory
- Nginx listens on port 80 only
- Upstream proxy should set `X-Forwarded-Proto: https` header
- HSTS headers are added conditionally based on `X-Forwarded-Proto`

This is the default configuration and requires no changes.

### Option 2: SSL Termination within Nginx

If you need nginx to handle SSL directly:

1. **Enable SSL configuration:**
   ```bash
   cp nginx/conf.d/ssl.conf.example nginx/conf.d/ssl.conf
   ```

2. **Edit ssl.conf** and update `server_name` with your domain

3. **Place certificates in this directory:**
   - `fullchain.pem` - Full certificate chain
   - `privkey.pem` - Private key

4. **Update docker-compose.yml:**
   - Uncomment port 443 mapping
   - Uncomment SSL volume mount

5. **Restart nginx:**
   ```bash
   docker-compose restart nginx
   ```

## Obtaining Certificates

### Let's Encrypt (Recommended)

```bash
# Install certbot
apt-get install certbot

# Obtain certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### Self-Signed (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=localhost"
```

## Certificate Renewal

For Let's Encrypt, set up automatic renewal:

```bash
# Add to crontab
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

## Security Notes

- Never commit certificates to version control
- Set proper file permissions: `chmod 600 *.pem`
- Keep private keys secure
- The nginx user must have read access to certificates

Deployment Configuration Summary:

ORBX Enterprise Suite configured for deployment at:
URL: https://cgp.orbx.in (SSL via Cloudflare DNS challenge)

Ports:
- PostgreSQL: 5434
- Backend: 8003
- Frontend: 3002
- Nginx HTTPS: 443
- Nginx HTTP redirect: 80

Default Credentials:
- Super Admin: admin@orbx.com / AdminPassword123
- Company: ORBX Corporation
- Branch: Headquarters (HQ)

## SSL Certificate Setup (Cloudflare DNS Challenge)

Since port 80 is occupied by existing services on your server, use Cloudflare DNS challenge instead of HTTP challenge.

### Step 1: Create Cloudflare API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Use template" → "Edit zone DNS"
3. Select zone: `orbx.in` (or specific zone for `cgp.orbx.in`)
4. Set permissions: DNS → Edit
5. **Important:** Remove or adjust IP Address Filtering so certbot can reach Let's Encrypt from your VPS IP
6. Copy the generated token

### Step 2: Create certbot credentials
```bash
cd ~/orbx-cgp
mkdir -p certbot ssl
cp certbot/cloudflare.ini.example certbot/cloudflare.ini
# Edit cloudflare.ini and paste your Cloudflare API token
nano certbot/cloudflare.ini
chmod 600 certbot/cloudflare.ini
```

### Step 3: Obtain initial SSL certificate
```bash
# Start certbot standalone container to request certificate
docker compose run --rm certbot certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  -d cgp.orbx.in \
  --email admin@orbx.com --agree-tos --non-interactive
```

### Step 4: Copy certificates into nginx-accessible location
```bash
mkdir -p ~/orbx-cgp/ssl
cp /etc/letsencrypt/live/cgp.orbx.in/fullchain.pem ~/orbx-cgp/ssl/
cp /etc/letsencrypt/live/cgp.orbx.in/privkey.pem ~/orbx-cgp/ssl/
chmod 644 ~/orbx-cgp/ssl/fullchain.pem
chmod 600 ~/orbx-cgp/ssl/privkey.pem
```

### Step 5: Deploy with SSL
```bash
cd ~/orbx-cgp
docker compose down
docker compose up -d --build
```

### Step 6: Verify
Access at: https://cgp.orbx.in

The certbot container runs in the background and auto-renews certificates every 12 hours.

## SSL Certificate Setup (Cloudflare DNS Challenge)

Since port 80 is occupied by existing services on your server, use Cloudflare DNS challenge instead of HTTP challenge.

### Step 1: Create Cloudflare API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Use template" → "Edit zone DNS"
3. Select zone: `orbx.in` (or specific zone for `cgp.orbx.in`)
4. Set permissions: DNS → Edit
5. Copy the generated token

### Step 2: Create certbot credentials
```bash
cd ~/orbx-cgp
mkdir -p certbot ssl
cp certbot/cloudflare.ini.example certbot/cloudflare.ini
# Edit cloudflare.ini and paste your Cloudflare API token
nano certbot/cloudflare.ini
chmod 600 certbot/cloudflare.ini
```

### Step 3: Obtain initial SSL certificate
```bash
# Start certbot standalone container to request certificate
docker compose run --rm certbot certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  -d cgp.orbx.in \
  --email admin@orbx.com --agree-tos --non-interactive
```

### Step 4: Copy certificates into nginx-accessible location
```bash
mkdir -p ~/orbx-cgp/ssl
cp /etc/letsencrypt/live/cgp.orbx.in/fullchain.pem ~/orbx-cgp/ssl/
cp /etc/letsencrypt/live/cgp.orbx.in/privkey.pem ~/orbx-cgp/ssl/
chmod 644 ~/orbx-cgp/ssl/fullchain.pem
chmod 600 ~/orbx-cgp/ssl/privkey.pem
```

### Step 5: Deploy with SSL
```bash
cd ~/orbx-cgp
docker compose down
docker compose up -d --build
```

### Step 6: Verify
Access at: https://cgp.orbx.in:8040

The certbot container runs in the background and auto-renews certificates every 12 hours.

# CI/CD Deployment Setup

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys the full stack whenever you merge `develop` into `main`.

## What it does

1. **Frontend job** — builds Angular with production config, SCPs the `dist/` output to the VPS, replaces `/var/www/html/`
2. **Backend job** — SSHs into `/root/clozzet_v2_api`, runs `git pull origin main`, `npm ci`, `npm run build`, then `pm2 restart clozzet_v`

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|--------|-------|
| `SSH_HOST` | Your VPS IP or domain |
| `SSH_USERNAME` | SSH user (e.g. `root`) |
| `SSH_PRIVATE_KEY` | Full private key content including header/footer lines |
| `SSH_PORT` | SSH port — optional, defaults to `22` |

## Generating a dedicated SSH key (recommended)

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-clozzet" -f ~/.ssh/github_actions_key

# Print the private key — paste this as SSH_PRIVATE_KEY secret
cat ~/.ssh/github_actions_key

# Print the public key — add this to your VPS
cat ~/.ssh/github_actions_key.pub
```

On your VPS:
```bash
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## VPS requirements

- Nginx serving `/var/www/html/` (frontend)
- Backend at `/root/clozzet_v2_api` — must be a git repo with `origin` pointing to your backend GitHub repo
- PM2 running the backend with app name `clozzet_v`
- SSH user must have passwordless sudo for the `cp`/`chown` commands, or run as root

### Allow passwordless sudo for www-data commands (if not root)

```bash
sudo visudo
# Add:
yourusername ALL=(ALL) NOPASSWD: /bin/rm, /bin/cp, /bin/chown, /bin/chmod
```

## Triggering a deployment

Merge `develop` into `main`:

```bash
git checkout main
git merge develop
git push origin main
```

The Actions workflow starts automatically. Monitor it at:
**GitHub repo → Actions tab**

## Troubleshooting

**Build fails** — check the Actions log. Run `npm run build -- --configuration=production` locally to reproduce.

**SSH connection refused** — verify `SSH_HOST`, `SSH_PORT`, and that the public key is in `~/.ssh/authorized_keys` on the VPS.

**PM2 process not found** — run `pm2 list` on the VPS to confirm the exact app name. Update the workflow if it differs from `clozzet_v`.

**Backend git pull fails** — make sure `/root/clozzet_v2_api` has the correct `origin` remote pointing to your backend repo and the SSH user has read access.

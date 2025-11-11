# GitHub Actions Deployment Setup

This document explains how to configure automatic deployment to your VPS server.

## Overview

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys your Angular application to your VPS server whenever you push or merge to the `main` branch.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### How to Add Secrets:
1. Go to your GitHub repository
2. Click on **Settings**
3. In the left sidebar, click on **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret below

### Required Secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_HOST` | Your VPS server IP address or domain | `192.168.1.100` or `yourdomain.com` |
| `SSH_USERNAME` | SSH username for your server | `root` or `ubuntu` |
| `SSH_PRIVATE_KEY` | Your SSH private key (see below) | (multi-line key content) |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |

## How to Get Your SSH Private Key

### Option 1: Use Existing SSH Key
If you already have an SSH key pair for your server:

```bash
# On your local machine, display your private key
cat ~/.ssh/id_rsa
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### Option 2: Create a New SSH Key (Recommended)
Create a dedicated key for GitHub Actions:

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions_key

# Display the private key
cat ~/.ssh/github_actions_key

# Display the public key (you'll need to add this to your server)
cat ~/.ssh/github_actions_key.pub
```

Then add the **public key** to your server:

```bash
# On your VPS server
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Workflow Behavior

The deployment workflow will:

1. ✅ Trigger automatically on push/merge to `main` branch
2. ✅ Install dependencies using `npm ci`
3. ✅ Build the Angular app with production configuration
4. ✅ Transfer built files to your VPS server
5. ✅ Deploy files to `/var/www/html/`
6. ✅ Set proper permissions (www-data:www-data)

## Testing the Setup

After adding all secrets:

1. Commit and push a change to the `main` branch
2. Go to your repository → **Actions** tab
3. You should see the workflow running
4. Check the logs to verify successful deployment

## Troubleshooting

### Permission Denied
- Make sure your SSH user has sudo access without password prompt
- Run: `sudo visudo` and add: `yourusername ALL=(ALL) NOPASSWD: ALL`

### Connection Failed
- Verify `SSH_HOST` is correct
- Check if `SSH_PORT` is correct (default is 22)
- Ensure your VPS firewall allows SSH connections from GitHub Actions

### Build Fails
- Check the Actions logs for specific errors
- Ensure your Angular app builds locally with: `npm run build -- --configuration=production`

## Manual Deployment

If you need to deploy manually, you can still use the deployment script:

```bash
./scripts/deploy-frontend.sh
```

## Security Notes

- Never commit your private keys to the repository
- Use repository secrets for all sensitive information
- Consider using a dedicated SSH key for GitHub Actions
- Regularly rotate your SSH keys

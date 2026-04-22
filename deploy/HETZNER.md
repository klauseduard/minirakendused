# Deploying Garden Planner to Hetzner

## Context

We have a Hetzner VPS already running another project (Estonian Scrabble):

- **Server:** `89.167.100.76` (IPv4), `2a01:4f9:c014:f6e0::1` (IPv6)
- **Domain:** `klauseduard.duckdns.org`
- **Reverse proxy:** Caddy (handles HTTPS automatically via Let's Encrypt)
- **Existing deployment:** Scrabble game at `/scrabble/` (Docker container on port 8080)
- **SSH:** `ssh root@89.167.100.76`

## What this project is

Garden Planner is a **static site** — pure HTML/JS/CSS, no backend, no build step.
It doesn't need Docker, Python, or any runtime. Just serve the files.

## Deployment plan

### Option A: Caddy serves the files directly (simplest)

1. **Clone the repo on the server:**
   ```bash
   ssh root@89.167.100.76
   cd ~
   git clone https://github.com/klauseduard/garden-planner.git
   ```

2. **Add a route to the Caddyfile** (`/etc/caddy/Caddyfile`):
   ```
   klauseduard.duckdns.org {
       # ... existing scrabble config ...

       handle_path /garden/* {
           root * /root/garden-planner
           file_server
       }
   }
   ```

3. **Restart Caddy:**
   ```bash
   systemctl restart caddy
   ```

4. **Access:**
   - `https://klauseduard.duckdns.org/garden/gardening_calendar.html`
   - `https://klauseduard.duckdns.org/garden/külvikalender.html`

### Option B: Caddy with a cleaner URL

If you want `https://klauseduard.duckdns.org/garden/` to serve the main app
directly, add an index redirect:

```
handle_path /garden/* {
    root * /root/garden-planner
    try_files {path} gardening_calendar.html
    file_server
}
```

### Updating

```bash
ssh root@89.167.100.76
cd ~/garden-planner
git pull
# No restart needed — Caddy serves files directly from disk
```

## Current Caddyfile structure

The existing Caddyfile on the server looks roughly like this:

```
klauseduard.duckdns.org {
    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 3
            roll_keep_for 720h
        }
    }

    handle /robots.txt { ... }
    handle /sitemap.xml { ... }

    handle /scrabble {
        redir /scrabble/ permanent
    }
    handle_path /scrabble/* {
        reverse_proxy 127.0.0.1:8080
    }

    # ADD GARDEN PLANNER HERE:
    handle /garden {
        redir /garden/ permanent
    }
    handle_path /garden/* {
        root * /root/garden-planner
        file_server
    }
}
```

## Notes

- No Docker needed — it's static files
- No build step — files are served as-is from the git checkout
- HTTPS is handled by Caddy automatically (same cert as Scrabble)
- The `pildid/` (images) directory will be served as-is under `/garden/pildid/`
- Internal links in the HTML may need adjustment if they assume being served
  from root `/` — check that CSS/JS/image paths are relative, not absolute
- The Estonian file `külvikalender.html` has special characters in the filename —
  this works fine on Linux but test the URL encoding in the browser

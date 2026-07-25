# CLAUDE.md

## Development

- The user connects to this machine over Tailscale. Always run dev servers bound to
  `0.0.0.0` (not `localhost`/`127.0.0.1`) so they are reachable from other devices
  on the tailnet, and share URLs using the machine's Tailscale hostname/IP rather
  than `localhost`.

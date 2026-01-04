# Amp-Prox

A professional proxy wrapper for Amp CLI. Optimized for custom backends and reliable startup.

## Features
- **Config Separation**: All settings in `config/config.json`.
- **Automated Proxy**: Shim server starts automatically on port defined in config.
- **Timestamped Logs**: Rolling logs in `logs/` directory.
- **Crash Fixes**: Pre-mocked responses for common CLI initialization failures.

## Structure
- `bin/`: CLI entry point.
- `config/`: User settings.
- `src/`: Proxy logic.
- `logs/`: Runtime logs.

## Setup
```bash
npm run setup
```

## Usage
```bash
amp-prox
```

# FusionOS Desktop Application

**Status:** PLANNED — Phase 22

## Overview

The FusionOS Desktop Application will be built with Electron + React + TypeScript.

## Planned Features

- Secure employee login
- Clock in/out with face verification
- Fingerprint/biometric device capture
- Notifications
- Employee self-service actions
- Background attendance helpers
- Offline queue with sync
- Auto-updates

## Architecture

The desktop client is treated as **untrusted**. Every request is authenticated, validated, and authorized server-side. Biometric matching/liveness happens server-side.

## Dependencies

This package will depend on:
- `@fusionos/web` (shared React components)
- `@fusionos/types` (shared types)
- `@fusionos/shared` (shared utilities)

Electron and related packages will be added in Phase 22.

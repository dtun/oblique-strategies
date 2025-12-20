# Oblique Strategies

A mobile app and MCP server implementation for accessing Oblique Strategies.

## Project Structure

This is a Yarn workspaces monorepo containing:

- **apps/mobile** - React Native mobile app (Expo)
- **apps/mcp-server** - MCP server (Hono + Cloudflare Workers)
- **packages/shared** - Shared TypeScript types and utilities

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4.1.0+ (managed via `packageManager` field)

### Installation

```bash
yarn install
```

### Development

Run all dev servers concurrently:

```bash
yarn dev
```

Or run individually:

```bash
# Mobile app only
yarn dev:mobile

# MCP server only
yarn dev:mcp
```

### Building

Build all workspaces:

```bash
yarn build
```

Build shared package only:

```bash
yarn build:shared
```

### Deployment

Deploy MCP server to Cloudflare:

```bash
yarn deploy:mcp
```

### Type Checking

Check TypeScript types across all workspaces:

```bash
yarn typecheck
```

## Workspace Scripts

- `dev` - Run all dev servers concurrently
- `dev:mobile` - Run mobile app dev server
- `dev:mcp` - Run MCP server dev server
- `build` - Build all workspaces
- `build:shared` - Build shared package only
- `deploy:mcp` - Deploy MCP server to Cloudflare
- `typecheck` - Type-check all workspaces
- `clean` - Clean all build outputs and node_modules

## Technologies

- **TypeScript 5.8** - Type-safe development
- **Yarn 4** - Fast, reliable dependency management
- **Expo** - React Native framework
- **Hono** - Fast web framework for Cloudflare Workers
- **Cloudflare Workers** - Serverless compute platform

## License

Private project

# strapi-plugin-nextauth


## Installation

```bash
npm install strapi-plugin-nextauth
# or
yarn add strapi-plugin-nextauth
```

## Configuration

Add the plugin configuration to your `config/plugins.ts` file:

```typescript
export default ({ env }) => ({
  'strapi-plugin-nextauth': {
    enabled: true,
  },
});
```

## Development

1. Clone and configure the repo
2. Rebuild the plugin: `npm run build`
3. Link to your Strapi app: `npx yalc add --link strapi-plugin-nextauth && npm install`

## API Endpoints

- `POST /api/strapi-plugin-nextauth/login` - Login
- `POST /api/strapi-plugin-nextauth/sync` - Sync with Social Account

## Requirements

- Node.js 18+
- Strapi v5

## License

MIT

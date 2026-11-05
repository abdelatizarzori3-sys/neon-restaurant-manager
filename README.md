# Neon Restaurant Manager

A bilingual restaurant operations dashboard with a futuristic neon interface. It includes an overview, menu editor, order tracking, inventory, expenses, and Arabic/English language settings.

## Menu imports

- CSV files are parsed in the browser.
- Menu photos are sent to the server and OpenAI to create editable draft items. Review the extracted names and prices before saving them.
- OpenAI usage is billed to the account associated with the `OPENAI_API_KEY` secret. Never commit API keys or `.env` files.

## Data and current scope

Restaurant data is stored in the current browser's local storage. This first version has no sign-in, multi-restaurant isolation, or cross-device synchronization.

## Run in Replit

The project uses a pnpm workspace. Start the managed **API Server** and **Neon Restaurant Manager** workflows in Replit.

Useful checks:

```sh
pnpm --filter @workspace/neon-restaurant run typecheck
pnpm --filter @workspace/api-server run typecheck
```

Menu-photo extraction requires `OPENAI_API_KEY` to be configured as a Replit Secret for the API server.

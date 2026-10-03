import { Hono } from 'hono';
import type { HonoEnv } from '../index';

export const webhookRouter = new Hono<HonoEnv>();

// Register Telegram webhook
webhookRouter.all('/register', async (c) => {
  const token = c.env.BOT_TOKEN;
  const secret = c.env.WEBHOOK_SECRET;
  const url = c.env.MINIAPP_URL;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${url}/bot/webhook`,
      secret_token: secret,
      max_connections: 100,
      allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member', 'chat_member', 'chat_join_request'],
    }),
  });
  const json = await res.json();
  return c.json(json);
});

// Get webhook info
webhookRouter.get('/info', async (c) => {
  const token = c.env.BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const json = await res.json();
  return c.json(json);
});

// Delete webhook (for polling mode dev)
webhookRouter.delete('/register', async (c) => {
  const token = c.env.BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  const json = await res.json();
  return c.json(json);
});

// Set bot commands
webhookRouter.all('/commands', async (c) => {
  const token = c.env.BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: '🚀 Start / Main Menu' },
        { command: 'menu', description: '🎛 Open Dashboard' },
        { command: 'plans', description: '💳 View Subscription Plans' },
        { command: 'mysubs', description: '📋 My Active Subscriptions' },
        { command: 'balance', description: '💰 My Wallet Balance' },
        { command: 'help', description: '❓ Help & Support' },
      ],
    }),
  });
  const json = await res.json();
  return c.json(json);
});

import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';
import { MACRO_PROMPT } from './prompt.js';

export const name = 'dsh-cn-macro-assistant';
export const inject = ['tools'];

export async function apply(ctx) {
  const store = new Store(join(homedir(), '.local', 'share', name));
  const disposers = [];
  let closed = false;
  for (const item of TOOLS) {
    disposers.push(ctx.tools.register(McpClient.createMcpToolDefinition(ctx, {
      name: item.name,
      rawName: item.name,
      description: item.description,
      inputSchema: item.inputSchema,
      call: async (args) => {
        if (closed) return { isError: true, content: [{ type: 'text', text: 'PLUGIN_CLOSED' }] };
        try {
          const value = await callTool(store, item.name, args || {});
          return { isError: false, content: [{ type: 'text', text: JSON.stringify(value) }] };
        } catch (error) {
          return { isError: true, content: [{ type: 'text', text: JSON.stringify({
            status: 'ERROR', error: String(error?.message || 'REQUEST_FAILED').slice(0, 240),
            guidance: '未生成或填补缺失数据；核对日期、网络和数据源状态。'
          }) }] };
        }
      }
    })));
  }
  ctx.inject(['systemPrompt'], scope => scope.systemPrompt.section({
    name: 'cn-macro-learning-assistant', order: 165, text: MACRO_PROMPT
  }));
  ctx.effect(function* () {
    yield () => { closed = true; for (const dispose of disposers) dispose(); store.close(); };
  }, 'cn-macro-assistant-lifecycle');
}

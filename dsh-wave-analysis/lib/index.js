import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';import { join } from 'node:path';
import { Store } from './storage.js';import { TOOLS,callTool } from './tools.js';
export const name='dsh-wave-analysis';export const inject=['tools'];
const PROMPT='波浪分析工具只计算传入数据上的枢轴、规则和比例。不得将候选点说成已确认的浪型；保留主方案与备选方案、失效条件，并区分历史可得时点。拐点必须使用confirmedAt，回放时禁止未来数据泄漏。图表绘制/拖拽UI未由本插件提供。斐波那契和浪型均为可检验假设。';
export async function apply(ctx){const store=new Store(join(homedir(),'.local','share',name)),disposers=[];let closed=false;for(const item of TOOLS){const d=McpClient.createMcpToolDefinition(ctx,{name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,call:async(args)=>{if(closed)throw Error('PLUGIN_CLOSED');return {content:[{type:'text',text:JSON.stringify(callTool(store,item.name,args||{}))}]};}});disposers.push(ctx.tools.register(d));}ctx.inject(['systemPrompt'],s=>s.systemPrompt.section({name:'wave-analysis',order:165,text:PROMPT}));ctx.effect(function*(){yield ()=>{closed=true;for(const d of disposers)d();store.close();};},'wave-analysis-lifecycle');}

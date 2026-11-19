import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';
import { GLOBAL_PROMPT } from './prompt.js';

export const name='dsh-global-macro-assistant';
export const inject=['tools'];

export async function apply(ctx){
  const store=new Store(join(homedir(),'.local','share',name));
  const disposers=[];let closed=false;
  for(const item of TOOLS){disposers.push(ctx.tools.register(McpClient.createMcpToolDefinition(ctx,{
    name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,
    call:async(args)=>{if(closed)return {isError:true,content:[{type:'text',text:'PLUGIN_CLOSED'}]};try{return {isError:false,content:[{type:'text',text:JSON.stringify(await callTool(store,item.name,args||{}))}]}}catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'ERROR',error:String(e?.message||'REQUEST_FAILED').slice(0,200),guidance:'未填补缺失数据；检查来源状态和日期。'})}]}}}
  })))}
  ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.section({name:'global-macro-learning-assistant',order:166,text:GLOBAL_PROMPT}));
  ctx.effect(function*(){yield ()=>{closed=true;for(const dispose of disposers)dispose();store.close()}},'global-macro-assistant-lifecycle');
}

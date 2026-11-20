import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';
import { POSITION_PROMPT } from './prompt.js';

export const name='dsh-short-term-position-manager';
export const inject=['tools'];
export async function apply(ctx){
 const store=new Store(join(homedir(),'.local','share',name));const disposers=[];let closed=false;
 for(const item of TOOLS){
  const definition=McpClient.createMcpToolDefinition(ctx,{name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,
   call:async(args)=>{if(closed)return {isError:true,content:[{type:'text',text:'PLUGIN_CLOSED'}]};try{return {isError:false,content:[{type:'text',text:JSON.stringify(await callTool(store,item.name,args||{}))}]};}catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'ERROR',error:String(e?.message||'REQUEST_FAILED').slice(0,200),guidance:'核对待确认草稿、账户权益/现金、风险预算、价格日期和止损条件；缺失时不生成精确仓位。'})}]};}}
  });disposers.push(ctx.tools.register(definition));
 }
 ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.section({name:'short-term-position-manager',order:170,text:POSITION_PROMPT}));
 ctx.effect(function*(){yield ()=>{closed=true;for(const d of disposers)d();store.close();}},'short-term-position-manager-lifecycle');
}


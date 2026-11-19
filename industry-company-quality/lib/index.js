import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';
import { QUALITY_PROMPT } from './prompt.js';

export const name='dsh-industry-company-quality';
export const inject=['tools'];
export async function apply(ctx){
 const store=new Store(join(homedir(),'.local','share',name));const disposers=[];let closed=false;
 for(const item of TOOLS){
  const definition=McpClient.createMcpToolDefinition(ctx,{name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,
   call:async(args)=>{if(closed)return {isError:true,content:[{type:'text',text:'PLUGIN_CLOSED'}]};try{return {isError:false,content:[{type:'text',text:JSON.stringify(await callTool(store,item.name,args||{}))}]};}catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'ERROR',error:String(e?.message||'REQUEST_FAILED').slice(0,200),guidance:'核对行业/公司名称、财务期间、原始来源和统计口径；证据不足时保留未知。'})}]};}}
  });disposers.push(ctx.tools.register(definition));
 }
 ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.section({name:'industry-company-quality-research',order:169,text:QUALITY_PROMPT}));
 ctx.effect(function*(){yield ()=>{closed=true;for(const d of disposers)d();store.close();}},'industry-company-quality-lifecycle');
}


import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';
import { INDUSTRY_PROMPT } from './prompt.js';

export const name='dsh-industry-opportunity-assistant';
export const inject=['tools'];

export async function apply(ctx){
 const store=new Store(join(homedir(),'.local','share',name));
 const disposers=[];let closed=false;
 for(const item of TOOLS){disposers.push(ctx.tools.register(McpClient.createMcpToolDefinition(ctx,{
  name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,
  call:async(args)=>{if(closed)return {isError:true,content:[{type:'text',text:'PLUGIN_CLOSED'}]};try{return {isError:false,content:[{type:'text',text:JSON.stringify(await callTool(store,item.name,args||{}))}]}}catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'ERROR',error:String(e?.message||'REQUEST_FAILED').slice(0,200),guidance:'检查日期、来源URL和数据状态；不以推测填补缺口。'})}]}}}
 })));}
 ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.section({name:'industry-opportunity-assistant',order:167,text:INDUSTRY_PROMPT}));
 ctx.effect(function*(){yield ()=>{closed=true;for(const dispose of disposers)dispose();store.close()}},'industry-opportunity-lifecycle');
}


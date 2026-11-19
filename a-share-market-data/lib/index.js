import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Store } from './storage.js';
import { TOOLS, callTool } from './tools.js';

export const name='dsh-a-share-market-data';
export const inject=['tools'];
export async function apply(ctx){
 const store=new Store(join(homedir(),'.local','share',name));const disposers=[];let closed=false;
 for(const item of TOOLS){
  const definition=McpClient.createMcpToolDefinition(ctx,{
   name:item.name,rawName:item.name,description:item.description,inputSchema:item.inputSchema,
   call:async(args)=>{
    if(closed)return {isError:true,content:[{type:'text',text:'PLUGIN_CLOSED'}]};
    try{return {isError:false,content:[{type:'text',text:JSON.stringify(await callTool(store,item.name,args||{}))}]};}
    catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({status:'ERROR',error:String(e?.message||'REQUEST_FAILED').slice(0,180),guidance:'检查市场代码、日期区间、来源连通性和数据质量；不以推测填补缺口。'})}]};}
   }
  });
  disposers.push(ctx.tools.register(definition));
 }
 ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.section({name:'a-share-market-data',order:168,text:'A股行情数据工具：优先使用固定行情工具，不临时探测接口。输出K线须说明证券/板块代码、周期、复权口径、行情日期、源及缺口。板块与个股口径不混用；成交额不是净流入；资金流为供应商估算。筹码分布读取同花顺导出/授权数据；板块筹码是成分汇总，不代表真实持仓。热度是样本内透明加权相对排名，不是胜率或买卖建议。'}));
 ctx.effect(function*(){yield ()=>{closed=true;for(const d of disposers)d();store.close();}},'a-share-market-data-lifecycle');
}


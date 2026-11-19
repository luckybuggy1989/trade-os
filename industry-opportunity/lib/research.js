export const SECTORS=['半导体','人工智能','云计算','通信设备','机器人','新能源汽车','动力电池','光伏','风电','储能','电网设备','石油天然气','煤炭','有色金属','钢铁','化工','医药生物','医疗器械','创新药','消费电子','汽车','家电','食品饮料','旅游酒店','航空航运','国防军工','建筑建材','房地产','银行','保险','券商','传媒','软件服务','数据中心','低空经济','商业航天'];

export const SOURCES=[
 {name:'工业和信息化部新闻发布',url:'https://www.miit.gov.cn/xwfb/',type:'官方政策/行业发布',automation:'固定页面抓取；页面结构变更时失败关闭'},
 {name:'中国政府网政策文件',url:'https://www.gov.cn/zhengce/zuixin/',type:'中央政策文件',automation:'固定页面抓取；仅存标题与链接'},
 {name:'巨潮资讯网',url:'https://www.cninfo.com.cn/new/commonUrl?url=disclosure%2Flist%2Fnotice',type:'上市公司法定信息披露',automation:'列表抓取可能受页面/接口变化影响'},
 {name:'中证指数有限公司',url:'https://www.csindex.com.cn/',type:'行业指数及行业估值定义',automation:'数据服务和授权需单独核实'},
 {name:'国证指数数据授权',url:'https://www.cnindex.com.cn/zh_services/data_licensing/index.html?act_menu=4&act_service=3',type:'指数行情授权说明',automation:'对外发布指数行情须按规则申请授权'},
 {name:'美国 SEC EDGAR API',url:'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',type:'美股公司原始披露',automation:'官方API；非板块行情接口'},
 {name:'NYSE Arca EOD ETF Report',url:'https://www.nyse.com/data-products/catalog/nyse-arca-eod-etf-report',type:'美股ETF日终市场数据产品',automation:'行情产品，费用及使用权需核对'}
];


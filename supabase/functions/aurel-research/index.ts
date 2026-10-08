import {admin,json,err,authenticate} from '../_shared/common.ts';
// Read-only enrichment preview. All extracted emails remain UNVERIFIED until reviewed by a human.
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return json({ok:true});if(req.method!=='POST')return json({error:'POST required'},405);
 const who=await authenticate(req,'member');if(!who.ok)return json({error:who.reason},401);
 try{
  const {company_id}=await req.json();const {data:co}=await admin.from('aurel_companies').select('id,website').eq('id',company_id).maybeSingle();
  if(!co?.website)return json({error:'Company website is required to enrich'},400);
  const link=new URL(co.website);const host=link.hostname.toLowerCase();
  if(link.protocol!=='https:'||link.username||link.password||link.port||/^(localhost|.*\.localhost|.*\.local|\d+\.\d+\.\d+\.\d+|\[.*\])$/.test(host)||!host.includes('.'))return json({error:'Only public HTTPS business websites are supported'},400);
  const res=await fetch(link.toString(),{redirect:'error',headers:{'user-agent':'AurelResearchBot/1.0 (business contact research)'},signal:AbortSignal.timeout(9000)});
  if(!res.ok||!String(res.headers.get('content-type')||'').includes('text/html'))return json({error:'Site did not return readable HTML'},422);
  const html=(await res.text()).slice(0,250000);
  const emails=[...new Set([...(html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)||[]).map(x=>x.slice(7)),...(html.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)||[])].map(x=>x.toLowerCase()))].filter(x=>!x.endsWith('.png')).slice(0,15);
  const title=html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()||'';
  return json({ok:true,source_url:link.toString(),page_title:title,emails,status:'unverified',note:'Public webpage evidence only. Verify person, role and UK outreach eligibility before approving.'});
 }catch(e){return json({ok:false,error:err(e)},422);}
});

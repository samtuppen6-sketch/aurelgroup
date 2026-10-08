import {admin,json,err,authenticate,londonDay,londonWeekday} from '../_shared/common.ts';
const SIC=new Set(['55100']); // hotels and similar accommodation (verified official company profiles)
async function ch(path:string,key:string){
 const response=await fetch('https://api.company-information.service.gov.uk'+path,{headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'},signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw new Error('Companies House returned HTTP '+response.status);
 return await response.json();
}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return json({ok:true});
 if(req.method!=='POST')return json({error:'POST required'},405);
 const who=await authenticate(req,'admin',true);if(!who.ok)return json({error:who.reason},401);
 const today=londonDay();
 if(['Sat','Sun'].includes(londonWeekday()))return json({ok:true,skipped:'Weekday-only discovery; no Saturday/Sunday leads'});
 const {data:settings}=await admin.from('aurel_settings').select('value').eq('key','discovery').single();
 if(who.job && settings?.value?.enabled!==true)return json({ok:true,skipped:'Daily discovery disabled until explicitly enabled'});
 const target=Math.max(1,Math.min(15,Number(settings?.value?.target_per_workday||15)));
 const {data:existing}=await admin.from('aurel_discovery_runs').select('*').eq('run_date',today).maybeSingle();
 if(existing && existing.status!=='failed')return json({ok:true,skipped:'Discovery already run today',run:existing});
 const attempt=existing ? await admin.from('aurel_discovery_runs').update({target,status:'running',added:0,details:{},started_at:new Date().toISOString(),finished_at:null}).eq('id',existing.id).eq('status','failed').select().maybeSingle() : await admin.from('aurel_discovery_runs').insert({run_date:today,target,status:'running'}).select().single();
 const {data:run,error:runErr}=attempt;
 if(runErr||!run)return json({ok:false,error:'Another discovery run is in progress'},409);
 let added=0;let examined=0;const problems:string[]=[];
 try{
  const key=Deno.env.get('COMPANIES_HOUSE_API_KEY')??'';
  if(!key)throw new Error('COMPANIES_HOUSE_API_KEY must be configured (no invented leads)');
  const queries=['hotel group','hotel','resort hotel','hospitality hotels'];
  const visited=new Set<string>();
  for(const query of queries){
   if(added>=target||examined>=75)break;
   const page=await ch('/search/companies?'+new URLSearchParams({q:query,items_per_page:'50',start_index:'0'}),key);
   for(const item of page.items??[]){
    if(added>=target||examined>=75)break;
    const n=String(item.company_number??'').trim();
    if(!n||visited.has(n)||String(item.company_status??'').toLowerCase()!=='active')continue;
    visited.add(n);examined++;
    const {data:already,error:dupeError}=await admin.from('aurel_companies').select('id').eq('company_number',n).maybeSingle();
    if(dupeError)throw dupeError;
    if(already)continue;
    try{
     const detail=await ch('/company/'+encodeURIComponent(n),key);
     if(detail.company_status!=='active'||!(detail.sic_codes??[]).some((s:string)=>SIC.has(s)))continue;
     const a=detail.registered_office_address??{};
     const location=[a.locality,a.region,a.postal_code].filter(Boolean).join(', ');
     const result=await admin.from('aurel_companies').insert({legal_name:String(detail.company_name),company_number:n,company_type:'limited',sector:'hospitality',location,source:'Companies House',source_url:'https://find-and-update.company-information.service.gov.uk/company/'+encodeURIComponent(n),status:'discovered',fit_score:50,notes:'Official company record only; trading site, decision-maker and business fit require verification.'});
     if(result.error){if(result.error.code==='23505')continue;problems.push('Insert '+n+': '+result.error.message);continue;}
     added++;
    }catch(e){problems.push('Company '+n+': '+err(e));}
   }
  }
  await admin.from('aurel_discovery_runs').update({status:'completed',added,details:{examined,problems:problems.slice(0,8)},finished_at:new Date().toISOString()}).eq('id',run.id);
  return json({ok:true,target,added,examined,shortfall:Math.max(0,target-added),note:'Only verified active UK hotel companies imported. No guessed email addresses or contacts.'});
 }catch(e){
  await admin.from('aurel_discovery_runs').update({status:'failed',added,details:{examined,error:err(e)},finished_at:new Date().toISOString()}).eq('id',run.id);
  return json({ok:false,added,error:err(e)},503);
 }
});

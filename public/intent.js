import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.112.3';
const cfg=window.AUREL_CONFIG||{};
const statusEl=document.querySelector('#intent-status');
const appEl=document.querySelector('#intent-app');
const tableBody=document.querySelector('#intent-rows');
const playbooksEl=document.querySelector('#intent-playbooks');
const metricsEl=document.querySelector('#intent-metrics');
let records=[];
const plain=(value)=>String(value??'');
function cell(row,value){
 const td=document.createElement('td');td.textContent=plain(value);row.append(td);return td;
}
function metric(label,value){
 const box=document.createElement('div');box.className='stat';
 const title=document.createElement('div');title.className='label';title.textContent=label;
 const num=document.createElement('div');num.className='value';num.textContent=plain(value);
 box.append(title,num);return box;
}
function render(){
 const lane=document.querySelector('#lane').value;
 const evidence=document.querySelector('#evidence').value;
 const subset=records.filter(x=>(lane==='all'||x.offer_lane===lane)&&(evidence==='all'||x.evidence_status===evidence));
 tableBody.replaceChildren();
 for(const x of subset){
  const tr=document.createElement('tr');
  const first=document.createElement('td');
  const a=document.createElement('a');a.href=String(x.vacancy_url||'#');a.target='_blank';a.rel='noopener noreferrer';a.className='intent-link';a.textContent=plain(x.employer_name);
  const position=document.createElement('div');position.className='small muted';position.textContent=plain(x.vacancy_title);
  first.append(a,position);tr.append(first);
  cell(tr,x.offer_lane==='finance_operations'?'Finance':'Client onboarding');
  const problem=cell(tr,x.workflow_problem);problem.className='intent-work';
  cell(tr,x.evidence_status.replaceAll('_',' '));
  cell(tr,x.signal_score);
  cell(tr,x.approved_for_outreach?'Yes':'No');
  tableBody.append(tr);
 }
 if(!subset.length){
  const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.textContent='No matching vacancy signals';tr.append(td);tableBody.append(tr);
 }
 metricsEl.replaceChildren(metric('Research signals',records.length),metric('Source checked',records.filter(x=>x.evidence_status==='source_checked').length),metric('Fully verified',records.filter(x=>x.evidence_status==='verified').length),metric('Sending approved',records.filter(x=>x.approved_for_outreach).length));
}
async function start(){
 try{
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl||'')||!cfg.supabaseAnonKey)throw Error('The CRM Supabase configuration is not available.');
  const client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const session=await client.auth.getSession();
  if(session.error)throw session.error;
  if(!session.data.session?.user){statusEl.textContent='Please sign in through the Aurel Sales Pro home screen, then return here.';return;}
  const {data:member,error:memberError}=await client.from('aurel_members').select('role').eq('user_id',session.data.session.user.id).maybeSingle();
  if(memberError||!member){statusEl.textContent='This page is restricted to Aurel members.';return;}
  const [sig,pb]=await Promise.all([
   client.from('aurel_vacancy_signals').select('id,employer_name,vacancy_title,vacancy_url,offer_lane,workflow_problem,evidence_status,signal_score,approved_for_outreach').order('signal_score',{ascending:false}).limit(100),
   client.from('aurel_outreach_playbooks').select('id,offer_lane,first_touch_template,approved_for_live_sending').order('id')
  ]);
  if(sig.error)throw sig.error;
  if(pb.error)throw pb.error;
  records=sig.data||[];
  playbooksEl.replaceChildren();
  for(const item of pb.data||[]){
   const section=document.createElement('section');section.style.marginBottom='20px';
   const title=document.createElement('h4');title.textContent=item.offer_lane==='finance_operations'?'Finance operations':'Client onboarding';
   const p=document.createElement('pre');p.textContent=item.first_touch_template;
   const note=document.createElement('p');note.className='intent-controls';note.textContent='Live sending approved: '+(item.approved_for_live_sending?'Yes':'No')+'. Placeholders require evidence-based replacement and human review.';
   section.append(title,p,note);playbooksEl.append(section);
  }
  statusEl.hidden=true;appEl.hidden=false;render();
  document.querySelector('#lane').addEventListener('change',render);
  document.querySelector('#evidence').addEventListener('change',render);
 }catch(e){statusEl.className='intent-error';statusEl.textContent='Unable to load the intent desk: '+plain(e.message||e);}
}
start();
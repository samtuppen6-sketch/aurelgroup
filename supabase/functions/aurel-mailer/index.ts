import {admin,json,err,authenticate,gmailToken,gmailGet,encode64,emailOf} from '../_shared/common.ts';
const sender='sam@aurelgroup.ai';
const rfcSubject=(s:string)=>'=?UTF-8?B?'+encode64(s.replace(/[\r\n]/g,' '))+'?=';
const b64url=(s:string)=>encode64(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return json({ok:true});if(req.method!=='POST')return json({error:'POST required'},405);
 const who=await authenticate(req,'admin');if(!who.ok)return json({error:who.reason},401);
 let id='';
 try{
  const input=await req.json();id=String(input.outreach_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'Valid outreach ID required'},400);
  const {data:cfg}=await admin.from('aurel_settings').select('value').eq('key','outreach').single();
  const s=cfg?.value??{};if(s.mode!=='approval_gated'||s.enabled!==true||s.sender_email!==sender)return json({error:'Aurel outbound sending is disabled. Configure and explicitly enable it after mailbox verification.'},409);
  const {data:o,error:oe}=await admin.from('aurel_outreach').select('*,aurel_contacts(*),aurel_companies(*)').eq('id',id).single();if(oe||!o)return json({error:'Outreach record not found'},404);
  if(o.status!=='approved'||!o.approved_at||!o.approved_by)return json({error:'Human approval required'},409);
  const c=o.aurel_contacts,p=o.aurel_companies;
  if(!c||!p||c.company_id!==o.company_id||!c.email||c.email_status!=='verified'||p.do_not_contact)return json({error:'Recipient has not passed contact verification'},409);
  if(c.lawful_basis==='unassessed'||(p.company_type==='sole_trader'||p.company_type==='partnership'||p.company_type==='unknown')&&c.lawful_basis!=='consent')return json({error:'UK PECR compliance review required'},409);
  if(c.lawful_basis==='consent'&&!c.consent_at)return json({error:'Consent record required'},409);
  const {data:supp}=await admin.from('aurel_suppressions').select('id').ilike('email',emailOf(c.email)).maybeSingle();if(supp)return json({error:'Email is suppressed'},409);
  const token=await gmailToken();const profile=await gmailGet(token,'profile');
  if(emailOf(profile.emailAddress??'')!==sender) return json({error:'Connected Gmail account is not sam@aurelgroup.ai. Refusing to send from another brand.'},409);
  const claim=await admin.rpc('aurel_claim_send',{p_id:id,p_limit:Math.max(1,Math.min(15,Number(s.daily_send_limit||15)))});
  if(claim.error||claim.data!==true)return json({error:'Daily cap reached, or message is no longer approved/available to send'},409);
  const subj=rfcSubject(o.subject);const to=emailOf(c.email);
  const body=o.body.includes('reply "no thanks"')?o.body:o.body.trim()+"\n\nIf this isn't relevant, reply \"no thanks\" and I'll make sure we don't contact you again.";
  const raw=[`From: Sam Tuppen <${sender}>`,`To: ${to}`,`Subject: ${subj}`,`MIME-Version: 1.0`,`Content-Type: text/plain; charset=UTF-8`,`Content-Transfer-Encoding: base64`,'',encode64(body)].join('\r\n');
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({raw:b64url(raw)})});
  const sentResult=await response.json();
  if(!response.ok||!sentResult.id)throw new Error(sentResult.error?.message||'Gmail send failed');
  await admin.from('aurel_outreach').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:sentResult.id,provider_thread_id:sentResult.threadId||null}).eq('id',id);
  await admin.from('aurel_companies').update({status:'contacted'}).eq('id',o.company_id);
  return json({ok:true,outreach_id:id,status:'sent'});
 }catch(e){
  if(id)await admin.from('aurel_outreach').update({status:'failed',last_error:'Verify Gmail Sent before retrying: '+err(e)}).eq('id',id).eq('status','sending');
  return json({ok:false,error:err(e),note:'Check Gmail Sent before retrying after a network error; duplicates are possible.'},500);
 }
});

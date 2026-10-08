import {admin,json,err,authenticate,gmailToken,gmailGet,emailOf,decode64Url} from '../_shared/common.ts';
function headers(message:any){return Object.fromEntries((message.payload?.headers??[]).map((h:any)=>[String(h.name).toLowerCase(),String(h.value)]));}
function content(part:any):string{
 if(!part)return '';
 if(part.mimeType==='text/plain'&&part.body?.data)try{return decode64Url(part.body.data)}catch{return ''}
 for(const p of part.parts??[]){const v=content(p);if(v)return v;}
 return '';
}
const optOut=(s:string)=>/\b(unsubscribe|remove me|stop emailing|do not contact|no thanks|take me off)\b/i.test(s);
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return json({ok:true});if(req.method!=='POST')return json({error:'POST required'},405);
 const who=await authenticate(req,'admin',true);if(!who.ok)return json({error:who.reason},401);
 try{
  const token=await gmailToken();const profile=await gmailGet(token,'profile');
  if(emailOf(profile.emailAddress??'')!=='sam@aurelgroup.ai')return json({error:'Reply mailbox is not the Aurel account'},409);
  let cursor='',checked=0,matched=0,duplicates=0;const errors:string[]=[];
  for(let page=0;page<3;page++){
   const args=new URLSearchParams({q:'in:inbox newer_than:30d -from:me',maxResults:'100'});if(cursor)args.set('pageToken',cursor);
   const list=await gmailGet(token,'messages?'+args);
   for(const m of list.messages??[]){
    checked++;
    try{
     const exists=await admin.from('aurel_inbound').select('id').eq('provider_message_id',m.id).maybeSingle();if(exists.data){duplicates++;continue;}
     const msg=await gmailGet(token,'messages/'+encodeURIComponent(m.id)+'?format=full');const h=headers(msg);
     const from=emailOf(h.from||'');const thread=String(msg.threadId||'');if(!from||!thread||from==='sam@aurelgroup.ai')continue;
     const matches=await admin.from('aurel_outreach').select('id,company_id,contact_id,aurel_contacts(email)').eq('provider_thread_id',thread).in('status',['sent','replied']).limit(8);
     if(matches.error)throw matches.error;
     const match=(matches.data||[]).find((o:any)=>emailOf(o.aurel_contacts?.email||'')===from);
     if(!match)continue;
     const body=(content(msg.payload)||String(msg.snippet||'')).split(/\nOn .+wrote:|\nFrom: |\n>|\n-----Original Message-----|\nFrom:.*@/)[0].trim().slice(0,4000);
     const insert=await admin.from('aurel_inbound').insert({company_id:match.company_id,contact_id:match.contact_id,outreach_id:match.id,provider_message_id:m.id,provider_thread_id:thread,sender_email:from,subject:String(h.subject||'Reply').slice(0,250),excerpt:body,received_at:new Date(Number(msg.internalDate)||Date.now()).toISOString()});
     if(insert.error){if(insert.error.code==='23505'){duplicates++;continue;}throw insert.error;}
     if(optOut(body)){
       await admin.from('aurel_suppressions').upsert({email:from,reason:'Email opt-out received'}, {onConflict:'email'});
       await admin.from('aurel_companies').update({do_not_contact:true}).eq('id',match.company_id);
     }
     matched++;
    }catch(e){errors.push(err(e));}
   }
   cursor=String(list.nextPageToken||'');if(!cursor)break;
  }
  return json({ok:errors.length===0,checked,matched,duplicates,errors:errors.slice(0,5)});
 }catch(e){return json({ok:false,error:err(e)},503);}
});

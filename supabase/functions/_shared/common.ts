import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

export const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const admin = createClient(url, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
export const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-aurel-job-key','access-control-allow-methods':'POST,OPTIONS'}});
export const err = (e:unknown) => e instanceof Error ? e.message : String(e);
export const emailOf=(value:string)=> (value.match(/<([^>]+)>/)?.[1]??value).trim().toLowerCase();
export const londonDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const londonWeekday=()=>new Intl.DateTimeFormat('en-US',{timeZone:'Europe/London',weekday:'short'}).format(new Date());
export async function authenticate(req:Request, role:'member'|'admin'='admin', allowJob=false){
  if(allowJob){
    const expected=Deno.env.get('AUREL_JOB_KEY')??'';
    const received=req.headers.get('x-aurel-job-key')??'';
    if(expected.length>=32 && received.length===expected.length){
      // constant-time comparison of pre-hashed, equal-length secret strings.
      const a=new TextEncoder().encode(expected),b=new TextEncoder().encode(received);
      let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
      if(mismatch===0) return {ok:true, userId:null, job:true} as const;
    }
  }
  const token=(req.headers.get('authorization')??'').replace(/^Bearer\s+/i,'');
  if(!token) return {ok:false,reason:'Login required'} as const;
  const user=await admin.auth.getUser(token);
  if(user.error||!user.data.user) return {ok:false,reason:'Invalid session'} as const;
  const {data:membership,error}=await admin.from('aurel_members').select('role').eq('user_id',user.data.user.id).maybeSingle();
  if(error||!membership) return {ok:false,reason:'Not an Aurel member'} as const;
  if(role==='admin'&&!['admin','director'].includes(membership.role))return {ok:false,reason:'Director approval required'} as const;
  return {ok:true,userId:user.data.user.id,job:false} as const;
}
export function encode64(s:string){const bytes=new TextEncoder().encode(s);let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);}
export function decode64Url(s:string){const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));}
export async function gmailToken(){
  const cid=Deno.env.get('AUREL_GMAIL_CLIENT_ID')??'',secret=Deno.env.get('AUREL_GMAIL_CLIENT_SECRET')??'',refresh=Deno.env.get('AUREL_GMAIL_REFRESH_TOKEN')??'';
  if(!cid||!secret||!refresh)throw new Error('Aurel Gmail OAuth credentials are not configured');
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:cid,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'})});
  const data=await res.json();if(!res.ok||!data.access_token)throw new Error('Aurel Gmail token refresh failed');return String(data.access_token);
}
export async function gmailGet(token:string,path:string){const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{authorization:'Bearer '+token}});const d=await res.json();if(!res.ok)throw new Error(d.error?.message||'Gmail read failed');return d;}

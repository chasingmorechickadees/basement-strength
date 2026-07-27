import {APP_VERSION,STORE_WORKOUTS,STORE_META,STORE_SETTINGS} from "./config.js";
import {getAll,getKV,put,clearStore,setKV,del} from "./db.js";
function download(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
export async function exportBackup(){
  const payload={app:"Basement Strength",version:APP_VERSION,schemaVersion:2,exportedAt:new Date().toISOString(),workouts:await getAll(STORE_WORKOUTS),draft:await getKV(STORE_META,"draft"),settings:await getAll(STORE_SETTINGS)};
  download(JSON.stringify(payload,null,2),"basement-strength-backup.json","application/json");
}
export async function importBackup(file){
  const data=JSON.parse(await file.text());
  if(!Array.isArray(data.workouts))throw new Error("Invalid backup");
  await clearStore(STORE_WORKOUTS);
  for(const w of data.workouts)await put(STORE_WORKOUTS,w);
  if(data.draft)await setKV(STORE_META,"draft",data.draft);else await del(STORE_META,"draft");
  if(Array.isArray(data.settings)){await clearStore(STORE_SETTINGS);for(const s of data.settings)await put(STORE_SETTINGS,s)}
}
export async function exportCSV(){
  const rows=[["date","workout","body_status","day_type","energy","effort","pain","session_notes","exercise","set","weight","reps","completed","exercise_notes"]];
  const all=await getAll(STORE_WORKOUTS);
  all.forEach(w=>w.exercises?.forEach(e=>e.sets?.forEach((s,i)=>rows.push([w.date,w.name,w.status||"",w.dayType||"",w.energy||"",w.effort||"",w.pain||"",w.sessionNotes||"",e.name,i+1,s.weight||"",s.reps||"",!!s.done,e.note||""]))));
  const csv=rows.map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")).join("\n");
  download(csv,"basement-strength-history.csv","text/csv");
}

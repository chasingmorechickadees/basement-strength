import {APP_VERSION,STORE_WORKOUTS,STORE_META,STORE_SETTINGS} from "./config.js";
import {openDB,getAll,put,del,clearStore,getKV,setKV} from "./db.js";
import {loadPlanData,getWorkout,getRotation,cloneWorkout} from "./workouts.js";
import {coachMessage,adaptExercises} from "./coach.js";
import {buildRecommendations} from "./progression.js";
import {exportBackup,importBackup,exportCSV} from "./backup.js";
import {$,escapeHtml,switchView} from "./ui.js";

let activePlan="A",baseExercises=[],activeExercises=[],quickStatus="normal",shortMode=false,startTime=null,timerHandle=null;

const normalize=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");

async function previousFor(name){
  const workouts=(await getAll(STORE_WORKOUTS)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  for(let i=workouts.length-1;i>=0;i--){
    const ex=workouts[i].exercises?.find(e=>normalize(e.name)===normalize(name));
    const completed=ex?.sets?.filter(s=>s.done&&(s.weight||s.reps));
    if(completed?.length)return completed.at(-1);
  }
  return null;
}
async function getNextWorkoutKey(){
  const rotation=await getRotation();
  const workouts=(await getAll(STORE_WORKOUTS)).filter(w=>/^Workout [ABCD]$/.test(w.name)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(!workouts.length)return rotation[0];
  const last=workouts.at(-1).name.replace("Workout ","");
  return rotation[(rotation.indexOf(last)+1)%rotation.length];
}
async function saveDraft(){await setKV(STORE_META,"draft",{plan:activePlan,started:startTime?.toISOString()||null,baseExercises,quickStatus,shortMode})}
function updateElapsed(){if(!startTime)return;const s=Math.max(0,Math.floor((Date.now()-startTime.getTime())/1000));$("elapsedTime").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
async function loadWorkout(key,useDraft=true){
  activePlan=key;
  const draft=useDraft?await getKV(STORE_META,"draft"):null;
  if(draft&&draft.plan===key&&Array.isArray(draft.baseExercises)){baseExercises=draft.baseExercises;startTime=new Date(draft.started||Date.now());quickStatus=draft.quickStatus||"normal";shortMode=!!draft.shortMode}
  else{baseExercises=cloneWorkout(await getWorkout(key));startTime=new Date()}
  activeExercises=adaptExercises(baseExercises,quickStatus,shortMode);
  $("workoutPicker").value=key;$("workoutTitle").textContent=key==="Travel"?"Travel / Band":`Workout ${key}`;$("sessionMode").textContent=shortMode?"25 min":"Full";
  clearInterval(timerHandle);timerHandle=setInterval(updateElapsed,1000);updateElapsed();await renderExercises();await saveDraft();
}
async function renderExercises(){
  $("exerciseList").innerHTML="";
  for(let ei=0;ei<activeExercises.length;ei++){
    const ex=activeExercises[ei],prev=await previousFor(ex.name),card=document.createElement("div");card.className="exercise-card";
    const options=[ex.name,...(ex.swaps||[])];
    card.innerHTML=`<div class="row between wrap"><div><div class="exercise-title">${escapeHtml(ex.name)}</div><div class="exercise-sub">Target: ${ex.setsData.length} × ${escapeHtml(ex.reps)}</div></div>${prev?`<span class="badge last-badge">Last: ${escapeHtml(prev.weight||"—")} × ${escapeHtml(prev.reps||"—")}</span>`:""}</div>
    ${options.length>1?`<select class="swap-select" data-ei="${ei}">${options.map(o=>`<option ${o===ex.name?"selected":""}>${escapeHtml(o)}</option>`).join("")}</select>`:""}
    <div class="set-grid"><span></span><span class="head">Weight</span><span class="head">Reps / time</span><span class="head">Done</span>${ex.setsData.map((s,si)=>`<strong>${si+1}</strong><input data-ei="${ei}" data-si="${si}" data-field="weight" value="${escapeHtml(s.weight)}"><input data-ei="${ei}" data-si="${si}" data-field="reps" value="${escapeHtml(s.reps)}"><input data-ei="${ei}" data-si="${si}" data-field="done" type="checkbox" ${s.done?"checked":""}>`).join("")}</div>
    <label>Exercise notes<input data-note-ei="${ei}" value="${escapeHtml(ex.userNote||"")}"></label>`;
    $("exerciseList").appendChild(card);
  }
  document.querySelectorAll("[data-field]").forEach(el=>el.addEventListener(el.type==="checkbox"?"change":"input",async e=>{const ei=+e.target.dataset.ei,si=+e.target.dataset.si,f=e.target.dataset.field;activeExercises[ei].setsData[si][f]=f==="done"?e.target.checked:e.target.value;baseExercises=structuredClone(activeExercises);await saveDraft()}));
  document.querySelectorAll("[data-note-ei]").forEach(el=>el.addEventListener("input",async e=>{activeExercises[+e.target.dataset.noteEi].userNote=e.target.value;baseExercises=structuredClone(activeExercises);await saveDraft()}));
  document.querySelectorAll(".swap-select").forEach(el=>el.addEventListener("change",async e=>{activeExercises[+e.target.dataset.ei].name=e.target.value;baseExercises=structuredClone(activeExercises);await renderExercises();await saveDraft()}));
}
function renderCoach(){$("coachMessage").textContent=coachMessage(quickStatus,$("dayType").value,+$("energyLevel").value)}
async function startRecommended(short){shortMode=short;await loadWorkout(await getNextWorkoutKey(),false);activeExercises=adaptExercises(baseExercises,quickStatus,shortMode);await renderExercises();await saveDraft();switchView("workout")}
async function finishWorkout(){
  if(!activeExercises.some(ex=>ex.setsData.some(s=>s.done)))return alert("Check at least one completed set first.");
  const entry={id:Date.now(),schemaVersion:2,name:activePlan==="Travel"?"Travel / Band":`Workout ${activePlan}`,date:new Date().toISOString(),started:startTime?.toISOString()||null,status:quickStatus,dayType:$("dayType").value,energy:$("energyLevel").value,effort:$("sessionEffort").value,pain:$("sessionPain").value,sessionNotes:$("sessionNotes").value,shortMode,exercises:activeExercises.map(ex=>({id:ex.id,name:ex.name,target:ex.reps,note:ex.userNote||"",sets:ex.setsData}))};
  await put(STORE_WORKOUTS,entry);await del(STORE_META,"draft");$("sessionEffort").value="";$("sessionPain").value="0";$("sessionNotes").value="";alert("Workout saved.");shortMode=false;switchView("today");await renderDashboard();
}
async function renderDashboard(){
  const now=new Date();$("todayDate").textContent=now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});$("nextWorkout").textContent=`Workout ${await getNextWorkoutKey()}`;
  const all=(await getAll(STORE_WORKOUTS)).sort((a,b)=>new Date(a.date)-new Date(b.date));const last=all.at(-1)?.date;
  $("lastLift").textContent=!last?"None yet":Math.floor((Date.now()-new Date(last))/86400000)===0?"Today":`${Math.floor((Date.now()-new Date(last))/86400000)} days ago`;
  $("monthCount").textContent=all.filter(w=>w.date.slice(0,7)===now.toISOString().slice(0,7)).length;
  const done=new Set(all.map(w=>new Date(w.date).toISOString().slice(0,10)));let cells=[];for(let i=27;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);cells.push(`<div class="day-cell ${done.has(k)?"done":""}">${d.getDate()}</div>`)}$("miniCalendar").innerHTML=cells.join("");renderCoach();
}
async function renderHistory(){const all=(await getAll(STORE_WORKOUTS)).sort((a,b)=>new Date(b.date)-new Date(a.date));$("historyList").innerHTML=all.length?all.map(w=>`<div class="history-item"><div class="row between"><span class="history-title">${escapeHtml(w.name)}</span><span class="history-meta">${new Date(w.date).toLocaleDateString()}</span></div><div class="history-meta">${w.exercises?.reduce((n,e)=>n+(e.sets?.filter(s=>s.done).length||0),0)||0} completed sets</div>${w.sessionNotes?`<div>${escapeHtml(w.sessionNotes)}</div>`:""}</div>`).join(""):'<p class="muted">No completed workouts yet.</p>'}
async function renderProgress(){const all=await getAll(STORE_WORKOUTS);$("statWorkouts").textContent=all.length;$("stat30").textContent=all.filter(w=>new Date(w.date)>=Date.now()-30*86400000).length;$("statStreak").textContent="—";$("recommendationsList").innerHTML=buildRecommendations(all).map(r=>`<div class="recommendation">${r}</div>`).join("");const names=[...new Set(all.flatMap(w=>w.exercises?.map(e=>e.name)||[]))].sort();$("exerciseHistorySelect").innerHTML=names.length?names.map(n=>`<option>${escapeHtml(n)}</option>`).join(""):"<option>No exercises yet</option>";await renderExerciseHistory()}
async function renderExerciseHistory(){const name=$("exerciseHistorySelect").value,all=(await getAll(STORE_WORKOUTS)).sort((a,b)=>new Date(b.date)-new Date(a.date));const rows=[];all.forEach(w=>w.exercises?.filter(e=>e.name===name).forEach(e=>{const sets=e.sets?.filter(s=>s.done)||[];if(sets.length)rows.push({date:w.date,sets})}));$("exerciseHistory").innerHTML=rows.length?rows.map(r=>`<div class="history-item"><strong>${new Date(r.date).toLocaleDateString()}</strong><div class="history-meta">${r.sets.map(s=>`${escapeHtml(s.weight||"—")} × ${escapeHtml(s.reps||"—")}`).join(" · ")}</div></div>`).join(""):'<p class="muted">No logged sets yet.</p>'}
async function loadSettings(){const d=await fetch("./data/default-settings.json").then(r=>r.json());$("defaultSessionLength").value=await getKV(STORE_SETTINGS,"defaultSessionLength")||d.defaultSessionLength;$("weightUnit").value=await getKV(STORE_SETTINGS,"weightUnit")||d.weightUnit}
async function bind(){
  document.querySelectorAll(".tab").forEach(t=>t.onclick=async()=>{switchView(t.dataset.view);if(t.dataset.view==="today")await renderDashboard();if(t.dataset.view==="history")await renderHistory();if(t.dataset.view==="progress")await renderProgress()});
  document.querySelectorAll("#bodyStatusChips .chip").forEach(btn=>btn.onclick=()=>{quickStatus=btn.dataset.status;document.querySelectorAll("#bodyStatusChips .chip").forEach(b=>b.classList.toggle("selected",b===btn));renderCoach()});
  $("dayType").onchange=renderCoach;$("energyLevel").onchange=renderCoach;$("startRecommended").onclick=()=>startRecommended(false);$("startShort").onclick=()=>startRecommended(true);$("workoutPicker").onchange=e=>{shortMode=false;loadWorkout(e.target.value,false)};
  $("finishWorkout").onclick=finishWorkout;$("resetWorkout").onclick=async()=>{if(confirm("Reset the current workout?")){await del(STORE_META,"draft");shortMode=false;await loadWorkout(activePlan,false)}};$("exerciseHistorySelect").onchange=renderExerciseHistory;
  $("exportBackup").onclick=exportBackup;$("exportCsv").onclick=exportCSV;$("importBackup").onchange=async e=>{try{await importBackup(e.target.files[0]);alert("Backup restored.");await renderDashboard()}catch{alert("Invalid backup file.")}};
  $("clearData").onclick=async()=>{if(confirm("Delete all workout history and the current draft?")){await clearStore(STORE_WORKOUTS);await clearStore(STORE_META);await renderDashboard()}};
  $("savePreferences").onclick=async()=>{await setKV(STORE_SETTINGS,"defaultSessionLength",$("defaultSessionLength").value);await setKV(STORE_SETTINGS,"weightUnit",$("weightUnit").value);alert("Preferences saved.")};
}
async function registerSW(){if("serviceWorker"in navigator)try{await navigator.serviceWorker.register("./sw.js")}catch(e){console.warn(e)}}
async function init(){
  await openDB();await loadPlanData();await loadSettings();
  const data=await loadPlanData();$("workoutPicker").innerHTML=Object.entries(data.workouts).map(([k,w])=>`<option value="${k}">${escapeHtml(w.name)}</option>`).join("");
  $("versionLabel").textContent=`Basement Strength ${APP_VERSION}`;
  await bind();await registerSW();await renderDashboard();await loadWorkout("A",true);switchView("today");
}
init();

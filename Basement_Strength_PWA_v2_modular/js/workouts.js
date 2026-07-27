let planData;
export async function loadPlanData(){
  if(planData)return planData;
  const response=await fetch("./data/workouts.json");
  if(!response.ok)throw new Error("Unable to load workouts");
  planData=await response.json();
  return planData;
}
export async function getWorkout(key){return (await loadPlanData()).workouts[key]}
export async function getRotation(){return (await loadPlanData()).rotation}
export function cloneWorkout(workout){
  return workout.exercises.map(ex=>({...ex,setsData:Array.from({length:ex.sets},()=>({weight:"",reps:"",done:false})),userNote:""}))
}

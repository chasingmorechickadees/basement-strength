export function coachMessage(status,day,energy){
  if(status==="neck")return "Use neck-friendly swaps and skip overhead work if it reproduces symptoms.";
  if(status==="glute")return "Keep lower-body range pain-free and favor supported work, bridges, or step-ups.";
  if(status==="low"||energy<=1)return "Use the 25-minute version and leave 3–4 reps in reserve.";
  if(day==="pilates")return "Keep accessory leg volume moderate today. Two sets is enough.";
  if(day==="drive")return "Take a few easy hip-mobility minutes before lifting and avoid forcing deep ranges.";
  if(day==="field")return "Use the full session only if your legs and back feel recovered from fieldwork.";
  if(day==="desk")return "Prioritize rows, pull-aparts, and neutral-neck positioning.";
  if(day==="sleep"||day==="mental")return "A shorter completed session is the goal today.";
  if(day==="great")return "Good day to pursue the top of your rep ranges while keeping clean form.";
  return "You look good for the full session.";
}
export function adaptExercises(exercises,status,shortMode){
  let out=structuredClone(exercises);
  if(status==="neck"){
    out=out.map(ex=>["Standing Dumbbell Shoulder Press","Arnold Press"].includes(ex.name)?{...ex,name:"Incline Dumbbell Bench Press"}:ex);
  }else if(status==="glute"){
    out=out.map(ex=>{
      if(["Dumbbell Romanian Deadlift","Dumbbell Sumo Deadlift"].includes(ex.name))return {...ex,name:"Glute Bridge",reps:"12-15"};
      if(ex.name.includes("Lunge"))return {...ex,name:"Supported Split Squat",reps:"8/side"};
      return ex;
    });
  }else if(status==="low"){
    out.forEach(ex=>ex.setsData=ex.setsData.slice(0,2));
  }
  if(shortMode){
    out.forEach(ex=>ex.setsData=ex.setsData.slice(0,2));
    out=out.slice(0,6);
  }
  return out;
}

export function buildRecommendations(workouts){
  const all=[...workouts].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=all.at(-1);
  if(!latest)return ["Log a few workouts and rate the effort. Recommendations will appear here."];
  const recs=[];
  if(Number(latest.pain)>=4)recs.push("Pain was elevated in your last session. Use a swap or reduce load next time.");
  if(latest.effort==="easy")recs.push("Your last workout felt easy. Consider the smallest available increase on movements completed at the top of the rep range.");
  if(latest.effort==="too_hard")recs.push("Your last workout was too hard. Repeat or reduce the loads rather than increasing.");
  if(latest.status==="neck")recs.push("Continue neck-friendly pressing until symptoms settle.");
  if(latest.status==="glute")recs.push("Keep the next lower-body session supported and pain-free.");
  return recs.length?recs:["Repeat the plan and aim for clean reps at the top of each range before increasing weight."];
}

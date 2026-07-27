import {DB_NAME,DB_VERSION,STORE_WORKOUTS,STORE_META,STORE_SETTINGS} from "./config.js";
let db;
export async function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const d=r.result;
      if(!d.objectStoreNames.contains(STORE_WORKOUTS))d.createObjectStore(STORE_WORKOUTS,{keyPath:"id"});
      if(!d.objectStoreNames.contains(STORE_META))d.createObjectStore(STORE_META,{keyPath:"key"});
      if(!d.objectStoreNames.contains(STORE_SETTINGS))d.createObjectStore(STORE_SETTINGS,{keyPath:"key"});
    };
    r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error);
  });
}
const store=(name,mode="readonly")=>db.transaction(name,mode).objectStore(name);
export const getAll=name=>new Promise((res,rej)=>{const r=store(name).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});
export const put=(name,value)=>new Promise((res,rej)=>{const r=store(name,"readwrite").put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error)});
export const del=(name,key)=>new Promise((res,rej)=>{const r=store(name,"readwrite").delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
export const clearStore=name=>new Promise((res,rej)=>{const r=store(name,"readwrite").clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
export async function getKV(name,key){return new Promise((res,rej)=>{const r=store(name).get(key);r.onsuccess=()=>res(r.result?.value??null);r.onerror=()=>rej(r.error)})}
export async function setKV(name,key,value){return put(name,{key,value})}

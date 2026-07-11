import type { PracticeQuestion } from "./types";

export type FormattedBlock = { article: string; articleJa: string; tags: string[]; questions: PracticeQuestion[] };

export function parseFormattedPracticeText(text: string): FormattedBlock[] {
  const lines=text.replace(/\r\n/g,"\n").split("\n"); const blocks:FormattedBlock[]=[]; let block:FormattedBlock={article:"",articleJa:"",tags:[],questions:[]}; let q:Record<string,string>|null=null; let section=""; let buffer:string[]=[];
  const flush=()=>{const value=buffer.join("\n").trim();if(section==="ARTICLE")block.article=value;if(section==="ARTICLE_JA")block.articleJa=value;if(q&&section==="QUESTION")q.question=value;if(q&&section==="EXPLANATION")q.explanation=value;buffer=[]};
  const saveQ=()=>{if(!q||!q.question?.trim())return;const opts=[q.A,q.B,q.C,q.D].filter(Boolean);const letter=(q.answer||"").toUpperCase();const answer=opts.length===4&&["A","B","C","D"].includes(letter)?opts[letter.charCodeAt(0)-65]:q.answer||"";block.questions.push({id:`q-${Date.now()}-${block.questions.length}`,number:block.questions.length+1,type:opts.length===4?"multiple_choice":"gap_fill",prompt:q.question,options:opts.length===4?opts:undefined,answer,explanation:q.explanation||""});q=null};
  const saveBlock=()=>{saveQ();if(block.article||block.questions.length)blocks.push(block);block={article:"",articleJa:"",tags:[],questions:[]}};
  const re=/^(ARTICLE_JA|ARTICLE|TAGS|QUESTION_TYPE|QUESTION|A|B|C|D|ANSWER|EXPLANATION)\s*:\s*(.*)$/i;
  for(const line of lines){const m=line.match(re);if(!m){if(section)buffer.push(line);continue}flush();const key=m[1].toUpperCase(),value=m[2]||"";if(key==="ARTICLE"){if(block.article||block.questions.length)saveBlock();section="ARTICLE";buffer=value?[value]:[]}else if(key==="ARTICLE_JA"){section="ARTICLE_JA";buffer=value?[value]:[]}else if(key==="TAGS"){block.tags=value.split(",").map(v=>v.trim()).filter(Boolean);section=""}else if(key==="QUESTION_TYPE"){saveQ();q={type:value};section=""}else if(key==="QUESTION"){if(q?.question)saveQ();q=q||{};section="QUESTION";buffer=value?[value]:[]}else if(q&&["A","B","C","D"].includes(key)){q[key]=value;section=""}else if(q&&key==="ANSWER"){q.answer=value;section=""}else if(q&&key==="EXPLANATION"){section="EXPLANATION";buffer=value?[value]:[]}}
  flush();saveBlock();return blocks;
}

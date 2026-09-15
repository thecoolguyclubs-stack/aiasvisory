/** Production browser regression for the uploaded assessment UI integration.
 * Run npm run build first. Uses local browser dependencies; no insurance API fixtures.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "http://127.0.0.1:32746";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "32746"], {stdio:["ignore","pipe","pipe"]});
let browser;
try {
 await new Promise((resolve,reject) => { server.stdout.on("data", d => { if(d.toString().includes("Ready")) resolve(); }); server.once("exit",code=>reject(new Error(`Server exit ${code}`))); });
 let executablePath=process.env.BROWSER_PATH, args=["--no-sandbox"];
 if(process.env.SPARTICUZ_MODULE) { const {default:binary}=await import(process.env.SPARTICUZ_MODULE); executablePath=await binary.executablePath(); args=binary.args; }
 browser=await chromium.launch({executablePath,args,headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on("pageerror", e=>errors.push(e.message));
 const choose=async (name,value)=>page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
 const next=()=>page.getByRole("button",{name:"Συνέχεια",exact:true}).click();
 await page.goto(base+"/assessment?start=new");
 await choose("insured-people","self"); await next();
 const dates=page.getByRole("combobox");
 await dates.nth(0).selectOption("31"); await dates.nth(1).selectOption("02"); await dates.nth(2).selectOption("1990");
 assert.equal(await page.getByRole("button",{name:"Συνέχεια",exact:true}).isDisabled(),true,"Impossible date must block navigation");
 await dates.nth(0).selectOption("15"); await next();
 await choose("current-insurance","none"); await next();
 await choose("evaluation-goal","first_time"); await next();
 await choose("priorities","surgery"); await choose("care-access","freedom"); await next();
 await choose("deductible","1500-to-5000"); await next();
 await page.getByRole("button",{name:"Ολοκλήρωση",exact:true}).waitFor();
 assert.equal(new URL(page.url()).search, "", "Start-new flag must be consumed before refresh");
 await page.reload();
 await page.locator("h1").waitFor();
 await page.getByRole("button",{name:"Ολοκλήρωση",exact:true}).waitFor();
 await choose("additional-needs","prevention_checkup");
 await page.getByRole("button",{name:"Ολοκλήρωση",exact:true}).click();
 await page.waitForURL("**/assessment/profile");
 await page.locator("h1").waitFor();
 const snapshot=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("insurancemarket.health-assessment.session.v4")));
 assert.ok(snapshot.submission.submittedAt);
 assert.equal(snapshot.submission.answers.costApproach,"balanced");
 assert.equal(snapshot.submission.answers.careAccess,"freedom");
 assert.deepEqual(snapshot.submission.answers.additionalNeeds,["prevention_checkup"]);
 assert.equal(snapshot.submission.people[0].birthDate,"1990-02-15");
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log("Assessment integration passed: invalid date, seven steps, refresh persistence, implicit cost approach and profile handoff.");
} finally { await browser?.close(); server.kill("SIGTERM"); }

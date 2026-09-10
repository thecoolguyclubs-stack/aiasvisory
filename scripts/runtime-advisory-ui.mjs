/** Isolated UI fixtures only. Does not connect to or modify the product database.
 * npm run build first. Set PLAYWRIGHT_MODULE and BROWSER_PATH if not installed locally.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { initialAssessmentState } from "../src/lib/assessment/state.ts";
import { createAssessmentSessionSnapshot } from "../src/lib/assessment/storage.ts";
import { isLiveRecommendationsResponse, isProgramDetailResponse } from "../src/lib/recommendations/contracts.ts";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.env.UI_OUTPUT_DIR || "/tmp/advisor-ui-review";
await mkdir(out, { recursive: true });
const base = "http://127.0.0.1:32745";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.env.UI_DEV ? "dev" : "start", "--hostname", "127.0.0.1", "--port", "32745"], { stdio: ["ignore", "pipe", "pipe"] });
const ready = new Promise((resolve, reject) => { server.stdout.on("data", d => { if(d.toString().includes("Ready")) resolve(); }); server.once("exit", code => reject(new Error(`Server exit ${code}`))); });
let browser;
try {
 await ready;
 let executablePath = process.env.BROWSER_PATH;
 let args = ["--no-sandbox"];
 if(process.env.SPARTICUZ_MODULE) { const { default: binary } = await import(process.env.SPARTICUZ_MODULE); executablePath = await binary.executablePath(); args = binary.args; }

 const state = { ...initialAssessmentState, view:"additionalNeeds", uploadPromptHandled:true, uploadDecision:"skipped", answers: { ...initialAssessmentState.answers, insuredPeople:"self", currentInsurance:"none", evaluationGoal:"first_time", priorities:["surgery","hospital-network","high-limit"], additionalNeeds:["prevention_checkup"], careAccess:"freedom", deductible:"1500-to-5000", costApproach:"balanced" }, people:[{id:"self",role:"self",label:"Εμένα",birthDate:"1990-05-15"}] };
 const snapshot = createAssessmentSessionSnapshot(state, "2026-09-10T10:00:00Z");
 const evidence = [
  {id:"ui-hospital",type:"coverage_fact",title:"Νοσοκομειακή περίθαλψη",excerpt:"Κάλυψη νοσηλείας σύμφωνα με τους όρους του προγράμματος. Δεδομένα αποκλειστικά για έλεγχο διεπαφής.",signalCode:"hospital-care",articleSection:"UI fixture / 1"},
  {id:"ui-network",type:"network_fact",title:"Συνεργαζόμενο δίκτυο",excerpt:"Η χρήση του δικτύου χρειάζεται επιβεβαίωση πριν από τη νοσηλεία.",signalCode:"private-hospitals",articleSection:"UI fixture / 2"},
  {id:"ui-waiting",type:"waiting_period",title:"Περίοδος αναμονής",excerpt:"Απαιτείται επιβεβαίωση της περιόδου αναμονής από σύμβουλο.",signalCode:"waiting-period",articleSection:"UI fixture / 3"},
 ];
 const recommendations = ["best-match","premium-choice","smart-budget-choice"].map((category,i)=>({programId:`ui-program-${i}`,programName:["Πρόγραμμα Υγείας Α","Πρόγραμμα Υγείας Β","Πρόγραμμα Υγείας Γ"][i],insurer:"Ασφαλιστική · UI fixture",category,categoryLabel:["Best Match","Premium Choice","Smart Budget Choice"][i],matchScore:[86,79,71][i],strengths:[],tradeOffs:["Η ελευθερία επιλογής εκτός δικτύου χρειάζεται επιβεβαίωση."],itemsToConfirm:["Επιβεβαίωση εξαιρέσεων και αναμονών πριν από οποιαδήποτε επιλογή."],warnings:[],missingEvidence:[{signalCode:"pricing",title:"Εξατομικευμένη τιμολόγηση"}],evidenceReferences:evidence,policyComparison:null}));
 const response = {ok:true,source:"supabase",generatedAt:"2026-09-10T10:01:00Z",recommendations};
 assert.ok(isLiveRecommendationsResponse(response));
 const program = {contractVersion:"product-detail-2026-07-v2",programId:"ui-program-0",name:recommendations[0].programName,insurer:recommendations[0].insurer,productType:"Ασφάλιση υγείας",signals:[],evidenceReferences:evidence,coverageFacts:[],deductibleRules:[],monetaryFacts:[],waitingPeriods:[],exclusions:[],providerNetworks:[],procedureFees:[],supplementaryBenefits:[],claimRules:[]};
 assert.ok(isProgramDetailResponse({ok:true,source:"supabase",program}));
 for(const width of (process.env.UI_WIDTHS || "1440,390").split(",").map(Number)) {
  browser = await chromium.launch({ executablePath, args, headless: true });
  const context = await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,acceptDownloads:true});
  const page = await context.newPage();
  page.on("console",message=>{if(message.type()==="error") console.error(message.text());});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/api/recommendations",route=>route.fulfill({json:response}));
  await page.route("**/api/programs/*",route=>route.fulfill({json:{ok:true,source:"supabase",program}}));
  await page.route("**/api/recommendation-explanation",route=>route.fulfill({status:503,json:{ok:false}}));
  await page.goto(base);
  await page.evaluate(({snapshot,response})=>{
   sessionStorage.setItem("insurancemarket.health-assessment.session.v4",JSON.stringify(snapshot));
   sessionStorage.setItem("insurancemarket.health-recommendations.session.v1",JSON.stringify({version:1,assessmentSubmittedAt:snapshot.submission.submittedAt,response}));
  },{snapshot,response});
  for(const [name,path] of [["home","/"],["profile","/assessment/profile"],["results","/results"],["detail","/results/ui-program-0"],["interest","/interest/ui-program-0"],["assessment","/assessment"]]) {
   if(process.env.UI_PAGE && name!==process.env.UI_PAGE) continue;
   await page.goto(base+path); await page.locator("h1").first().waitFor();
   if(name==="results") await page.getByRole("heading",{name:"Πρόγραμμα Υγείας Α",exact:true}).waitFor();
   if(name==="detail") await page.locator("#program-evidence").waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
   const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll("main *")).filter(el=>el.getBoundingClientRect().right>innerWidth+2 && getComputedStyle(el).position!=="absolute").map(el=>el.className).slice(0,10));
   assert.deepEqual(overflow,[],`${name} overflow at ${width}: ${overflow}`);
   if((width===1440 && ["home","profile","results","detail","assessment"].includes(name)) || (width===390 && name==="profile")) {
    const download=page.waitForEvent("download",{timeout:60000});
    await page.getByRole("button",{name:"Εξαγωγή PDF"}).click();
    const file=await download.catch(async error => { console.error(await page.getByRole("status").allTextContents()); await page.screenshot({path:`${out}/export-error.png`}); throw error; }); await file.saveAs(`${out}/${name}${width===390 ? "-mobile" : ""}.pdf`);
    assert.equal(await page.locator("iframe").count(),0,"PDF frame must be cleaned up");
   }
  }
  for (const view of process.env.UI_PAGE ? [] : ["insuredPeople", "birthDates", "currentInsurance", "evaluationGoal", "priorities", "deductible"]) {
   await page.evaluate(({snapshot,view})=>sessionStorage.setItem("insurancemarket.health-assessment.session.v4",JSON.stringify({...snapshot,navigation:{...snapshot.navigation,view,history:[]}})),{snapshot,view});
   await page.goto(base+"/assessment"); await page.locator("h1").waitFor();
   await page.screenshot({path:`${out}/step-${view}-${width}.png`,fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} has horizontal overflow`);
   if(width===1440 && ["birthDates","priorities"].includes(view)) {
    const download=page.waitForEvent("download",{timeout:60000});
    await page.getByRole("button",{name:"Εξαγωγή PDF"}).click();
    await (await download).saveAs(`${out}/step-${view}.pdf`);
   }
  }
  assert.deepEqual(errors,[],`Browser errors: ${errors}`);
  await context.close();
  await browser.close();
 }
 console.log(JSON.stringify({ok:true,viewports:[1440,390],routes:6,pdfExports:8,output:out}));
} finally { await browser?.close(); server.kill("SIGTERM"); }

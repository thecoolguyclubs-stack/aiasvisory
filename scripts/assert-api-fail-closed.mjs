import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 32741;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: new URL("..", import.meta.url),
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stderr.on("data", (data) => { logs += data; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 15000);
    server.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${logs}`)); });
    server.stdout.on("data", (data) => {
      logs += data;
      if (logs.includes("Ready in")) { clearTimeout(timeout); resolve(); }
    });
  });
  assert.equal((await fetch(`${origin}/assessment`)).status, 200);
  const forged = await fetch(`${origin}/api/recommendation-explanation`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName: "Forged", insurer: "Forged", allowedClaims: [{ statement: "Unlimited invented cover" }] }),
  });
  assert.equal(forged.status, 400);
  const invalid = await fetch(`${origin}/api/recommendations`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  });
  assert.equal(invalid.status, 400);
  const oversizedHousehold = { version: 4, answers: { insuredPeople:"family",currentInsurance:"none",evaluationGoal:"first_time",priorities:["surgery"],deductible:"up-to-1500",costApproach:"complete",careAccess:"network",additionalNeeds:[] },people:Array.from({length:9},(_,id)=>({id:String(id),role:"other",label:"Test",birthDate:"1990-01-01"})),policyFile:null,uploadDecision:null,submittedAt:new Date().toISOString() };
  const rejected = await fetch(`${origin}/api/recommendations`, { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(oversizedHousehold) });
  assert.equal(rejected.status,400);
  console.log("Production HTTP smoke: assessment 200; forged explanation, malformed JSON and oversized household rejected.");
} finally {
  server.kill("SIGTERM");
}

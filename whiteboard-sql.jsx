import { useState, useEffect, useRef } from "react";
import { Ban, Mic, Table2, HelpCircle, Play, ArrowRight, ArrowLeft, Lightbulb, Send, Loader2, CheckCircle2, AlertCircle, XCircle, ThumbsUp, Wrench, Eye, EyeOff, ChevronDown, ChevronUp, RefreshCw, Clock } from "lucide-react";

const P = [
  {
    id:1, diff:"Easy",
    title:"Flag abnormal HbA1c results",
    context:"The diabetic review team needs all patients with elevated HbA1c for urgent follow-up. Normal HbA1c is below 6.5%.",
    question:"Return patient_id, result_value, and result_date for all HbA1c tests where result_value exceeds 6.5. Order by result_date descending.",
    tables:[{
      name:"lab_results",
      cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_value DECIMAL(5,2)","result_date DATE","status VARCHAR(20)"],
      rows:[[1,101,"'HbA1c'",7.2,"'2026-06-15'","'ABNORMAL'"],[2,102,"'HbA1c'",5.4,"'2026-06-14'","'NORMAL'"],[3,103,"'Glucose'",120,"'2026-06-13'","'HIGH'"],[4,104,"'HbA1c'",8.1,"'2026-06-12'","'ABNORMAL'"],[5,105,"'HbA1c'",6.3,"'2026-06-11'","'NORMAL'"]]
    }],
    hint:"You need two conditions joined by AND: one filters by test name, one by value. Then sort.",
    concepts:["WHERE + AND","ORDER BY DESC"],
  },
  {
    id:2, diff:"Easy",
    title:"Test volume by department",
    context:"The lab manager needs to know how many tests each department ordered in June 2026 to plan staffing.",
    question:"Count tests per department for June 2026. Return department and test_count. Only include departments with more than 3 tests. Order by test_count descending.",
    tables:[{
      name:"test_requests",
      cols:["request_id INT","patient_id INT","department VARCHAR(50)","test_name VARCHAR(50)","requested_date DATE"],
      rows:[[1,101,"'Cardiology'","'Troponin'","'2026-06-15'"],[2,102,"'Haematology'","'FBC'","'2026-06-14'"],[3,103,"'Cardiology'","'BNP'","'2026-06-13'"],[4,104,"'Biochemistry'","'HbA1c'","'2026-06-12'"],[5,105,"'Cardiology'","'ECG'","'2026-07-01'"],[6,106,"'Haematology'","'Coag'","'2026-06-10'"]]
    }],
    hint:"Sequence matters: WHERE filters rows before GROUP BY groups them, then HAVING filters the groups. COUNT(*) counts rows per group.",
    concepts:["GROUP BY","COUNT(*)","WHERE date filter","HAVING"],
  },
  {
    id:3, diff:"Easy-Medium",
    title:"Patient names with abnormal results",
    context:"Clinicians need patient names alongside abnormal results for the morning handover report.",
    question:"Join patients and lab_results. Return patient_name, test_name, result_value, and result_date where status = 'ABNORMAL'. Order by result_date descending.",
    tables:[
      {name:"patients",cols:["patient_id INT","patient_name VARCHAR(100)","ward VARCHAR(50)"],rows:[[101,"'Kofi Mensah'","'Ward 3A'"],[102,"'Ama Owusu'","'ICU'"],[103,"'Kwame Asante'","'Ward 2B'"],[104,"'Akosua Boateng'","'Ward 3A'"]]},
      {name:"lab_results",cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_value DECIMAL(5,2)","result_date DATE","status VARCHAR(20)"],rows:[[1,101,"'HbA1c'",7.2,"'2026-06-15'","'ABNORMAL'"],[2,102,"'HbA1c'",5.4,"'2026-06-14'","'NORMAL'"],[3,103,"'Troponin'",0.18,"'2026-06-15'","'ABNORMAL'"],[4,104,"'FBC'",12.1,"'2026-06-13'","'NORMAL'"]]}
    ],
    hint:"Connect tables on the column they share. Use table.column notation to avoid ambiguity. The status filter goes in WHERE, not ON.",
    concepts:["INNER JOIN","ON clause","table.column notation"],
  },
  {
    id:4, diff:"Medium",
    title:"Patients without recent lab tests",
    context:"The quality team wants admitted patients who had NO lab tests in the last 7 days — a potential care gap.",
    question:"Find all currently admitted patients (discharge_date IS NULL) with no lab results between 2026-06-30 and 2026-07-07. Return patient_id and patient_name.",
    tables:[
      {name:"patients",cols:["patient_id INT","patient_name VARCHAR(100)"],rows:[[101,"'Kofi Mensah'"],[102,"'Ama Owusu'"],[103,"'Kwame Asante'"],[104,"'Akosua Boateng'"]]},
      {name:"admissions",cols:["admission_id INT","patient_id INT","admission_date DATE","discharge_date DATE"],rows:[[1,101,"'2026-07-01'","NULL"],[2,102,"'2026-06-20'","'2026-07-01'"],[3,103,"'2026-07-03'","NULL"],[4,104,"'2026-07-02'","NULL"]]},
      {name:"lab_results",cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_date DATE"],rows:[[1,101,"'HbA1c'","'2026-07-06'"],[2,103,"'FBC'","'2026-06-28'"]]}
    ],
    hint:"Step 1: filter admissions to discharge_date IS NULL. Step 2: LEFT JOIN lab_results with a date condition. Step 3: WHERE the joined result is NULL — that means no matching test.",
    concepts:["LEFT JOIN","IS NULL","Date filtering","Multiple JOINs"],
  },
  {
    id:5, diff:"Medium",
    title:"Above-average results by test type",
    context:"The clinical team wants to see which results are elevated above the average for that specific test — not the overall average.",
    question:"Return patient_id, test_name, result_value, and the per-test average (aliased as test_avg) for all results where result_value exceeds the average for that specific test_name.",
    tables:[{
      name:"lab_results",
      cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_value DECIMAL(6,2)"],
      rows:[[1,101,"'HbA1c'",7.2],[2,102,"'HbA1c'",5.4],[3,103,"'HbA1c'",8.1],[4,104,"'Glucose'",120],[5,105,"'Glucose'",85],[6,106,"'Glucose'",180]]
    }],
    hint:"Think like a hospital lab director comparing each patient to their peer group — the subquery must compute AVG grouped by test_name, then you join it back on test_name to compare each row to its own category average.",
    concepts:["Subquery with GROUP BY","AVG per group","Correlated or joined subquery"],
  },
  {
    id:6, diff:"Medium",
    title:"Monthly reagent spend by department",
    context:"The procurement manager needs a cost breakdown: how much each department spent on reagents in July 2026.",
    question:"Using a CTE named monthly_usage, sum quantity per department + reagent for July 2026. Join to reagents to compute total_cost (quantity × unit_cost) per department. Return department, total_quantity, total_cost. Order by total_cost descending.",
    tables:[
      {name:"reagent_usage",cols:["usage_id INT","reagent_id INT","department VARCHAR(50)","quantity_used INT","usage_date DATE"],rows:[[1,501,"'Biochemistry'",10,"'2026-07-03'"],[2,502,"'Haematology'",5,"'2026-07-04'"],[3,501,"'Biochemistry'",8,"'2026-07-05'"],[4,503,"'Immunology'",12,"'2026-07-06'"],[5,502,"'Haematology'",3,"'2026-07-06'"]]},
      {name:"reagents",cols:["reagent_id INT","reagent_name VARCHAR(100)","unit_cost DECIMAL(8,2)"],rows:[[501,"'HbA1c Reagent Kit'",45.00],[502,"'FBC Reagent Pack'",28.50],[503,"'Immunoglobulin Panel'",120.00]]}
    ],
    hint:"Think of the CTE like a prep step on a lab bench: first aggregate what you need (quantity by dept + reagent), then bring in the cost reference (reagents table), then calculate and present the totals.",
    concepts:["WITH CTE","SUM + GROUP BY","JOIN a CTE","Calculated column (×)"],
  },
  {
    id:7, diff:"Medium-Hard",
    title:"Highest result per patient per test",
    context:"Clinicians want each patient's worst result per test type — to quickly see who needs the most urgent attention.",
    question:"Rank each result per patient per test type, rank 1 = highest value. Return patient_id, test_name, result_value, result_date, and result_rank. Only show rows where result_rank = 1.",
    tables:[{
      name:"lab_results",
      cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_value DECIMAL(6,2)","result_date DATE"],
      rows:[[1,101,"'HbA1c'",7.2,"'2026-06-15'"],[2,101,"'HbA1c'",6.8,"'2026-05-10'"],[3,101,"'Glucose'",140,"'2026-06-15'"],[4,102,"'HbA1c'",8.5,"'2026-06-10'"],[5,102,"'HbA1c'",9.1,"'2026-05-01'"],[6,103,"'Glucose'",98,"'2026-06-12'"]]
    }],
    hint:"RANK() OVER (PARTITION BY patient_id, test_name ORDER BY result_value DESC). You're partitioning by both columns — like ranking runners within their own age group and gender category simultaneously. You can't WHERE on a window function directly — wrap in a subquery or CTE.",
    concepts:["RANK() OVER()","PARTITION BY two columns","Filter on window result via CTE or subquery"],
  },
  {
    id:8, diff:"Hard",
    title:"Doctors below department attendance average",
    context:"Management wants to identify doctors whose appointment attendance rates fall below their department average — for a performance review.",
    question:"Write a query using at least two CTEs: (1) each doctor's attendance rate, (2) the average rate per department. Return doctor_name, department, personal_rate, dept_avg — only where personal_rate < dept_avg. Round rates to 2 decimal places.",
    tables:[
      {name:"appointments",cols:["appt_id INT","patient_id INT","doctor_id INT","appt_date DATE","attended BOOLEAN"],rows:[[1,101,201,"'2026-07-01'","TRUE"],[2,102,201,"'2026-07-02'","FALSE"],[3,103,202,"'2026-07-01'","TRUE"],[4,104,202,"'2026-07-03'","TRUE"],[5,105,203,"'2026-07-02'","FALSE"],[6,106,203,"'2026-07-04'","FALSE"]]},
      {name:"doctors",cols:["doctor_id INT","doctor_name VARCHAR(100)","department VARCHAR(50)"],rows:[[201,"'Dr. Acheampong'","'Biochemistry'"],[202,"'Dr. Mensah'","'Biochemistry'"],[203,"'Dr. Owusu'","'Haematology'"],[204,"'Dr. Asante'","'Haematology'"]]}
    ],
    hint:"CTE 1: JOIN appointments+doctors, GROUP BY doctor, ROUND(SUM(CASE WHEN attended THEN 1.0 ELSE 0 END)/COUNT(*),2) as rate. CTE 2: FROM CTE 1, GROUP BY department, AVG(rate). Final: JOIN both on department, filter personal_rate < dept_avg.",
    concepts:["Multiple CTEs","CASE WHEN in aggregate","AVG of a rate","CTE-to-CTE join"],
  },
  {
    id:9, diff:"Hard",
    title:"Reagent order history — running total and change",
    context:"The lab manager wants to track cumulative reagent stock over time and whether order sizes are increasing or decreasing.",
    question:"For reagent_id = 501, return order_date, quantity_ordered, a running total of quantity (cumulative sum), and the change vs the previous order using LAG (NULL for first row). Order by order_date ascending.",
    tables:[{
      name:"reagent_orders",
      cols:["order_id INT","reagent_id INT","order_date DATE","quantity_ordered INT","unit_price DECIMAL(8,2)"],
      rows:[[1,501,"'2026-04-01'",50,45.00],[2,501,"'2026-05-03'",75,45.00],[3,501,"'2026-05-28'",40,46.50],[4,501,"'2026-06-15'",100,45.00],[5,502,"'2026-06-20'",60,28.50]]
    }],
    hint:"Think of the running total like a lab stockroom ledger — each row adds to what came before. Two window functions in the same SELECT: SUM(quantity_ordered) OVER (ORDER BY order_date) for the cumulative total, and LAG(quantity_ordered,1) OVER (ORDER BY order_date) for the previous value. Then subtract.",
    concepts:["SUM() OVER (ORDER BY)","LAG() window function","Running totals","Arithmetic on window results"],
  },
  {
    id:10, diff:"Hard",
    title:"30-day hospital readmissions",
    context:"30-day readmission rate is a critical quality indicator. A readmission is a new admission within 30 days of a prior discharge.",
    question:"Find all readmissions within 30 days of a prior discharge. Return patient_name, first_discharge_date, readmission_date, days_between, the primary ICD code for the readmission, and whether an HbA1c test was taken during the readmission stay ('Yes' or 'No'). Order by days_between ascending.",
    tables:[
      {name:"patients",cols:["patient_id INT","patient_name VARCHAR(100)"],rows:[[101,"'Kofi Mensah'"],[102,"'Ama Owusu'"],[103,"'Kwame Asante'"]]},
      {name:"admissions",cols:["admission_id INT","patient_id INT","admission_date DATE","discharge_date DATE"],rows:[[1,101,"'2026-05-01'","'2026-05-08'"],[2,101,"'2026-05-15'","'2026-05-22'"],[3,102,"'2026-05-10'","'2026-05-20'"],[4,102,"'2026-06-25'","NULL"],[5,103,"'2026-06-01'","'2026-06-10'"],[6,103,"'2026-06-18'","'2026-06-25'"]]},
      {name:"icd_codes",cols:["icd_id INT","admission_id INT","icd_code VARCHAR(10)","description VARCHAR(200)","is_primary BOOLEAN"],rows:[[1,2,"'E11.9'","'Type 2 Diabetes'","TRUE"],[2,4,"'I50.9'","'Heart Failure'","TRUE"],[3,6,"'J18.9'","'Pneumonia'","TRUE"]]},
      {name:"lab_results",cols:["result_id INT","patient_id INT","test_name VARCHAR(50)","result_date DATE"],rows:[[1,101,"'HbA1c'","'2026-05-17'"],[2,101,"'FBC'","'2026-05-16'"],[3,103,"'Glucose'","'2026-06-20'"]]}
    ],
    hint:"Step 1: self-join admissions (a1=prior, a2=readmission) on same patient where a2.admission_date is within 30 days of a1.discharge_date (a1.discharge_date IS NOT NULL). Step 2: JOIN patients. Step 3: JOIN icd_codes (is_primary=TRUE) on a2.admission_id. Step 4: LEFT JOIN lab_results (test='HbA1c', date between a2 dates). CASE WHEN to return Yes/No.",
    concepts:["Self-join for same-table comparison","Date arithmetic","CASE WHEN","LEFT JOIN for optional data","Multiple table joins"],
  },
];

const DROLE = { "Easy":"success","Easy-Medium":"accent","Medium":"pro","Medium-Hard":"warning","Hard":"danger" };
const pad2 = n => n.toString().padStart(2,"0");
const fmt = s => `${pad2(Math.floor(s/60))}:${pad2(s%60)}`;
const ic = (style={}) => ({ flexShrink:0, ...style });

function SchemaTable({ t }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:12, fontWeight:500, color:"#0D9488", marginBottom:6 }}>{t.name}</div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", fontSize:12, fontFamily:'JetBrains Mono, Consolas, monospace', width:"100%" }}>
          <thead>
            <tr>{t.cols.map((c,i)=>(
              <th key={i} style={{ padding:"5px 10px", textAlign:"left", background:"#F8FAFC", borderBottom:"0.5px solid #E2E8F0", color:"#475569", fontWeight:500, whiteSpace:"nowrap" }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            {t.rows.map((row,ri)=>(
              <tr key={ri}>{row.map((cell,ci)=>(
                <td key={ci} style={{ padding:"4px 10px", borderBottom:"0.5px solid #E2E8F0", color:"#1E293B" }}>{String(cell)}</td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Nofly() {
  return (
    <div style={{ background:"#FEF2F2", border:"0.5px solid #FECACA", borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"flex-start" }}>
      <Ban size={16} style={{ color:"#DC2626", marginTop:2, ...ic() }} aria-hidden="true" />
      <div>
        <div style={{ fontSize:13, fontWeight:500, color:"#DC2626", marginBottom:2 }}>No-fly zone</div>
        <div style={{ fontSize:12, color:"#DC2626", opacity:.85 }}>No documentation. No SQL editor. No AI. No autocomplete. Just you and the problem — exactly like a real interview.</div>
      </div>
    </div>
  );
}

function VoiceBar({ text }) {
  return (
    <div style={{ background:"#F0FDFA", border:"0.5px solid #99F6E4", borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"flex-start" }}>
      <Mic size={16} style={{ color:"#0D9488", marginTop:2, ...ic() }} aria-hidden="true" />
      <div style={{ fontSize:12, color:"#0D9488", lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

function Score({ n, label }) {
  const role = n>=8?"success":n>=6?"warning":"danger";
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:28, fontWeight:500, color:`var(--text-${role})`, lineHeight:1 }}>{n}<span style={{ fontSize:14, color:"#94A3B8" }}>/10</span></div>
      <div style={{ fontSize:11, color:"#94A3B8", marginTop:3 }}>{label}</div>
    </div>
  );
}

function Btn({ onClick, disabled, children, variant="primary", style={} }) {
  const base = { border:"none", borderRadius:"8px", padding:"9px 18px", fontSize:14, fontWeight:500, cursor:disabled?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:6, ...style };
  if (variant==="primary") return <button onClick={onClick} disabled={disabled} style={{ ...base, background:disabled?"#E2E8F0":"#0D9488", color:disabled?"#94A3B8":"#FFFFFF" }}>{children}</button>;
  return <button onClick={onClick} style={{ ...base, background:"transparent", color:"#475569", border:"0.5px solid #E2E8F0" }}>{children}</button>;
}

function IntroStep({ p, score, onStart }) {
  const role = DROLE[p.diff];
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ background:`var(--bg-${role})`, color:`var(--text-${role})`, border:`0.5px solid var(--border-${role})`, borderRadius:"8px", padding:"2px 10px", fontSize:11, fontWeight:500 }}>{p.diff}</span>
            <span style={{ fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:12, color:"#94A3B8" }}>#{pad2(p.id)} of 10</span>
          </div>
          <div style={{ fontSize:17, fontWeight:500, marginBottom:6 }}>{p.title}</div>
          <div style={{ fontSize:13, color:"#475569", lineHeight:1.65 }}>{p.context}</div>
        </div>
        {score && (
          <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:"12px 16px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:11, color:"#94A3B8", marginBottom:4, fontFamily:'JetBrains Mono, Consolas, monospace' }}>your best</div>
            <div style={{ fontSize:22, fontWeight:500, color:score.passed?"#059669":"#D97706" }}>{score.sql_score}/10</div>
            {score.passed&&<div style={{ fontSize:11, color:"#059669" }}>passed ✓</div>}
            {score.time&&<div style={{ fontSize:11, color:"#94A3B8", fontFamily:'JetBrains Mono, Consolas, monospace', marginTop:2 }}>{fmt(score.time)}</div>}
          </div>
        )}
      </div>

      <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"#475569", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
          <HelpCircle size={14} aria-hidden="true" /> Your task
        </div>
        <div style={{ fontSize:14, lineHeight:1.7 }}>{p.question}</div>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"#475569", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
          <Table2 size={14} aria-hidden="true" /> Table schemas (sample data)
        </div>
        {p.tables.map((t,i)=><SchemaTable key={i} t={t} />)}
      </div>

      <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:8, padding:"10px 14px", marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:500, color:"#94A3B8", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Concepts tested</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {p.concepts.map((c,i)=>(
            <span key={i} style={{ background:"#FFFFFF", border:"0.5px solid #E2E8F0", borderRadius:"8px", padding:"2px 8px", fontSize:12, fontFamily:'JetBrains Mono, Consolas, monospace', color:"#1E293B" }}>{c}</span>
          ))}
        </div>
      </div>

      <Btn onClick={onStart}><Play size={14} aria-hidden="true" /> Start challenge</Btn>
    </div>
  );
}

function PseudoStep({ p, pseudo, setPseudo, showHint, setShowHint, onNext }) {
  return (
    <div>
      <Nofly />
      <VoiceBar text='Say your logic out loud before you write anything: "First I need to... then I will... finally I..." Narrate it to an imaginary interviewer. This is exactly what the whiteboard method trains.' />

      <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"#475569", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}><HelpCircle size={13} aria-hidden="true"/> Task reminder</div>
        <div style={{ fontSize:13, lineHeight:1.65 }}>{p.question}</div>
      </div>

      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:14, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>Step 1 — plan in plain English</div>
        <div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>Write what your query will do, step by step. No SQL syntax yet. Build the skeleton before the syntax.</div>
      </div>

      <textarea
        value={pseudo}
        onChange={e=>setPseudo(e.target.value)}
        placeholder={"E.g.:\n1. I need to filter lab_results to only HbA1c tests\n2. Then I need to keep only rows where the value exceeds 6.5\n3. Finally I will sort by result_date newest first"}
        style={{ width:"100%", minHeight:180, padding:"12px 14px", fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:13, lineHeight:1.7, background:"#FFFFFF", color:"#1E293B", border:"0.5px solid #CBD5E1", borderRadius:8, resize:"vertical", boxSizing:"border-box", outline:"none" }}
      />

      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12 }}>
        <Btn onClick={onNext}>Looks good — write the SQL <ArrowRight size={14} aria-hidden="true"/></Btn>
        <Btn variant="ghost" onClick={()=>setShowHint(!showHint)}><Lightbulb size={14} aria-hidden="true"/> {showHint?"Hide hint":"Show hint"}</Btn>
      </div>

      {showHint&&(
        <div style={{ background:"#FFFBEB", border:"0.5px solid #FDE68A", borderRadius:8, padding:"10px 14px", marginTop:12 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#D97706", marginBottom:4 }}>Hint — try not to peek until you've struggled!</div>
          <div style={{ fontSize:13, color:"#D97706", lineHeight:1.65 }}>{p.hint}</div>
        </div>
      )}
    </div>
  );
}

function SqlStep({ p, sql, setSql, onBack, onGrade }) {
  const handleTab = e => {
    if (e.key==="Tab") {
      e.preventDefault();
      const s=e.target.selectionStart, end=e.target.selectionEnd;
      setSql(sql.substring(0,s)+"  "+sql.substring(end));
    }
  };
  return (
    <div>
      <Nofly />
      {!sql.trim()&&<VoiceBar text="Translate your pseudocode into SQL now. Read each line of your plan out loud as you convert it — this is exactly what you do in a real whiteboard interview." />}

      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        {p.tables.map((t,i)=>(
          <div key={i} style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:"8px", padding:"4px 10px", fontSize:12, fontFamily:'JetBrains Mono, Consolas, monospace', color:"#475569", display:"flex", alignItems:"center", gap:4 }}>
            <Table2 size={12} aria-hidden="true"/> {t.name}({t.cols.map(c=>c.split(" ")[0]).join(", ")})
          </div>
        ))}
      </div>

      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>Step 2 — write the SQL</div>
        <div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>Plain text only. No syntax highlighting. No editor. Tab inserts 2 spaces.</div>
      </div>

      <textarea
        value={sql}
        onChange={e=>setSql(e.target.value)}
        onKeyDown={handleTab}
        placeholder={"SELECT ...\nFROM ...\nWHERE ...\n\n-- Write your full answer here"}
        spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
        style={{ width:"100%", minHeight:240, padding:"12px 14px", fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:13, lineHeight:1.75, background:"#FFFFFF", color:"#1E293B", border:"0.5px solid #CBD5E1", borderRadius:8, resize:"vertical", boxSizing:"border-box", outline:"none" }}
      />

      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12 }}>
        <Btn onClick={onGrade} disabled={!sql.trim()}><Send size={14} aria-hidden="true"/> Grade my answer</Btn>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft size={14} aria-hidden="true"/> Edit pseudocode</Btn>
      </div>
    </div>
  );
}

function GradingStep() {
  const MSGS = ["Reading your logic...","Checking syntax...","Running against sample data...","Formulating feedback..."];
  const [i,setI]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setI(x=>(x+1)%MSGS.length),1300); return()=>clearInterval(t); },[]);
  return (
    <div style={{ textAlign:"center", padding:"56px 0" }}>
      <Loader2 size={36} style={{ color:"#0D9488", animation:"spin 1s linear infinite", marginBottom:16 }} aria-hidden="true"/>
      <div style={{ fontSize:14, color:"#475569" }}>{MSGS[i]}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ReviewStep({ p, result, time, showModel, setShowModel, onRetry, onNext }) {
  if (result.error) {
    return (
      <div style={{ background:"#FEF2F2", border:"0.5px solid #FECACA", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:500, color:"#DC2626", marginBottom:4 }}>Grading failed</div>
        <div style={{ fontSize:13, color:"#DC2626", marginBottom:12 }}>{result.message}</div>
        <Btn variant="ghost" onClick={onRetry} style={{ borderColor:"#FECACA", color:"#DC2626" }}><RefreshCw size={14} aria-hidden="true"/> Try again</Btn>
      </div>
    );
  }

  const vr = result.passed?"success":result.sql_score>=5?"warning":"danger";
  const VIcon = result.passed?CheckCircle2:result.sql_score>=5?AlertCircle:XCircle;

  return (
    <div>
      <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:"16px 20px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <VIcon size={32} style={{ color:`var(--text-${vr})`, flexShrink:0 }} aria-hidden="true"/>
          <div>
            <div style={{ fontSize:17, fontWeight:500 }}>{result.verdict||"Graded"}</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>
              <Clock size={12} style={{ verticalAlign:"middle", marginRight:3 }} aria-hidden="true"/>{fmt(time)} · {p.diff}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:20 }}>
          <Score n={result.pseudocode_score??0} label="Logic" />
          <Score n={result.sql_score??0} label="SQL" />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#475569", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Clock size={13} aria-hidden="true"/>Logic assessment</div>
          <div style={{ fontSize:13, lineHeight:1.65 }}>{result.logic_feedback}</div>
        </div>
        <div style={{ background:"#F8FAFC", border:"0.5px solid #E2E8F0", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#475569", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Send size={13} aria-hidden="true"/>SQL assessment</div>
          <div style={{ fontSize:13, lineHeight:1.65 }}>{result.sql_feedback}</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ background:"#ECFDF5", border:"0.5px solid #A7F3D0", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#059669", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><ThumbsUp size={13} aria-hidden="true"/>What worked</div>
          <ul style={{ margin:0, paddingLeft:16 }}>
            {(result.what_worked||[]).map((w,i)=><li key={i} style={{ fontSize:13, color:"#059669", lineHeight:1.6, marginBottom:3 }}>{w}</li>)}
          </ul>
        </div>
        <div style={{ background:"#FEF2F2", border:"0.5px solid #FECACA", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#DC2626", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Wrench size={13} aria-hidden="true"/>What to fix</div>
          <ul style={{ margin:0, paddingLeft:16 }}>
            {(result.what_to_fix||[]).map((w,i)=><li key={i} style={{ fontSize:13, color:"#DC2626", lineHeight:1.6, marginBottom:3 }}>{w}</li>)}
          </ul>
        </div>
      </div>

      {result.interview_tip&&(
        <div style={{ background:"#F0FDFA", border:"0.5px solid #99F6E4", borderRadius:8, padding:"10px 14px", marginBottom:12, display:"flex", gap:10, alignItems:"flex-start" }}>
          <Lightbulb size={15} style={{ color:"#0D9488", marginTop:2, flexShrink:0 }} aria-hidden="true"/>
          <div style={{ fontSize:13, color:"#0D9488", lineHeight:1.6 }}><span style={{ fontWeight:500 }}>Interview tip: </span>{result.interview_tip}</div>
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <button
          onClick={()=>setShowModel(!showModel)}
          style={{ background:"transparent", color:"#475569", border:"0.5px solid #E2E8F0", borderRadius:"8px", padding:"8px 14px", fontSize:13, cursor:"pointer", width:"100%", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}
        >
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>{showModel?<EyeOff size={14} aria-hidden="true"/>:<Eye size={14} aria-hidden="true"/>}{showModel?"Hide":"Show"} model answer</span>
          {showModel?<ChevronUp size={14} aria-hidden="true"/>:<ChevronDown size={14} aria-hidden="true"/>}
        </button>
        {showModel&&(
          <pre style={{ margin:0, padding:"14px 16px", background:"#FFFFFF", border:"0.5px solid #E2E8F0", borderTop:"none", borderRadius:"0 0 8px 8px", fontSize:13, fontFamily:'JetBrains Mono, Consolas, monospace', lineHeight:1.75, overflowX:"auto", color:"#1E293B", whiteSpace:"pre-wrap" }}>
            {result.model_answer}
          </pre>
        )}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        {onNext&&<Btn onClick={onNext}>Next problem <ArrowRight size={14} aria-hidden="true"/></Btn>}
        <Btn variant="ghost" onClick={onRetry}><RefreshCw size={14} aria-hidden="true"/> Retry</Btn>
      </div>
    </div>
  );
}

export default function App() {
  const [idx,setIdx]=useState(0);
  const [step,setStep]=useState("intro");
  const [pseudo,setPseudo]=useState("");
  const [sql,setSql]=useState("");
  const [result,setResult]=useState(null);
  const [timer,setTimer]=useState(0);
  const [running,setRunning]=useState(false);
  const [scores,setScores]=useState({});
  const [showHint,setShowHint]=useState(false);
  const [showModel,setShowModel]=useState(false);
  const tiRef=useRef();
  const p=P[idx];

  useEffect(()=>{
    window.storage?.get("wma_sql_v2").then(r=>{ if(r) setScores(JSON.parse(r.value)); }).catch(()=>{});
  },[]);

  useEffect(()=>{
    clearInterval(tiRef.current);
    if(running) tiRef.current=setInterval(()=>setTimer(t=>t+1),1000);
    return ()=>clearInterval(tiRef.current);
  },[running]);

  const pick = i => {
    setIdx(i); setStep("intro"); setTimer(0); setRunning(false);
    setPseudo(""); setSql(""); setResult(null); setShowHint(false); setShowModel(false);
  };

  const start = () => {
    setPseudo(""); setSql(""); setResult(null); setShowHint(false); setShowModel(false);
    setTimer(0); setRunning(true); setStep("pseudo");
  };

  const grade = async () => {
    setRunning(false); setStep("grading");
    const tbl = p.tables.map(t=>`Table ${t.name}:\n  Columns: ${t.cols.join(", ")}\n  Rows: ${t.rows.map(r=>`(${r.join(",")})`).join(" | ")}`).join("\n\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1300,
          system:"You are a strict but encouraging SQL interview coach. Respond ONLY with a valid JSON object. No markdown, no text outside the JSON.",
          messages:[{role:"user",content:`Problem: ${p.question}\nContext: ${p.context}\nConcepts: ${p.concepts.join(", ")}\n\n${tbl}\n\nStudent pseudocode:\n${pseudo.trim()||"(skipped)"}\n\nStudent SQL:\n${sql.trim()||"(blank)"}\n\nJSON format exactly: {"pseudocode_score":N,"sql_score":N,"passed":bool,"verdict":"Excellent|Good|Needs work|Try again","logic_feedback":"2 sentences","sql_feedback":"3 sentences naming specific errors","what_worked":["...","..."],"what_to_fix":["...","..."],"model_answer":"clean SQL","interview_tip":"one actionable interview tip"}`}]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```(?:json)?|```/g,"").trim());
      setResult(parsed);
      const ns={...scores,[p.id]:{sql_score:parsed.sql_score,passed:parsed.passed,time:timer}};
      setScores(ns);
      window.storage?.set("wma_sql_v2",JSON.stringify(ns)).catch(()=>{});
    } catch(e) {
      setResult({error:true,message:e.message});
    }
    setStep("review");
  };

  const passed = Object.values(scores).filter(s=>s.passed).length;

  return (
    <div style={{ fontFamily:'-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif', color:"#1E293B", padding:"16px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", border:0 }}>
        Whiteboard SQL — 10 healthcare SQL challenges with AI grading
      </h2>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, paddingBottom:14, borderBottom:"0.5px solid #E2E8F0" }}>
        <div>
          <div style={{ fontWeight:500 }}>Whiteboard SQL</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>10 healthcare problems · no autocomplete · no safety net</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:13 }}>
            <span style={{ fontWeight:500, color:"#059669" }}>{passed}</span>
            <span style={{ color:"#94A3B8" }}>/10 passed</span>
          </div>
          {(running||timer>0)&&(
            <div style={{ fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:13, color:timer>600?"#DC2626":"#475569", display:"flex", alignItems:"center", gap:4 }}>
              <Clock size={13} aria-hidden="true"/> {fmt(timer)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
        {P.map((pr,i)=>{
          const sc=scores[pr.id]; const active=i===idx;
          return (
            <button key={pr.id} onClick={()=>pick(i)} aria-label={`Problem ${pr.id}: ${pr.title}`}
              style={{ padding:"5px 11px", borderRadius:"8px", cursor:"pointer", flexShrink:0, border:active?"0.5px solid #99F6E4":"0.5px solid #E2E8F0", background:active?"#F0FDFA":"transparent", color:active?"#0D9488":"#475569", fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
              {sc?.passed
                ? <CheckCircle2 size={11} style={{ color:"#059669" }} aria-hidden="true"/>
                : sc
                ? <span style={{ width:7, height:7, borderRadius:"50%", background:"#D97706", display:"inline-block" }}/>
                : <span style={{ width:7, height:7, borderRadius:"50%", border:"1px solid currentColor", display:"inline-block" }}/>}
              #{pad2(pr.id)}
            </button>
          );
        })}
      </div>

      {step==="intro"&&<IntroStep p={p} score={scores[p.id]} onStart={start}/>}
      {step==="pseudo"&&<PseudoStep p={p} pseudo={pseudo} setPseudo={setPseudo} showHint={showHint} setShowHint={setShowHint} onNext={()=>setStep("sql")}/>}
      {step==="sql"&&<SqlStep p={p} sql={sql} setSql={setSql} onBack={()=>setStep("pseudo")} onGrade={grade}/>}
      {step==="grading"&&<GradingStep/>}
      {step==="review"&&result&&<ReviewStep p={p} result={result} time={timer} showModel={showModel} setShowModel={setShowModel} onRetry={start} onNext={idx<P.length-1?()=>pick(idx+1):null}/>}
    </div>
  );
}

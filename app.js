// Public project credentials are safe to use in a browser. Never put a service_role key here.
const db = window.supabase && typeof window.supabase.createClient === 'function'
  ? window.supabase.createClient(
      'https://vtqgrgxxkaykhtpqzhqe.supabase.co',
      'sb_publishable_wxfGAEOZXvUUXGM6z0aGsw_Bo-eFhj-'
    )
  : null;
if (db) window.scholarTrackDb = db;
let data = { scholars: [], submissions: [], programs: [] };
const $ = s => document.querySelector(s);
const el = (tag, cls) => { const node = document.createElement(tag); if (cls) node.className = cls; return node; };
const badge = text => `<span class="badge ${text.toLowerCase().replaceAll(' ','-')}">${text}</span>`;
const empty = (cols, text = 'No records found.') => `<tr><td class="empty" colspan="${cols}">${text}</td></tr>`;
const program = id => data.programs.find(p => p.id === id);
const scholar = id => data.scholars.find(s => s.id === id);
const displayDate = value => new Date(value).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});

function toast(message) { const t=$('#toast'); t.textContent=message; t.classList.add('show-toast'); setTimeout(()=>t.classList.remove('show-toast'),2800); }
function error(message) {
  const loginError = $('#loginError');
  if (loginError && !$('#loginScreen').hidden) loginError.textContent = message || 'Something went wrong. Please try again.';
  else toast(message || 'Something went wrong. Please try again.');
}
function openModal(html) { $('#modalContent').innerHTML=html; $('#modalBackdrop').classList.add('open'); }
function closeModal() { $('#modalBackdrop').classList.remove('open'); }

async function loadData() {
  if (!db) {
    render();
    toast('Dashboard opened. Database connection is unavailable; refresh to try again.');
    return;
  }
  const [programResult, scholarResult, submissionResult] = await Promise.all([
    db.from('scholarship_programs').select('*').order('name'),
    db.from('scholars').select('*').order('created_at', {ascending:false}),
    db.from('grade_submissions').select('*').order('submitted_at', {ascending:false})
  ]);
  if (programResult.error || scholarResult.error || submissionResult.error) {
    console.error(programResult.error || scholarResult.error || submissionResult.error);
    error('Unable to load Supabase data. Refresh and check your connection.'); return;
  }
  data.programs=programResult.data; 
  data.scholars=scholarResult.data.map(x => ({id:x.student_no,name:x.full_name,course:x.course,programId:x.program_id,status:x.status}));
  data.submissions=submissionResult.data.map(x => ({id:x.id,scholarId:x.student_no,period:`${x.academic_year} · ${x.semester}`,gpa:x.gwa,document:x.document_name || 'No document attached',date:displayDate(x.submitted_at),status:x.submission_status,verifiedAt:x.verified_at}));
  render();
}
function renderDashboard() {
  const total=data.scholars.filter(s=>s.status!=='Disqualified').length;
  const pending=data.scholars.filter(s=>s.status==='Pending Submission').length;
  const verify=data.submissions.filter(s=>s.status==='For Verification').length;
  const compliant=data.scholars.filter(s=>s.status==='Compliant').length;
  $('#totalScholars').textContent=total; $('#pendingSubmissions').textContent=pending; $('#forVerification').textContent=verify; $('#compliantCount').textContent=compliant; $('#pendingBadge').textContent=verify;
  const completed=data.scholars.filter(s=>data.submissions.some(x=>x.scholarId===s.id)).length;
  const percent=total?Math.round(completed/total*100):0; $('#submissionPercent').textContent=percent+'%'; $('#submissionProgress').style.width=percent+'%';
  const overview=[['Compliant',compliant],['For Verification',verify],['Pending Submission',pending]];
  $('#statusSummary').replaceChildren(...overview.map(([name,count])=>{const d=el('div');d.innerHTML=`<span>${name}</span><b>${count}</b>`;return d;}));
  const latest=data.submissions.slice(0,4);
  $('#recentSubmissions').innerHTML=latest.length?latest.map(s=>{const p=scholar(s.scholarId);return `<tr><td class="name-cell"><b>${p?.name||s.scholarId}</b><small>${s.scholarId}</small></td><td>${program(p?.programId)?.name||'—'}</td><td>${s.period.split('·')[1]}</td><td>${Number(s.gpa).toFixed(2)}</td><td>${badge(s.status)}</td><td><button class="action-btn" data-verify="${s.id}">${s.status==='For Verification'?'Review':'View'}</button></td></tr>`}).join(''):empty(6,'No grade submissions yet.');
}
function renderScholars() {
  const q=$('#scholarSearch').value.toLowerCase(), status=$('#statusFilter').value;
  const list=data.scholars.filter(s=>(!q||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!status||s.status===status));
  $('#scholarsTable').innerHTML=list.length?list.map(s=>`<tr><td>${s.id}</td><td class="name-cell"><b>${s.name}</b></td><td>${program(s.programId)?.name||'—'}</td><td>${s.course}</td><td>${badge(s.status)}</td><td><button class="action-btn" data-profile="${s.id}">View</button></td></tr>`).join(''):empty(6,'No scholars match your search.');
}
function renderSubmissions() {
  const filter=$('#submissionFilter').value, list=data.submissions.filter(s=>!filter||s.status===filter);
  $('#submissionsTable').innerHTML=list.length?list.map(s=>{const p=scholar(s.scholarId);return `<tr><td class="name-cell"><b>${p?.name||s.scholarId}</b><small>${s.scholarId}</small></td><td>${s.period}</td><td>${Number(s.gpa).toFixed(2)}</td><td>${s.document}</td><td>${s.date}</td><td>${badge(s.status)}</td><td><button class="action-btn" data-verify="${s.id}">${s.status==='For Verification'?'Verify':'View'}</button></td></tr>`}).join(''):empty(7,'No grade submissions yet.');
}
function renderCompliance() {
  const eligible=data.scholars.filter(s=>data.submissions.some(x=>x.scholarId===s.id&&x.status==='Verified'));
  $('#complianceTable').innerHTML=eligible.length?eligible.map(s=>{const sub=data.submissions.find(x=>x.scholarId===s.id&&x.status==='Verified'), req=program(s.programId)?.minimum_gpa, pass=Number(sub.gpa)<=Number(req);return `<tr><td class="name-cell"><b>${s.name}</b><small>${s.id}</small></td><td>GPA of ${Number(req).toFixed(2)} or better</td><td>${Number(sub.gpa).toFixed(2)}</td><td>${badge(s.status)}</td><td>${badge(pass?'Compliant':'With Deficiency')} ${pass?'Meets requirement':'Below requirement'}</td><td><button class="action-btn" data-evaluate="${s.id}">Evaluate</button></td></tr>`}).join(''):empty(6,'No verified submissions ready for evaluation.');
}
function renderReports() {
  const states=['Compliant','Pending Submission','For Verification','With Deficiency','Probationary','Renewed'];
  $('#reportGrid').innerHTML=states.map(state=>`<div><span>${state}</span><b>${state==='For Verification'?data.submissions.filter(s=>s.status===state).length:data.scholars.filter(s=>s.status===state).length}</b></div>`).join('');
  const attention=data.scholars.filter(s=>['Pending Submission','With Deficiency','Probationary','For Verification'].includes(s.status));
  $('#attentionTable').innerHTML=attention.length?attention.map(s=>`<tr><td>${s.name}</td><td>${program(s.programId)?.name||'—'}</td><td>${badge(s.status)}</td><td>${s.status==='Pending Submission'?'Grade submission required':s.status==='For Verification'?'Waiting for staff verification':'Does not currently meet requirements'}</td></tr>`).join(''):empty(4,'No scholars require attention.');
}
function render(){renderDashboard();renderScholars();renderSubmissions();renderCompliance();renderReports();}

function registerModal() {
  if (!db) return toast('Database connection is unavailable. Refresh the page and try again.');
  openModal(`<h2>Register scholar</h2><p>Create a new scholarship recipient record.</p><form id="registerForm"><div class="form-grid"><label>Student number<input required name="id" placeholder="e.g. S-2026-006" /></label><label>Full name<input required name="name" placeholder="e.g. Juan Dela Cruz" /></label><label class="full">Course / Program<input required name="course" placeholder="e.g. BS Information Technology" /></label><label class="full">Scholarship program<select required name="program">${data.programs.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></label></div><div class="modal-footer"><button type="button" class="btn btn-outline" id="cancelModal">Cancel</button><button class="btn btn-primary">Save Scholar</button></div></form>`);
  $('#registerForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error:insertError}=await db.from('scholars').insert({student_no:f.get('id').trim(),full_name:f.get('name').trim(),course:f.get('course').trim(),program_id:Number(f.get('program')),status:'Active'});if(insertError){error(insertError.message);return;}closeModal();toast('Scholar successfully registered.');loadData();};
}
function submissionModal() {
  if (!db) return toast('Database connection is unavailable. Refresh the page and try again.');
  const eligible=data.scholars.filter(s=>!data.submissions.some(x=>x.scholarId===s.id&&x.status!=='Returned'));
  openModal(`<h2>Add grade submission</h2><p>Record a scholar’s semester grade submission.</p><form id="submissionForm"><div class="form-grid"><label class="full">Scholar<select required name="scholarId"><option value="">Select scholar</option>${eligible.map(s=>`<option value="${s.id}">${s.name} — ${s.id}</option>`).join('')}</select></label><label>Academic year<select name="year"><option>AY 2026–2027</option></select></label><label>Semester<select name="semester"><option>1st Semester</option><option>2nd Semester</option></select></label><label>General weighted average<input required name="gpa" type="number" min="1" max="5" step="0.01" placeholder="e.g. 1.75" /></label><label>Document filename<input required name="document" placeholder="e.g. grades.pdf" /></label></div><div class="modal-footer"><button type="button" class="btn btn-outline" id="cancelModal">Cancel</button><button class="btn btn-primary">Submit for Verification</button></div></form>`);
  $('#submissionForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);if(!f.get('scholarId'))return toast('Select a scholar.');const {error:insertError}=await db.from('grade_submissions').insert({student_no:f.get('scholarId'),academic_year:f.get('year'),semester:f.get('semester'),gwa:Number(f.get('gpa')),document_name:f.get('document'),submission_status:'For Verification'});if(insertError){error(insertError.message);return;}const {error:statusError}=await db.from('scholars').update({status:'For Verification'}).eq('student_no',f.get('scholarId'));if(statusError) console.error(statusError);closeModal();toast('Submission sent for verification.');loadData();};
}
function verifyModal(id) {
  if (!db) return toast('Database connection is unavailable. Refresh the page and try again.');
  const sub=data.submissions.find(x=>x.id==id), p=scholar(sub.scholarId); if(!sub) return;
  openModal(`<h2>${sub.status==='For Verification'?'Verify':'Submission details'}</h2><p>${p?.name||sub.scholarId} · ${sub.scholarId}</p><div class="form-grid"><label>Academic period<input value="${sub.period}" disabled /></label><label>General weighted average<input value="${Number(sub.gpa).toFixed(2)}" disabled /></label><label class="full">Supporting document<input value="${sub.document}" disabled /></label></div>${sub.status==='For Verification'?`<div class="modal-footer"><button class="btn btn-outline" id="returnSub">Return for completion</button><button class="btn btn-primary" id="confirmVerify">Verify Submission</button></div>`:''}`);
  if(sub.status==='For Verification') { $('#confirmVerify').onclick=async()=>{const {error:updateError}=await db.from('grade_submissions').update({submission_status:'Verified',verified_at:new Date().toISOString()}).eq('id',id);if(updateError)return error(updateError.message);await db.from('scholars').update({status:'Active'}).eq('student_no',sub.scholarId);closeModal();toast('Submission verified and ready for evaluation.');loadData();}; $('#returnSub').onclick=async()=>{const {error:updateError}=await db.from('grade_submissions').update({submission_status:'Returned'}).eq('id',id);if(updateError)return error(updateError.message);await db.from('scholars').update({status:'With Deficiency'}).eq('student_no',sub.scholarId);closeModal();toast('Submission returned to scholar.');loadData();}; }
}
function evaluate(id) {
  if (!db) return toast('Database connection is unavailable. Refresh the page and try again.');
  const p=scholar(id), sub=data.submissions.find(x=>x.scholarId===id&&x.status==='Verified'), req=program(p.programId)?.minimum_gpa, pass=Number(sub.gpa)<=Number(req);
  openModal(`<h2>Evaluate compliance</h2><p>${p.name} · ${program(p.programId)?.name}</p><div class="form-grid"><label>Required GPA<input value="${Number(req).toFixed(2)} or better" disabled /></label><label>Verified GPA<input value="${Number(sub.gpa).toFixed(2)}" disabled /></label><label class="full">Evaluation result<input value="${pass?'Meets academic requirement':'Does not meet academic requirement'}" disabled /></label></div><div class="modal-footer"><button class="btn btn-outline" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveEvaluation">${pass?'Mark Compliant':'Record Deficiency'}</button></div>`);
  $('#saveEvaluation').onclick=async()=>{const status=pass?'Compliant':'With Deficiency';const {error:updateError}=await db.from('scholars').update({status}).eq('student_no',id);if(updateError)return error(updateError.message);closeModal();toast(`Status updated to ${status}.`);loadData();};
}
function profile(id){const s=scholar(id);openModal(`<h2>${s.name}</h2><p>${s.id}</p><div class="form-grid"><label>Course<input value="${s.course}" disabled /></label><label>Current status<input value="${s.status}" disabled /></label><label class="full">Scholarship program<input value="${program(s.programId)?.name||''}" disabled /></label></div><div class="modal-footer"><button class="btn btn-primary" id="cancelModal">Close</button></div>`);}

document.addEventListener('click', e=>{
  const nav=e.target.closest('[data-view]'); if(nav){document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));nav.classList.add('active');document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+nav.dataset.view).classList.add('active');$('#pageTitle').textContent=nav.dataset.view==='dashboard'?'Good morning, Staff':nav.textContent.trim().replace(/\d+$/,'');}
  const action=e.target.closest('[data-action]')?.dataset.action;if(action==='register')registerModal();if(action==='submission')submissionModal();if(action==='verify')$('[data-view="submissions"]').click();if(action==='report')$('[data-view="reports"]').click();if(e.target.dataset.go)$(`[data-view="${e.target.dataset.go}"]`).click();if(e.target.dataset.verify)verifyModal(e.target.dataset.verify);if(e.target.dataset.evaluate)evaluate(e.target.dataset.evaluate);if(e.target.dataset.profile)profile(e.target.dataset.profile);if(e.target.id==='closeModal'||e.target.id==='cancelModal')closeModal();if(e.target.id==='printReport')window.print();
});
$('#quickAction').onclick=registerModal;$('#scholarSearch').oninput=renderScholars;$('#statusFilter').onchange=renderScholars;$('#submissionFilter').onchange=renderSubmissions;$('#modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal();};

async function showApp(session) {
  $('#loginScreen').hidden = true;
  $('#appShell').hidden = false;
  $('#signedInEmail').textContent = session.user.email;
  try {
    await loadData();
  } catch (loadError) {
    console.error(loadError);
    toast('Dashboard opened, but the data could not be loaded. Refresh to try again.');
  }
}
window.showScholarTrackApp = showApp;
function showLogin() {
  $('#appShell').hidden = true;
  $('#loginScreen').hidden = false;
  $('#loginForm').reset();
  $('#loginError').textContent = '';
}
$('#loginForm').onsubmit = event => window.manualSignIn(event);
$('#logoutButton').onclick = () => { localStorage.removeItem('scholarTrackStaffSession'); showLogin(); toast('You have been signed out.'); };
const savedStaffEmail = localStorage.getItem('scholarTrackStaffSession');
if (savedStaffEmail) showApp({ user: { email: savedStaffEmail } }); else showLogin();

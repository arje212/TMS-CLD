import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Trash2, Search, Users, Upload,
  FileSpreadsheet, CheckCheck, Loader2,
  CreditCard, Wifi, WifiOff, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const RFID_SERVER = 'http://localhost:5050';

const DEPARTMENTS = ['Smartech', 'Osha', 'HR', 'EBM', 'Datatech'];

const DEPT_COLORS = {
  Smartech: 'bg-blue-50 text-blue-700',
  Osha:     'bg-red-50 text-red-700',
  HR:       'bg-purple-50 text-purple-700',
  EBM:      'bg-emerald-50 text-emerald-700',
  Datatech: 'bg-amber-50 text-amber-700',
};

const formatUID = (uid) => {
  if (!uid) return 'N/A';
  let clean = uid.replace(/\s+/g, '').toUpperCase();
  if (clean.length % 2 !== 0) clean = '0' + clean;
  return clean.match(/.{2}/g)?.join(' ') ?? clean;
};

// ── Student Registration Form ─────────────────────────────────────────────────
const StudentRegForm = ({ onSuccess, onCancel, schools, batches }) => {
  const pollRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('idle');
  const [scanSuccess, setScanSuccess]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [errors, setErrors]             = useState({});
  const [form, setForm] = useState({ unique_id: '', name: '', id_number: '', school: '', batch: '', department: '' });

  const filteredBatches = batches.filter(b => b.school === form.school);

  useEffect(() => () => { stopPolling(); fetch(`${RFID_SERVER}/stop`).catch(() => {}); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const handleStartScan = async () => {
    setScanSuccess(false);
    setForm(p => ({ ...p, unique_id: '' }));
    setServerStatus('starting');
    stopPolling();
    try {
      const res  = await fetch(`${RFID_SERVER}/start`);
      const data = await res.json();
      if (!data.success) { setServerStatus('error'); toast.error('Hindi ma-connect sa RFID reader.'); return; }
      setServerStatus('ready');
      toast.info('RFID reader ready — i-tap ang card.');
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${RFID_SERVER}/uid`);
          const d = await r.json();
          if (d.uid) {
            const uid = d.uid.replace(/\s+/g, '').toUpperCase();
            setForm(p => ({ ...p, unique_id: uid }));
            setScanSuccess(true);
            setServerStatus('idle');
            stopPolling();
            fetch(`${RFID_SERVER}/stop`).catch(() => {});
            toast.success(`Card detected: ${formatUID(uid)}`);
          }
        } catch { /* ignore */ }
      }, 500);
    } catch { setServerStatus('error'); toast.error('Hindi ma-reach ang RFID server.'); }
  };

  const handleChange = (field, value) => {
    const v = (field === 'name' || field === 'id_number') ? value.toUpperCase() : value;
    setForm(p => ({ ...p, [field]: v }));
    if (field === 'school') setForm(p => ({ ...p, school: value, batch: '' }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name       = 'Kailangan ang pangalan.';
    if (!form.school)        e.school     = 'Piliin ang school.';
    if (!form.batch)         e.batch      = 'Piliin ang batch.';
    if (!form.department)    e.department = 'Piliin ang department.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (form.unique_id) {
        const existing = await pb.collection('sh_students').getList(1, 1, {
          filter: `unique_id = "${form.unique_id}"`, $autoCancel: false,
        });
        if (existing.items.length > 0) { toast.error('RFID card na ito ay nakarehistro na.'); setSubmitting(false); return; }
      }
      await pb.collection('sh_students').create({
        unique_id:  form.unique_id.trim().toUpperCase(),
        name:       form.name.trim().toUpperCase(),
        id_number:  form.id_number.trim().toUpperCase(),
        school:     form.school,
        batch:      form.batch,
        department: form.department,
        status:     'active',
      }, { $autoCancel: false });
      toast.success('Student registered!');
      onSuccess();
    } catch { toast.error('Failed to register student.'); }
    finally { setSubmitting(false); }
  };

  const statusMap = {
    idle:     { color: 'text-slate-500',  bg: 'bg-slate-50',  label: 'I-click ang "Scan Card" para simulan.' },
    starting: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Nagko-connect sa RFID reader…' },
    ready:    { color: 'text-primary',    bg: 'bg-primary/5', label: 'Ready — i-tap ang card sa reader.' },
    error:    { color: 'text-red-500',    bg: 'bg-red-50',    label: 'Error. Siguraduhing naka-run ang rfid_server.py.' },
  };
  const s = statusMap[serverStatus];

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${s.bg}`}>
        {serverStatus === 'starting' ? <Loader2 className={`h-4 w-4 animate-spin ${s.color}`} /> :
         serverStatus === 'ready'    ? <Wifi    className={`h-4 w-4 ${s.color}`} /> :
                                       <WifiOff className={`h-4 w-4 ${s.color}`} />}
        <span className={`text-xs font-medium flex-1 ${s.color}`}>{s.label}</span>
      </div>

      <div className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-all ${
        scanSuccess ? 'border-emerald-400 bg-emerald-50' : serverStatus === 'ready' ? 'border-primary/50 bg-primary/5' : 'border-slate-200 bg-slate-50'
      }`}>
        {scanSuccess ? <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" /> :
         serverStatus === 'ready' ? <Loader2 className="h-6 w-6 text-primary shrink-0 animate-spin" /> :
                                    <CreditCard className="h-6 w-6 text-slate-300 shrink-0" />}
        <div className="flex-1 min-w-0">
          {scanSuccess
            ? <><p className="text-xs font-semibold text-emerald-700">Card detected!</p><p className="text-sm font-mono text-emerald-800">{formatUID(form.unique_id)}</p></>
            : <p className="text-sm text-slate-400">{serverStatus === 'ready' ? 'Naghihintay sa card tap…' : 'Walang card na na-detect'}</p>}
        </div>
        <Button variant={scanSuccess ? 'outline' : 'default'} size="sm" onClick={handleStartScan}
          disabled={serverStatus === 'starting' || serverStatus === 'ready'}>
          {serverStatus === 'starting' || serverStatus === 'ready'
            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Scanning…</>
            : scanSuccess ? 'Re-scan' : <><CreditCard className="h-3 w-3 mr-1.5" /> Scan Card</>}
        </Button>
      </div>
      <Input placeholder="Manual RFID input (optional)" value={form.unique_id}
        onChange={e => { setForm(p => ({ ...p, unique_id: e.target.value.toUpperCase() })); setScanSuccess(!!e.target.value); }}
        className="font-mono text-sm" />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full Name <span className="text-red-500">*</span></Label>
          <Input placeholder="JUAN DELA CRUZ" value={form.name} onChange={e => handleChange('name', e.target.value)} className={`uppercase ${errors.name ? 'border-red-400' : ''}`} />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>ID Number</Label>
          <Input placeholder="e.g. 2024-001" value={form.id_number} onChange={e => handleChange('id_number', e.target.value)} className="font-mono uppercase" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Department <span className="text-red-500">*</span></Label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map(dept => (
            <button key={dept} type="button"
              onClick={() => { setForm(p => ({ ...p, department: dept })); setErrors(p => ({ ...p, department: null })); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                form.department === dept
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
              }`}>
              {dept}
            </button>
          ))}
        </div>
        {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>School <span className="text-red-500">*</span></Label>
          <select value={form.school} onChange={e => { setForm(p => ({ ...p, school: e.target.value, batch: '' })); }}
            className={`w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm ${errors.school ? 'border-red-400' : 'border-input'}`}>
            <option value="">— Piliin —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.school && <p className="text-xs text-red-500">{errors.school}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Batch <span className="text-red-500">*</span></Label>
          <select value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))}
            disabled={!form.school}
            className={`w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm ${errors.batch ? 'border-red-400' : 'border-input'} disabled:opacity-50`}>
            <option value="">— Piliin —</option>
            {filteredBatches.map(b => <option key={b.id} value={b.id}>Batch {b.batch_number} ({b.date_start})</option>)}
          </select>
          {errors.batch && <p className="text-xs text-red-500">{errors.batch}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Register Student'}
        </Button>
      </div>
    </div>
  );
};

// ── Bulk Upload ───────────────────────────────────────────────────────────────
const BulkStudentUpload = ({ onSuccess, onCancel, schools, batches, existingStudents }) => {
  const fileRef = useRef(null);
  const [parsed, setParsed]         = useState([]);
  const [importing, setImporting]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [done, setDone]             = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedBatch, setSelectedBatch]   = useState('');

  const filteredBatches = batches.filter(b => b.school === selectedSchool);

  const existingByID = useMemo(() => {
    const map = new Map();
    existingStudents.forEach(s => { if (s.id_number) map.set(s.id_number.trim().toUpperCase(), s); });
    return map;
  }, [existingStudents]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) { toast.error('File is empty.'); return; }

        const headers = Object.keys(rows[0]);
        const norm    = s => s.toString().trim().toLowerCase().replace(/[\s_\-]/g, '');
        const findCol = (candidates) => headers.find(h => candidates.includes(norm(h)));

        const nameCol  = findCol(['name','fullname','empname','studentname']);
        const idCol    = findCol(['idnumber','id','idno','studentid']);
        const rfidCol  = findCol(['uniqueid','rfid','uid','cardid']);
        const deptCol  = findCol(['department','dept','section']);

        const records = rows.map(row => {
          const name       = nameCol ? row[nameCol].toString().trim().toUpperCase() : '';
          const id_number  = idCol   ? row[idCol].toString().trim().toUpperCase()   : '';
          const unique_id  = rfidCol ? row[rfidCol].toString().trim().replace(/[\s\-:]/g, '').toUpperCase() : '';
          const department = deptCol ? row[deptCol].toString().trim() : '';

          // Normalize department
          const deptMatch = DEPARTMENTS.find(d => d.toLowerCase() === department.toLowerCase()) || '';

          if (!name) return null;
          const isDup = id_number && existingByID.has(id_number);
          return {
            name, id_number, unique_id,
            department: deptMatch,
            status: isDup ? 'duplicate' : 'pending',
            skipReason: isDup ? 'ID na nasa records' : '',
          };
        }).filter(Boolean);

        setParsed(records);
        toast.info(`${records.length} rows detected.`);
      } catch { toast.error('Hindi ma-parse ang file.'); }
    };
    reader.readAsBinaryString(file);
  };

  const pendingCount = parsed.filter(r => r.status === 'pending').length;
  const dupCount     = parsed.filter(r => r.status === 'duplicate').length;
  const successCount = parsed.filter(r => r.status === 'success').length;

  const handleImport = async () => {
    if (!selectedSchool || !selectedBatch) { toast.error('Piliin muna ang school at batch.'); return; }
    const toImport = parsed.filter(r => r.status === 'pending');
    if (!toImport.length) return;
    setImporting(true);
    const updated = [...parsed];
    let completed = 0;
    for (const record of toImport) {
      const idx = updated.findIndex(r => r === record);
      try {
        await pb.collection('sh_students').create({
          name:       record.name,
          id_number:  record.id_number,
          unique_id:  record.unique_id,
          department: record.department,
          school:     selectedSchool,
          batch:      selectedBatch,
          status:     'active',
        }, { $autoCancel: false });
        updated[idx] = { ...record, status: 'success' };
      } catch { updated[idx] = { ...record, status: 'error' }; }
      completed++;
      setProgress(Math.round((completed / toImport.length) * 100));
      setParsed([...updated]);
    }
    setImporting(false);
    setDone(true);
    toast.success(`Done! ${updated.filter(r => r.status === 'success').length} students imported.`);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>School <span className="text-red-500">*</span></Label>
          <select value={selectedSchool} onChange={e => { setSelectedSchool(e.target.value); setSelectedBatch(''); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
            <option value="">— Piliin —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Batch <span className="text-red-500">*</span></Label>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            disabled={!selectedSchool}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm disabled:opacity-50">
            <option value="">— Piliin —</option>
            {filteredBatches.map(b => <option key={b.id} value={b.id}>Batch {b.batch_number} ({b.date_start})</option>)}
          </select>
        </div>
      </div>

      <div onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
        <FileSpreadsheet className="h-8 w-8 text-primary/50" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">I-click para mag-upload ng Excel/CSV</p>
          <p className="text-xs text-slate-400 mt-1">Columns: <span className="font-mono">NAME / ID_NUMBER / DEPARTMENT / UNIQUE_ID (optional)</span></p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {parsed.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-blue-50 text-blue-700 border-none">{pendingCount} to import</Badge>
            {dupCount     > 0 && <Badge className="bg-amber-50 text-amber-700 border-none">{dupCount} duplicate</Badge>}
            {successCount > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-none">{successCount} imported</Badge>}
          </div>
          {importing && <Progress value={progress} className="h-2" />}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs py-2">Name</TableHead>
                  <TableHead className="text-xs py-2">ID</TableHead>
                  <TableHead className="text-xs py-2">Dept</TableHead>
                  <TableHead className="text-xs py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs py-1.5">{r.name}</TableCell>
                    <TableCell className="text-xs font-mono py-1.5">{r.id_number || '—'}</TableCell>
                    <TableCell className="text-xs py-1.5">
                      {r.department
                        ? <Badge className={`text-xs border-none ${DEPT_COLORS[r.department] ?? 'bg-slate-100 text-slate-600'}`}>{r.department}</Badge>
                        : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge className={`text-xs border-none ${
                        r.status === 'success'   ? 'bg-emerald-50 text-emerald-700' :
                        r.status === 'duplicate' ? 'bg-amber-50 text-amber-700'    :
                        r.status === 'error'     ? 'bg-red-50 text-red-700'        :
                                                   'bg-blue-50 text-blue-700'
                      }`}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={importing}>Cancel</Button>
        <Button onClick={handleImport} disabled={importing || pendingCount === 0 || done}>
          {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</> :
           done      ? <><CheckCheck className="h-4 w-4 mr-2" /> Done</> :
                       <><Upload className="h-4 w-4 mr-2" /> Import {pendingCount} Student{pendingCount !== 1 ? 's' : ''}</>}
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SHStudentsPage = () => {
  const [students, setStudents]         = useState([]);
  const [schools, setSchools]           = useState([]);
  const [batches, setBatches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [bulkOpen, setBulkOpen]         = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterSchool, setFilterSchool] = useState('All');
  const [filterBatch, setFilterBatch]   = useState('All');
  const [filterDept, setFilterDept]     = useState('All');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [studentData, schoolData, batchData] = await Promise.all([
        pb.collection('sh_students').getFullList({ sort: 'name', expand: 'school,batch', $autoCancel: false }),
        pb.collection('sh_schools').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('sh_batches').getFullList({ sort: '-date_start', expand: 'school', $autoCancel: false }),
      ]);
      setStudents(studentData);
      setSchools(schoolData);
      setBatches(batchData);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await pb.collection('sh_students').delete(id, { $autoCancel: false });
      toast.success('Student deleted.');
      fetchData();
    } catch { toast.error('Failed to delete.'); }
  };

  const filteredBatches = filterSchool !== 'All' ? batches.filter(b => b.school === filterSchool) : batches;

  const filtered = students
    .filter(s => filterSchool === 'All' || s.school === filterSchool)
    .filter(s => filterBatch  === 'All' || s.batch  === filterBatch)
    .filter(s => filterDept   === 'All' || s.department === filterDept)
    .filter(s => !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <>
      <Helmet><title>Students - Senior High</title></Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
            <p className="text-muted-foreground mt-1">Masterlist ng lahat ng Senior High students.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload className="h-4 w-4 mr-2" /> Bulk Upload</Button>
            <Button onClick={() => setRegisterOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name or ID…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
          </div>
          <select value={filterSchool}
            onChange={e => { setFilterSchool(e.target.value); setFilterBatch('All'); }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
            <option value="All">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
            disabled={filterSchool === 'All'}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm disabled:opacity-50">
            <option value="All">All Batches</option>
            {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.expand?.school?.name} — Batch {b.batch_number}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
            <option value="All">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Walang students na nahanap.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">ID Number</TableHead>
                    <TableHead className="font-semibold text-slate-600">Department</TableHead>
                    <TableHead className="font-semibold text-slate-600">RFID</TableHead>
                    <TableHead className="font-semibold text-slate-600">School</TableHead>
                    <TableHead className="font-semibold text-slate-600">Batch</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student, i) => (
                    <TableRow key={student.id} className="hover:bg-slate-50/50 border-b-slate-100">
                      <TableCell className="text-slate-500 text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{student.id_number || '—'}</TableCell>
                      <TableCell>
                        {student.department
                          ? <Badge className={`border-none text-xs ${DEPT_COLORS[student.department] ?? 'bg-slate-100 text-slate-600'}`}>{student.department}</Badge>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-500">
                        {student.unique_id
                          ? <span className="text-emerald-600 text-xs font-semibold">✓ Registered</span>
                          : <span className="text-slate-300 text-xs">No RFID</span>}
                      </TableCell>
                      <TableCell><Badge className="bg-orange-50 text-orange-700 border-none text-xs">{student.expand?.school?.name ?? '—'}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">Batch {student.expand?.batch?.batch_number ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={registerOpen} onOpenChange={o => { if (!o) fetch(`${RFID_SERVER}/stop`).catch(() => {}); setRegisterOpen(o); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Register Student</DialogTitle></DialogHeader>
          <StudentRegForm schools={schools} batches={batches}
            onSuccess={() => { setRegisterOpen(false); fetchData(); }}
            onCancel={() => { fetch(`${RFID_SERVER}/stop`).catch(() => {}); setRegisterOpen(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Bulk Upload Students</DialogTitle></DialogHeader>
          <BulkStudentUpload schools={schools} batches={batches} existingStudents={students}
            onSuccess={() => { setBulkOpen(false); fetchData(); }}
            onCancel={() => setBulkOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SHStudentsPage;
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, MapPin, Calendar, CheckCircle2, XCircle, BarChart3, Plus, Printer, Search, Users, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendance } from '@/hooks/useAttendance.js';
import AttendanceScanner from '@/components/AttendanceScanner.jsx';
import AttendanceList from '@/components/AttendanceList.jsx';
import BulkAttendanceActions from '@/components/BulkAttendanceActions.jsx';

// ─── PocketBase config ────────────────────────────────────────────────────────
const PB_URL        = pb.baseUrl.replace(/\/$/, '');
const PB_COLLECTION = 'wip2janw3jd5x1l';

// ─── Convert any image URL → base64 PNG via Canvas ───────────────────────────
const imageUrlToBase64PNG = (url) =>
  new Promise(async (resolve) => {
    try {
      const response = await fetch(url);
      if (!response.ok) { resolve(''); return; }
      const blob   = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const img    = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth  || 100;
          canvas.height = img.naturalHeight || 50;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          URL.revokeObjectURL(blobUrl);
          resolve(base64);
        } catch { URL.revokeObjectURL(blobUrl); resolve(''); }
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(''); };
      img.src = blobUrl;
    } catch { resolve(''); }
  });

// ─── Print Attendance Sheet ───────────────────────────────────────────────────
const printAttendanceSheet = async ({ training, assignments, attendanceRecords }) => {
  const toastId = toast.loading('Preparing attendance sheet…');

  const attendeePromises = assignments.map(async (a, idx) => {
    const trainee = a.expand?.trainee;
    const record  = attendanceRecords.find(r => r.trainee === a.trainee);
    let signatureBase64 = '';
    if (trainee?.signature && trainee?.id && (record?.status === 'present' || record?.status === 'late')) {
      const fileUrl = `${PB_URL}/api/files/${PB_COLLECTION}/${trainee.id}/${trainee.signature}`;
      signatureBase64 = await imageUrlToBase64PNG(fileUrl);
    }
    return {
      no: idx + 1,
      employeeNo: trainee?.id_number || '',
      name:       trainee?.name      || '',
      company:    'TORRES TECH',
      department: trainee?.batch     || '',
      status:     record?.status     || '',
      signatureBase64,
    };
  });

  const attendees  = await Promise.all(attendeePromises);
  toast.dismiss(toastId);

  const totalRows = Math.max(25, attendees.length);
  const rows = Array.from({ length: totalRows }, (_, i) =>
    attendees[i] || { no: i + 1, employeeNo: '', name: '', company: '', department: '', status: '', signatureBase64: '' }
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Attendance Sheet - ${training?.title || 'Training'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Special Elite', 'Courier New', Courier, monospace; background: #e5e7eb; color: #1a1a1a; }
    .page-wrapper { display: flex; flex-direction: column; align-items: center; padding: 24px 0 40px 0; }
    .print-btn { margin-bottom: 16px; padding: 8px 28px; background: #1e293b; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: sans-serif; display: flex; align-items: center; gap: 6px; }
    .print-btn:hover { background: #334155; }
    .a4-paper { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.3); padding: 12mm 14mm 10mm 14mm; }
    .header { text-align: center; padding-bottom: 8px; }
    .header img.logo { height: 58px; object-fit: contain; margin-bottom: 4px; }
    .header h2 { font-size: 13px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; }
    .form-section { border: 1px solid black; padding: 8px 12px 4px 12px; font-size: 11px; }
    .form-row { display: flex; align-items: flex-end; margin-bottom: 3px; }
    .form-label { font-weight: bold; font-size: 11px; letter-spacing: 0.04em; white-space: nowrap; width: 130px; flex-shrink: 0; }
    .form-value { flex: 1; border-bottom: 1px solid black; font-size: 11px; min-height: 16px; padding: 0 4px; }
    .checkbox-group { display: flex; align-items: center; gap: 4px; margin-left: 24px; width: 190px; font-size: 11px; }
    .checkbox-box { width: 11px; height: 11px; border: 1px solid black; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
    .attendees-label { font-weight: bold; font-size: 11px; letter-spacing: 0.04em; text-decoration: underline; margin-top: 8px; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; font-family: inherit; table-layout: fixed; }
    thead tr { background-color: #808080; color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { border: 1px solid black; padding: 3px 4px; text-align: center; font-weight: bold; overflow: hidden; }
    td { border: 1px solid black; padding: 2px 4px; height: 26px; vertical-align: middle; overflow: hidden; }
    col.col-no   { width: 26px; }
    col.col-emp  { width: 88px; }
    col.col-name { width: auto; }
    col.col-co   { width: 80px; }
    col.col-dept { width: 88px; }
    col.col-sig  { width: 128px; }
    .td-no   { text-align: center; font-weight: bold; }
    .td-name { white-space: nowrap; overflow: hidden; text-overflow: clip; }
    .sig-cell { text-align: center; padding: 1px 2px; }
    .sig-cell img { max-height: 22px; max-width: 120px; object-fit: contain; display: block; margin: 0 auto; }
    .remarks-section { border-top: 1px solid black; margin-top: 4px; padding-top: 4px; }
    .remarks-row { display: flex; align-items: center; gap: 4px; font-size: 11px; }
    .remarks-label { font-weight: bold; white-space: nowrap; }
    .remarks-line { flex: 1; border-bottom: 1px solid black; min-height: 16px; }
    .footer { display: flex; justify-content: space-between; margin-top: 12px; font-size: 9px; color: #555; border-top: 1px solid #aaa; padding-top: 4px; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .page-wrapper { padding: 0; }
      .a4-paper { box-shadow: none; width: 100%; padding: 12mm 14mm 10mm 14mm; }
      thead tr { background-color: #808080 !important; color: white !important; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="a4-paper">
    <div class="header">
      <img class="logo" src="https://media.base44.com/images/public/69e973e55260b271bfa26df9/3ca6be5e9_image.png" alt="Torres Logo" />
      <h2>ATTENDANCE SHEET</h2>
    </div>
    <div class="form-section">
      <div class="form-row">
        <div style="display:flex;align-items:flex-end;flex:1">
          <span class="form-label">DATE</span>
          <span class="form-value">${training?.date || ''}</span>
        </div>
        <div class="checkbox-group"><span class="checkbox-box"></span><span>Meeting</span></div>
      </div>
      <div class="form-row">
        <div style="display:flex;align-items:flex-end;flex:1">
          <span class="form-label">TIME STARTED</span>
          <span class="form-value">${training?.time || ''}</span>
        </div>
        <div class="checkbox-group"><span class="checkbox-box">✓</span><span>Training / Seminar</span></div>
      </div>
      <div class="form-row">
        <div style="display:flex;align-items:flex-end;flex:1">
          <span class="form-label">TIME ENDED</span>
          <span class="form-value"></span>
        </div>
        <div class="checkbox-group"><span class="checkbox-box"></span><span>Orientation / Workshop</span></div>
      </div>
      <div class="form-row"><span class="form-label">SUBJECT</span><span class="form-value">${training?.title || ''}</span></div>
      <div class="form-row"><span class="form-label">VENUE</span><span class="form-value">${training?.location || ''}</span></div>
      <div class="form-row"><span class="form-label">CHAMPION/LECTURER</span><span class="form-value"></span></div>
      <div class="attendees-label">ATTENDEES</div>
    </div>
    <table>
      <colgroup>
        <col class="col-no" /><col class="col-emp" /><col class="col-name" />
        <col class="col-co" /><col class="col-dept" /><col class="col-sig" />
      </colgroup>
      <thead>
        <tr>
          <th>NO.</th><th>EMPLOYEE NO.</th><th>NAME</th>
          <th>COMPANY</th><th>DEPARTMENT</th><th>SIGNATURE OF ATTENDEE</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td class="td-no">${row.no}</td>
            <td>${row.employeeNo}</td>
            <td class="td-name">${row.name}</td>
            <td>${row.company}</td>
            <td>${row.department}</td>
            <td class="sig-cell">${row.signatureBase64 ? `<img src="${row.signatureBase64}" alt="signature" />` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="remarks-section">
      <div class="remarks-row"><span class="remarks-label">REMARKS:</span><span class="remarks-line"></span></div>
    </div>
    <div class="footer">
      <span>Established February 03, 2015</span>
      <span>QMS-F010</span>
    </div>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (win) { win.document.write(html); win.document.close(); }
};

// ─── Assign Trainees Dialog Content ──────────────────────────────────────────
// UPDATED: now accepts ytEmployees + companyFilter alongside existing batch filter
const AssignTraineesDialogContent = ({
  training, allTrainees, ytEmployees, assignments,
  selectedTrainees, setSelectedTrainees,
  assignLoading, onAssign, onCancel,
}) => {
  const [search, setSearch]               = useState('');
  const [batchFilter, setBatchFilter]     = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all'); // ← NEW

  // Build combined people list: Torres Tech trainees + Yazaki Torres employees
  const allPeople = useMemo(() => [
    ...allTrainees.map(t => ({
      ...t,
      _company:   'Torres Tech',
      _sourceKey: `tt::${t.id}`,
    })),
    ...ytEmployees.map(e => ({
      ...e,
      _company:   'Yazaki Torres',
      _sourceKey: `yt::${e.id}`,
      // normalise field names so the rest of the code is uniform
      email:      e.email      || '',
      batch:      e.batch      || e.department || '',
      id_number:  e.id_number  || '',
    })),
  ], [allTrainees, ytEmployees]);

  // IDs already assigned (uses original id field)
  const assignedIds = useMemo(() => new Set(assignments.map(a => a.trainee)), [assignments]);

  // Batch options from Torres Tech trainees only (YT uses department)
  const batches = useMemo(() => {
    const batchSet = new Set(allTrainees.map(t => t.batch).filter(Boolean));
    return ['all', ...Array.from(batchSet).sort()];
  }, [allTrainees]);

  const filtered = useMemo(() => allPeople.filter(p => {
    const matchCompany = companyFilter === 'all' || p._company === companyFilter;
    const matchBatch   = batchFilter   === 'all' || p.batch    === batchFilter;
    const matchSearch  =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.id_number?.toLowerCase().includes(search.toLowerCase());
    return matchCompany && matchBatch && matchSearch;
  }), [allPeople, search, batchFilter, companyFilter]);

  const unassignedFiltered      = filtered.filter(p => !assignedIds.has(p.id));
  const alreadyAssignedFiltered = filtered.filter(p =>  assignedIds.has(p.id));

  const allFilteredUnassignedSelected =
    unassignedFiltered.length > 0 &&
    unassignedFiltered.every(p => selectedTrainees.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredUnassignedSelected) {
      setSelectedTrainees(selectedTrainees.filter(id => !unassignedFiltered.find(p => p.id === id)));
    } else {
      const toAdd = unassignedFiltered.map(p => p.id).filter(id => !selectedTrainees.includes(id));
      setSelectedTrainees([...selectedTrainees, ...toAdd]);
    }
  };

  const companyBadge = (company) =>
    company === 'Torres Tech'
      ? <Badge className="bg-blue-50 text-blue-700 border-none text-[10px] shrink-0">Torres Tech</Badge>
      : <Badge className="bg-violet-50 text-violet-700 border-none text-[10px] shrink-0">Yazaki Torres</Badge>;

  return (
    <div className="space-y-4">
      {/* Search + Filters row */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* ── NEW: Company filter ── */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="pl-9 pr-4 h-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          >
            <option value="all">All Companies</option>
            <option value="Torres Tech">Torres Tech</option>
            <option value="Yazaki Torres">Yazaki Torres</option>
          </select>
        </div>

        {/* Existing batch filter — hidden when Yazaki is selected (they use department) */}
        {companyFilter !== 'Yazaki Torres' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
            >
              {batches.map(b => (
                <option key={b} value={b}>{b === 'all' ? 'All Departments' : b}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {unassignedFiltered.length} available · {alreadyAssignedFiltered.length} already assigned
        </span>
        {unassignedFiltered.length > 0 && (
          <button onClick={toggleSelectAll} className="text-primary hover:underline font-medium">
            {allFilteredUnassignedSelected ? 'Deselect all' : `Select all ${unassignedFiltered.length}`}
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No trainees match your search</p>
        ) : (
          <>
            {/* Unassigned */}
            {unassignedFiltered.map(person => (
              <div
                key={person._sourceKey}
                onClick={() => {
                  if (selectedTrainees.includes(person.id))
                    setSelectedTrainees(selectedTrainees.filter(id => id !== person.id));
                  else setSelectedTrainees([...selectedTrainees, person.id]);
                }}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Checkbox
                  id={person._sourceKey}
                  checked={selectedTrainees.includes(person.id)}
                  onCheckedChange={checked => {
                    if (checked) setSelectedTrainees([...selectedTrainees, person.id]);
                    else setSelectedTrainees(selectedTrainees.filter(tid => tid !== person.id));
                  }}
                  onClick={e => e.stopPropagation()}
                />
                <label htmlFor={person._sourceKey} className="flex-1 cursor-pointer select-none min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">{person.name}</div>
                  <div className="text-xs text-slate-400 flex gap-2 flex-wrap">
                    {person.email     && <span>{person.email}</span>}
                    {person.batch     && <span className="text-primary font-medium">· {person.batch}</span>}
                    {person.id_number && <span>· #{person.id_number}</span>}
                  </div>
                </label>
                {/* ── NEW: Company badge ── */}
                {companyFilter === 'all' && companyBadge(person._company)}
              </div>
            ))}

            {/* Already assigned section */}
            {alreadyAssignedFiltered.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Already Assigned</p>
                </div>
                {alreadyAssignedFiltered.map(person => (
                  <div
                    key={person._sourceKey}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 opacity-60 cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-700 truncate">{person.name}</div>
                      <div className="text-xs text-slate-400 flex gap-2">
                        {person.email && <span>{person.email}</span>}
                        {person.batch && <span className="text-primary font-medium">· {person.batch}</span>}
                      </div>
                    </div>
                    {companyFilter === 'all' && companyBadge(person._company)}
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">Assigned</Badge>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 justify-between items-center pt-4 border-t">
        <span className="text-sm text-slate-500">
          {selectedTrainees.length > 0 ? `${selectedTrainees.length} selected` : 'No trainees selected'}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onAssign} disabled={assignLoading || selectedTrainees.length === 0}>
            {assignLoading ? 'Assigning...' : `Assign ${selectedTrainees.length} Trainee(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TrainingDetailPage = () => {
  const { id } = useParams();
  const [training, setTraining]                   = useState(null);
  const [assignments, setAssignments]             = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [allTrainees, setAllTrainees]             = useState([]);
  const [ytEmployees, setYtEmployees]             = useState([]); // ← NEW
  const [selectedTrainees, setSelectedTrainees]   = useState([]);
  const [assignDialogOpen, setAssignDialogOpen]   = useState(false);
  const [assignLoading, setAssignLoading]         = useState(false);

  const {
    fetchAttendanceForTraining,
    fetchAssignmentsForTraining,
    markPresent, markAbsent, recordCheckout,
    getAttendanceStats,
  } = useAttendance();

  const loadData = async () => {
    try {
      const tData = await pb.collection('trainings').getOne(id, { $autoCancel: false });
      setTraining(tData);
      const [assigns, records] = await Promise.all([
        fetchAssignmentsForTraining(id),
        fetchAttendanceForTraining(id),
      ]);
      setAssignments(assigns);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading training data:', error);
      toast.error('Failed to load training details');
    } finally {
      setLoading(false);
    }
  };

  // ── UPDATED: fetch both Torres Tech trainees AND Yazaki Torres employees ──
  const fetchAllTrainees = async () => {
    try {
      const [ttData, ytData] = await Promise.all([
        pb.collection('trainees').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('yt_employees').getFullList({ sort: 'name', $autoCancel: false }).catch(() => []),
      ]);
      setAllTrainees(ttData);
      setYtEmployees(ytData);
      setSelectedTrainees([]);
    } catch {
      toast.error('Failed to load trainees');
    }
  };

  const handleAssignTrainees = async () => {
    if (selectedTrainees.length === 0) { toast.error('Please select at least one trainee'); return; }
    setAssignLoading(true);
    try {
      for (const traineeId of selectedTrainees) {
        await pb.collection('training_assignments').create({
          training:      id,
          trainee:       traineeId,
          assigned_date: new Date().toISOString().split('T')[0],
          $autoCancel:   false,
        });
      }
      toast.success(`Assigned ${selectedTrainees.length} trainee(s) successfully`);
      setAssignDialogOpen(false);
      setSelectedTrainees([]);
      loadData();
    } catch {
      toast.error('Failed to assign trainees');
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    pb.collection('attendance').subscribe('*', (e) => { if (e.record.training === id) loadData(); });
    return () => { pb.collection('attendance').unsubscribe('*'); };
  }, [id]);

  const handleMarkAllPresent = async () => {
    const pending = assignments.filter(a => !attendanceRecords.find(r => r.trainee === a.trainee));
    for (const a of pending) await markPresent(id, a.trainee);
    loadData();
  };

  const handleMarkAllAbsent = async () => {
    const pending = assignments.filter(a => !attendanceRecords.find(r => r.trainee === a.trainee));
    for (const a of pending) await markAbsent(id, a.trainee);
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" /><Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats(assignments, attendanceRecords);

  return (
    <>
      <Helmet><title>{`${training?.title || 'Training'} - TMS Pro`}</title></Helmet>

      <div className="space-y-6">
        {/* Header — unchanged */}
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <Link to="/trainings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{training?.title}</h1>
              <Badge variant={training?.status === 'completed' ? 'outline' : 'default'} className="uppercase text-[10px] tracking-wider">
                {training?.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {training?.date}</span>
              <span className="flex items-center gap-1.5"><Clock    className="h-3.5 w-3.5" /> {training?.time}</span>
              <span className="flex items-center gap-1.5"><MapPin   className="h-3.5 w-3.5" /> {training?.location}</span>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            className="gap-2 border-slate-200 hover:bg-slate-50 shrink-0"
            onClick={() => printAttendanceSheet({ training, assignments, attendanceRecords })}
          >
            <Printer className="h-4 w-4" /> Print Attendance Sheet
          </Button>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto rounded-lg shadow-sm mb-6">
            <TabsTrigger value="overview"   className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Attendance Roster</TabsTrigger>
            <TabsTrigger value="analytics"  className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Analytics</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="shadow-sm border-none ring-1 ring-slate-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Training Details</CardTitle>
                  {/* ── Assign Trainees button — now fetches both TT + YT ── */}
                  <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={fetchAllTrainees}>
                        <Plus className="h-4 w-4 mr-2" />Assign Trainees
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Assign Trainees to {training?.title}</DialogTitle>
                      </DialogHeader>
                      {allTrainees.length === 0 && ytEmployees.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No trainees found in masterlist</p>
                      ) : (
                        <AssignTraineesDialogContent
                          training={training}
                          allTrainees={allTrainees}
                          ytEmployees={ytEmployees}        // ← NEW prop
                          assignments={assignments}
                          selectedTrainees={selectedTrainees}
                          setSelectedTrainees={setSelectedTrainees}
                          assignLoading={assignLoading}
                          onAssign={handleAssignTrainees}
                          onCancel={() => setAssignDialogOpen(false)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">{training?.description || 'No description provided.'}</p>
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Total Assigned</span>
                      <span className="font-medium text-slate-900">{stats.totalAssigned} Trainees</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Status</span>
                      <span className="font-medium text-slate-900 capitalize">{training?.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Summary card — unchanged */}
              <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-slate-100">
                <CardHeader><CardTitle className="text-lg">Attendance Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-48 h-48 rounded-full border-8 border-slate-50 flex flex-col items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                          strokeDasharray={`${stats.percentage * 2.89} 289`}
                          className="transition-all duration-1000 ease-out" />
                      </svg>
                      <span className="text-4xl font-bold text-slate-900">{stats.percentage}%</span>
                      <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">Present</span>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-900">Present</p>
                            <p className="text-xs text-emerald-700">Checked in successfully</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-emerald-700">{stats.presentCount}</span>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-rose-900">Absent</p>
                            <p className="text-xs text-rose-700">Did not attend</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-rose-700">{stats.absentCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Attendance Roster — unchanged ── */}
          <TabsContent value="attendance" className="mt-0 space-y-6">
            <Card className="border-primary/20 shadow-md bg-blue-50/30">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Quick Check-In</h3>
                  <p className="text-sm text-slate-600">Scan ID card or enter trainee ID manually</p>
                </div>
                <AttendanceScanner trainingId={id} onScanSuccess={loadData} />
              </CardContent>
            </Card>
            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <CardTitle className="text-lg">Master Roster</CardTitle>
                <BulkAttendanceActions
                  assignments={assignments} attendanceRecords={attendanceRecords}
                  onMarkAllPresent={handleMarkAllPresent} onMarkAllAbsent={handleMarkAllAbsent}
                />
              </CardHeader>
              <CardContent className="pt-6">
                <AttendanceList
                  assignments={assignments} attendanceRecords={attendanceRecords}
                  onMarkPresent={async (traineeId) => { await markPresent(id, traineeId); loadData(); }}
                  onMarkAbsent={async (traineeId)  => { await markAbsent(id, traineeId);  loadData(); }}
                  onCheckout={async (recordId)     => { await recordCheckout(recordId);   loadData(); }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Analytics — unchanged ── */}
          <TabsContent value="analytics" className="mt-0">
            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Detailed analytics for this specific training session will appear here once the session is completed and scores are recorded.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default TrainingDetailPage;
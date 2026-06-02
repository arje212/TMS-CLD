import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, Hash, Edit, Plus, CheckCircle2, XCircle, Clock, AlertCircle, Tag, BookOpen, Users, MessageSquare, Printer } from 'lucide-react';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatHHMM = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
};

// ─── Print Helpers ────────────────────────────────────────────────────────────

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', 'Georgia', serif;
    background: #e5e7eb;
    display: flex;
    justify-content: center;
    padding: 32px 16px;
  }
  .page {
    background: #fdfdfd;
    width: 100%;
    max-width: 850px;
    border: 2.5px solid #000;
    min-height: 1100px;
    position: relative;
  }
  /* ── Header ── */
  .doc-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px 24px 12px;
  }
  .doc-header img { width: 50px; height: 50px; object-fit: contain; }
  .doc-header h1 {
    color: #1a4a8a;
    font-size: 22px;
    font-weight: bold;
    font-family: 'Times New Roman', 'Georgia', serif;
    letter-spacing: 1.5px;
    text-align: center;
  }
  /* ── Info fields ── */
  .info-block { padding: 12px 32px 16px; }
  .info-field { display: flex; align-items: baseline; margin-bottom: 2px; }
  .info-field .field-label {
    font-weight: bold;
    font-family: Arial, Helvetica, sans-serif;
    white-space: nowrap;
  }
  .info-field .field-label.large { font-size: 18px; min-width: 80px; }
  .info-field .field-label.small { font-size: 14px; min-width: 130px; }
  .info-field .field-value {
    flex: 1;
    margin-left: 4px;
    border-bottom: 1px solid #000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    padding-bottom: 1px;
    min-height: 20px;
  }
  /* ── Section title (for group/training prints) ── */
  .section-title {
    font-size: 12px;
    font-weight: bold;
    font-family: Arial, Helvetica, sans-serif;
    margin: 20px 0 0;
    padding: 6px 8px;
    background: #f0f4ff;
    border-left: 4px solid #1a4a8a;
    color: #1a4a8a;
  }
  /* ── Table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  thead tr th {
    border: 1.5px solid #000;
    border-top: 2px solid #000;
    padding: 8px 4px;
    font-size: 11.5px;
    font-weight: bold;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.3;
    vertical-align: middle;
    background: #f7f7f7;
  }
  tbody tr td {
    border: 1px solid #000;
    border-left: 1.5px solid #000;
    border-right: 1.5px solid #000;
    height: 28px;
    padding: 2px 5px;
    font-size: 10.5px;
    font-family: Arial, Helvetica, sans-serif;
    vertical-align: middle;
  }
  /* ── Footer ── */
  .doc-footer {
    padding: 12px 32px;
    font-size: 9px;
    color: #94a3b8;
    text-align: right;
    font-family: Arial, Helvetica, sans-serif;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .page { border: 2.5px solid #000; min-height: unset; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

const fmtDate = (val) => {
  if (!val) return '';
  return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Columns match the Torres Technology Center format
// Training Code | Training Title | Actual Start Date | Actual End Date | Batch Number | Remarks
const COLUMNS = [
  { label: 'Training Code',      width: '14%' },
  { label: 'Training Title',     width: '24%' },
  { label: 'Actual Start Date',  width: '14%' },
  { label: 'Actual End Date',    width: '14%' },
  { label: 'Batch Number',       width: '14%' },
  { label: 'Remarks',            width: '20%' },
];

const colHeaders = COLUMNS.map(c =>
  `<th style="width:${c.width}">${c.label}</th>`
).join('');

const recordRow = (record) => `
  <tr>
    <td style="text-align:center;font-family:monospace">${record.training_code !== '—' ? record.training_code : ''}</td>
    <td>${record.title !== '—' ? record.title : ''}</td>
    <td style="text-align:center">${fmtDate(record.attendance_date || record.date)}</td>
    <td style="text-align:center">${record.time_out ? fmtDate(record.attendance_date || record.date) : ''}</td>
    <td style="text-align:center">${record.batch !== '—' ? record.batch : ''}</td>
    <td>${record.remarks || ''}</td>
  </tr>
`;

// Pad rows to at least 25 for empty form look
const padRows = (records, min = 25) => {
  const filled = records.map(recordRow).join('');
  const empty = Math.max(0, min - records.length);
  const emptyRows = Array.from({ length: empty })
    .map(() => `<tr>${COLUMNS.map(() => '<td>&nbsp;</td>').join('')}</tr>`)
    .join('');
  return filled + emptyRows;
};

const tableHTML = (records) => `
  <table>
    <thead><tr>${colHeaders}</tr></thead>
    <tbody>${padRows(records)}</tbody>
  </table>
`;

const infoBlock = (trainee) => `
  <div class="info-block">
    <div class="info-field">
      <span class="field-label large">NAME:</span>
      <span class="field-value">${trainee.name || ''}</span>
    </div>
    <div class="info-field">
      <span class="field-label small">DEPARTMENT:</span>
      <span class="field-value">${trainee.batch || ''}</span>
    </div>
    <div class="info-field">
      <span class="field-label small">ID NUMBER:</span>
      <span class="field-value">${trainee.id_number || ''}</span>
    </div>
  </div>
`;

const LOGO_URL = 'https://media.base44.com/images/public/69fab5d20d141e515c1323bf/64ec1c27e_image.png';

const docHeader = () => `
  <div class="doc-header">
    <img src="${LOGO_URL}" alt="Logo" />
    <h1>TORRES TECHNOLOGY CENTER CORPORATION</h1>
  </div>
`;

const openPrintWindow = (bodyHTML, title) => {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>${bodyHTML}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
};

// ─── Print: Individual ────────────────────────────────────────────────────────
const printIndividual = (trainee, trainingHistory) => {
  const body = `
    <div class="page">
      ${docHeader()}
      ${infoBlock(trainee)}
      ${tableHTML(trainingHistory)}
      <div class="doc-footer">Printed: ${new Date().toLocaleString()} · Individual Report</div>
    </div>
  `;
  openPrintWindow(body, `Training Record - ${trainee.name}`);
};

// ─── Print: By Group (Batch) ──────────────────────────────────────────────────
const printByGroup = (trainee, trainingHistory) => {
  const groups = {};
  trainingHistory.forEach((r) => {
    const key = r.batch && r.batch !== '—' ? r.batch : 'No Batch';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const sections = Object.entries(groups)
    .map(([batch, records]) => `
      <div class="section-title">${batch} — ${records.length} record${records.length !== 1 ? 's' : ''}</div>
      ${tableHTML(records)}
    `)
    .join('');

  const body = `
    <div class="page">
      ${docHeader()}
      ${infoBlock(trainee)}
      ${sections}
      <div class="doc-footer">Printed: ${new Date().toLocaleString()} · By Group Report</div>
    </div>
  `;
  openPrintWindow(body, `By Group - ${trainee.name}`);
};

// ─── Print: By Training Code ──────────────────────────────────────────────────
const printByTraining = (trainee, trainingHistory) => {
  const groups = {};
  trainingHistory.forEach((r) => {
    const key = r.training_code && r.training_code !== '—' ? r.training_code : 'No Code';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const sections = Object.entries(groups)
    .map(([code, records]) => `
      <div class="section-title">${code} — ${records[0]?.title || ''} (${records.length} record${records.length !== 1 ? 's' : ''})</div>
      ${tableHTML(records)}
    `)
    .join('');

  const body = `
    <div class="page">
      ${docHeader()}
      ${infoBlock(trainee)}
      ${sections}
      <div class="doc-footer">Printed: ${new Date().toLocaleString()} · By Training Code Report</div>
    </div>
  `;
  openPrintWindow(body, `By Training - ${trainee.name}`);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TraineeDetailPage = () => {
  const { id } = useParams();
  const [trainee, setTrainee] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addTrainingOpen, setAddTrainingOpen] = useState(false);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '', id_number: '', unique_id: '', batch: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    training_code: '',
    training_title: '',
    batch: '',
    remarks: '',
    status: 'completed',
    completion_date: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => { fetchTraineeDetails(); }, [id]);

  const fetchTraineeDetails = async () => {
    try {
      const traineeData = await pb.collection('trainees').getOne(id, { $autoCancel: false });
      setTrainee(traineeData);
      setEditData({
        name: traineeData.name || '',
        email: traineeData.email || '',
        id_number: traineeData.id_number || '',
        unique_id: traineeData.unique_id || '',
        batch: traineeData.batch || '',
      });

      const combined = [];

      // 1. Manual completion_records
      try {
        const completionData = await pb.collection('completion_records').getFullList({
          filter: `trainee="${id}"`,
          sort: '-completion_date',
          $autoCancel: false,
        });
        completionData.forEach(r => {
          combined.push({
            id: r.id,
            source: 'manual',
            training_code:  r.training_code  || '—',
            title:          r.training_title || r.training || '—',
            batch:          r.batch          || '—',
            remarks:        r.remarks        || '',
            date:           r.completion_date,
            status:         r.status,
            attendance_date: null,
            time_in:  null,
            time_out: null,
          });
        });
      } catch (err) {
        console.log('No completion records:', err);
      }

      // 2. Auto from attendance
      try {
        const attendanceData = await pb.collection('attendance').getFullList({
          filter: `trainee="${id}"`,
          expand: 'training',
          sort: '-date',
          $autoCancel: false,
        });
        attendanceData.forEach(r => {
          const trainingEndTime = r.expand?.training?.end_time;
          const trainingDate    = r.expand?.training?.date?.slice(0, 10);
          const today           = new Date().toLocaleDateString('en-CA');
          const trainingEnded   = r.expand?.training?.status === 'completed'
            || (trainingDate < today)
            || (trainingDate === today && trainingEndTime
                && new Date().toTimeString().slice(0, 5) >= trainingEndTime);

          let displayStatus = r.status;
          if (r.time_in && !r.time_out && trainingEnded) displayStatus = 'incomplete';

          combined.push({
            id: r.id,
            source: 'attendance',
            training_code:  r.expand?.training?.training_code || '—',
            title:          r.expand?.training?.title         || '—',
            batch:          r.expand?.training?.batch || '—',
            remarks:        '',
            date:           r.expand?.training?.date || null,
            status:         displayStatus,
            attendance_date: r.date || r.created,
            time_in:  r.time_in  || null,
            time_out: r.time_out || null,
          });
        });
      } catch (err) {
        console.log('No attendance records:', err);
      }

      combined.sort((a, b) => {
        const dateA = new Date(a.attendance_date || a.date || 0);
        const dateB = new Date(b.attendance_date || b.date || 0);
        return dateB - dateA;
      });

      setTrainingHistory(combined);
    } catch (error) {
      console.error('Error fetching trainee details:', error);
      toast.error('Failed to load trainee details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await pb.collection('trainees').update(id, editData, { $autoCancel: false });
      toast.success('Trainee updated successfully');
      setEditOpen(false);
      fetchTraineeDetails();
    } catch (error) {
      toast.error('Failed to update trainee');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddTraining = async () => {
    if (!newRecord.training_code.trim()) { toast.error('Lagyan ng Training Code.'); return; }
    if (!newRecord.training_title.trim()) { toast.error('Lagyan ng Training Title.'); return; }
    if (!newRecord.completion_date) { toast.error('Lagyan ng Completion Date.'); return; }

    setAddLoading(true);
    try {
      await pb.collection('completion_records').create({
        trainee:        id,
        training_code:  newRecord.training_code.trim().toUpperCase(),
        training_title: newRecord.training_title.trim(),
        batch:          newRecord.batch.trim(),
        remarks:        newRecord.remarks.trim(),
        status:         newRecord.status,
        completion_date: newRecord.completion_date,
      }, { $autoCancel: false });

      toast.success('Training record added!');
      setAddTrainingOpen(false);
      setNewRecord({ training_code: '', training_title: '', batch: '', remarks: '', status: 'completed', completion_date: '' });
      fetchTraineeDetails();
    } catch (error) {
      const msg = error?.response?.message || error?.message || 'Failed to add training record';
      toast.error(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'late':       return <Clock className="h-4 w-4 text-amber-500" />;
      case 'incomplete': return <AlertCircle className="h-4 w-4 text-violet-500" />;
      case 'absent': case 'failed': return <XCircle className="h-4 w-4 text-rose-500" />;
      default:           return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-none capitalize">{status}</Badge>;
      case 'late':
        return <Badge className="bg-amber-100 text-amber-700 border-none capitalize">Late</Badge>;
      case 'incomplete':
        return <Badge className="bg-violet-100 text-violet-700 border-none capitalize">Incomplete</Badge>;
      case 'absent': case 'failed':
        return <Badge className="bg-rose-100 text-rose-700 border-none capitalize">{status}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-none capitalize">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  const attendanceRecords = trainingHistory.filter(r => r.source === 'attendance');
  const presentCount    = attendanceRecords.filter(r => r.status === 'present').length;
  const lateCount       = attendanceRecords.filter(r => r.status === 'late').length;
  const incompleteCount = attendanceRecords.filter(r => r.status === 'incomplete').length;
  const absentCount     = attendanceRecords.filter(r => r.status === 'absent').length;

  return (
    <>
      <Helmet>
        <title>{`${trainee?.name || 'Trainee'} - Training Monitoring System`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/trainees"><ArrowLeft className="h-4 w-4 mr-2" />Back to Trainees</Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Trainee Profile Card ── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Trainee Profile</CardTitle>
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-2" />Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Edit Trainee</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      {[
                        { label: 'Full Name', key: 'name', type: 'text' },
                        { label: 'Email', key: 'email', type: 'email' },
                        { label: 'Employee ID', key: 'id_number', type: 'text' },
                        { label: 'RFID ID', key: 'unique_id', type: 'text' },
                        { label: 'Batch/Department', key: 'batch', type: 'text' },
                      ].map(f => (
                        <div key={f.key}>
                          <Label>{f.label}</Label>
                          <Input type={f.type} value={editData[f.key]}
                            onChange={(e) => setEditData({ ...editData, [f.key]: e.target.value })} />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} disabled={editLoading}>
                          {editLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-2xl font-bold">{trainee?.name}</p>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div><p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{trainee?.email}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div><p className="font-medium">Employee ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{trainee?.id_number || 'N/A'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div><p className="font-medium">RFID ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{trainee?.unique_id}</p></div>
                </div>
                {trainee?.batch && (
                  <div><p className="font-medium">Batch/Department</p>
                    <p className="text-sm text-muted-foreground">{trainee?.batch}</p></div>
                )}
                {attendanceRecords.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="font-medium text-sm mb-2">Attendance Summary</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { count: presentCount,    label: 'Present',    bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-600' },
                        { count: lateCount,       label: 'Late',       bg: 'bg-amber-50',   text: 'text-amber-700',   sub: 'text-amber-600' },
                        { count: incompleteCount, label: 'Incomplete', bg: 'bg-violet-50',  text: 'text-violet-700',  sub: 'text-violet-600' },
                        { count: absentCount,     label: 'Absent',     bg: 'bg-rose-50',    text: 'text-rose-700',    sub: 'text-rose-600' },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-lg px-3 py-2 text-center`}>
                          <p className={`text-lg font-bold ${s.text}`}>{s.count}</p>
                          <p className={`text-xs ${s.sub}`}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Training History Card ── */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Training History</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manual entries + auto from attendance</p>
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex items-center gap-2">

                  {/* Print Dropdown */}
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrintMenuOpen((prev) => !prev)}
                      disabled={trainingHistory.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    {printMenuOpen && (
                      <>
                        {/* backdrop */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setPrintMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-44">
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => { setPrintMenuOpen(false); printIndividual(trainee, trainingHistory); }}
                          >
                            <span className="text-slate-500">👤</span> Individual Report
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => { setPrintMenuOpen(false); printByGroup(trainee, trainingHistory); }}
                          >
                            <span className="text-slate-500">🗂️</span> By Group / Batch
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => { setPrintMenuOpen(false); printByTraining(trainee, trainingHistory); }}
                          >
                            <span className="text-slate-500">📋</span> By Training Code
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add Training */}
                  <Dialog open={addTrainingOpen} onOpenChange={(open) => {
                    setAddTrainingOpen(open);
                    if (!open) setNewRecord({ training_code: '', training_title: '', batch: '', remarks: '', status: 'completed', completion_date: '' });
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" />Add Training</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                      <DialogHeader><DialogTitle>Add Training Record</DialogTitle></DialogHeader>
                      <div className="space-y-4">

                        {/* Training Code */}
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-slate-400" />
                            Training Code <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g. MESH-001, BLS-2024"
                            value={newRecord.training_code}
                            onChange={(e) => setNewRecord({ ...newRecord, training_code: e.target.value.toUpperCase() })}
                            className="font-mono"
                          />
                        </div>

                        {/* Training Title */}
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                            Training Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g. Safety Orientation, Fire Drill"
                            value={newRecord.training_title}
                            onChange={(e) => setNewRecord({ ...newRecord, training_title: e.target.value })}
                          />
                        </div>

                        {/* Batch */}
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            Batch
                          </Label>
                          <Input
                            placeholder="e.g. Batch 1, KHMPT-MDC"
                            value={newRecord.batch}
                            onChange={(e) => setNewRecord({ ...newRecord, batch: e.target.value })}
                          />
                        </div>

                        {/* Completion Date */}
                        <div className="space-y-1.5">
                          <Label>Completion Date <span className="text-red-500">*</span></Label>
                          <Input
                            type="date"
                            value={newRecord.completion_date}
                            onChange={(e) => setNewRecord({ ...newRecord, completion_date: e.target.value })}
                          />
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                          <Label>Status</Label>
                          <Select value={newRecord.status} onValueChange={(val) => setNewRecord({ ...newRecord, status: val })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            Remarks <span className="text-slate-400 text-xs font-normal">(optional)</span>
                          </Label>
                          <Textarea
                            placeholder="Additional notes or remarks…"
                            value={newRecord.remarks}
                            onChange={(e) => setNewRecord({ ...newRecord, remarks: e.target.value })}
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button onClick={handleAddTraining} disabled={addLoading} className="min-w-28">
                            {addLoading ? 'Adding…' : 'Add Record'}
                          </Button>
                          <Button variant="outline" onClick={() => setAddTrainingOpen(false)}>Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent>
                {trainingHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No training records found</div>
                ) : (
                  <div className="space-y-3">
                    {trainingHistory.map((record) => (
                      <div
                        key={`${record.source}-${record.id}`}
                        className={`p-4 rounded-xl border transition-colors ${
                          record.status === 'incomplete' ? 'bg-violet-50 border-violet-100' :
                          record.status === 'late'       ? 'bg-amber-50 border-amber-100' :
                          record.status === 'absent' || record.status === 'failed' ? 'bg-rose-50 border-rose-100' :
                          'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: icon + details */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-0.5 flex-shrink-0">{getStatusIcon(record.status)}</div>
                            <div className="flex-1 min-w-0 space-y-1.5">

                              {/* Code + Title row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {record.training_code && record.training_code !== '—' && (
                                  <Badge className="bg-primary/10 text-primary border-none font-mono text-xs px-2">
                                    {record.training_code}
                                  </Badge>
                                )}
                                <p className="font-semibold text-slate-900 text-sm">{record.title}</p>
                              </div>

                              {/* Batch */}
                              {record.batch && record.batch !== '—' && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-500">{record.batch}</span>
                                </div>
                              )}

                              {/* Date + time */}
                              <div className="flex items-center gap-3 flex-wrap">
                                {(record.attendance_date || record.date) && (
                                  <p className="text-xs text-muted-foreground">
                                    📅 {new Date(record.attendance_date || record.date).toLocaleDateString()}
                                  </p>
                                )}
                                {record.source === 'attendance' && record.time_in && (
                                  <p className="text-xs text-muted-foreground">
                                    🕐 In: {formatHHMM(record.time_in)}
                                    {record.time_out
                                      ? ` · Out: ${formatHHMM(record.time_out)}`
                                      : record.status === 'incomplete' ? ' · No time-out' : ''}
                                  </p>
                                )}
                                <span className="text-xs text-slate-400 italic">
                                  {record.source === 'manual' ? 'Manual entry' : 'Auto from attendance'}
                                </span>
                              </div>

                              {/* Remarks */}
                              {record.remarks && (
                                <div className="flex items-start gap-1.5">
                                  <MessageSquare className="h-3 w-3 text-slate-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-500 italic">{record.remarks}</span>
                                </div>
                              )}

                              {/* Incomplete warning */}
                              {record.status === 'incomplete' && (
                                <p className="text-xs text-violet-600 font-medium">⚠️ Left before training ended</p>
                              )}
                            </div>
                          </div>

                          {/* Right: status badge */}
                          <div className="flex-shrink-0">{getStatusBadge(record.status)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </>
  );
};

export default TraineeDetailPage;
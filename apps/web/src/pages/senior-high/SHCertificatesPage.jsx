import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Download, Printer, Users, CheckCircle2, BookMarked } from 'lucide-react';
import { toast } from 'sonner';

const MIN_DAYS = 8; // minimum days present to be eligible

const SHCertificatesPage = () => {
  const [batches, setBatches]     = useState([]);
  const [students, setStudents]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');
  const printRef = useRef(null);

  useEffect(() => { fetchBatches(); }, []);
  useEffect(() => { if (selectedBatch) fetchStudentsAndAttendance(); }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const data = await pb.collection('sh_batches').getFullList({
        sort: '-date_start', expand: 'school', $autoCancel: false,
      });
      setBatches(data);
      if (data.length > 0) setSelectedBatch(data[0].id);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  };

  const fetchStudentsAndAttendance = async () => {
    try {
      const [studentData, attendanceData] = await Promise.all([
        pb.collection('sh_students').getFullList({ filter: `batch = "${selectedBatch}"`, sort: 'name', expand: 'school,batch', $autoCancel: false }),
        pb.collection('sh_attendance').getFullList({ filter: `batch = "${selectedBatch}"`, $autoCancel: false }),
      ]);
      setStudents(studentData);
      setAttendance(attendanceData);
    } catch { toast.error('Failed to load students'); }
  };

  const getDaysPresent = (studentId) =>
    attendance.filter(a => a.student === studentId && a.status === 'present').length;

  const isEligible = (studentId) => getDaysPresent(studentId) >= MIN_DAYS;

  const eligibleStudents = students.filter(s => isEligible(s.id));
  const selectedBatchData = batches.find(b => b.id === selectedBatch);

  const printCertificate = (student) => {
    const daysPresent = getDaysPresent(student.id);
    const batchData   = selectedBatchData;
    const schoolName  = batchData?.expand?.school?.name ?? '';
    const dateRange   = `${batchData?.date_start ?? ''} to ${batchData?.date_end ?? ''}`;

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${student.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@300;400;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 1056px; height: 816px; display: flex; align-items: center; justify-content: center; background: white; font-family: 'Lato', sans-serif; }
          .cert { width: 960px; height: 720px; border: 12px solid #D97706; padding: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; background: white; }
          .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #FDE68A; pointer-events: none; }
          .logo { font-size: 12px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #92400E; margin-bottom: 8px; }
          .title { font-family: 'Cinzel', serif; font-size: 48px; font-weight: 700; color: #D97706; line-height: 1.1; margin-bottom: 4px; }
          .subtitle { font-family: 'Cinzel', serif; font-size: 16px; color: #92400E; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 32px; }
          .presented { font-size: 14px; color: #6B7280; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
          .name { font-family: 'Cinzel', serif; font-size: 40px; font-weight: 700; color: #1F2937; margin-bottom: 24px; border-bottom: 2px solid #D97706; padding-bottom: 16px; min-width: 500px; }
          .body { font-size: 16px; color: #374151; line-height: 1.8; max-width: 680px; margin-bottom: 32px; }
          .body strong { color: #D97706; }
          .days { display: inline-block; background: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; font-weight: 700; padding: 4px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 32px; }
          .footer { display: flex; gap: 80px; justify-content: center; align-items: flex-end; margin-top: 16px; }
          .sig-block { text-align: center; }
          .sig-line { width: 200px; border-top: 1.5px solid #374151; margin-bottom: 6px; }
          .sig-name { font-weight: 700; font-size: 13px; color: #1F2937; }
          .sig-title { font-size: 11px; color: #6B7280; }
          .corner { position: absolute; width: 40px; height: 40px; border-color: #D97706; border-style: solid; }
          .tl { top: 20px; left: 20px; border-width: 3px 0 0 3px; }
          .tr { top: 20px; right: 20px; border-width: 3px 3px 0 0; }
          .bl { bottom: 20px; left: 20px; border-width: 0 0 3px 3px; }
          .br { bottom: 20px; right: 20px; border-width: 0 3px 3px 0; }
        </style>
      </head>
      <body>
        <div class="cert">
          <div class="corner tl"></div><div class="corner tr"></div>
          <div class="corner bl"></div><div class="corner br"></div>
          <div class="logo">Torres Tech Manufacturing Corp.</div>
          <div class="title">Certificate</div>
          <div class="subtitle">of Completion</div>
          <div class="presented">This is to certify that</div>
          <div class="name">${student.name}</div>
          <div class="body">
            from <strong>${schoolName}</strong> has successfully completed the<br>
            <strong>Senior High School Work Immersion Program</strong><br>
            held from <strong>${dateRange}</strong>
          </div>
          <div class="days">Days Attended: ${daysPresent} / 10</div>
          <div class="footer">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-name">Training Coordinator</div>
              <div class="sig-title">Torres Tech Manufacturing Corp.</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-name">HR Manager</div>
              <div class="sig-title">Torres Tech Manufacturing Corp.</div>
            </div>
          </div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const printAllCertificates = () => {
    if (eligibleStudents.length === 0) { toast.error('Walang eligible students.'); return; }
    eligibleStudents.forEach((student, i) => {
      setTimeout(() => printCertificate(student), i * 800);
    });
    toast.success(`Printing ${eligibleStudents.length} certificates…`);
  };

  return (
    <>
      <Helmet><title>Certificates - Senior High</title></Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Certificates</h1>
            <p className="text-muted-foreground mt-1">I-generate ang certificates para sa mga students na kumpleto ang training.</p>
          </div>
          <Button onClick={printAllCertificates} disabled={eligibleStudents.length === 0} className="gap-2">
            <Printer className="h-4 w-4" /> Print All ({eligibleStudents.length})
          </Button>
        </div>

        {/* Batch selector */}
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-700 shrink-0">Batch:</label>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm min-w-[260px]">
            {batches.map(b => <option key={b.id} value={b.id}>{b.expand?.school?.name} — Batch {b.batch_number} ({b.date_start})</option>)}
          </select>
          <Badge className="bg-emerald-50 text-emerald-700 border-none">
            {eligibleStudents.length} eligible (≥{MIN_DAYS} days)
          </Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Students', value: students.length,        bg: 'bg-blue-50',    color: 'text-blue-700',    icon: Users        },
            { label: 'Eligible',       value: eligibleStudents.length, bg: 'bg-emerald-50', color: 'text-emerald-700', icon: CheckCircle2 },
            { label: 'Not Eligible',   value: students.length - eligibleStudents.length, bg: 'bg-red-50', color: 'text-red-700', icon: BookMarked },
          ].map(({ label, value, bg, color, icon: Icon }) => (
            <Card key={label} className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className={`p-4 flex items-center gap-4 ${bg} rounded-lg`}>
                <Icon className={`h-8 w-8 ${color} opacity-70`} />
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Students table */}
        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Students — {selectedBatchData?.expand?.school?.name} Batch {selectedBatchData?.batch_number}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-16">
                <Award className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Walang students sa batch na ito.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">ID Number</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Days Present</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Eligible</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, i) => {
                    const days    = getDaysPresent(student.id);
                    const eligible = days >= MIN_DAYS;
                    return (
                      <TableRow key={student.id} className="hover:bg-slate-50/50 border-b-slate-100">
                        <TableCell className="text-slate-400 text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{student.id_number || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-none text-xs ${
                            days === 10 ? 'bg-emerald-100 text-emerald-700' :
                            days >= MIN_DAYS ? 'bg-blue-100 text-blue-700' :
                                              'bg-red-100 text-red-700'
                          }`}>{days} / 10</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {eligible
                            ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                            : <span className="text-xs text-red-400">Below {MIN_DAYS} days</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={eligible ? 'default' : 'outline'}
                            size="sm"
                            disabled={!eligible}
                            onClick={() => printCertificate(student)}
                            className="gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SHCertificatesPage;
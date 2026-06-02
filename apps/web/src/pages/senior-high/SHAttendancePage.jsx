import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Wifi, WifiOff, Loader2, Save, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const RFID_SERVER = 'http://localhost:5050';
const DAYS = Array.from({ length: 10 }, (_, i) => i + 1);

const DEPT_COLORS = {
  Smartech: 'bg-blue-50 text-blue-700',
  Osha:     'bg-red-50 text-red-700',
  HR:       'bg-purple-50 text-purple-700',
  EBM:      'bg-emerald-50 text-emerald-700',
  Datatech: 'bg-amber-50 text-amber-700',
};

const SHAttendancePage = () => {
  const [batches, setBatches]       = useState([]);
  const [students, setStudents]     = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDay, setSelectedDay]     = useState(1);
  const [rfidStatus, setRfidStatus]       = useState('idle');
  const [lastScanned, setLastScanned]     = useState(null);
  const pollRef = useRef(null);

  // RFID Registration dialog
  const [registerDialog, setRegisterDialog] = useState(false);
  const [pendingUID, setPendingUID]         = useState('');
  const [unregisteredStudents, setUnregisteredStudents] = useState([]);
  const [registeringStudent, setRegisteringStudent]     = useState(null);

  useEffect(() => {
    fetchBatches();
    return () => { stopPolling(); fetch(`${RFID_SERVER}/stop`).catch(() => {}); };
  }, []);

  useEffect(() => {
    if (selectedBatch) fetchStudentsAndAttendance();
  }, [selectedBatch, selectedDay]);

  const fetchBatches = async () => {
    try {
      const data = await pb.collection('sh_batches').getFullList({
        filter: 'status = "ongoing"',
        expand: 'school',
        $autoCancel: false,
      });
      setBatches(data);
      if (data.length > 0) setSelectedBatch(data[0].id);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  };

  const fetchStudentsAndAttendance = async () => {
    try {
      const [studentData, attendanceData] = await Promise.all([
        pb.collection('sh_students').getFullList({
          filter: `batch = "${selectedBatch}"`, sort: 'name', $autoCancel: false,
        }),
        pb.collection('sh_attendance').getFullList({
          filter: `batch = "${selectedBatch}" && day_number = ${selectedDay}`, $autoCancel: false,
        }),
      ]);
      setStudents(studentData);
      const map = {};
      attendanceData.forEach(a => { map[a.student] = { id: a.id, status: a.status }; });
      setAttendance(map);
    } catch { toast.error('Failed to load attendance'); }
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // ── RFID Scan ──────────────────────────────────────────────────────────────
  const startRfidScan = async () => {
    setRfidStatus('starting');
    stopPolling();
    try {
      const res  = await fetch(`${RFID_SERVER}/start`);
      const data = await res.json();
      if (!data.success) { setRfidStatus('error'); toast.error('Hindi ma-connect sa RFID reader.'); return; }
      setRfidStatus('ready');
      toast.info('RFID ready — i-tap ang card ng student.');

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${RFID_SERVER}/uid`);
          const d = await r.json();
          if (d.uid) {
            const uid = d.uid.replace(/\s+/g, '').toUpperCase();
            stopPolling();
            fetch(`${RFID_SERVER}/stop`).catch(() => {});
            setRfidStatus('idle');

            // Find student with this RFID
            const student = students.find(s => s.unique_id?.replace(/\s+/g, '').toUpperCase() === uid);

            if (student) {
              // Already registered — mark present directly
              await markAttendance(student.id, 'present');
              setLastScanned(student.name);
              toast.success(`✓ ${student.name} — Present`);
              setTimeout(() => startRfidScan(), 1000);
            } else {
              // Unknown RFID — show registration dialog
              setPendingUID(uid);
              const unregistered = students.filter(s => !s.unique_id || s.unique_id.trim() === '');
              setUnregisteredStudents(unregistered);
              setRegisterDialog(true);
            }
          }
        } catch { /* ignore */ }
      }, 500);
    } catch { setRfidStatus('error'); toast.error('Hindi ma-reach ang RFID server.'); }
  };

  const stopRfidScan = () => {
    stopPolling();
    fetch(`${RFID_SERVER}/stop`).catch(() => {});
    setRfidStatus('idle');
  };

  // ── Register RFID to student & mark present ────────────────────────────────
  const handleRegisterAndPresent = async (student) => {
    if (registeringStudent) return;
    setRegisteringStudent(student.id);
    try {
      // Save RFID to student
      await pb.collection('sh_students').update(student.id, {
        unique_id: pendingUID,
      }, { $autoCancel: false });

      // Mark present
      await markAttendance(student.id, 'present');

      // Update local students list
      setStudents(prev => prev.map(s =>
        s.id === student.id ? { ...s, unique_id: pendingUID } : s
      ));

      toast.success(`✓ ${student.name} — RFID registered & Present!`);
      setLastScanned(student.name);
      setRegisterDialog(false);
      setPendingUID('');
      setRegisteringStudent(null);

      // Continue scanning
      setTimeout(() => startRfidScan(), 1000);
    } catch {
      toast.error('Failed to register RFID.');
      setRegisteringStudent(null);
    }
  };

  const handleCancelRegister = () => {
    setRegisterDialog(false);
    setPendingUID('');
    setRegisteringStudent(null);
    setTimeout(() => startRfidScan(), 500);
  };

  // ── Mark Attendance ────────────────────────────────────────────────────────
  const markAttendance = async (studentId, status) => {
    const existing = attendance[studentId];
    try {
      if (existing?.id) {
        await pb.collection('sh_attendance').update(existing.id, { status }, { $autoCancel: false });
      } else {
        const today = new Date().toISOString().split('T')[0];
        await pb.collection('sh_attendance').create({
          student: studentId, batch: selectedBatch,
          day_number: selectedDay, date: today, status,
        }, { $autoCancel: false });
      }
      setAttendance(prev => ({ ...prev, [studentId]: { ...existing, status } }));
    } catch { toast.error('Failed to save attendance.'); }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const unmarked = students.filter(s => !attendance[s.id]);
      for (const student of unmarked) {
        await pb.collection('sh_attendance').create({
          student: student.id, batch: selectedBatch,
          day_number: selectedDay, date: today, status: 'absent',
        }, { $autoCancel: false });
      }
      await fetchStudentsAndAttendance();
      toast.success('Attendance saved! Unmarked students set to absent.');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount  = Object.values(attendance).filter(a => a.status === 'absent').length;
  const lateCount    = Object.values(attendance).filter(a => a.status === 'late').length;

  const selectedBatchData = batches.find(b => b.id === selectedBatch);

  return (
    <>
      <Helmet><title>Attendance - Senior High</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-muted-foreground mt-1">I-record ang daily attendance ng Senior High students.</p>
        </div>

        {/* Batch & Day selector */}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Batch (Ongoing)</label>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm min-w-[220px]">
              {batches.length === 0 && <option value="">Walang ongoing batch</option>}
              {batches.map(b => <option key={b.id} value={b.id}>{b.expand?.school?.name} — Batch {b.batch_number}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Day</label>
            <select value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              {DAYS.map(d => <option key={d} value={d}>Day {d}</option>)}
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            {rfidStatus === 'idle' || rfidStatus === 'error' ? (
              <Button onClick={startRfidScan} variant="outline" className="gap-2">
                <Wifi className="h-4 w-4" /> Start RFID Scan
              </Button>
            ) : (
              <Button onClick={stopRfidScan} variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                {rfidStatus === 'starting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                Stop Scanning
              </Button>
            )}
            <Button onClick={saveAll} disabled={saving || !selectedBatch} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All
            </Button>
          </div>
        </div>

        {/* RFID status bar */}
        {rfidStatus !== 'idle' && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
            rfidStatus === 'ready' ? 'bg-primary/5 border border-primary/20' :
            rfidStatus === 'error' ? 'bg-red-50 border border-red-200' :
                                     'bg-yellow-50 border border-yellow-200'}`}>
            {rfidStatus === 'starting' ? <Loader2 className="h-5 w-5 animate-spin text-yellow-600" /> :
             rfidStatus === 'ready'    ? <Wifi    className="h-5 w-5 text-primary" /> :
                                         <WifiOff className="h-5 w-5 text-red-500" />}
            <div>
              <p className={`text-sm font-medium ${
                rfidStatus === 'ready' ? 'text-primary' :
                rfidStatus === 'error' ? 'text-red-600' : 'text-yellow-700'}`}>
                {rfidStatus === 'ready'    ? 'RFID Scanner Active — I-tap ang card ng student.' :
                 rfidStatus === 'starting' ? 'Nagko-connect…' : 'Connection error.'}
              </p>
              {lastScanned && rfidStatus === 'ready' &&
                <p className="text-xs text-slate-500 mt-0.5">Last scanned: <strong>{lastScanned}</strong></p>}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Present', value: presentCount, bg: 'bg-emerald-50', color: 'text-emerald-700' },
            { label: 'Absent',  value: absentCount,  bg: 'bg-red-50',     color: 'text-red-700'     },
            { label: 'Late',    value: lateCount,    bg: 'bg-amber-50',   color: 'text-amber-700'   },
          ].map(({ label, value, bg, color }) => (
            <Card key={label} className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className={`p-4 text-center ${bg} rounded-lg`}>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendance table */}
        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedBatchData ? `${selectedBatchData.expand?.school?.name} — Batch ${selectedBatchData.batch_number}` : '—'} · Day {selectedDay}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Walang students sa batch na ito.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600 w-10">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">ID Number</TableHead>
                    <TableHead className="font-semibold text-slate-600">Department</TableHead>
                    <TableHead className="font-semibold text-slate-600">RFID</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, i) => {
                    const rec    = attendance[student.id];
                    const status = rec?.status ?? null;
                    return (
                      <TableRow key={student.id} className={`border-b-slate-100 transition-colors ${
                        status === 'present' ? 'bg-emerald-50/30' :
                        status === 'absent'  ? 'bg-red-50/20'     :
                        status === 'late'    ? 'bg-amber-50/30'   : 'hover:bg-slate-50/50'
                      }`}>
                        <TableCell className="text-slate-400 text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{student.id_number || '—'}</TableCell>
                        <TableCell>
                          {student.department
                            ? <Badge className={`border-none text-xs ${DEPT_COLORS[student.department] ?? 'bg-slate-100 text-slate-600'}`}>{student.department}</Badge>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {student.unique_id
                            ? <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CreditCard className="h-3 w-3" /> Registered</span>
                            : <span className="text-xs text-slate-400">No RFID</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {status ? (
                            <Badge className={`border-none text-xs ${
                              status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'absent'  ? 'bg-red-100 text-red-700' :
                                                     'bg-amber-100 text-amber-700'
                            }`}>
                              {status === 'present' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {status === 'absent'  && <XCircle      className="h-3 w-3 mr-1" />}
                              {status === 'late'    && <Clock        className="h-3 w-3 mr-1" />}
                              {status}
                            </Badge>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            {['present', 'late', 'absent'].map(s => (
                              <button key={s} onClick={() => markAttendance(student.id, s)}
                                className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                                  status === s
                                    ? s === 'present' ? 'bg-emerald-500 text-white border-emerald-500' :
                                      s === 'absent'  ? 'bg-red-500 text-white border-red-500' :
                                                        'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                }`}>
                                {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                              </button>
                            ))}
                          </div>
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

      {/* RFID Registration Dialog */}
      <Dialog open={registerDialog} onOpenChange={open => { if (!open) handleCancelRegister(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Register this RFID Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <CreditCard className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Detected RFID UID</p>
                <p className="font-mono font-bold text-slate-900 tracking-wider">{pendingUID}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">Piliin ang pangalan ng student na mag-o-own ng card na ito:</p>
            {unregisteredStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Lahat ng students ay may RFID na.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                {unregisteredStudents.map(student => (
                  <button key={student.id}
                    onClick={() => handleRegisterAndPresent(student)}
                    disabled={!!registeringStudent}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors text-left disabled:opacity-50">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {student.id_number && <span className="text-xs font-mono text-slate-400">{student.id_number}</span>}
                        {student.department && (
                          <Badge className={`border-none text-xs ${DEPT_COLORS[student.department] ?? 'bg-slate-100 text-slate-600'}`}>
                            {student.department}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {registeringStudent === student.id
                      ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      : <CheckCircle2 className="h-4 w-4 text-slate-300" />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCancelRegister}>Cancel — Scan Next</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SHAttendancePage;
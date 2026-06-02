import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Wifi, WifiOff, Users, CheckCircle2, XCircle,
  Clock, Search, Calendar, MapPin, BookOpen, Layers,
  CreditCard, UserCheck, RefreshCw, Download
} from 'lucide-react';

const RFID_URL = 'http://localhost:5050';
const POLL_INTERVAL = 800;

const statusColor = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
};

const DEPT_COLORS = {
  Smartech: 'bg-blue-100 text-blue-700',
  Osha: 'bg-orange-100 text-orange-700',
  HR: 'bg-purple-100 text-purple-700',
  EBM: 'bg-teal-100 text-teal-700',
  Datatech: 'bg-pink-100 text-pink-700',
};

export default function SHTrainingDetailPage() {
  const { id } = useParams();
  const [training, setTraining] = useState(null);
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [rfidConnected, setRfidConnected] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanMessage, setScanMessage] = useState('Waiting for RFID tap...');
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Register RFID modal (for unregistered cards)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pendingRfid, setPendingRfid] = useState(null);
  const [unregisteredStudents, setUnregisteredStudents] = useState([]);
  const [registerSearch, setRegisterSearch] = useState('');

  const pollRef = useRef(null);
  const processingRef = useRef(false);

  useEffect(() => {
    fetchAll();
    checkRfid();
    startPolling();
    return () => stopPolling();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const t = await pb.collection('sh_trainings').getOne(id, { expand: 'batch', $autoCancel: false });
      setTraining(t);

      if (t.batch) {
        const b = await pb.collection('sh_batches').getOne(t.batch, { $autoCancel: false });
        setBatch(b);

        const studs = await pb.collection('sh_students').getFullList({
          filter: `batch = "${t.batch}"`,
          sort: 'name',
          $autoCancel: false,
        });
        setStudents(studs);
      }

      const att = await pb.collection('sh_training_attendance').getFullList({
        filter: `training = "${id}"`,
        expand: 'student',
        $autoCancel: false,
      });
      setAttendance(att);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const att = await pb.collection('sh_training_attendance').getFullList({
        filter: `training = "${id}"`,
        expand: 'student',
        $autoCancel: false,
      });
      setAttendance(att);
    } catch (e) {
      console.error(e);
    }
  };

  const checkRfid = async () => {
    try {
      const res = await fetch(`${RFID_URL}/status`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        setRfidConnected(data.scanning);
      }
    } catch {
      setRfidConnected(false);
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(pollRfid, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const pollRfid = useCallback(async () => {
    if (processingRef.current) return;
    try {
      const res = await fetch(`${RFID_URL}/uid`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return;
      const data = await res.json();
      if (data.uid) {
        setRfidConnected(true);
        handleRfidScan(data.uid);
      }
    } catch {
      setRfidConnected(false);
    }
  }, [students, attendance]);

  const handleRfidScan = async (uid) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setLastScan(uid);

    try {
      // Find student with this RFID
      const student = students.find((s) => s.unique_id === uid);

      if (!student) {
        // Unregistered card — show register modal
        const unregistered = students.filter((s) => !s.unique_id);
        setUnregisteredStudents(unregistered);
        setPendingRfid(uid);
        setShowRegisterModal(true);
        setScanMessage(`Unknown card: ${uid} — Assign to a student`);
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      // Check if already marked present today
      const today = new Date().toISOString().slice(0, 10);
      const existing = attendance.find(
        (a) => a.student === student.id && a.training === id
      );

      if (existing) {
        setScanMessage(`✅ ${student.name} already marked ${existing.status}`);
        toast.info(`${student.name} already marked ${existing.status}`);
      } else {
        // Mark as present
        await pb.collection('sh_training_attendance').create({
          student: student.id,
          training: id,
          date: today,
          status: 'present',
        }, { $autoCancel: false });

        setScanMessage(`✅ ${student.name} — Present!`);
        toast.success(`${student.name} marked Present`);
        await fetchAttendance();
      }
    } catch (e) {
      toast.error('Failed to record attendance.');
      console.error(e);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const handleRegisterAndMark = async (student) => {
    if (!pendingRfid || !student) return;
    setProcessing(true);
    try {
      // Register RFID
      await pb.collection('sh_students').update(student.id, { unique_id: pendingRfid }, { $autoCancel: false });

      // Update local students list
      setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, unique_id: pendingRfid } : s));

      // Mark present
      const today = new Date().toISOString().slice(0, 10);
      await pb.collection('sh_training_attendance').create({
        student: student.id,
        training: id,
        date: today,
        status: 'present',
      }, { $autoCancel: false });

      toast.success(`${student.name} — RFID registered & marked Present!`);
      setScanMessage(`✅ ${student.name} — RFID registered & Present!`);
      setShowRegisterModal(false);
      setPendingRfid(null);
      setRegisterSearch('');
      await fetchAttendance();
    } catch (e) {
      toast.error('Failed to register RFID.');
      console.error(e);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const handleManualStatus = async (studentId, status) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = attendance.find((a) => a.student === studentId && a.training === id);
    try {
      if (existing) {
        await pb.collection('sh_training_attendance').update(existing.id, { status }, { $autoCancel: false });
      } else {
        await pb.collection('sh_training_attendance').create({
          student: studentId,
          training: id,
          date: today,
          status,
        }, { $autoCancel: false });
      }
      toast.success('Attendance updated.');
      await fetchAttendance();
    } catch (e) {
      toast.error('Failed to update.');
    }
  };

  // Stats
  const totalStudents = students.length;
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const absentCount = totalStudents - presentCount - lateCount;

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  const getStudentAttendance = (studentId) =>
    attendance.find((a) => a.student === studentId);

  const filteredRegister = unregisteredStudents.filter((s) =>
    s.name?.toLowerCase().includes(registerSearch.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(registerSearch.toLowerCase())
  );

  const exportCsv = () => {
    const rows = [['Name', 'Student ID', 'Department', 'Status', 'Date']];
    students.forEach((s) => {
      const att = getStudentAttendance(s.id);
      rows.push([
        s.name || '',
        s.student_id || '',
        s.department || '',
        att?.status || 'absent',
        att?.date || '',
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${training?.title || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="p-6 text-center text-slate-400">Training not found.</div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{training.title} — SH Pre-Training</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Link to="/senior-high/pre-training">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        {/* Training Info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{training.title}</h1>
                  {training.training_code && (
                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      {training.training_code}
                    </span>
                  )}
                  <Badge className={`text-xs ${
                    training.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    training.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    training.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {training.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  {training.date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />{training.date.slice(0, 10)}
                    </span>
                  )}
                  {training.time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />{training.time}{training.end_time ? ` – ${training.end_time}` : ''}
                    </span>
                  )}
                  {training.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />{training.location}
                    </span>
                  )}
                  {batch && (
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />{batch.name || batch.batch_name}
                    </span>
                  )}
                </div>
                {training.trainer && (
                  <p className="text-xs text-slate-400">Trainer: {training.trainer}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-slate-600' },
            { label: 'Present', value: presentCount, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Late', value: lateCount, icon: Clock, color: 'text-yellow-600' },
            { label: 'Absent', value: absentCount, icon: XCircle, color: 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* RFID Scanner Panel */}
        <Card className="border-none ring-1 ring-slate-100">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${rfidConnected ? 'bg-green-500' : 'bg-red-400'} animate-pulse`} />
                <span className="text-sm font-medium text-slate-700">
                  RFID Scanner — {rfidConnected ? 'Connected' : 'Disconnected'}
                </span>
                {rfidConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-400" />}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={checkRfid} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconnect
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className={`mt-4 p-4 rounded-lg text-sm font-medium text-center transition-all ${
              processing
                ? 'bg-blue-50 text-blue-700'
                : lastScan
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-50 text-slate-500'
            }`}>
              <CreditCard className="h-5 w-5 inline mr-2 opacity-60" />
              {scanMessage}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Roster */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Attendance Roster
                <span className="text-sm font-normal text-slate-400">
                  ({filteredStudents.length} students)
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  className="pl-9 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {['Smartech', 'Osha', 'HR', 'EBM', 'Datatech'].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Dept</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">RFID</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((s) => {
                    const att = getStudentAttendance(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell font-mono text-xs">{s.student_id || '—'}</td>
                        <td className="py-2.5 px-3">
                          {s.department ? (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DEPT_COLORS[s.department] || 'bg-gray-100 text-gray-600'}`}>
                              {s.department}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {s.unique_id ? (
                            <span className="text-xs text-green-600 font-mono bg-green-50 px-1.5 py-0.5 rounded">
                              {s.unique_id.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No RFID</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {att ? (
                            <Badge className={`text-xs ${statusColor[att.status] || 'bg-gray-100 text-gray-700'}`}>
                              {att.status}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-slate-100 text-slate-500">absent</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-green-700 hover:bg-green-50"
                              onClick={() => handleManualStatus(s.id, 'present')}
                            >P</Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-yellow-700 hover:bg-yellow-50"
                              onClick={() => handleManualStatus(s.id, 'late')}
                            >L</Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-red-700 hover:bg-red-50"
                              onClick={() => handleManualStatus(s.id, 'absent')}
                            >A</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No students found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Register RFID Modal */}
      <Dialog open={showRegisterModal} onOpenChange={(open) => {
        if (!open) {
          setShowRegisterModal(false);
          setPendingRfid(null);
          setRegisterSearch('');
          processingRef.current = false;
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Assign RFID Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg font-mono">
              Card UID: {pendingRfid}
            </div>
            <p className="text-sm text-slate-600">Select a student to assign this card and mark them Present:</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student..."
                className="pl-9"
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredRegister.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">No unregistered students found.</p>
              ) : (
                filteredRegister.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleRegisterAndMark(s)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{s.student_id || 'No ID'}</span>
                      {s.department && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${DEPT_COLORS[s.department] || 'bg-gray-100'}`}>
                          {s.department}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              setShowRegisterModal(false);
              setPendingRfid(null);
              setRegisterSearch('');
              processingRef.current = false;
            }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

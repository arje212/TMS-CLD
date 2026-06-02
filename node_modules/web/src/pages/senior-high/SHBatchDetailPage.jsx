import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, School, Calendar, Users,
  CheckCircle2, XCircle, Clock, BookMarked,
} from 'lucide-react';

const DAYS = Array.from({ length: 10 }, (_, i) => i + 1);

const statusColor = {
  upcoming:  'bg-amber-50 text-amber-700',
  ongoing:   'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

const SHBatchDetailPage = () => {
  const { id } = useParams();
  const [batch, setBatch]         = useState(null);
  const [students, setStudents]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [batchData, studentsData, attendanceData] = await Promise.all([
        pb.collection('sh_batches').getOne(id, { expand: 'school', $autoCancel: false }),
        pb.collection('sh_students').getFullList({ filter: `batch = "${id}"`, sort: 'name', $autoCancel: false }),
        pb.collection('sh_attendance').getFullList({ filter: `batch = "${id}"`, $autoCancel: false }),
      ]);
      setBatch(batchData);
      setStudents(studentsData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (studentId, day) => {
    const rec = attendance.find(a => a.student === studentId && a.day_number === day);
    return rec?.status ?? null;
  };

  const getDaySummary = (day) => {
    const dayRecords = attendance.filter(a => a.day_number === day);
    const present = dayRecords.filter(a => a.status === 'present').length;
    const absent  = dayRecords.filter(a => a.status === 'absent').length;
    const late    = dayRecords.filter(a => a.status === 'late').length;
    return { present, absent, late, total: students.length };
  };

  const getStudentCompletionDays = (studentId) =>
    attendance.filter(a => a.student === studentId && a.status === 'present').length;

  const statusIcon = {
    present: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    absent:  <XCircle className="h-4 w-4 text-red-400" />,
    late:    <Clock className="h-4 w-4 text-amber-500" />,
  };

  const daySummary = getDaySummary(activeDay);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <BookMarked className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="text-muted-foreground">Batch not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/senior-high/batches"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Batches</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Batch Detail - Senior High</title></Helmet>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" className="mt-1 shrink-0">
            <Link to="/senior-high/batches"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {batch.expand?.school?.name} — Batch {batch.batch_number}
              </h1>
              <Badge className={`border-none ${statusColor[batch.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {batch.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{batch.date_start} → {batch.date_end}</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{students.length} students</span>
              <span className="flex items-center gap-1.5"><School className="h-4 w-4" />{batch.expand?.school?.address || 'No address'}</span>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: students.length,    bg: 'bg-blue-50',    color: 'text-blue-600'    },
            { label: 'Present Today',  value: daySummary.present, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Absent Today',   value: daySummary.absent,  bg: 'bg-red-50',     color: 'text-red-600'     },
            { label: 'Late Today',     value: daySummary.late,    bg: 'bg-amber-50',   color: 'text-amber-600'   },
          ].map(({ label, value, bg, color }) => (
            <Card key={label} className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground leading-tight">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Day tabs + attendance table */}
        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Attendance per Day</CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {DAYS.map(day => {
                const s = getDaySummary(day);
                const hasData = s.present + s.absent + s.late > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      activeDay === day
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : hasData
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-primary hover:border-blue-200'
                    }`}
                  >
                    Day {day}
                    {hasData && activeDay !== day && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Walang students sa batch na ito.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/senior-high/students">Go to Students</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600 w-10">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">ID Number</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Day {activeDay}</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">Days Present</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, i) => {
                    const status = getStatus(student.id, activeDay);
                    const daysPresent = getStudentCompletionDays(student.id);
                    return (
                      <TableRow key={student.id} className="hover:bg-slate-50/50 border-b-slate-100">
                        <TableCell className="text-slate-400 text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{student.id_number || '—'}</TableCell>
                        <TableCell className="text-center">
                          {status ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {statusIcon[status]}
                              <span className={`text-xs font-medium capitalize ${
                                status === 'present' ? 'text-emerald-600' :
                                status === 'absent'  ? 'text-red-500' : 'text-amber-600'
                              }`}>{status}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-none text-xs ${
                            daysPresent === 10 ? 'bg-emerald-100 text-emerald-700' :
                            daysPresent >= 7   ? 'bg-blue-100 text-blue-700' :
                            daysPresent >= 4   ? 'bg-amber-100 text-amber-700' :
                                                 'bg-slate-100 text-slate-500'
                          }`}>
                            {daysPresent} / 10
                          </Badge>
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

export default SHBatchDetailPage;
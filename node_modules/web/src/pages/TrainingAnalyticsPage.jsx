import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, Award, Clock } from 'lucide-react';

const TrainingAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgAttendance: 0,
    passRate: 0,
    totalTrained: 0,
    lateRate: 0,
    incompleteCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [batchData, setBatchData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [attendanceRecords, traineesResult, assignmentsResult, trainingsResult] = await Promise.all([
        pb.collection('attendance').getFullList({ expand: 'training', $autoCancel: false }),
        pb.collection('trainees').getList(1, 1000, { $autoCancel: false }),
        pb.collection('training_assignments').getFullList({ $autoCancel: false }),
        pb.collection('trainings').getFullList({ $autoCancel: false }),
      ]);

      const trainees = traineesResult.items;

      // ── Determine "incomplete" from records ────────────────────────────────
      // incomplete = has time_in, no time_out, training ended
      const today = new Date().toLocaleDateString('en-CA');
      const nowHHMM = new Date().toTimeString().slice(0, 5);

      const enriched = attendanceRecords.map(r => {
        const training = r.expand?.training;
        const trainingDate = training?.date?.slice(0, 10);
        const trainingEnded = training?.status === 'completed'
          || (trainingDate && trainingDate < today)
          || (trainingDate === today && training?.end_time && nowHHMM >= training.end_time);

        let status = r.status;
        if (r.time_in && !r.time_out && trainingEnded) {
          status = 'incomplete';
        }
        return { ...r, computedStatus: status };
      });

      // ── Stats ──────────────────────────────────────────────────────────────
      const presentCount    = enriched.filter(a => a.computedStatus === 'present').length;
      const lateCount       = enriched.filter(a => a.computedStatus === 'late').length;
      const incompleteCount = enriched.filter(a => a.computedStatus === 'incomplete').length;
      const total           = enriched.length;

      // Attendance rate = present + late (they showed up)
      const avgAttendance = total > 0
        ? Math.round(((presentCount + lateCount) / total) * 100)
        : 0;

      const lateRate = total > 0
        ? Math.round((lateCount / total) * 100)
        : 0;

      // Participation = trainees who attended ≥1 session (present or late)
      const traineeIdsPresent = new Set(
        enriched.filter(a => a.computedStatus === 'present' || a.computedStatus === 'late').map(a => a.trainee)
      );
      const totalAssigned = new Set(assignmentsResult.map(a => a.trainee)).size;
      const passRate = totalAssigned > 0
        ? Math.round((traineeIdsPresent.size / totalAssigned) * 100)
        : 0;

      setStats({ avgAttendance, passRate, totalTrained: trainees.length, lateRate, incompleteCount });

      // ── Status breakdown pie ───────────────────────────────────────────────
      setStatusBreakdown([
        { name: 'Present',    value: presentCount,    pct: total > 0 ? Math.round((presentCount    / total) * 100) : 0, color: '#10b981' },
        { name: 'Late',       value: lateCount,       pct: total > 0 ? Math.round((lateCount       / total) * 100) : 0, color: '#f59e0b' },
        { name: 'Incomplete', value: incompleteCount, pct: total > 0 ? Math.round((incompleteCount / total) * 100) : 0, color: '#8b5cf6' },
        { name: 'Absent',     value: total - presentCount - lateCount - incompleteCount,
          pct: total > 0 ? Math.round(((total - presentCount - lateCount - incompleteCount) / total) * 100) : 0,
          color: '#ef4444' },
      ]);

      // ── Monthly attendance trend ───────────────────────────────────────────
      const monthlyMap = {};
      enriched.forEach(record => {
        const dateStr = record.date || record.created;
        const month = new Date(dateStr).toLocaleString('default', { month: 'short' });
        if (!monthlyMap[month]) monthlyMap[month] = { present: 0, late: 0, incomplete: 0, absent: 0, total: 0 };
        monthlyMap[month].total++;
        if (record.computedStatus === 'present')    monthlyMap[month].present++;
        else if (record.computedStatus === 'late')       monthlyMap[month].late++;
        else if (record.computedStatus === 'incomplete') monthlyMap[month].incomplete++;
        else                                             monthlyMap[month].absent++;
      });

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setMonthlyData(
        months.map(m => ({
          name: m,
          present:    monthlyMap[m]?.present    || 0,
          late:       monthlyMap[m]?.late       || 0,
          incomplete: monthlyMap[m]?.incomplete || 0,
          absent:     monthlyMap[m]?.absent     || 0,
          rate: monthlyMap[m]
            ? Math.round(((monthlyMap[m].present + monthlyMap[m].late) / monthlyMap[m].total) * 100)
            : 0,
          target: 90,
        }))
      );

      // ── Trainee attendance distribution pie ────────────────────────────────
      // Perfect  = present/late in ALL assigned trainings, no absent/incomplete
      // Partial  = attended some
      // No Show  = never attended
      const traineeMap = {};
      assignmentsResult.forEach(a => {
        if (!traineeMap[a.trainee]) traineeMap[a.trainee] = { assigned: 0, attended: 0 };
        traineeMap[a.trainee].assigned++;
      });
      enriched.forEach(r => {
        if ((r.computedStatus === 'present' || r.computedStatus === 'late') && traineeMap[r.trainee]) {
          traineeMap[r.trainee].attended++;
        }
      });

      let perfect = 0, partial = 0, noShow = 0;
      Object.values(traineeMap).forEach(({ assigned, attended }) => {
        if (attended === 0)           noShow++;
        else if (attended >= assigned) perfect++;
        else                          partial++;
      });

      const distTotal = perfect + partial + noShow;
      setPerformanceData([
        { name: 'Perfect Attendance', value: distTotal > 0 ? Math.round((perfect / distTotal) * 100) : 0, count: perfect, color: '#10b981' },
        { name: 'Partial Attendance', value: distTotal > 0 ? Math.round((partial / distTotal) * 100) : 0, count: partial, color: '#3b82f6' },
        { name: 'No Attendance',      value: distTotal > 0 ? Math.round((noShow  / distTotal) * 100) : 0, count: noShow,  color: '#ef4444' },
      ]);

      // ── Department-wise attendance breakdown ───────────────────────────────
      const batchMap = {};
      trainees.forEach(t => {
        const key = t.batch || 'Unknown';
        if (!batchMap[key]) batchMap[key] = { present: 0, late: 0, incomplete: 0, absent: 0 };
      });
      enriched.forEach(record => {
        const trainee = trainees.find(t => t.id === record.trainee);
        if (trainee) {
          const key = trainee.batch || 'Unknown';
          if (!batchMap[key]) batchMap[key] = { present: 0, late: 0, incomplete: 0, absent: 0 };
          if      (record.computedStatus === 'present')    batchMap[key].present++;
          else if (record.computedStatus === 'late')       batchMap[key].late++;
          else if (record.computedStatus === 'incomplete') batchMap[key].incomplete++;
          else                                             batchMap[key].absent++;
        }
      });

      setBatchData(
        Object.entries(batchMap).map(([batch, data]) => ({
          name: batch,
          present:    data.present,
          late:       data.late,
          incomplete: data.incomplete,
          absent:     data.absent,
        }))
      );

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Training Analytics - TMS Pro</title></Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Training Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into training performance and attendance
          </p>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Attendance Rate</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.avgAttendance}%</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Present + Late records</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Trainee Participation</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.passRate}%</h3>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Attended at least one session</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-amber-600 mb-1">Late Rate</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.lateRate}%</h3>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">{stats.incompleteCount} incomplete records</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-indigo-600 mb-1">Total Trainees</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.totalTrained}</h3>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Across {batchData.length || 0} active departments
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Chart 1: Monthly attendance trend ─────────────────────────── */}
          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Attendance Trends (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={v => [`${v}%`]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="rate"   name="Attendance Rate %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="target" name="Target %"           stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* ── Chart 2: Status breakdown pie ─────────────────────────────── */}
          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Attendance Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {statusBreakdown.every(d => d.value === 0) ? (
                <div className="h-[250px] w-full flex items-center justify-center flex-col gap-2">
                  <p className="text-slate-400 text-sm">No attendance data yet.</p>
                  <p className="text-slate-300 text-xs">Data will appear once attendance is recorded.</p>
                </div>
              ) : (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, _name, props) => [`${props.payload.pct}% (${v} records)`]}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full px-4 mt-3 space-y-2.5">
                    {statusBreakdown.map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{item.value} records</span>
                          <span className="text-sm font-semibold w-10 text-right">{item.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Chart 3: Trainee distribution pie ─────────────────────────── */}
          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Trainee Attendance Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {performanceData.every(d => d.value === 0) ? (
                <div className="h-[250px] w-full flex items-center justify-center flex-col gap-2">
                  <p className="text-slate-400 text-sm">No attendance data yet.</p>
                </div>
              ) : (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={performanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, _name, props) => [`${v}% (${props.payload.count} trainees)`]}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full px-4 mt-3 space-y-2.5">
                    {performanceData.map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{item.count} trainees</span>
                          <span className="text-sm font-semibold w-10 text-right">{item.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Chart 4: Department-wise stacked bar ──────────────────────── */}
          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Department-wise Attendance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {batchData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No department data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={batchData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="present"    name="Present"    stackId="a" fill="#10b981" radius={[0,0,0,0]} barSize={40} />
                      <Bar dataKey="late"       name="Late"       stackId="a" fill="#f59e0b" radius={[0,0,0,0]} barSize={40} />
                      <Bar dataKey="incomplete" name="Incomplete" stackId="a" fill="#8b5cf6" radius={[0,0,0,0]} barSize={40} />
                      <Bar dataKey="absent"     name="Absent"     stackId="a" fill="#ef4444" radius={[4,4,0,0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
};

export default TrainingAnalyticsPage;
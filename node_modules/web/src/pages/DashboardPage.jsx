import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useCompany } from '@/hooks/useCompany.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, TrendingUp, CheckCircle2, ArrowRight, Clock, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const DashboardPage = () => {
  const { company, companyLabel, prefix } = useCompany();
  const [stats, setStats]               = useState(null);
  const [recentTrainings, setRecentTrainings] = useState([]);
  const [attendanceChartData, setAttendanceChartData] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isEmpty, setIsEmpty]           = useState(false);

  useEffect(() => {
    setLoading(true);
    setIsEmpty(false);
    setStats(null);
    setRecentTrainings([]);
    setAttendanceChartData([]);
    fetchDashboardData();
  }, [company]);

  const fetchDashboardData = async () => {
    try {
      const [traineesData, trainingsData, attendanceData, assignmentsData] = await Promise.all([
        pb.collection(`${prefix}trainees`).getList(1, 1, { $autoCancel: false }),
        pb.collection(`${prefix}trainings`).getList(1, 5, { sort: '-date', $autoCancel: false }),
        pb.collection(`${prefix}attendance`).getFullList({ $autoCancel: false }),
        pb.collection(`${prefix}training_assignments`).getFullList({ $autoCancel: false }),
      ]);

      if (trainingsData.totalItems === 0 && traineesData.totalItems === 0) {
        setIsEmpty(true);
        return;
      }

      const presentCount  = attendanceData.filter(a => a.status === 'present').length;
      const attendanceRate = attendanceData.length > 0
        ? Math.round((presentCount / attendanceData.length) * 100) : 0;

      setStats({
        totalTrainees:  traineesData.totalItems,
        totalTrainings: trainingsData.totalItems,
        attendanceRate,
        completionRate: 85,
      });

      setRecentTrainings(trainingsData.items);

      const chartData = trainingsData.items.map(t => {
        const tAssigns  = assignmentsData.filter(a => a.training === t.id);
        const tAttends  = attendanceData.filter(a => a.training === t.id);
        const present   = tAttends.filter(a => a.status === 'present').length;
        const attendedIds = new Set(tAttends.map(a => a.trainee));
        const notRecorded = tAssigns.filter(a => !attendedIds.has(a.trainee)).length;
        const absent    = tAttends.filter(a => a.status === 'absent').length + notRecorded;
        return { name: t.title?.split(' ')[0]?.substring(0, 8) || 'Day', present, absent };
      });

      setAttendanceChartData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionData = [
    { name: 'Completed', value: 85, color: '#10b981' },
    { name: 'Pending',   value: 15, color: '#94a3b8' },
  ];

  if (!loading && isEmpty) {
    return (
      <>
        <Helmet><title>Dashboard - {companyLabel}</title></Helmet>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{companyLabel}</h1>
            <p className="text-muted-foreground mt-1">Dashboard Overview</p>
          </div>
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-700">No data yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {companyLabel} has no trainings or trainees set up yet.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Dashboard - {companyLabel}</title></Helmet>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{companyLabel} — Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your training programs.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Card key={i} className="shadow-sm"><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Calendar,      label: 'Total Trainings',  value: stats?.totalTrainings,  bg: 'bg-blue-50',    color: 'text-blue-600'    },
              { icon: Users,         label: 'Total Trainees',   value: stats?.totalTrainees,   bg: 'bg-indigo-50',  color: 'text-indigo-600'  },
              { icon: TrendingUp,    label: 'Attendance Rate',  value: `${stats?.attendanceRate}%`, bg: 'bg-emerald-50', color: 'text-emerald-600' },
              { icon: CheckCircle2,  label: 'Completion Rate',  value: `${stats?.completionRate}%`, bg: 'bg-amber-50',   color: 'text-amber-600'   },
            ].map(({ icon: Icon, label, value, bg, color }) => (
              <Card key={label} className="shadow-sm border-none ring-1 ring-slate-100">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full ${bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value ?? 0}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Per Training</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                {attendanceChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">No attendance data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4,4,0,0]} barSize={32} />
                      <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader><CardTitle className="text-lg font-semibold">Completion Status</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {completionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900">{stats?.completionRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
              <div className="flex gap-4 mt-4 w-full justify-center">
                {completionData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Training Sessions</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
              <Link to={`/${company}/trainings`}>View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrainings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No trainings yet.</div>
              ) : recentTrainings.map((training, index) => (
                <div key={training.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Day</span>
                      <span className="text-lg font-bold text-primary leading-none">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{training.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {training.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {training.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={training.status === 'completed' ? 'outline' : 'default'} className="hidden sm:inline-flex">{training.status}</Badge>
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/${company}/trainings/${training.id}`}>Manage</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default DashboardPage;
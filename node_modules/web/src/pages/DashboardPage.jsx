import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, TrendingUp, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentTrainings, setRecentTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [traineesData, trainingsData, attendanceData] = await Promise.all([
        pb.collection('trainees').getList(1, 1, { $autoCancel: false }),
        pb.collection('trainings').getList(1, 5, { sort: '-date', $autoCancel: false }),
        pb.collection('attendance').getList(1, 1000, { $autoCancel: false })
      ]);

      const totalTrainees = traineesData.totalItems;
      const totalTrainings = trainingsData.totalItems;
      
      const presentCount = attendanceData.items.filter(a => a.status === 'present').length;
      const attendanceRate = attendanceData.totalItems > 0
        ? Math.round((presentCount / attendanceData.totalItems) * 100)
        : 0;

      setStats({
        totalTrainees,
        totalTrainings,
        attendanceRate,
        completionRate: 85 // Mocked for visual purposes as requested
      });

      setRecentTrainings(trainingsData.items);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceData = [
    { name: 'Mon', present: 45, absent: 5 },
    { name: 'Tue', present: 52, absent: 3 },
    { name: 'Wed', present: 48, absent: 7 },
    { name: 'Thu', present: 50, absent: 5 },
    { name: 'Fri', present: 55, absent: 0 },
  ];

  const completionData = [
    { name: 'Completed', value: 85, color: 'hsl(var(--success))' },
    { name: 'Pending', value: 15, color: 'hsl(var(--muted-foreground))' },
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard - TMS Pro</title>
      </Helmet>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your training programs.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-sm"><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Trainings</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats?.totalTrainings || 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Trainees</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats?.totalTrainees || 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats?.attendanceRate || 0}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats?.completionRate || 0}%</h3>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="present" name="Present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Completion Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-slate-900">{stats?.completionRate || 0}%</span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
              <div className="flex gap-4 mt-4 w-full justify-center">
                {completionData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
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
              <Link to="/trainings">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrainings.map((training, index) => (
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
                    <Badge variant={training.status === 'completed' ? 'outline' : 'default'} className="hidden sm:inline-flex">
                      {training.status}
                    </Badge>
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/trainings/${training.id}`}>Manage</Link>
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
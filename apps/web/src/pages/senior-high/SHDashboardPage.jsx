import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { School, Users, BookMarked, Award, ArrowRight, Calendar } from 'lucide-react';

const SHDashboardPage = () => {
  const [stats, setStats]   = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [schoolsData, batchesData, studentsData, attendanceData] = await Promise.all([
        pb.collection('sh_schools').getList(1, 1, { $autoCancel: false }),
        pb.collection('sh_batches').getList(1, 5, {
          sort: '-date_start',
          expand: 'school',
          $autoCancel: false,
        }),
        pb.collection('sh_students').getList(1, 1, { $autoCancel: false }),
        pb.collection('sh_attendance').getFullList({ $autoCancel: false }),
      ]);

      const presentCount = attendanceData.filter(a => a.status === 'present').length;
      const attendanceRate = attendanceData.length > 0
        ? Math.round((presentCount / attendanceData.length) * 100)
        : 0;

      setStats({
        totalSchools:  schoolsData.totalItems,
        totalBatches:  batchesData.totalItems,
        totalStudents: studentsData.totalItems,
        attendanceRate,
      });

      setBatches(batchesData.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    upcoming:  'bg-amber-50 text-amber-700',
    ongoing:   'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <>
      <Helmet><title>Senior High Dashboard - TMS Pro</title></Helmet>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Senior High — Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview ng lahat ng Senior High training batches.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: School,    label: 'Partner Schools',  value: stats?.totalSchools,   bg: 'bg-orange-50',  color: 'text-orange-600'  },
              { icon: BookMarked,label: 'Total Batches',    value: stats?.totalBatches,   bg: 'bg-blue-50',    color: 'text-blue-600'    },
              { icon: Users,     label: 'Total Students',   value: stats?.totalStudents,  bg: 'bg-indigo-50',  color: 'text-indigo-600'  },
              { icon: Award,     label: 'Attendance Rate',  value: `${stats?.attendanceRate}%`, bg: 'bg-emerald-50', color: 'text-emerald-600' },
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

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Batches</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/senior-high/batches">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : batches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Walang batches pa. Mag-add ng school at batch para magsimula.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                        <BookMarked className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {batch.expand?.school?.name ?? 'Unknown School'} — Batch {batch.batch_number}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {batch.date_start} → {batch.date_end}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border-none text-xs ${statusColor[batch.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {batch.status}
                      </Badge>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/senior-high/batches/${batch.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SHDashboardPage;
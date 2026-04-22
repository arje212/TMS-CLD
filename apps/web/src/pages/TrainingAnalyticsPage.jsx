import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

const TrainingAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgAttendance: 0,
    passRate: 0,
    totalTrained: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [batchData, setBatchData] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch trainings
      const trainingsResult = await pb.collection('trainings').getList(1, 100, {
        $autoCancel: false
      });
      const trainings = trainingsResult.items;

      // Fetch completion records for pass rate
      const completionResult = await pb.collection('completion_records').getList(1, 1000, {
        $autoCancel: false
      });
      const completions = completionResult.items;

      // Fetch attendance records
      const attendanceResult = await pb.collection('attendance').getList(1, 1000, {
        $autoCancel: false
      });
      const attendanceRecords = attendanceResult.items;

      // Calculate statistics
      const completedCount = completions.filter(c => c.status === 'completed').length;
      const passRate = completions.length > 0 ? Math.round((completedCount / completions.length) * 100) : 0;

      const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
      const avgAttendance = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

      // Fetch trainees for total count
      const traineesResult = await pb.collection('trainees').getList(1, 1000, {
        $autoCancel: false
      });

      setStats({
        avgAttendance: avgAttendance,
        passRate: passRate,
        totalTrained: traineesResult.items.length,
      });

      // Generate monthly data from attendance records
      const monthlyMap = {};
      attendanceRecords.forEach(record => {
        const month = new Date(record.date).toLocaleString('default', { month: 'short' });
        if (!monthlyMap[month]) {
          monthlyMap[month] = { present: 0, total: 0 };
        }
        monthlyMap[month].total++;
        if (record.status === 'present') {
          monthlyMap[month].present++;
        }
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const newMonthlyData = months.map(m => ({
        name: m,
        rate: monthlyMap[m] ? Math.round((monthlyMap[m].present / monthlyMap[m].total) * 100) : 0,
        target: 90
      }));
      setMonthlyData(newMonthlyData);

      // Generate performance distribution based on completion status
      const statusCounts = {
        'Completed': completions.filter(c => c.status === 'completed').length,
        'Pending': completions.filter(c => c.status === 'pending').length,
        'Failed': completions.filter(c => c.status === 'failed').length,
      };

      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      const performanceList = [
        { name: 'Completed', value: total > 0 ? Math.round((statusCounts['Completed'] / total) * 100) : 0, color: 'hsl(var(--success))' },
        { name: 'Pending', value: total > 0 ? Math.round((statusCounts['Pending'] / total) * 100) : 0, color: 'hsl(var(--primary))' },
        { name: 'Failed', value: total > 0 ? Math.round((statusCounts['Failed'] / total) * 100) : 0, color: 'hsl(var(--destructive))' },
      ];
      setPerformanceData(performanceList);

      // Group attendance by batch
      const batchMap = {};
      traineesResult.items.forEach(trainee => {
        batchMap[trainee.batch] = { present: 0, absent: 0 };
      });

      attendanceRecords.forEach(record => {
        const trainee = traineesResult.items.find(t => t.id === record.trainee);
        if (trainee && batchMap[trainee.batch]) {
          if (record.status === 'present') {
            batchMap[trainee.batch].present++;
          } else {
            batchMap[trainee.batch].absent++;
          }
        }
      });

      const newBatchData = Object.entries(batchMap).map(([batch, data]) => ({
        name: batch || 'Unknown',
        present: data.present,
        absent: data.absent,
      }));
      setBatchData(newBatchData);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Training Analytics - TMS Pro</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Training Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights into training performance and attendance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Avg. Attendance Rate</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.avgAttendance}%</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              </div>
              <p className="text-xs text-slate-500 mt-4">+2.1% from last month</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Overall Pass Rate</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.passRate}%</h3>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl"><Award className="h-5 w-5 text-emerald-600" /></div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Based on post-training assessments</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-indigo-600 mb-1">Total Trained</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stats.totalTrained}</h3>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl"><Users className="h-5 w-5 text-indigo-600" /></div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Across {batchData.length || 0} active batches</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Attendance Trends (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[60, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="rate" name="Actual Rate %" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="dashed" dataKey="target" name="Target %" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Trainee Performance Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4 w-full px-8">
                {performanceData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Batch-wise Attendance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="present" name="Present" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} barSize={40} />
                    <Bar dataKey="absent" name="Absent" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default TrainingAnalyticsPage;
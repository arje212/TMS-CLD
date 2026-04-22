import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, TrendingUp, Clock, User, Award, ChevronRight } from 'lucide-react';
import TrainingCard from '@/components/TrainingCard.jsx';
import { toast } from 'sonner';

const TraineeDashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [traineeProfile, setTraineeProfile] = useState(null);
  const [recentTrainings, setRecentTrainings] = useState([]);
  const [stats, setStats] = useState({
    attended: 0,
    completed: 0,
    rate: 0,
    inProgress: 0
  });

  useEffect(() => {
    const fetchTraineeData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Trainee Record matching current user's email
        const traineeRes = await pb.collection('trainees').getList(1, 1, {
          filter: `email="${currentUser.email}"`,
          $autoCancel: false
        });

        if (traineeRes.items.length === 0) {
          toast.error("Trainee profile not found.");
          setLoading(false);
          return;
        }

        const trainee = traineeRes.items[0];
        setTraineeProfile(trainee);

        // 2. Fetch Attendance and Completion Records
        const [attendanceRes, completionsRes] = await Promise.all([
          pb.collection('attendance').getList(1, 5, {
            filter: `trainee="${trainee.id}"`,
            sort: '-created',
            expand: 'training',
            $autoCancel: false
          }),
          pb.collection('completion_records').getFullList({
            filter: `trainee="${trainee.id}"`,
            $autoCancel: false
          })
        ]);

        // Process recent trainings
        const mappedTrainings = attendanceRes.items.map(record => {
          const t = record.expand?.training || {};
          const isCompleted = completionsRes.some(c => c.training === t.id && c.status === 'completed');
          
          return {
            id: t.id,
            title: t.title || 'Unknown Training',
            date: t.date || 'TBD',
            time: t.time || 'TBD',
            location: t.location || 'Virtual',
            attendanceStatus: record.status,
            completionStatus: isCompleted ? 'completed' : (t.status === 'completed' ? 'pending' : 'ongoing')
          };
        });

        setRecentTrainings(mappedTrainings);

        // 3. Get Full Stats (we need all attendance records for accurate counts)
        const allAttendance = await pb.collection('attendance').getFullList({
          filter: `trainee="${trainee.id}"`,
          expand: 'training',
          $autoCancel: false
        });

        const presentCount = allAttendance.filter(a => a.status === 'present').length;
        const completedCount = completionsRes.filter(c => c.status === 'completed').length;
        const attendanceRate = allAttendance.length > 0 
          ? Math.round((presentCount / allAttendance.length) * 100) 
          : 0;
        
        const inProgressCount = allAttendance.filter(a => a.expand?.training?.status === 'ongoing').length;

        setStats({
          attended: presentCount,
          completed: completedCount,
          rate: attendanceRate,
          inProgress: inProgressCount
        });

      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchTraineeData();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Trainee Portal</title>
      </Helmet>

      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Welcome Profile Section */}
        <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Award className="h-64 w-64 -mt-10 -mr-10" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center backdrop-blur-sm shadow-inner">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Welcome back, {traineeProfile?.name || currentUser?.name}!</h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-blue-100 font-medium mt-3">
                <span className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg text-sm">
                  ID: {traineeProfile?.unique_id || 'N/A'}
                </span>
                <span className="flex items-center gap-2">
                  Batch 1 {/* Hardcoded batch as per requirements/schema limit */}
                </span>
                <span className="flex items-center gap-2">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm border-none ring-1 ring-slate-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Trainings Attended</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.attended}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Completed</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.completed}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.rate}%</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-slate-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">In Progress</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.inProgress}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Trainings List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recent Trainings</h2>
            <Button variant="ghost" className="text-primary hover:bg-blue-50" onClick={() => navigate('/my-trainings')}>
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {recentTrainings.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Trainings Yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  You haven't been assigned to or attended any training sessions yet. They will appear here once scheduled.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentTrainings.map((training) => (
                <TrainingCard 
                  key={training.id} 
                  training={training} 
                  onClick={() => navigate(`/my-trainings/${training.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TraineeDashboardPage;
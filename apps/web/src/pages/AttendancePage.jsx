import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar, Users, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AttendancePage = () => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const trainingsData = await pb.collection('trainings').getFullList({
        sort: '-date',
        $autoCancel: false,
      });

      const [assignments, attendance] = await Promise.all([
        pb.collection('training_assignments').getFullList({ $autoCancel: false }),
        pb.collection('attendance').getFullList({ $autoCancel: false }),
      ]);

      const enrichedTrainings = trainingsData.map(t => {
        const tAssigns = assignments.filter(a => a.training === t.id);
        const tAttends = attendance.filter(a => a.training === t.id);

        const total = tAssigns.length;
        const present = tAttends.filter(a => a.status === 'present').length;

        // FIX: absent = trainees explicitly marked absent
        //            + assigned trainees with NO attendance record at all
        const explicitAbsent = tAttends.filter(a => a.status === 'absent').length;

        // find assigned trainees who have zero attendance record for this training
        const attendedTraineeIds = new Set(tAttends.map(a => a.trainee));
        const notRecorded = tAssigns.filter(a => !attendedTraineeIds.has(a.trainee)).length;

        const absent = explicitAbsent + notRecorded;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return { ...t, stats: { total, present, absent, rate } };
      });

      setTrainings(enrichedTrainings);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance summaries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Attendance - TMS Pro</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance Overview</h1>
          <p className="text-muted-foreground mt-1">
            Monitor attendance rates across all training sessions
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="shadow-sm border-none ring-1 ring-slate-100">
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-muted-foreground">No trainings found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training, index) => (
              <Card
                key={training.id}
                className="flex flex-col shadow-sm border-none ring-1 ring-slate-100 hover:shadow-md transition-all duration-200 group"
              >
                <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">
                        Day {index + 1}
                      </span>
                      <CardTitle
                        className="text-lg line-clamp-1 text-slate-900"
                        title={training.title}
                      >
                        {training.title}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={training.status === 'completed' ? 'outline' : 'default'}
                      className={
                        training.status === 'completed'
                          ? 'bg-slate-100 text-slate-600 border-none'
                          : ''
                      }
                    >
                      {training.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" /> {training.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-slate-400" /> {training.stats.total} Assigned
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between pt-6">
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">Attendance Rate</span>
                      <span className="font-bold text-primary">{training.stats.rate}%</span>
                    </div>
                    <Progress
                      value={training.stats.rate}
                      className="h-2.5 mb-4 bg-slate-100"
                      indicatorClassName="bg-primary"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">
                          {training.stats.present} Present
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-rose-50 px-3 py-2 rounded-lg">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span className="text-sm font-medium text-rose-700">
                          {training.stats.absent} Absent
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full mt-auto group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"
                  >
                    <Link to={`/trainings/${training.id}`}>
                      View Detailed Roster <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AttendancePage;
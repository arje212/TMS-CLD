import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Users, Clock, MapPin, Calendar, Download, CheckCircle2, XCircle, BarChart3, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendance } from '@/hooks/useAttendance.js';
import AttendanceScanner from '@/components/AttendanceScanner.jsx';
import AttendanceList from '@/components/AttendanceList.jsx';
import BulkAttendanceActions from '@/components/BulkAttendanceActions.jsx';

const TrainingDetailPage = () => {
  const { id } = useParams();
  const [training, setTraining] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allTrainees, setAllTrainees] = useState([]);
  const [selectedTrainees, setSelectedTrainees] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const { 
    fetchAttendanceForTraining, 
    fetchAssignmentsForTraining, 
    markPresent, 
    markAbsent, 
    recordCheckout,
    getAttendanceStats 
  } = useAttendance();

  const loadData = async () => {
    try {
      const tData = await pb.collection('trainings').getOne(id, { $autoCancel: false });
      setTraining(tData);
      
      const [assigns, records] = await Promise.all([
        fetchAssignmentsForTraining(id),
        fetchAttendanceForTraining(id)
      ]);
      
      setAssignments(assigns);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading training data:', error);
      toast.error('Failed to load training details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTrainees = async () => {
    try {
      const traineesData = await pb.collection('trainees').getFullList({
        sort: 'name',
        $autoCancel: false
      });
      setAllTrainees(traineesData);
      setSelectedTrainees([]);
    } catch (error) {
      console.error('Error fetching trainees:', error);
      toast.error('Failed to load trainees');
    }
  };

  const handleAssignTrainees = async () => {
    if (selectedTrainees.length === 0) {
      toast.error('Please select at least one trainee');
      return;
    }

    setAssignLoading(true);
    try {
      for (const traineeId of selectedTrainees) {
        await pb.collection('training_assignments').create({
          training: id,
          trainee: traineeId,
          assigned_date: new Date().toISOString().split('T')[0],
          $autoCancel: false
        });
      }
      toast.success(`Assigned ${selectedTrainees.length} trainee(s) successfully`);
      setAssignDialogOpen(false);
      setSelectedTrainees([]);
      loadData();
    } catch (error) {
      console.error('Error assigning trainees:', error);
      toast.error('Failed to assign trainees');
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    pb.collection('attendance').subscribe('*', function (e) {
      if (e.record.training === id) {
        loadData();
      }
    });

    return () => {
      pb.collection('attendance').unsubscribe('*');
    };
  }, [id]);

  const handleMarkAllPresent = async () => {
    const pending = assignments.filter(a => !attendanceRecords.find(r => r.trainee === a.trainee));
    for (const a of pending) {
      await markPresent(id, a.trainee);
    }
    loadData();
  };

  const handleMarkAllAbsent = async () => {
    const pending = assignments.filter(a => !attendanceRecords.find(r => r.trainee === a.trainee));
    for (const a of pending) {
      await markAbsent(id, a.trainee);
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats(assignments, attendanceRecords);

  return (
    <>
      <Helmet>
        <title>{`${training?.title || 'Training'} - TMS Pro`}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <Link to="/trainings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{training?.title}</h1>
              <Badge variant={training?.status === 'completed' ? 'outline' : 'default'} className="uppercase text-[10px] tracking-wider">
                {training?.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {training?.date}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {training?.time}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {training?.location}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto rounded-lg shadow-sm mb-6">
            <TabsTrigger value="overview" className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Attendance Roster</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="shadow-sm border-none ring-1 ring-slate-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Training Details</CardTitle>
                  <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        onClick={() => fetchAllTrainees()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Trainees
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Assign Trainees to {training?.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {allTrainees.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No trainees found in masterlist</p>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {allTrainees.map(trainee => (
                              <div key={trainee.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
                                <Checkbox
                                  id={trainee.id}
                                  checked={selectedTrainees.includes(trainee.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTrainees([...selectedTrainees, trainee.id]);
                                    } else {
                                      setSelectedTrainees(selectedTrainees.filter(id => id !== trainee.id));
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={trainee.id}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-sm">{trainee.name}</div>
                                  <div className="text-xs text-muted-foreground">{trainee.email}</div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end pt-4 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => setAssignDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAssignTrainees}
                            disabled={assignLoading || selectedTrainees.length === 0}
                          >
                            {assignLoading ? 'Assigning...' : `Assign ${selectedTrainees.length} Trainee(s)`}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">{training?.description || 'No description provided.'}</p>
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Total Assigned</span>
                      <span className="font-medium text-slate-900">{stats.totalAssigned} Trainees</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Status</span>
                      <span className="font-medium text-slate-900 capitalize">{training?.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-48 h-48 rounded-full border-8 border-slate-50 flex flex-col items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeDasharray={`${stats.percentage * 2.89} 289`} className="transition-all duration-1000 ease-out" />
                      </svg>
                      <span className="text-4xl font-bold text-slate-900">{stats.percentage}%</span>
                      <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">Present</span>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-900">Present</p>
                            <p className="text-xs text-emerald-700">Checked in successfully</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-emerald-700">{stats.presentCount}</span>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-rose-900">Absent</p>
                            <p className="text-xs text-rose-700">Did not attend</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-rose-700">{stats.absentCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-0 space-y-6">
            <Card className="border-primary/20 shadow-md bg-blue-50/30">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Quick Check-In</h3>
                  <p className="text-sm text-slate-600">Scan ID card or enter trainee ID manually</p>
                </div>
                <AttendanceScanner trainingId={id} onScanSuccess={loadData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <CardTitle className="text-lg">Master Roster</CardTitle>
                <BulkAttendanceActions 
                  assignments={assignments}
                  attendanceRecords={attendanceRecords}
                  onMarkAllPresent={handleMarkAllPresent}
                  onMarkAllAbsent={handleMarkAllAbsent}
                />
              </CardHeader>
              <CardContent className="pt-6">
                <AttendanceList 
                  assignments={assignments}
                  attendanceRecords={attendanceRecords}
                  onMarkPresent={async (traineeId) => { await markPresent(id, traineeId); loadData(); }}
                  onMarkAbsent={async (traineeId) => { await markAbsent(id, traineeId); loadData(); }}
                  onCheckout={async (recordId) => { await recordCheckout(recordId); loadData(); }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <Card className="shadow-sm border-none ring-1 ring-slate-100">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Detailed analytics for this specific training session will appear here once the session is completed and scores are recorded.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default TrainingDetailPage;
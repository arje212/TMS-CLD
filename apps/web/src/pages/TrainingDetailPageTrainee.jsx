import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, Clock, MapPin, AlignLeft, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge.jsx';
import { toast } from 'sonner';

const TrainingDetailPageTrainee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ training: null, attendance: null, completion: null });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch trainee info first to guarantee correct ID mapping
        const traineeRes = await pb.collection('trainees').getList(1, 1, {
          filter: `email="${currentUser.email}"`,
          $autoCancel: false
        });
        
        const traineeId = traineeRes.items[0]?.id;
        if (!traineeId) throw new Error("Trainee profile not found");

        const [trainingData, attendanceData, completionData] = await Promise.all([
          pb.collection('trainings').getOne(id, { $autoCancel: false }),
          pb.collection('attendance').getList(1, 1, {
            filter: `training="${id}" && trainee="${traineeId}"`,
            $autoCancel: false
          }),
          pb.collection('completion_records').getList(1, 1, {
            filter: `training="${id}" && trainee="${traineeId}"`,
            $autoCancel: false
          })
        ]);

        setData({
          training: trainingData,
          attendance: attendanceData.items[0] || null,
          completion: completionData.items[0] || null
        });

      } catch (error) {
        console.error("Error fetching training details:", error);
        toast.error("Failed to load training details.");
        navigate('/my-trainings');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, currentUser, navigate]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const { training, attendance, completion } = data;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${training?.title || 'Training'} - Trainee Portal`}</title>
      </Helmet>

      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 text-slate-500 hover:text-slate-900 -ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Trainings
        </Button>

        {/* Hero Header */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
             <StatusBadge status={completion ? 'completed' : (attendance?.status || training?.status)} className="scale-110" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 max-w-2xl leading-tight">{training?.title}</h1>
          <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
            <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> {training?.date}</span>
            <span className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /> {training?.time}</span>
            {training?.location && (
              <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" /> {training.location}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Details */}
          <Card className="lg:col-span-2 border-none ring-1 ring-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <AlignLeft className="h-5 w-5 text-primary" /> About this Training
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-slate-600 leading-relaxed">
              <p>{training?.description || 'No description provided for this training session.'}</p>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Your Attendance Record</h4>
                {attendance ? (
                  <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Check-in Time</span>
                      <span className="font-medium text-slate-900">{formatDate(attendance.check_in_time)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Check-out Time</span>
                      <span className="font-medium text-slate-900">{attendance.check_out_time ? formatDate(attendance.check_out_time) : 'Not recorded'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-500">No attendance records found for this session.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Status / Actions */}
          <div className="space-y-6">
            <Card className="border-none ring-1 ring-slate-100 shadow-sm overflow-hidden">
              <CardHeader className={`${completion ? 'bg-emerald-50' : 'bg-slate-50'} pb-4`}>
                <CardTitle className="text-lg">Certification</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 text-center space-y-4">
                {completion && completion.completion_status === 'completed' ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Successfully Completed</h4>
                    <p className="text-sm text-slate-500">You met all requirements for this training module.</p>
                    <Button className="w-full mt-4" variant="outline">
                      <Download className="h-4 w-4 mr-2" /> Download Certificate
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                      <Clock className="h-8 w-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Pending Completion</h4>
                    <p className="text-sm text-slate-500">
                      Certification will be issued once the trainer marks this session as completed.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Materials shared by the instructor:</p>
                <Button variant="secondary" className="w-full justify-start text-primary bg-blue-50 hover:bg-blue-100">
                  <ExternalLink className="h-4 w-4 mr-2" /> View Course Materials
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrainingDetailPageTrainee;
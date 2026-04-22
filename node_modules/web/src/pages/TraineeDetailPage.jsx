import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, Hash, Edit, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TraineeDetailPage = () => {
  const { id } = useParams();
  const [trainee, setTrainee] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addTrainingOpen, setAddTrainingOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '', id_number: '', unique_id: '', batch: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({ training: '', status: 'completed', completion_date: '' });
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchTraineeDetails();
  }, [id]);

  const fetchTraineeDetails = async () => {
    try {
      const traineeData = await pb.collection('trainees').getOne(id, { $autoCancel: false });
      setTrainee(traineeData);
      setEditData({
        name: traineeData.name || '',
        email: traineeData.email || '',
        id_number: traineeData.id_number || '',
        unique_id: traineeData.unique_id || '',
        batch: traineeData.batch || ''
      });

      const combined = [];

      // 1. Manual completion_records
      try {
        const completionData = await pb.collection('completion_records').getFullList({
          filter: `trainee="${id}"`,
          expand: 'training',
          sort: '-completion_date',
          $autoCancel: false
        });
        completionData.forEach(r => {
          combined.push({
            id: r.id,
            source: 'manual',
            title: r.expand?.training?.title || r.training || 'Unknown Training',
            date: r.completion_date,
            status: r.status,
            attendance_date: null,
          });
        });
      } catch (err) {
        console.log('No completion records:', err);
      }

      // 2. Auto from attendance collection
      // Field names based on actual PocketBase: training (relation), trainee (relation), date, status
      try {
        const attendanceData = await pb.collection('attendance').getFullList({
          filter: `trainee="${id}"`,
          expand: 'training',
          sort: '-date',
          $autoCancel: false
        });
        attendanceData.forEach(r => {
          combined.push({
            id: r.id,
            source: 'attendance',
            title: r.expand?.training?.title || 'Unknown Training',
            date: r.expand?.training?.date || null,
            status: r.status,
            attendance_date: r.date || r.created, // use attendance date or fallback to created
          });
        });
      } catch (err) {
        console.log('No attendance records:', err);
      }

      // Sort by date descending
      combined.sort((a, b) => {
        const dateA = new Date(a.attendance_date || a.date || 0);
        const dateB = new Date(b.attendance_date || b.date || 0);
        return dateB - dateA;
      });

      setTrainingHistory(combined);
    } catch (error) {
      console.error('Error fetching trainee details:', error);
      toast.error('Failed to load trainee details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await pb.collection('trainees').update(id, editData, { $autoCancel: false });
      toast.success('Trainee updated successfully');
      setEditOpen(false);
      fetchTraineeDetails();
    } catch (error) {
      console.error('Error updating trainee:', error);
      toast.error('Failed to update trainee');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddTraining = async () => {
    if (!newRecord.training || !newRecord.completion_date) {
      toast.error('Please fill all fields');
      return;
    }
    setAddLoading(true);
    try {
      await pb.collection('completion_records').create({
        trainee: id,
        training: newRecord.training,
        status: newRecord.status,
        completion_date: newRecord.completion_date,
        $autoCancel: false
      });
      toast.success('Training record added successfully');
      setAddTrainingOpen(false);
      setNewRecord({ training: '', status: 'completed', completion_date: '' });
      fetchTraineeDetails();
    } catch (error) {
      console.error('Error adding training:', error);
      toast.error('Failed to add training record');
    } finally {
      setAddLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'absent':
      case 'failed': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-none capitalize">{status}</Badge>;
      case 'absent':
      case 'failed': return <Badge className="bg-rose-100 text-rose-700 border-none capitalize">{status}</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-none capitalize">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${trainee?.name || 'Trainee'} - Training Monitoring System`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/trainees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trainees
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Trainee Profile Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Trainee Profile</CardTitle>
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Trainee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="id_number">Employee ID</Label>
                        <Input id="id_number" value={editData.id_number}
                          onChange={(e) => setEditData({ ...editData, id_number: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="unique_id">RFID ID (for card scanning)</Label>
                        <Input id="unique_id" value={editData.unique_id}
                          onChange={(e) => setEditData({ ...editData, unique_id: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="batch">Batch/Department</Label>
                        <Input id="batch" value={editData.batch}
                          onChange={(e) => setEditData({ ...editData, batch: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} disabled={editLoading}>
                          {editLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-bold mb-2">{trainee?.name}</p>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{trainee?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Employee ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{trainee?.id_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">RFID ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{trainee?.unique_id}</p>
                  </div>
                </div>
                {trainee?.batch && (
                  <div>
                    <p className="font-medium">Batch/Department</p>
                    <p className="text-sm text-muted-foreground">{trainee?.batch}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Training History Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Training History</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manual entries + auto from attendance
                  </p>
                </div>
                <Dialog open={addTrainingOpen} onOpenChange={setAddTrainingOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Training
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Training Record</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="training">Training Name</Label>
                        <Input id="training" type="text" placeholder="Enter training name"
                          value={newRecord.training}
                          onChange={(e) => setNewRecord({ ...newRecord, training: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="completion_date">Completion Date</Label>
                        <Input id="completion_date" type="date"
                          value={newRecord.completion_date}
                          onChange={(e) => setNewRecord({ ...newRecord, completion_date: e.target.value })}
                          className="text-gray-900" />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={newRecord.status} onValueChange={(val) => setNewRecord({ ...newRecord, status: val })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddTraining} disabled={addLoading}>
                          {addLoading ? 'Adding...' : 'Add Record'}
                        </Button>
                        <Button variant="outline" onClick={() => setAddTrainingOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {trainingHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No training records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trainingHistory.map((record) => (
                      <div key={`${record.source}-${record.id}`} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-medium text-slate-900">{record.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {record.attendance_date && (
                                <p className="text-xs text-muted-foreground">
                                  📅 {new Date(record.attendance_date).toLocaleDateString()}
                                </p>
                              )}
                              {!record.attendance_date && record.date && (
                                <p className="text-xs text-muted-foreground">
                                  📅 {new Date(record.date).toLocaleDateString()}
                                </p>
                              )}
                              <span className="text-xs text-slate-400 italic">
                                {record.source === 'manual' ? 'Manual entry' : 'Auto from attendance'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </>
  );
};

export default TraineeDetailPage;
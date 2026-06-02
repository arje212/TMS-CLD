import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import TrainingForm from '@/components/TrainingForm.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Eye, Edit, Trash2, Calendar, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TrainingsPage = () => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  useEffect(() => {
    fetchTrainings();
    const interval = setInterval(() => { fetchTrainings(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrainings = async () => {
    try {
      const result = await pb.collection('trainings').getList(1, 50, {
        sort: '-date',
        $autoCancel: false
      });

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      for (const training of result.items) {
        const trainingDateTime = new Date(`${training.date}T${training.time}`);
        if (training.date < today && (training.status === 'ongoing' || training.status === 'upcoming')) {
          try {
            await pb.collection('trainings').update(training.id, { status: 'completed' }, { $autoCancel: false });
            training.status = 'completed';
          } catch (err) { console.error('Failed to auto-complete:', err); }
        }
        if (training.date === today && now >= trainingDateTime && training.status === 'upcoming') {
          try {
            await pb.collection('trainings').update(training.id, { status: 'ongoing' }, { $autoCancel: false });
            training.status = 'ongoing';
          } catch (err) { console.error('Failed to auto-update status:', err); }
        }
      }

      const upcoming = result.items.filter(t => t.date >= today);
      setTrainings(upcoming);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      toast.error('Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this training? This action cannot be undone.')) return;
    try {
      await pb.collection('trainings').delete(id, { $autoCancel: false });
      toast.success('Training deleted successfully');
      fetchTrainings();
    } catch (error) {
      toast.error('Failed to delete training');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Completed</Badge>;
      case 'ongoing':   return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Ongoing</Badge>;
      default:          return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Upcoming</Badge>;
    }
  };

  return (
    <>
      <Helmet><title>Pre-Training - TMS Pro</title></Helmet>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pre-Training</h1>
            <p className="text-muted-foreground mt-1">Manage and schedule all training sessions</p>
          </div>
          <Button onClick={() => { setSelectedTraining(null); setDialogOpen(true); }} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />Create New Training
          </Button>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : trainings.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No upcoming trainings</h3>
                <p className="text-muted-foreground mb-6">Get started by creating your first training session.</p>
                <Button onClick={() => { setSelectedTraining(null); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Create First Training
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600">Training Title</TableHead>
                    <TableHead className="font-semibold text-slate-600">Schedule</TableHead>
                    <TableHead className="font-semibold text-slate-600">Location</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map(training => (
                    <TableRow key={training.id} className="hover:bg-slate-50/50 transition-colors border-b-slate-100">
                      <TableCell className="font-medium text-slate-900 py-4">{training.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center text-sm text-slate-700">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {training.date}
                          </span>
                          <span className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {training.time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center text-sm text-slate-700">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {training.location}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(training.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50">
                            <Link to={`/pre-training/${training.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50"
                            onClick={() => { setSelectedTraining(training); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50"
                            onClick={() => handleDelete(training.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedTraining ? 'Edit Training Session' : 'Create New Training'}
            </DialogTitle>
          </DialogHeader>
          <TrainingForm
            training={selectedTraining}
            onSuccess={() => { setDialogOpen(false); fetchTrainings(); }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainingsPage;
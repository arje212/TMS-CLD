import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, BookOpen } from 'lucide-react';
import TrainingCard from '@/components/TrainingCard.jsx';
import { toast } from 'sonner';

const MyTrainingsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMyTrainings();
  }, [currentUser]);

  const fetchMyTrainings = async () => {
    try {
      setLoading(true);
      // 1. Get trainee profile
      const traineeRes = await pb.collection('trainees').getList(1, 1, {
        filter: `email="${currentUser.email}"`,
        $autoCancel: false
      });

      if (traineeRes.items.length === 0) {
        setLoading(false);
        return;
      }
      const traineeId = traineeRes.items[0].id;

      // 2. Get attendance and completions
      const [attendanceRes, completionsRes] = await Promise.all([
        pb.collection('attendance').getFullList({
          filter: `trainee="${traineeId}"`,
          sort: '-created',
          expand: 'training',
          $autoCancel: false
        }),
        pb.collection('completion_records').getFullList({
          filter: `trainee="${traineeId}"`,
          $autoCancel: false
        })
      ]);

      const mappedTrainings = attendanceRes.map(record => {
        const t = record.expand?.training || {};
        const isCompleted = completionsRes.some(c => c.training === t.id && c.status === 'completed');
        
        // Derive comprehensive status for filtering
        let derivedStatus = 'pending';
        if (isCompleted) derivedStatus = 'completed';
        else if (t.status === 'ongoing') derivedStatus = 'ongoing';
        else if (record.status === 'absent') derivedStatus = 'absent';
        else if (record.status === 'present') derivedStatus = 'present';

        return {
          id: t.id,
          title: t.title || 'Unknown Training',
          date: t.date || 'TBD',
          time: t.time || 'TBD',
          location: t.location || 'Virtual',
          attendanceStatus: record.status,
          completionStatus: isCompleted ? 'completed' : (t.status === 'completed' ? 'pending' : 'ongoing'),
          filterStatus: derivedStatus
        };
      });

      setTrainings(mappedTrainings);
    } catch (error) {
      console.error('Error fetching my trainings:', error);
      toast.error('Failed to load your training records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          t.completionStatus === statusFilter || 
                          t.attendanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Helmet>
        <title>My Trainings - Trainee Portal</title>
      </Helmet>

      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Trainings</h1>
          <p className="text-muted-foreground mt-1">Review your training history and attendance records.</p>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search trainings by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex gap-4 sm:w-auto w-full">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200">
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : filteredTrainings.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <BookOpen className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Trainings Found</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your filters to see more results." 
                : "You don't have any training records yet."}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrainings.map(training => (
              <TrainingCard 
                key={training.id} 
                training={training} 
                onClick={() => navigate(`/my-trainings/${training.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MyTrainingsPage;
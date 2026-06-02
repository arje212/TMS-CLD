import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Search, Eye, Pencil, Trash2, Calendar, Clock, MapPin,
  BookOpen, ChevronRight, Layers
} from 'lucide-react';

const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const COLOR_OPTIONS = ['yellow', 'blue', 'green', 'red', 'purple', 'orange'];

const statusColor = {
  upcoming: 'bg-yellow-100 text-yellow-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const defaultForm = {
  training_code: '',
  title: '',
  description: '',
  date: '',
  time: '',
  end_time: '',
  trainer: '',
  location: '',
  status: 'upcoming',
  color: 'yellow',
  batch: '',
};

export default function SHTrainingsPage() {
  const [trainings, setTrainings] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTraining, setEditTraining] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchTrainings();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await pb.collection('sh_batches').getFullList({ sort: '-created', $autoCancel: false });
      setBatches(res);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const res = await pb.collection('sh_trainings').getFullList({
        sort: '-date',
        expand: 'batch',
        $autoCancel: false,
      });
      setTrainings(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditTraining(null);
    setFormData(defaultForm);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditTraining(t);
    setFormData({
      training_code: t.training_code || '',
      title: t.title || '',
      description: t.description || '',
      date: t.date ? t.date.slice(0, 10) : '',
      time: t.time || '',
      end_time: t.end_time || '',
      trainer: t.trainer || '',
      location: t.location || '',
      status: t.status || 'upcoming',
      color: t.color || 'yellow',
      batch: t.batch || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date || !formData.batch) {
      toast.error('Title, Date, and Batch are required.');
      return;
    }
    setSaving(true);
    try {
      if (editTraining) {
        await pb.collection('sh_trainings').update(editTraining.id, formData, { $autoCancel: false });
        toast.success('Training updated!');
      } else {
        await pb.collection('sh_trainings').create(formData, { $autoCancel: false });
        toast.success('Training created!');
      }
      setShowForm(false);
      fetchTrainings();
    } catch (e) {
      toast.error('Failed to save training.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await pb.collection('sh_trainings').delete(deleteId, { $autoCancel: false });
      toast.success('Training deleted.');
      setDeleteId(null);
      fetchTrainings();
    } catch (e) {
      toast.error('Failed to delete training.');
    }
  };

  const filtered = trainings.filter((t) => {
    const matchSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.training_code?.toLowerCase().includes(search.toLowerCase()) ||
      t.trainer?.toLowerCase().includes(search.toLowerCase());
    const matchBatch = batchFilter === 'all' || t.batch === batchFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchBatch && matchStatus;
  });

  return (
    <>
      <Helmet>
        <title>Senior High — Pre-Training</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Senior High Pre-Training
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage training sessions per batch</p>
          </div>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Training
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, code, trainer..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name || b.batch_name || b.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Training List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading trainings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No trainings found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => {
              const batch = batches.find((b) => b.id === t.batch);
              return (
                <Card
                  key={t.id}
                  className="border-none ring-1 ring-slate-100 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-lg">{t.title}</h3>
                          {t.training_code && (
                            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                              {t.training_code}
                            </span>
                          )}
                          <Badge className={`text-xs ${statusColor[t.status] || 'bg-gray-100 text-gray-700'}`}>
                            {t.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          {t.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {t.date.slice(0, 10)}
                            </span>
                          )}
                          {t.time && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {t.time}{t.end_time ? ` – ${t.end_time}` : ''}
                            </span>
                          )}
                          {t.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {t.location}
                            </span>
                          )}
                          {batch && (
                            <span className="flex items-center gap-1.5">
                              <Layers className="h-4 w-4 text-slate-400" />
                              {batch.name || batch.batch_name || 'Batch'}
                            </span>
                          )}
                        </div>
                        {t.trainer && (
                          <p className="text-xs text-slate-400">Trainer: {t.trainer}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/senior-high/pre-training/${t.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link to={`/senior-high/pre-training/${t.id}`}>
                          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                            View
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTraining ? 'Edit Training' : 'New Training'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Training Code</Label>
                <Input
                  value={formData.training_code}
                  onChange={(e) => setFormData({ ...formData, training_code: e.target.value })}
                  placeholder="e.g., SH-T001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Batch <span className="text-red-500">*</span></Label>
                <Select value={formData.batch} onValueChange={(v) => setFormData({ ...formData, batch: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name || b.batch_name || b.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Training title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Training description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Trainer</Label>
                <Input
                  value={formData.trainer}
                  onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                  placeholder="Trainer name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Room / Venue"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editTraining ? 'Update Training' : 'Create Training'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Training?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">This action cannot be undone. All attendance records for this training will remain but the training will be removed.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleDelete} className="flex-1">Delete</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

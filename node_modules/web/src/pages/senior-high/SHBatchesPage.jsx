import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, BookMarked, Calendar, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed'];

const statusColor = {
  upcoming:  'bg-amber-50 text-amber-700',
  ongoing:   'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

const emptyForm = { school: '', batch_number: '', date_start: '', date_end: '', status: 'upcoming', notes: '' };

const SHBatchesPage = () => {
  const [batches, setBatches]       = useState([]);
  const [schools, setSchools]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState({});
  const [resetting, setResetting]   = useState(null); // batch id being reset

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [batchData, schoolData] = await Promise.all([
        pb.collection('sh_batches').getFullList({ sort: '-date_start', expand: 'school', $autoCancel: false }),
        pb.collection('sh_schools').getFullList({ sort: 'name', $autoCancel: false }),
      ]);
      setBatches(batchData);
      setSchools(schoolData);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (batch) => {
    setEditing(batch);
    setForm({
      school: batch.school, batch_number: batch.batch_number,
      date_start: batch.date_start, date_end: batch.date_end,
      status: batch.status, notes: batch.notes || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.school)       e.school       = 'Piliin ang school.';
    if (!form.batch_number) e.batch_number = 'Kailangan ang batch number.';
    if (!form.date_start)   e.date_start   = 'Kailangan ang start date.';
    if (!form.date_end)     e.date_end     = 'Kailangan ang end date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, batch_number: Number(form.batch_number) };
      if (editing) {
        await pb.collection('sh_batches').update(editing.id, payload, { $autoCancel: false });
        toast.success('Batch updated!');
      } else {
        await pb.collection('sh_batches').create(payload, { $autoCancel: false });
        toast.success('Batch created!');
      }
      setDialogOpen(false);
      fetchData();
    } catch { toast.error('Failed to save batch.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this batch? Students and attendance under this batch will be affected.')) return;
    try {
      await pb.collection('sh_batches').delete(id, { $autoCancel: false });
      toast.success('Batch deleted.');
      fetchData();
    } catch { toast.error('Failed to delete batch.'); }
  };

  // ── Reset RFID ─────────────────────────────────────────────────────────────
  const handleResetRFID = async (batch) => {
    if (!window.confirm(
      `Reset RFID ng lahat ng students sa "${batch.expand?.school?.name} — Batch ${batch.batch_number}"?\n\nAng lahat ng unique_id ay mababago at magiging blank. Gagamitin ito para sa susunod na batch.`
    )) return;

    setResetting(batch.id);
    try {
      // Get all students in this batch
      const students = await pb.collection('sh_students').getFullList({
        filter: `batch = "${batch.id}"`, $autoCancel: false,
      });

      // Clear unique_id for each student
      for (const student of students) {
        await pb.collection('sh_students').update(student.id, {
          unique_id: '',
        }, { $autoCancel: false });
      }

      toast.success(`Done! ${students.length} RFID cards na-reset. Pwede na gamitin para sa susunod na batch.`);
    } catch { toast.error('Failed to reset RFID.'); }
    finally { setResetting(null); }
  };

  return (
    <>
      <Helmet><title>Batches - Senior High</title></Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Training Batches</h1>
            <p className="text-muted-foreground mt-1">Bawat batch = 1 school, 10-day training program.</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> New Batch</Button>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : batches.length === 0 ? (
              <div className="text-center py-16">
                <BookMarked className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Walang batches pa.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">School</TableHead>
                    <TableHead className="font-semibold text-slate-600">Batch</TableHead>
                    <TableHead className="font-semibold text-slate-600">Date Start</TableHead>
                    <TableHead className="font-semibold text-slate-600">Date End</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch, i) => (
                    <TableRow key={batch.id} className="hover:bg-slate-50/50 border-b-slate-100">
                      <TableCell className="text-slate-500 text-sm">{i + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{batch.expand?.school?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">Batch {batch.batch_number}</TableCell>
                      <TableCell className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {batch.date_start}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{batch.date_end}</TableCell>
                      <TableCell>
                        <Badge className={`border-none text-xs ${statusColor[batch.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50">
                            <Link to={`/senior-high/batches/${batch.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50"
                            onClick={() => openEdit(batch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Reset RFID — show only for completed batches */}
                          {batch.status === 'completed' && (
                            <Button variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => handleResetRFID(batch)}
                              disabled={resetting === batch.id}
                              title="Reset RFID cards para sa susunod na batch">
                              {resetting === batch.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <RotateCcw className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50"
                            onClick={() => handleDelete(batch.id)}>
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-primary" />
              {editing ? 'Edit Batch' : 'New Training Batch'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Partner School <span className="text-red-500">*</span></Label>
              <select value={form.school}
                onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                className={`w-full h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm ${errors.school ? 'border-red-400' : 'border-input'}`}>
                <option value="">— Piliin ang school —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.school && <p className="text-xs text-red-500">{errors.school}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Batch Number <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" placeholder="e.g. 1" value={form.batch_number}
                  onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))}
                  className={errors.batch_number ? 'border-red-400' : ''} />
                {errors.batch_number && <p className="text-xs text-red-500">{errors.batch_number}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date Start <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.date_start}
                  onChange={e => setForm(p => ({ ...p, date_start: e.target.value }))}
                  className={errors.date_start ? 'border-red-400' : ''} />
                {errors.date_start && <p className="text-xs text-red-500">{errors.date_start}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date End <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.date_end}
                  onChange={e => setForm(p => ({ ...p, date_end: e.target.value }))}
                  className={errors.date_end ? 'border-red-400' : ''} />
                {errors.date_end && <p className="text-xs text-red-500">{errors.date_end}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Batch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SHBatchesPage;
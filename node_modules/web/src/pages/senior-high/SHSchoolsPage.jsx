import React, { useState, useEffect } from 'react';
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
import { Plus, Edit, Trash2, School, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', address: '', contact_person: '', contact_number: '', status: 'active' };

const SHSchoolsPage = () => {
  const [schools, setSchools]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState({});

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    try {
      const items = await pb.collection('sh_schools').getFullList({ sort: 'name', $autoCancel: false });
      setSchools(items);
    } catch (err) {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (school) => {
    setEditing(school);
    setForm({ name: school.name, address: school.address, contact_person: school.contact_person, contact_number: school.contact_number, status: school.status });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'School name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await pb.collection('sh_schools').update(editing.id, form, { $autoCancel: false });
        toast.success('School updated!');
      } else {
        await pb.collection('sh_schools').create(form, { $autoCancel: false });
        toast.success('School added!');
      }
      setDialogOpen(false);
      fetchSchools();
    } catch {
      toast.error('Failed to save school.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this school? This will also affect related batches and students.')) return;
    try {
      await pb.collection('sh_schools').delete(id, { $autoCancel: false });
      toast.success('School deleted.');
      fetchSchools();
    } catch {
      toast.error('Failed to delete school.');
    }
  };

  return (
    <>
      <Helmet><title>Schools - Senior High</title></Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Partner Schools</h1>
            <p className="text-muted-foreground mt-1">Manage all Senior High partner schools.</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add School</Button>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : schools.length === 0 ? (
              <div className="text-center py-16">
                <School className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Walang schools pa. Mag-add ng partner school.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">School Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">Address</TableHead>
                    <TableHead className="font-semibold text-slate-600">Contact Person</TableHead>
                    <TableHead className="font-semibold text-slate-600">Contact No.</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school, i) => (
                    <TableRow key={school.id} className="hover:bg-slate-50/50 border-b-slate-100">
                      <TableCell className="text-slate-500 text-sm">{i + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{school.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{school.address || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{school.contact_person || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{school.contact_number || '—'}</TableCell>
                      <TableCell>
                        <Badge className={school.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-none' : 'bg-slate-100 text-slate-600 border-none'}>
                          {school.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50" onClick={() => openEdit(school)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50" onClick={() => handleDelete(school.id)}>
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
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              {editing ? 'Edit School' : 'Add Partner School'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>School Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. BICAS" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase() }))} className={errors.name ? 'border-red-400' : ''} />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="e.g. Biñan, Laguna" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input placeholder="e.g. Juan Dela Cruz" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input placeholder="e.g. 09XX-XXX-XXXX" value={form.contact_number} onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add School'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SHSchoolsPage;
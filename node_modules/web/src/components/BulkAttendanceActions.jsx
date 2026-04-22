import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, XSquare, Download } from 'lucide-react';
import { toast } from 'sonner';

const BulkAttendanceActions = ({ assignments, attendanceRecords, onMarkAllPresent, onMarkAllAbsent }) => {
  
  const handleExport = () => {
    if (!assignments.length) {
      toast.error('No data to export');
      return;
    }

    const data = assignments.map(a => {
      const trainee = a.expand?.trainee;
      const record = attendanceRecords.find(r => r.trainee === trainee?.id);
      return {
        Name: trainee?.name || 'Unknown',
        ID: trainee?.unique_id || 'N/A',
        Status: record?.status || 'pending',
        CheckIn: record?.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'N/A',
        CheckOut: record?.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A'
      };
    });

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => {
        if(window.confirm('Mark all pending trainees as present?')) onMarkAllPresent();
      }}>
        <CheckSquare className="h-4 w-4 mr-2" /> Mark All Present
      </Button>
      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
        if(window.confirm('Mark all pending trainees as absent?')) onMarkAllAbsent();
      }}>
        <XSquare className="h-4 w-4 mr-2" /> Mark All Absent
      </Button>
      <Button variant="secondary" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" /> Export CSV
      </Button>
    </div>
  );
};

export default BulkAttendanceActions;
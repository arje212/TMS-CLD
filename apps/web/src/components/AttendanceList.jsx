import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import AttendanceStatus from './AttendanceStatus.jsx';

const AttendanceList = ({ assignments, attendanceRecords, onMarkPresent, onMarkAbsent, onCheckout }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssignments = assignments.filter(a => 
    a.expand?.trainee?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.expand?.trainee?.unique_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentTrainees = filteredAssignments.filter(a => {
    const record = attendanceRecords.find(r => r.trainee === a.trainee);
    return record?.status === 'present';
  });

  const absentOrPendingTrainees = filteredAssignments.filter(a => {
    const record = attendanceRecords.find(r => r.trainee === a.trainee);
    return !record || record.status !== 'present';
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search trainees by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Present ({presentTrainees.length})
        </h3>
        {presentTrainees.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No trainees present yet.</p>
        ) : (
          <div className="grid gap-3">
            {presentTrainees.map(assignment => {
              const trainee = assignment.expand.trainee;
              const record = attendanceRecords.find(r => r.trainee === trainee.id);
              return (
                <AttendanceStatus
                  key={trainee.id}
                  trainee={trainee}
                  record={record}
                  onMarkPresent={onMarkPresent}
                  onMarkAbsent={onMarkAbsent}
                  onCheckout={onCheckout}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Absent / Pending ({absentOrPendingTrainees.length})
        </h3>
        {absentOrPendingTrainees.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">All assigned trainees are present.</p>
        ) : (
          <div className="grid gap-3">
            {absentOrPendingTrainees.map(assignment => {
              const trainee = assignment.expand.trainee;
              const record = attendanceRecords.find(r => r.trainee === trainee.id);
              return (
                <AttendanceStatus
                  key={trainee.id}
                  trainee={trainee}
                  record={record}
                  onMarkPresent={onMarkPresent}
                  onMarkAbsent={onMarkAbsent}
                  onCheckout={onCheckout}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceList;
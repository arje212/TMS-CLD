import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const AttendanceStatus = ({ trainee, record, onMarkPresent, onMarkAbsent, onCheckout }) => {
  const status = record?.status || 'pending';

  const formatHHMM = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':');
    const hour = Number(h);
    if (Number.isNaN(hour)) return hhmm;
    const display = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${display}:${m || '00'} ${ampm}`;
  };
  
  const getStatusBadge = () => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Checked In</Badge>;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:shadow-sm transition-all">
      <div className="mb-4 sm:mb-0">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-semibold text-base">{trainee.name}</h4>
          {getStatusBadge()}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{trainee.unique_id || trainee.id_number || 'No ID'}</span>
          {record?.time_in && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> In: {formatHHMM(record.time_in)}
            </span>
          )}
          {record?.time_out && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Out: {formatHHMM(record.time_out)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status !== 'present' && (
          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => onMarkPresent(trainee.id)}>
            <CheckCircle className="h-4 w-4 mr-1" /> Present
          </Button>
        )}
        {status !== 'absent' && (
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onMarkAbsent(trainee.id)}>
            <XCircle className="h-4 w-4 mr-1" /> Absent
          </Button>
        )}
        {status === 'present' && record && !record?.time_out && (
          <Button size="sm" variant="secondary" onClick={() => onCheckout(record.id)}>
            Check Out
          </Button>
        )}
      </div>
    </div>
  );
};

export default AttendanceStatus;

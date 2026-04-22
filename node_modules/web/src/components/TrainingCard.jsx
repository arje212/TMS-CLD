import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

const TrainingCard = ({ training, onClick }) => {
  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 border-none ring-1 ring-slate-100 group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 bg-white">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors text-lg">
              {training.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                {training.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {training.time}
              </span>
              {training.location && (
                <span className="flex items-center gap-1.5 hidden sm:flex">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {training.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={training.attendanceStatus || training.status} />
              {training.completionStatus && training.completionStatus !== 'pending' && (
                <span className="text-xs font-medium text-muted-foreground">
                  {training.completionStatus === 'completed' ? 'Certified' : 'Not Certified'}
                </span>
              )}
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors ml-2 hidden sm:flex">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingCard;
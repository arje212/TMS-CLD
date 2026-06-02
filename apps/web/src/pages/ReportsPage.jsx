import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, TrendingUp, Users, Calendar, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [completionReport, setCompletionReport] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterTraining, setFilterTraining] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterName, setFilterName] = useState('');

  // Unique training titles for dropdown
  const trainingOptions = useMemo(() => {
    const titles = [...new Set(attendanceReport.map(r => r.expand?.training?.title).filter(Boolean))];
    return titles;
  }, [attendanceReport]);

  // Filtered attendance records
  const filteredAttendance = useMemo(() => {
    return attendanceReport.filter(record => {
      const trainingTitle = record.expand?.training?.title || '';
      const traineeName = record.expand?.trainee?.name || '';
      const recordDate = new Date(record.created).toLocaleDateString('en-CA');

      const matchTraining = filterTraining === 'all' || trainingTitle === filterTraining;
      const matchDate = !filterDate || recordDate === filterDate;
      const matchName = !filterName || traineeName.toLowerCase().includes(filterName.toLowerCase());

      return matchTraining && matchDate && matchName;
    });
  }, [attendanceReport, filterTraining, filterDate, filterName]);

  const clearFilters = () => {
    setFilterTraining('all');
    setFilterDate('');
    setFilterName('');
  };

  const hasActiveFilters = filterTraining !== 'all' || filterDate !== '' || filterName !== '';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [traineesData, trainingsData, attendanceData, completionData] = await Promise.all([
        pb.collection('trainees').getList(1, 1, { $autoCancel: false }),
        pb.collection('trainings').getList(1, 50, { $autoCancel: false }),
        pb.collection('attendance').getList(1, 200, {
          expand: 'training,trainee',
          sort: '-created',
          $autoCancel: false
        }),
        pb.collection('completion_records').getList(1, 100, {
          expand: 'training,trainee',
          $autoCancel: false
        })
      ]);

      const totalTrainees = traineesData.totalItems;
      const totalTrainings = trainingsData.totalItems;
      const completedTrainings = trainingsData.items.filter(t => t.status === 'completed').length;
      const attendanceRate = attendanceData.totalItems > 0
        ? ((attendanceData.items.filter(a => a.status === 'present').length / attendanceData.totalItems) * 100).toFixed(1)
        : 0;

      setStats({ totalTrainees, totalTrainings, completedTrainings, attendanceRate });
      setAttendanceReport(attendanceData.items);
      setCompletionReport(completionData.items);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast('No data to export');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast('Export completed');
  };

  const exportAttendanceSheet = async (trainingTitle, attendanceData) => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    try {
      let logoImg = '';
      try {
        const response = await fetch('/torres-logo.png');
        if (response.ok) {
          const blob = await response.blob();
          logoImg = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {}

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #c41e3a; padding-bottom: 15px; }
              .header-logo { margin-bottom: 10px; }
              .header-logo img { height: 50px; }
              .header-title { font-size: 20px; font-weight: bold; color: #003366; }
              .header-subtitle { font-size: 14px; color: #666; }
              .content { margin: 20px 0; }
              .form-section { margin-bottom: 15px; font-size: 12px; }
              .form-row { display: flex; gap: 30px; margin-bottom: 8px; }
              .form-field { flex: 1; }
              .form-label { font-weight: bold; }
              .form-value { border-bottom: 1px solid #000; min-height: 20px; }
              .activity-section { margin: 10px 0; }
              .activity-label { font-weight: bold; margin-bottom: 5px; }
              .checkboxes { margin-left: 10px; font-size: 12px; }
              .checkbox { margin-right: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              table, th, td { border: 1px solid #000; }
              th { background-color: #e8e8e8; font-weight: bold; padding: 8px; text-align: left; }
              td { padding: 15px 8px; height: 20px; }
              .footer-section { margin-top: 20px; font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoImg ? `<div class="header-logo"><img src="${logoImg}" alt="Torres Logo" /></div>` : ''}
              <div class="header-title">TORRES TECHNOLOGY CENTER CORPORATION</div>
              <div class="header-subtitle">Attendance Sheet</div>
            </div>
            <div class="content">
              <div class="form-section">
                <div class="form-row">
                  <div class="form-field"><span class="form-label">DATE:</span><div class="form-value"></div></div>
                  <div class="form-field"><span class="form-label">TIME STARTED:</span><div class="form-value"></div></div>
                  <div class="form-field"><span class="form-label">TIME ENDED:</span><div class="form-value"></div></div>
                </div>
                <div class="form-row">
                  <div class="form-field" style="flex: 2;"><span class="form-label">SUBJECT:</span><div class="form-value">${trainingTitle || ''}</div></div>
                </div>
                <div class="form-row">
                  <div class="form-field" style="flex: 1.5;"><span class="form-label">VENUE:</span><div class="form-value"></div></div>
                  <div class="form-field" style="flex: 1.5;"><span class="form-label">CHAMPION/LECTURER:</span><div class="form-value"></div></div>
                </div>
                <div class="activity-section">
                  <div class="activity-label">Type of Activity:</div>
                  <div class="checkboxes">
                    <span class="checkbox">☐ Meeting</span>
                    <span class="checkbox">☐ Training / Seminar</span>
                    <span class="checkbox">☐ Orientation / Workshop</span>
                  </div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 5%;">NO.</th>
                    <th style="width: 12%;">EMPLOYEE NO.</th>
                    <th style="width: 20%;">NAME</th>
                    <th style="width: 13%;">COMPANY</th>
                    <th style="width: 15%;">DEPARTMENT</th>
                    <th style="width: 35%;">SIGNATURE OF ATTENDEE</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceData.map((record, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${record.employeeId || ''}</td>
                      <td>${record.name || ''}</td>
                      <td>TORRES TECH</td>
                      <td>${record.department || ''}</td>
                      <td></td>
                    </tr>
                  `).join('')}
                  ${Array(Math.max(0, 50 - attendanceData.length)).fill(null).map((_, idx) => `
                    <tr>
                      <td>${attendanceData.length + idx + 1}</td>
                      <td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="footer-section">
                <div><strong>REMARKS:</strong></div>
                <div style="border: 1px solid #000; height: 60px; margin-bottom: 20px;"></div>
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                  <div>Established February 08, 2005</div>
                  <div>QMS-F018</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      document.body.appendChild(element);

      html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }).then(canvas => {
        document.body.removeChild(element);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/png');
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }
        pdf.save(`attendance_sheet_${trainingTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Attendance sheet exported!');
      }).catch(error => {
        document.body.removeChild(element);
        toast.error('Failed to generate PDF');
      });
    } catch (error) {
      toast.error('Failed to export attendance sheet');
    }
  };

  return (
    <>
      <Helmet>
        <title>Reports - Training Monitoring System</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into training performance</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trainees</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.totalTrainees || 0}</div></CardContent>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trainings</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.totalTrainings || 0}</div></CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.completedTrainings || 0}</div></CardContent>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.attendanceRate || 0}%</div></CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detailed Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4">
              <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
              <TabsTrigger value="completion">Completion Report</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              {/* Filter Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Filter Records</span>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" /> Clear Filters
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Training Title</Label>
                    <Select value={filterTraining} onValueChange={setFilterTraining}>
                      <SelectTrigger className="bg-white h-9 text-sm">
                        <SelectValue placeholder="All Trainings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Trainings</SelectItem>
                        {trainingOptions.map(title => (
                          <SelectItem key={title} value={title}>{title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Date</Label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-white h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Trainee Name</Label>
                    <Input
                      type="text"
                      placeholder="Search name..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="bg-white h-9 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredAttendance.length}</span> of {attendanceReport.length} records
                </p>
              </div>

              {/* Export Button */}
              <div className="mb-4">
                <Button
                  onClick={() => {
                    const trainingName = filterTraining !== 'all' ? filterTraining : (filteredAttendance[0]?.expand?.training?.title || 'Training');
                    exportAttendanceSheet(
                      trainingName,
                      filteredAttendance.map(r => ({
                        employeeId: r.expand?.trainee?.id_number || 'N/A',
                        name: r.expand?.trainee?.name || 'Unknown',
                        department: r.expand?.trainee?.batch || '',
                        status: r.status
                      }))
                    );
                  }}
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Attendance Sheet {hasActiveFilters ? '(Filtered)' : ''}
                </Button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No records match your filters</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Training</TableHead>
                      <TableHead>Trainee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.expand?.training?.title || record.training || 'Unknown'}</TableCell>
                        <TableCell>{record.expand?.trainee?.name || 'Unknown'}</TableCell>
                        <TableCell>{new Date(record.created).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'present'
                              ? 'bg-emerald-100 text-emerald-700'
                              : record.status === 'late'
                              ? 'bg-amber-100 text-amber-700'
                              : record.status === 'incomplete'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="completion">
              <div className="mb-4">
                <Button
                  onClick={() => exportToCSV(
                    completionReport.map(r => ({
                      Training: r.expand?.training?.title || r.training,
                      Trainee: r.expand?.trainee?.name || r.trainee,
                      CompletionDate: r.completion_date ? new Date(r.completion_date).toLocaleDateString() : 'N/A',
                      Status: r.status
                    })),
                    'completion_report.csv'
                  )}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : completionReport.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No completion data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Training</TableHead>
                      <TableHead>Trainee</TableHead>
                      <TableHead>Completion Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionReport.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.expand?.training?.title || record.training || 'Unknown'}</TableCell>
                        <TableCell>{record.expand?.trainee?.name || 'Unknown'}</TableCell>
                        <TableCell>{record.completion_date ? new Date(record.completion_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{record.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default ReportsPage;
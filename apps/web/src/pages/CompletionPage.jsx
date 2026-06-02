import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const CompletionPage = () => {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletions();
  }, []);

  const fetchCompletions = async () => {
    try {
      const result = await pb.collection('completion_records').getList(1, 50, {
        expand: 'training,trainee',
        sort: '-completion_date',
        $autoCancel: false
      });
      setCompletions(result.items);
    } catch (error) {
      console.error('Error fetching completions:', error);
      toast('Failed to load completion records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Completion Records - Training Monitoring System</title>
        <meta name="description" content="View all training completion records" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Completion Records</h1>
            <p className="text-muted-foreground">View all training completions</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Completions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : completions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No completion records found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trainee Name</TableHead>
                      <TableHead>Training Name</TableHead>
                      <TableHead>Date Completed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completions.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.expand?.trainee?.name || 'Unknown Trainee'}
                        </TableCell>
                        <TableCell>{record.expand?.training?.title || 'Unknown Training'}</TableCell>
                        <TableCell>
                          {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'completed' ? 'default' : 'outline'}>
                            {record.status || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default CompletionPage;

import { useState, useEffect, FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { RefreshCw, Trash2, Plus, Edit2 } from "lucide-react";

export default function SyncHistoryDashboard() {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // T17 Item 1: handleToggleJob and handleDeleteJob were missing — called in JSX but never defined
  const handleToggleJob = (job: { id: number; enabled: boolean }) => {
    updateJobMutation.mutate({ jobId: job.id, enabled: !job.enabled });
  };

  const handleDeleteJob = (jobId: number) => {
    if (!window.confirm('Delete this sync job? This cannot be undone.')) return;
    deleteJobMutation.mutate({ jobId });
  };

  // T16 Item 2: handleCreateJob was missing — form onSubmit threw ReferenceError
  const handleCreateJob = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const jobName = (data.get('jobName') as string)?.trim();
    const scheduleType = data.get('scheduleType') as 'hourly' | 'daily' | 'weekly' | 'monthly';
    const scheduleTime = (data.get('scheduleTime') as string) || undefined;
    const scheduleDay = (data.get('scheduleDay') as string) || undefined;
    if (!jobName || !scheduleType) return;
    createJobMutation.mutate({ jobName, scheduleType, scheduleTime, scheduleDay });
  };

  // Queries
  const { data: syncJobs = [], refetch: refetchJobs } =
    trpc.integrations.getAllSyncJobs.useQuery();
  const { data: syncHistory = [], refetch: refetchHistory } =
    trpc.integrations.getSyncHistory.useQuery({ limit: 50 });

  // Mutations
  const createJobMutation = trpc.integrations.createSyncJob.useMutation({
    onSuccess: () => {
      refetchJobs();
      setShowCreateForm(false);
    },
  });

  const updateJobMutation = trpc.integrations.updateSyncJob.useMutation({
    onSuccess: () => {
      refetchJobs();
    },
  });

  const deleteJobMutation = trpc.integrations.deleteSyncJob.useMutation({
    onSuccess: () => {
      refetchJobs();
      setSelectedJob(null);
    },
  });

  // Auto-refresh history every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchHistory();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchHistory]);

  // Helper: compute success rate percentage from sync history
  function getSuccessRate(): number {
    if (syncHistory.length === 0) return 0;
    const successful = syncHistory.filter((s: any) => s.status === "success").length;
    return Math.round((successful / syncHistory.length) * 100);
  }

  // Helper: total contacts synced across all history entries
  function getTotalSynced(): number {
    return syncHistory.reduce((sum: number, s: any) => sum + (s.syncedContacts || 0), 0);
  }

  // Helper: returns a coloured Badge for a sync/job status string
  function getStatusBadge(status: string) {
    if (status === "success")
      return <Badge className="bg-green-100 text-green-800 border-green-300">Success</Badge>;
    if (status === "failed" || status === "error")
      return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
    if (status === "running")
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Running</Badge>;
    if (status === "pending")
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Zoho Sync Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage Zoho Books synchronization jobs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Syncs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncHistory.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getSuccessRate()}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contacts Synced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalSynced()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {syncJobs.filter((j) => j.enabled).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scheduled Jobs */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scheduled Jobs</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Job
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showCreateForm && (
                  <form onSubmit={handleCreateJob} className="mb-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Job Name</label>
                      <input
                        type="text"
                        name="jobName"
                        placeholder="e.g., Daily Sync"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Schedule</label>
                      <select
                        name="scheduleType"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        required
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Time (HH:MM)</label>
                      <input
                        type="time"
                        name="scheduleTime"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Day</label>
                      <select
                        name="scheduleDay"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="">Any</option>
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="flex-1"
                        disabled={createJobMutation.isPending}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {syncJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedJob === job.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedJob(job.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.jobName}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.scheduleType}
                            {job.scheduleTime && ` at ${job.scheduleTime}`}
                          </p>
                          {job.lastRunAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last run:{" "}
                              {format(new Date(job.lastRunAt), "MMM d, HH:mm")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleJob(job);
                            }}
                          >
                            {job.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(job.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {job.lastStatus && (
                        <div className="mt-2">
                          {getStatusBadge(job.lastStatus)}
                        </div>
                      )}
                    </div>
                  ))}

                  {syncJobs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No scheduled jobs yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sync History</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchHistory()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contacts</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncHistory.map((sync) => (
                        <TableRow key={sync.id}>
                          <TableCell className="capitalize text-sm">
                            {sync.syncType}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sync.status)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="text-green-600">
                              {sync.syncedContacts || 0}
                            </span>
                            {sync.failedContacts > 0 && (
                              <span className="text-red-600 ml-2">
                                / {sync.failedContacts} failed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sync.durationMs
                              ? `${(sync.durationMs / 1000).toFixed(1)}s`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(sync.startedAt), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {syncHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sync history yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


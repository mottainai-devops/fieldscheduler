import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, CheckCircle2, XCircle, Clock, Link2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useState } from "react";

export default function BuildingGroups() {
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);

  const { data: pendingRequests = [], refetch } = trpc.fieldWorker.getPendingLinkageRequests.useQuery();
  const { data: approvedRelations = [] } = trpc.fieldWorker.getAllLinkageRelationships.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.fieldWorker.approveLinkageRequest.useMutation({
    onSuccess: () => {
      toast.success("Linkage request approved");
      refetch();
      utils.fieldWorker.getAllLinkageRelationships.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.fieldWorker.rejectLinkageRequest.useMutation({
    onSuccess: () => {
      toast.success("Linkage request rejected");
      refetch();
      setRejectingRequestId(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const removeMutation = trpc.fieldWorker.removeLinkageRelationship.useMutation({
    onSuccess: () => {
      toast.success("Linkage relationship removed");
      utils.fieldWorker.getAllLinkageRelationships.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const handleApprove = (requestId: number) => {
    // In a real app, get the actual user ID from auth context
    approveMutation.mutate({ requestId, userId: 1 });
  };

  const handleReject = () => {
    if (!rejectingRequestId) return;
    // In a real app, get the actual user ID from auth context
    rejectMutation.mutate({
      requestId: rejectingRequestId,
      userId: 1,
      rejectionReason: rejectionReason || undefined,
    });
  };

  const handleRemove = (relationId: number) => {
    if (confirm("Are you sure you want to remove this linkage relationship?")) {
      removeMutation.mutate({ relationId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Building ID Linkages" subtitle="Review and manage building ID linkage requests" />

      <div className="container mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Approved Linkages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{approvedRelations.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Customers Linked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{approvedRelations.length * 2}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Pending Linkage Requests
          </h2>
          {pendingRequests.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-8 text-center text-slate-400">
                No pending linkage requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: any) => (
                <Card key={request.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 className="w-5 h-5 text-blue-400" />
                          <span className="text-sm text-slate-400">
                            Requested by: <strong className="text-white">{request.requestedByWorker?.name || "Unknown"}</strong>
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          {/* Main Customer */}
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-4 h-4 text-green-400" />
                              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                MAIN
                              </span>
                            </div>
                            <p className="font-medium text-white">{request.mainCustomer?.name}</p>
                            {request.mainCustomer?.address && (
                              <p className="text-xs text-slate-400 mt-1">{request.mainCustomer.address}</p>
                            )}
                          </div>

                          {/* Annex Customer */}
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-4 h-4 text-blue-400" />
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                ANNEX
                              </span>
                            </div>
                            <p className="font-medium text-white">{request.annexCustomer?.name}</p>
                            {request.annexCustomer?.address && (
                              <p className="text-xs text-slate-400 mt-1">{request.annexCustomer.address}</p>
                            )}
                          </div>
                        </div>

                        {request.notes && (
                          <div className="p-2 bg-slate-700/30 rounded text-sm text-slate-300">
                            <strong>Notes:</strong> {request.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingRequestId(request.id)}
                          disabled={rejectMutation.isPending}
                          className="border-red-600 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Approved Linkages Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Approved Linkages
          </h2>
          {approvedRelations.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-8 text-center text-slate-400">
                No approved linkages yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedRelations.map((relation: any) => (
                <Card key={relation.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">MAIN</span>
                            <p className="font-medium text-white">{relation.mainCustomer?.name}</p>
                          </div>
                        </div>
                        <div className="text-slate-500">→</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">ANNEX</span>
                            <p className="font-medium text-white">{relation.annexCustomer?.name}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(relation.id)}
                        disabled={removeMutation.isPending}
                        className="border-red-600 text-red-400 hover:bg-red-500/10"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Approved: {new Date(relation.approvedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectingRequestId !== null} onOpenChange={() => setRejectingRequestId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Linkage Request</DialogTitle>
            <DialogDescription className="text-slate-400">
              Please provide a reason for rejecting this linkage request
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="bg-slate-700 border-slate-600 text-white"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectingRequestId(null)}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


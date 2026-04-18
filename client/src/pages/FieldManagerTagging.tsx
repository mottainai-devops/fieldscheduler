import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Edit2, Upload } from "lucide-react";
import { toast } from "sonner";

const FIELD_MANAGERS_DATA = [
  { id: 1, name: "Bukola", customermafCodes: ["AFT-200", "AFT-221", "AFT-223", "MTD-096", "TKB-052"] },
  { id: 2, name: "Halleluyah", customermafCodes: ["CUM-099", "CUM-415", "DIC-413", "ECO-220", "SAY-076", "TKB-117"] },
  { id: 3, name: "Juwon", customermafCodes: ["ADK-062", "DIC-087", "DIC-410", "EOA-414", "HSY-060", "WAS-061"] },
  { id: 4, name: "Aishat", customermafCodes: ["MOT-108", "MOT-027", "MOT-107"] },
];

interface FieldManagerTag {
  id: number;
  fieldManagerId: number;
  customermaf: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function FieldManagerTagging() {
  const [selectedManager, setSelectedManager] = useState<string>("1");
  const [newCustomerMAF, setNewCustomerMAF] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingTag, setEditingTag] = useState<FieldManagerTag | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Queries and mutations
  const { data: allTags = {}, refetch: refetchTags, isLoading: tagsLoading } = trpc.fieldWorker.getAllFieldManagerTags.useQuery();
  const { data: workers = [], isLoading: workersLoading } = trpc.fieldWorker.getWorkers.useQuery();

  const addTagMutation = trpc.fieldWorker.addFieldManagerTag.useMutation({
    onSuccess: () => {
      toast.success("Tag added successfully");
      setNewCustomerMAF("");
      setNewDescription("");
      setIsAddingTag(false);
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to add tag: ${error.message}`);
    },
  });

  const removeTagMutation = trpc.fieldWorker.removeFieldManagerTag.useMutation({
    onSuccess: () => {
      toast.success("Tag removed successfully");
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to remove tag: ${error.message}`);
    },
  });

  const updateTagMutation = trpc.fieldWorker.updateFieldManagerTagDescription.useMutation({
    onSuccess: () => {
      toast.success("Tag updated successfully");
      setEditingTag(null);
      setEditDescription("");
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });

  const bulkAddTagsMutation = trpc.fieldWorker.bulkAddFieldManagerTags.useMutation({
    onSuccess: (result) => {
      toast.success(`Added ${result.length} tags successfully`);
      setIsBulkLoading(false);
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to add tags: ${error.message}`);
      setIsBulkLoading(false);
    },
  });

  const handleAddTag = async () => {
    if (!newCustomerMAF.trim()) {
      toast.error("Please enter a CUSTOMERMAF code");
      return;
    }

    await addTagMutation.mutateAsync({
      fieldManagerId: parseInt(selectedManager),
      customermaf: newCustomerMAF.toUpperCase(),
      description: newDescription || undefined,
    });
  };

  const handleRemoveTag = async (customermaf: string) => {
    if (window.confirm(`Remove tag ${customermaf}?`)) {
      await removeTagMutation.mutateAsync({
        fieldManagerId: parseInt(selectedManager),
        customermaf,
      });
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    await updateTagMutation.mutateAsync({
      fieldManagerId: editingTag.fieldManagerId,
      customermaf: editingTag.customermaf,
      description: editDescription,
    });
  };

  const handleBulkLoadFromExcel = async () => {
    const managerId = parseInt(selectedManager);
    const managerData = FIELD_MANAGERS_DATA.find((m) => m.id === managerId);

    if (!managerData) {
      toast.error("Manager not found");
      return;
    }

    setIsBulkLoading(true);

    const tags = managerData.customermafCodes.map((code) => ({
      customermaf: code,
      description: `Auto-loaded from Excel for ${managerData.name}`,
    }));

    await bulkAddTagsMutation.mutateAsync({
      fieldManagerId: managerId,
      tags,
    });
  };

  const currentManagerTags = (allTags[parseInt(selectedManager)] || []) as FieldManagerTag[];
  const selectedManagerName = workers.find((w) => w.id === parseInt(selectedManager))?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <FieldManagerBreadcrumb />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Field Manager Tagging</h1>
          <p className="text-slate-400">
            Assign CUSTOMERMAF building IDs to field managers for dynamic scheduling
          </p>
        </div>

        {/* Manager Selection and Actions */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Select Field Manager</CardTitle>
            <CardDescription>Choose a field manager to manage their assigned building IDs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select field manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id.toString()} className="text-white">
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBulkLoadFromExcel}
                disabled={isBulkLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isBulkLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Load from Excel
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add New Tag */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Tag
              </CardTitle>
              <CardDescription>Assign a building ID to {selectedManagerName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">CUSTOMERMAF Code</label>
                <Input
                  value={newCustomerMAF}
                  onChange={(e) => setNewCustomerMAF(e.target.value.toUpperCase())}
                  placeholder="e.g., AFT-200"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Description (Optional)</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add notes about this building ID..."
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 resize-none"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleAddTag}
                disabled={addTagMutation.isPending || !newCustomerMAF}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addTagMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tags List */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">
                Assigned Tags for {selectedManagerName}
              </CardTitle>
              <CardDescription>
                {currentManagerTags.length} building IDs assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : currentManagerTags.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">No tags assigned yet</p>
                  <p className="text-sm text-slate-500 mt-2">Add a tag or load from Excel to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {currentManagerTags.map((tag) => (
                    <div
                      key={`${tag.fieldManagerId}-${tag.customermaf}`}
                      className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-slate-500 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-600 text-white font-mono">{tag.customermaf}</Badge>
                            <span className="text-xs text-slate-400">
                              {new Date(tag.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {tag.description && (
                            <p className="text-sm text-slate-300">{tag.description}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600"
                                onClick={() => {
                                  setEditingTag(tag);
                                  setEditDescription(tag.description || "");
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-800 border-slate-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">Edit Tag Description</DialogTitle>
                                <DialogDescription>Update the description for {tag.customermaf}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Add notes about this building ID..."
                                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 resize-none"
                                  rows={4}
                                />
                                <Button
                                  onClick={handleUpdateTag}
                                  disabled={updateTagMutation.isPending}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {updateTagMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    "Update Description"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                            onClick={() => handleRemoveTag(tag.customermaf)}
                            disabled={removeTagMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {FIELD_MANAGERS_DATA.map((manager) => {
            const managerTags = (allTags[manager.id] || []) as FieldManagerTag[];
            return (
              <Card key={manager.id} className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-2">{manager.name}</p>
                    <p className="text-3xl font-bold text-white mb-2">{managerTags.length}</p>
                    <p className="text-xs text-slate-500">Tags Assigned</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}


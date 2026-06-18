import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail, Phone, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { useState } from "react";
import { toast } from "sonner";

export default function Workers() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "on_leave">("active");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [pin, setPin] = useState("");
  const [workerRole, setWorkerRole] = useState<"field_manager" | "supervisor">("field_manager");
  const [preferredWebhookType, setPreferredWebhookType] = useState<"payt" | "monthly" | "">("payt");

  const { data: workers = [], isLoading } = trpc.fieldWorker.getWorkers.useQuery();
  const utils = trpc.useUtils();
  const createWorkerMutation = trpc.fieldWorker.createWorker.useMutation({
    onSuccess: () => {
      toast.success("Worker created successfully");
      utils.fieldWorker.getWorkers.invalidate();
      setOpen(false);
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setSkills("");
      setStatus("active");
      setShiftStart("08:00");
      setShiftEnd("17:00");
      setPin("");
    },
    onError: (error) => {
      toast.error(`Failed to create worker: ${error.message}`);
    },
  });

  const updateWorkerMutation = trpc.fieldWorker.updateWorker.useMutation({
    onSuccess: () => {
      toast.success("Worker updated successfully");
      utils.fieldWorker.getWorkers.invalidate();
      setEditOpen(false);
      setSelectedWorker(null);
    },
    onError: (error) => {
      toast.error(`Failed to update worker: ${error.message}`);
    },
  });

  const deleteWorkerMutation = trpc.fieldWorker.deleteWorker.useMutation({
    onSuccess: () => {
      toast.success("Worker deleted successfully");
      utils.fieldWorker.getWorkers.invalidate();
      setDeleteOpen(false);
      setSelectedWorker(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete worker: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Worker name is required");
      return;
    }

    createWorkerMutation.mutate({
      name,
      email: email || undefined,
      phone: phone || undefined,
      pin: pin || undefined,
      skills: skills || undefined,
      status,
      shiftStart,
      shiftEnd,
      role: workerRole,
      preferredWebhookType: preferredWebhookType || undefined,
    } as any);
  };

  const handleEdit = (worker: any) => {
    setSelectedWorker(worker);
    setName(worker.name);
    setEmail(worker.email || "");
    setPhone(worker.phone || "");
    setSkills(worker.skills || "");
    setStatus(worker.status);
    setShiftStart(worker.shiftStart);
    setShiftEnd(worker.shiftEnd);
    setPin(""); // Don't pre-fill PIN for security
    setWorkerRole(worker.role || "field_manager");
    setPreferredWebhookType(worker.preferredWebhookType || "payt");
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !name.trim()) {
      toast.error("Worker name is required");
      return;
    }

    updateWorkerMutation.mutate({
      id: selectedWorker.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      pin: pin || undefined,
      skills: skills || undefined,
      status,
      shiftStart,
      shiftEnd,
      role: workerRole,
      preferredWebhookType: preferredWebhookType || undefined,
    } as any);
  };

  const handleDelete = (worker: any) => {
    setSelectedWorker(worker);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedWorker) return;
    deleteWorkerMutation.mutate({ id: selectedWorker.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-600/20 text-green-400";
      case "inactive": return "bg-gray-600/20 text-gray-400";
      case "on_leave": return "bg-yellow-600/20 text-yellow-400";
      default: return "bg-gray-600/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Workers" subtitle="Manage field workers and assignments" />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Field Workers ({workers.length})</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Worker
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Worker</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Add a new field worker to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name" className="text-slate-300">Name *</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pin" className="text-slate-300">PIN (for mobile app login)</Label>
                        <Input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 4-6 digit PIN"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="skills" className="text-slate-300">Skills (comma-separated)</Label>
                        <Input
                          id="skills"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          placeholder="Compliance, Inspection, Reporting"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="status" className="text-slate-300">Status</Label>
                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="shiftStart" className="text-slate-300">Shift Start</Label>
                          <Input
                            id="shiftStart"
                            type="time"
                            value={shiftStart}
                            onChange={(e) => setShiftStart(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="shiftEnd" className="text-slate-300">Shift End</Label>
                          <Input
                            id="shiftEnd"
                            type="time"
                            value={shiftEnd}
                            onChange={(e) => setShiftEnd(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-slate-300">Role</Label>
                        <Select value={workerRole} onValueChange={(v: any) => setWorkerRole(v)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="field_manager">Field Manager</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {workerRole === 'supervisor' && (
                        <div className="grid gap-2">
                          <Label className="text-slate-300">Billing Type (Webhook Preference)</Label>
                          <Select value={preferredWebhookType || 'payt'} onValueChange={(v: any) => setPreferredWebhookType(v)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="payt">PAYT (Pay As You Throw)</SelectItem>
                              <SelectItem value="monthly">Monthly Billing</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500">Only admins can change this after it is set.</p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="border-slate-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createWorkerMutation.isPending}
                      >
                        {createWorkerMutation.isPending ? "Creating..." : "Create Worker"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading workers...</div>
            ) : workers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No workers found. Click "Create Worker" to add your first field worker.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{worker.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(worker.status)}`}>
                              {worker.status}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              (worker as any).role === 'supervisor'
                                ? 'bg-purple-600/20 text-purple-400'
                                : 'bg-blue-600/20 text-blue-400'
                            }`}>
                              {(worker as any).role === 'supervisor' ? 'Supervisor' : 'Field Manager'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
                          onClick={() => handleEdit(worker)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                          onClick={() => handleDelete(worker)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {worker.email && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{worker.email}</span>
                        </div>
                      )}
                      
                      {worker.phone && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone className="w-3 h-3" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{worker.shiftStart} - {worker.shiftEnd}</span>
                      </div>
                    </div>
                    
                    {worker.skills && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {worker.skills.split(',').map((skill: string, index: number) => skill.trim()).filter(Boolean).map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Worker Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Worker</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Update worker information
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name" className="text-slate-300">Name *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email" className="text-slate-300">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone" className="text-slate-300">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-pin" className="text-slate-300">PIN (leave blank to keep current)</Label>
                  <Input
                    id="edit-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter new PIN or leave blank"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-skills" className="text-slate-300">Skills (comma-separated)</Label>
                  <Input
                    id="edit-skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="e.g., maintenance, inspection"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status" className="text-slate-300">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-shift-start" className="text-slate-300">Shift Start</Label>
                    <Input
                      id="edit-shift-start"
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-shift-end" className="text-slate-300">Shift End</Label>
                    <Input
                      id="edit-shift-end"
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300">Role</Label>
                  <Select value={workerRole} onValueChange={(v: any) => setWorkerRole(v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="field_manager">Field Manager</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300">Billing Type (Webhook Preference)</Label>
                  <Select value={preferredWebhookType || 'payt'} onValueChange={(v: any) => setPreferredWebhookType(v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="payt">PAYT (Pay As You Throw)</SelectItem>
                      <SelectItem value="monthly">Monthly Billing</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Admin-only field. Supervisor's billing type preference.</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateWorkerMutation.isPending}
                >
                  {updateWorkerMutation.isPending ? "Updating..." : "Update Worker"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Worker</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete {selectedWorker?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                className="border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteWorkerMutation.isPending}
              >
                {deleteWorkerMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}


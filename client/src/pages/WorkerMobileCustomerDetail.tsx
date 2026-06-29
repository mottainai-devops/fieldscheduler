import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, FileText, DollarSign, AlertTriangle, Navigation, Link2 } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/utils/currency";
import { useState } from "react";
import { toast } from "sonner";

export default function WorkerMobileCustomerDetail() {
  const [, params] = useRoute("/worker-mobile/customer/:routeId/:customerId");
  const [, setLocation] = useLocation();
  const customerId = params?.customerId ? parseInt(params.customerId) : null;
  const routeId = params?.routeId ? parseInt(params.routeId) : null;
  
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState<"main" | "annex">("annex");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [linkNotes, setLinkNotes] = useState("");
  
  // Payment features state
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [paymentUploadDialogOpen, setPaymentUploadDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: customer } = trpc.workerAuth.getCustomerById.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const { data: linkageStatus, refetch: refetchLinkageStatus } = trpc.workerAuth.getCustomerLinkageStatus.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );
  
  const { data: allCustomers = [] } = trpc.workerAuth.getCustomers.useQuery();
  
  const createLinkageMutation = trpc.workerAuth.createLinkageRequest.useMutation({
    onSuccess: () => {
      toast.success("Linkage request submitted for admin review");
      setLinkDialogOpen(false);
      setSearchQuery("");
      setSelectedCustomerId(null);
      setLinkNotes("");
      refetchLinkageStatus();
    },
    onError: (error) => {
      toast.error(`Failed to create linkage request: ${error.message}`);
    },
  });
  
  const handleSubmitLinkage = () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer to link");
      return;
    }
    
    const mainId = linkType === "main" ? selectedCustomerId : customerId!;
    const annexId = linkType === "annex" ? selectedCustomerId : customerId!;
    
    createLinkageMutation.mutate({
      mainCustomerId: mainId,
      annexCustomerId: annexId,
      requestedBy: 1, // In real app, get from auth context
      notes: linkNotes || undefined,
    });
  };
  
  const filteredCustomers = allCustomers.filter((c: any) => 
    c.id !== customerId && 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle payment reminder
  const sendReminderMutation = trpc.payments.sendPaymentReminder.useMutation({
    onSuccess: () => {
      toast.success("Payment reminder sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send reminder: " + error.message);
    },
  });

  const handleSendPaymentReminder = (invoice: any) => {
    if (!customerId) return;
    
    sendReminderMutation.mutate({
      customerId: customerId,
      invoiceId: invoice.invoice_id,
      amount: invoice.total,
      dueDate: invoice.due_date,
      method: "email", // Default to email, can be made configurable
    });
  };
  
  // Handle payment proof upload
  const uploadPaymentMutation = trpc.payments.uploadPaymentProof.useMutation({
    onSuccess: () => {
      toast.success("Payment proof uploaded successfully!");
      setPaymentUploadDialogOpen(false);
      setPaymentFile(null);
      setPaymentNotes("");
      setPaymentAmount("");
      setPaymentMethod("");
      setSelectedInvoiceId(null);
    },
    onError: (error) => {
      toast.error("Failed to upload payment proof: " + error.message);
    },
  });

  const handlePaymentUpload = async () => {
    if (!paymentFile) {
      toast.error("Please select a file to upload");
      return;
    }
    
    if (!customerId) {
      toast.error("Customer ID not found");
      return;
    }

    // Get worker ID from localStorage
    const workerData = localStorage.getItem("currentWorker");
    if (!workerData) {
      toast.error("Worker session not found");
      return;
    }
    const workerId = JSON.parse(workerData).id;
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(paymentFile);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        await uploadPaymentMutation.mutateAsync({
          customerId: customerId,
          invoiceId: selectedInvoiceId || undefined,
          workerId: workerId,
          fileData: base64Data,
          fileName: paymentFile.name,
          fileType: paymentFile.type,
          notes: paymentNotes || undefined,
          amount: paymentAmount || undefined,
          paymentMethod: paymentMethod || undefined,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
    } catch (error) {
      toast.error("Failed to upload payment proof");
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentFile(e.target.files[0]);
    }
  };

  const { data: paymentStatus } = trpc.workerAuth.getCustomerPaymentStatus.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const { data: violations = [] } = trpc.workerAuth.getViolationsByCustomer.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const { data: abatementNotices = [] } = trpc.workerAuth.getAbatementNoticesByCustomer.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  // Zoho financial data (using workerAuth public endpoints)
  const { data: statement } = trpc.workerAuth.getCustomerStatement.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );
  
  const { data: invoices = [] } = trpc.workerAuth.getCustomerInvoices.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );
  
  const { data: payments = [] } = trpc.workerAuth.getCustomerPayments.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );
  
  // Filter invoices by search query
  const filteredInvoices = invoices.filter((inv: any) =>
    inv.invoice_number?.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
    inv.date?.includes(invoiceSearchQuery)
  );

  const handleNavigate = () => {
    const lat = customer?.latitude;
    const lng = customer?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading customer details...</p>
      </div>
    );
  }

  const activeViolations = violations?.filter((v: any) => v.status === 'reported' || v.status === 'under_review') || [];
  const resolvedViolations = violations?.filter((v: any) => v.status === 'resolved') || [];

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/worker-mobile/route/${routeId}`)}
              className="text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-white">{customer.name}</h1>
              <p className="text-xs text-slate-400">Customer Details</p>
            </div>
          </div>
          {customer.latitude && customer.longitude && (
            <Button
              size="sm"
              onClick={handleNavigate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Navigate
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.address && (
              <div>
                <span className="text-slate-400">Address:</span>
                <p className="text-white">{customer.address}</p>
              </div>
            )}
            {customer.latitude && customer.longitude && (
              <div>
                <span className="text-slate-400">Coordinates:</span>
                <p className="text-white">{customer.latitude}, {customer.longitude}</p>
              </div>
            )}
            {/* Building ID Linkage Status */}
            {customer.buildingId && (
              <div>
                <span className="text-slate-400">Building ID:</span>
                <p className="text-white">{customer.buildingId}</p>
              </div>
            )}
            {linkageStatus && (
              <div className="mt-2">
                {linkageStatus.type === "main" ? (
                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                      MAIN BUILDING
                    </span>
                    {linkageStatus.annexCustomers && linkageStatus.annexCustomers.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400">Annexes:</p>
                        {linkageStatus.annexCustomers.map((annex: any) => (
                          <p key={annex.id} className="text-xs text-slate-300">• {annex.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                      ANNEX
                    </span>
                    {linkageStatus.mainCustomer && (
                      <p className="text-xs text-slate-300 mt-1">
                        Annex of: <strong>{linkageStatus.mainCustomer.name}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Link Building ID Button */}
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => setLinkDialogOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Link Building ID
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Financial & Compliance Data */}
        <Tabs defaultValue="statement" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="statement">Statement</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          {/* Statement Tab */}
          <TabsContent value="statement">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Zoho Books Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!customer.zohoContactId ? (
                  <p className="text-slate-400 text-sm">No Zoho contact linked</p>
                ) : statement ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total</span>
                      <span className="text-white font-semibold">{formatCurrency(statement.total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Balance</span>
                      <span className="text-white font-semibold">{formatCurrency(statement.balance || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No statement data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-4">
                  <Input
                    placeholder="Search invoices by number or date..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                
                {/* Upload Payment Proof Button */}
                <Button
                  onClick={() => setPaymentUploadDialogOpen(true)}
                  className="w-full mb-4 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  Upload Payment Proof
                </Button>
                
                {!customer.zohoContactId ? (
                  <p className="text-slate-400 text-sm">No Zoho contact linked</p>
                ) : filteredInvoices && filteredInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {filteredInvoices.map((invoice: any, index: number) => (
                      <div key={index} className="p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-medium">{invoice.invoice_number || `Invoice #${index + 1}`}</p>
                            <p className="text-xs text-slate-400">{invoice.date || 'N/A'}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                            invoice.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {invoice.status || 'pending'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Amount</span>
                          <span className="text-white font-semibold">{formatCurrency(invoice.total || 0)}</span>
                        </div>
                        {/* Payment Reminder Button for Overdue Invoices */}
                        {invoice.status === 'overdue' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendPaymentReminder(invoice)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-xs"
                          >
                            Send Payment Reminder
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No invoices found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentStatus && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">Payment Status</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        paymentStatus.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        paymentStatus.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {paymentStatus.status}
                      </span>
                    </div>
                    {paymentStatus.outstandingBalance && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Outstanding</span>
                        <span className="text-white font-semibold text-sm">{formatCurrency(paymentStatus.outstandingBalance)}</span>
                      </div>
                    )}
                  </div>
                )}
                {!customer.zohoContactId ? (
                  <p className="text-slate-400 text-sm">No Zoho contact linked</p>
                ) : payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment: any, index: number) => (
                      <div key={index} className="p-3 bg-slate-700/30 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{formatCurrency(payment.amount || 0)}</p>
                          <p className="text-xs text-slate-400">{payment.date || 'N/A'}</p>
                        </div>
                        <span className="text-xs text-slate-400">{payment.payment_mode || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No payment history found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Compliance Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeViolations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-400 mb-2">Active Violations ({activeViolations.length})</h4>
                      <div className="space-y-2">
                        {activeViolations.map((violation: any) => (
                          <div key={violation.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-white font-medium text-sm">{violation.violationType?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 mt-1">{violation.description || 'No description'}</p>
                            <p className="text-xs text-red-400 mt-1">
                              Reported: {violation.reportedAt ? new Date(violation.reportedAt).toLocaleDateString() : 'N/A'}
                            </p>
                            {violation.notes && (
                              <p className="text-xs text-slate-300 mt-1">Notes: {violation.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {resolvedViolations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-400 mb-2">Resolved Violations ({resolvedViolations.length})</h4>
                      <div className="space-y-2">
                        {resolvedViolations.map((violation: any) => (
                          <div key={violation.id} className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-white font-medium text-sm">{violation.violationType?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 mt-1">{violation.description || 'No description'}</p>
                            <p className="text-xs text-green-400 mt-1">
                              Resolved: {violation.resolvedAt ? new Date(violation.resolvedAt).toLocaleDateString() : 'N/A'}
                            </p>
                            {violation.notes && (
                              <p className="text-xs text-slate-300 mt-1">Resolution: {violation.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {violations && violations.length === 0 && (
                    <p className="text-slate-400 text-sm">No violations recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Abatement Notices Section */}
            {abatementNotices && abatementNotices.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700 mt-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Abatement Notices ({abatementNotices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {abatementNotices.map((notice: any) => {
                      const isOverdue = notice.dueDate && new Date(notice.dueDate) < new Date() && notice.status === 'issued';
                      const statusColor = notice.status === 'complied' ? 'green' : notice.status === 'escalated' ? 'red' : isOverdue ? 'orange' : 'yellow';
                      
                      return (
                        <div key={notice.id} className={`p-3 bg-${statusColor}-500/10 border border-${statusColor}-500/20 rounded-lg`}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-white font-medium text-sm">
                              Notice #{notice.noticeNumber || `ABT-${notice.id}`}
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusColor}-500/20 text-${statusColor}-400 capitalize`}>
                              {notice.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-400">
                              Issued: {notice.issuedDate ? new Date(notice.issuedDate).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className={`${isOverdue ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}>
                              Due: {notice.dueDate ? new Date(notice.dueDate).toLocaleDateString() : 'N/A'}
                              {isOverdue && ' (OVERDUE)'}
                            </p>
                            {notice.complianceDate && (
                              <p className="text-green-400">
                                Complied: {new Date(notice.complianceDate).toLocaleDateString()}
                              </p>
                            )}
                            {notice.notes && (
                              <p className="text-slate-300 mt-2">Notes: {notice.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Violation Button */}
        <Button
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={() => setLocation(`/worker-mobile/report-violation/${routeId}/${customerId}`)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Violation
        </Button>
      </div>

      {/* Link Building ID Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Link Building ID</DialogTitle>
            <DialogDescription className="text-slate-400">
              Report that this customer is linked to another building ID
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Link Type Selection */}
            <div>
              <Label className="text-white">This customer should be:</Label>
              <RadioGroup value={linkType} onValueChange={(v) => setLinkType(v as "main" | "annex")} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="annex" id="annex" />
                  <Label htmlFor="annex" className="text-slate-300">Annex of another customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="main" id="main" />
                  <Label htmlFor="main" className="text-slate-300">Main building (link another as annex)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Customer Search */}
            <div>
              <Label className="text-white">
                {linkType === "annex" ? "Select main customer:" : "Select annex customer:"}
              </Label>
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
              {searchQuery && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {filteredCustomers.slice(0, 5).map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`p-2 rounded cursor-pointer ${
                        selectedCustomerId === c.id
                          ? "bg-blue-600"
                          : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      <p className="text-sm text-white">{c.name}</p>
                      {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-sm text-slate-400 p-2">No customers found</p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-white">Notes (optional):</Label>
              <Textarea
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
                placeholder="Why are these customers linked? (e.g., same compound, multiple polygons)"
                className="bg-slate-700 border-slate-600 text-white mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitLinkage}
              disabled={!selectedCustomerId || createLinkageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createLinkageMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Proof Upload Dialog */}
      <Dialog open={paymentUploadDialogOpen} onOpenChange={setPaymentUploadDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Payment Proof</DialogTitle>
            <DialogDescription className="text-slate-400">
              Upload evidence of customer payment (receipt, bank transfer, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label className="text-white">Select File</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
              {paymentFile && (
                <p className="text-xs text-green-400 mt-1">Selected: {paymentFile.name}</p>
              )}
            </div>
            
            {/* Amount */}
            <div>
              <Label className="text-white">Amount Paid <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-white">Payment Method <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Select method…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-white">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Textarea
                placeholder="Add any notes about this payment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentUploadDialogOpen(false);
                setPaymentFile(null);
                setPaymentNotes("");
                setPaymentAmount("");
                setPaymentMethod("");
              }}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentUpload}
              disabled={!paymentFile}
              className="bg-green-600 hover:bg-green-700"
            >
              Upload Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


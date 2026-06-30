import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building, DollarSign, AlertTriangle, Download, MessageSquare, Trash2, Send } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/utils/currency";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";


function ReplyBox({ noteId, customerId, onReply, addNoteMutation }: { noteId: number; customerId: number; onReply: () => void; addNoteMutation: any }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-blue-400 hover:text-blue-300">Reply</button>
  );
  return (
    <div className="flex gap-2 mt-2">
      <input
        className="flex-1 bg-slate-800 text-white border border-slate-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
        placeholder="Write a reply..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button size="sm" disabled={!text.trim()} onClick={() => {
        if (!text.trim()) return;
        addNoteMutation.mutate({ customerId, noteText: text.trim(), parentNoteId: noteId, authorType: "admin" });
        setText(""); setOpen(false); onReply();
      }} className="bg-blue-600 hover:bg-blue-700">Send</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const customerId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("overview");
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const { data: customer } = trpc.fieldWorker.getCustomers.useQuery(
    undefined,
    {
      enabled: !!customerId,
      select: (customers) => customers.find(c => c.id === customerId),
    }
  );

  const { data: statement, isLoading: statementLoading } = trpc.integrations.getCustomerStatement.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );

  const { data: invoices } = trpc.integrations.getCustomerInvoices.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );

  const { data: payments } = trpc.integrations.getCustomerPayments.useQuery(
    { zohoContactId: customer?.zohoContactId || "" },
    { enabled: !!customer?.zohoContactId }
  );

  const { data: violations } = trpc.compliance.getAllViolations.useQuery(
    undefined,
    {
      enabled: !!customerId,
      select: (all: any) => all.filter((v: any) => v.customerId === customerId),
    }
  );

  const { data: paymentStatus } = trpc.compliance.getPaymentStatus.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const { data: customerNotes, refetch: refetchNotes } = trpc.customer.getCustomerNotes.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  // T25 fix: wire admin note mutations (were undefined — caused runtime errors on Notes tab)
  const addNoteMutation = trpc.customer.addAdminNote.useMutation({
    onSuccess: () => refetchNotes(),
  });
  const deleteNoteMutation = trpc.customer.deleteCustomerNote.useMutation({
    onSuccess: () => refetchNotes(),
  });

  if (!customerId || !customer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader 
        title={customer.name} 
        subtitle="Customer Details & Compliance" 
        showBackButton={true}
        backTo="/customers"
        backLabel="Back to Customers"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Customers", href: "/customers" },
          { label: customer.name, href: `/customers/${customer.id}` }
        ]}
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info Card */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400">Address</p>
                      <p className="text-white">{customer.address}</p>
                    </div>
                  </div>
                )}
                


                {(customer.arcgisBuildingId || customer.buildingId) && (
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400">Building ID</p>
                      <p className="text-white font-mono text-sm">{customer.arcgisBuildingId || customer.buildingId}</p>
                      {customer.isMainBuilding && (
                        <span className="text-xs text-green-400">Main Building</span>
                      )}
                    </div>
                  </div>
                )}
                {customer.arcgisBuildingId && customer.unitCode && (
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400">Customer ID</p>
                      <p className="text-white font-mono text-sm">{customer.arcgisBuildingId} {customer.unitCode}</p>
                      <p className="text-xs text-slate-500">ArcGIS-native composite</p>
                    </div>
                  </div>
                )}

                {customer.latitude && customer.longitude && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400">Coordinates</p>
                      <p className="text-white text-sm">
                        {customer.latitude}, {customer.longitude}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Status Card */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentStatus ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        paymentStatus.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        paymentStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {paymentStatus.status}
                      </span>
                    </div>
                    {paymentStatus.outstandingBalance && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Outstanding</span>
                        <span className="text-white font-semibold">{formatCurrency(paymentStatus.outstandingBalance || 0)}</span>
                      </div>
                    )}
                    {paymentStatus.lastPaymentDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Last Payment</span>
                        <span className="text-white">{new Date(paymentStatus.lastPaymentDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No payment information available</p>
                )}
              </CardContent>
            </Card>

            {/* Compliance Summary */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Active Violations</span>
                    <span className="text-red-400 font-semibold">
                      {violations?.filter((v: any) => v.status === 'open').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Resolved</span>
                    <span className="text-green-400 font-semibold">
                      {violations?.filter((v: any) => v.status === 'resolved').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Violations</span>
                    <span className="text-white font-semibold">{violations?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Information */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-slate-800 border border-slate-700">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="statement">Zoho Statement</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="violations">Violations</TabsTrigger>
                <TabsTrigger value="notes">Visit Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Customer Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Customer ID</p>
                        {customer.arcgisBuildingId && customer.unitCode ? (
                          <p className="text-white font-mono text-sm">{customer.arcgisBuildingId} {customer.unitCode}</p>
                        ) : (
                          <p className="text-white font-semibold">#{customer.id}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Building ID</p>
                        <p className="text-white font-mono text-sm">{customer.arcgisBuildingId || customer.buildingId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Has Coordinates</p>
                        <p className="text-white font-semibold">
                          {customer.latitude && customer.longitude ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Created</p>
                        <p className="text-white font-semibold">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statement">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Zoho Books Statement</span>
                      {statement && (
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statementLoading ? (
                      <p className="text-slate-400">Loading statement...</p>
                    ) : statement ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                          <span className="text-slate-400">Total</span>
                          <span className="text-white font-semibold text-lg">{formatCurrency(statement.total || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-900 rounded-lg">
                          <span className="text-slate-400">Balance</span>
                          <span className="text-white font-semibold text-lg">{formatCurrency(statement.balance || 0)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400">No statement data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoices && invoices.length > 0 ? (
                      <div className="space-y-3">
                        {invoices.map((invoice: any, idx: number) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-white font-semibold">Invoice #{invoice.invoice_number || idx + 1}</p>
                              <p className="text-sm text-slate-400">
                                {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">₦{invoice.total || '0.00'}</p>
                              <p className="text-sm text-slate-400">{invoice.status || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">No invoices found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments && payments.length > 0 ? (
                      <div className="space-y-3">
                        {payments.map((payment: any, idx: number) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-white font-semibold">Payment #{payment.payment_number || idx + 1}</p>
                              <p className="text-sm text-slate-400">
                                {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-semibold">{formatCurrency(payment.amount || 0)}</p>
                              <p className="text-sm text-slate-400">{payment.payment_mode || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">No payments found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="violations">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Compliance Violations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {violations && violations.length > 0 ? (
                      <div className="space-y-3">
                        {violations.map((violation: any) => (
                          <div key={violation.id} className="bg-slate-900 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-semibold">Violation #{violation.id}</p>
                                <p className="text-sm text-slate-400">
                                  {new Date(violation.reportedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                violation.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                violation.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {violation.status}
                              </span>
                            </div>
                            {violation.notes && (
                              <p className="text-slate-300 text-sm mt-2">{violation.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">No violations recorded</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Customer Visit Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add new note */}
                    <div className="bg-slate-900 p-4 rounded-lg space-y-3">
                      <textarea
                        className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500"
                        rows={3}
                        placeholder="Add an admin note or reply to field worker..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsAddingNote(true);
                          addNoteMutation.mutate({ customerId, noteText: newNoteText.trim() });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Post Note
                      </Button>
                    </div>
                    {/* Notes list */}
                    {customerNotes && customerNotes.length > 0 ? (
                      <div className="space-y-4">
                        {customerNotes.map((note: any) => (
                          <div key={note.id} className="bg-slate-900 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                                  {note.authorType === 'admin' ? 'Admin' : 'Field Worker'}
                                </span>
                                <span className="text-slate-400 text-xs">{note.authorName || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs">{note.visitDate || new Date(note.createdAt).toLocaleDateString()}</span>
                                <button onClick={() => deleteNoteMutation.mutate({ id: note.id })} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {note.noteText && <p className="text-white text-sm mb-2">{note.noteText}</p>}
                            {note.photoUrl && <img src={note.photoUrl} alt="Note photo" className="rounded-lg max-h-48 object-cover mb-2" />}
                            {/* Replies */}
                            {note.replies && note.replies.length > 0 && (
                              <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-700 pl-3">
                                {note.replies.map((reply: any) => (
                                  <div key={reply.id} className="bg-slate-800 p-3 rounded-lg">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                                        {reply.authorType === 'admin' ? 'Admin' : 'Field Worker'}
                                      </span>
                                      <button onClick={() => deleteNoteMutation.mutate({ id: reply.id })} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {reply.noteText && <p className="text-slate-300 text-sm">{reply.noteText}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Reply box */}
                            <div className="mt-3">
                              <ReplyBox noteId={note.id} customerId={customerId!} onReply={() => refetchNotes()} addNoteMutation={addNoteMutation} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No visit notes yet. Field workers and admins can add notes here.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}


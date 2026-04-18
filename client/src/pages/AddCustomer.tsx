import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

export default function AddCustomer() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    buildingId: "",
    serviceType: "maintenance",
    priority: "medium",
  });

  const createCustomerMutation = trpc.fieldWorker.createCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully!");
      setLocation("/customers");
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Please fill in all required fields");
      return;
    }

    createCustomerMutation.mutate({
      name: formData.name,
      address: formData.address || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
      buildingId: formData.buildingId || null,
      serviceType: formData.serviceType as "maintenance" | "inspection" | "repair",
      priority: formData.priority as "high" | "medium" | "low",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader 
        title="Add Customer" 
        subtitle="Create a new customer location"
        showBackButton={true}
        backTo="/customers"
        backLabel="Back to Customers"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Customers", href: "/customers" },
          { label: "Add Customer", href: "/add-customer" }
        ]}
      />

      <main className="container mx-auto px-6 py-8">

        <Card className="bg-slate-800/50 border-slate-700 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-slate-300">
                  Customer Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Enter customer name"
                />
              </div>

              {/* Building ID */}
              <div>
                <Label htmlFor="buildingId" className="text-slate-300">
                  Building ID
                </Label>
                <Input
                  id="buildingId"
                  name="buildingId"
                  type="text"
                  value={formData.buildingId}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Enter building ID"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="text-slate-300">
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Enter address"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude" className="text-slate-300">
                    Latitude <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="text"
                    required
                    value={formData.latitude}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="e.g., 6.5244"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-slate-300">
                    Longitude <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="text"
                    required
                    value={formData.longitude}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="e.g., 3.3792"
                  />
                </div>
              </div>

              {/* Service Type */}
              <div>
                <Label htmlFor="serviceType" className="text-slate-300">
                  Service Type
                </Label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white mt-2"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="repair">Repair</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="priority" className="text-slate-300">
                  Priority
                </Label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white mt-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
                <Link href="/customers">
                  <Button type="button" variant="outline" className="border-slate-600 text-slate-300">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


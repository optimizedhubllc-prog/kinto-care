import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Archive } from "lucide-react";

export default function Medications() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", dosage: "", frequency: "", instructions: "" });

  const medicationsQuery = trpc.medications.list.useQuery({ hubId });
  const createMutation = trpc.medications.create.useMutation();
  const updateMutation = trpc.medications.update.useMutation();
  const deleteMutation = trpc.medications.delete.useMutation();

  const isFamilyAdmin = user?.role === "admin";

  const handleOpenDialog = (medication?: any) => {
    if (medication) {
      setEditingId(medication.id);
      setFormData({
        name: medication.name,
        dosage: medication.dosage || "",
        frequency: medication.frequency || "",
        instructions: medication.instructions || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", dosage: "", frequency: "", instructions: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Medication name is required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          medicationId: editingId,
          hubId,
          ...formData,
        });
        toast.success("Medication updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        toast.success("Medication added");
      }
      setIsDialogOpen(false);
      medicationsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save medication");
    }
  };

  const handleDelete = async (medicationId: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    try {
      await deleteMutation.mutateAsync({ medicationId, hubId });
      toast.success("Medication deleted");
      medicationsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete medication");
    }
  };

  if (medicationsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const medications = medicationsQuery.data || [];

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Medications</h1>
            <p className="text-slate-600 mt-2">Manage active and inactive medications</p>
          </div>
          {isFamilyAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Add"} Medication</DialogTitle>
                  <DialogDescription>
                    Enter the medication details below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Medication Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Aspirin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input
                      id="dosage"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      placeholder="e.g., Twice daily"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <Input
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="e.g., Take with food"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Update" : "Add"} Medication
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {medications.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-slate-600">No medications yet. {isFamilyAdmin && "Add one to get started."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <Card key={med.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{med.name}</CardTitle>
                      {med.dosage && <p className="text-sm text-slate-600 mt-1">{med.dosage}</p>}
                    </div>
                    {isFamilyAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(med)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(med.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {med.frequency && (
                      <div>
                        <p className="text-sm text-slate-600">Frequency</p>
                        <p className="font-medium">{med.frequency}</p>
                      </div>
                    )}
                    {med.instructions && (
                      <div>
                        <p className="text-sm text-slate-600">Instructions</p>
                        <p className="font-medium">{med.instructions}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
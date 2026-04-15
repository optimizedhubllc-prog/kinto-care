import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import { useState } from "react";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Phone, Mail, MapPin, MessageCircle, Globe, AlertCircle } from "lucide-react";
import { isInternationalNumber, isDominicanRepublic, getWhatsAppUrl, getCountryName } from "@/lib/phoneUtils";

export default function MedicalContacts() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const contactsQuery = trpc.medicalContacts.list.useQuery({ hubId });
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const createMutation = trpc.medicalContacts.create.useMutation();
  const updateMutation = trpc.medicalContacts.update.useMutation();
  const deleteMutation = trpc.medicalContacts.delete.useMutation();

  const hub = hubQuery.data;
  const isFamilyAdmin = hub?.members?.some(m => m.userId === user?.id && m.role === 'family_admin');

  const handleOpenDialog = (contact?: any) => {
    if (contact) {
      setEditingId(contact.id);
      setFormData({
        name: contact.name,
        specialty: contact.specialty || "",
        phone: contact.phone || "",
        email: contact.email || "",
        address: contact.address || "",
        notes: contact.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", specialty: "", phone: "", email: "", address: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Contact name is required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          contactId: editingId,
          hubId,
          ...formData,
        });
        toast.success("Contact updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        toast.success("Contact added");
      }
      setIsDialogOpen(false);
      contactsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save contact");
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await deleteMutation.mutateAsync({ contactId, hubId });
      toast.success("Contact deleted");
      contactsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  if (contactsQuery.isLoading || hubQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const contacts = contactsQuery.data || [];

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Medical Contacts</h1>
              <p className="text-slate-600 mt-2">Reference database of doctors and healthcare providers</p>
            </div>
            {isFamilyAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Add"} Medical Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Dr. Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="e.g., Cardiologist"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., +1-809-555-1234 or +1-212-555-1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., doctor@hospital.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g., 123 Medical Plaza"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional information"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Update" : "Add"} Contact
                  </Button>
                </form>
              </DialogContent>
              </Dialog>
            )}
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-slate-600">No medical contacts yet. {isFamilyAdmin && "Add one to get started."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{contact.name}</CardTitle>
                      {contact.specialty && <p className="text-sm text-slate-600 mt-1">{contact.specialty}</p>}
                    </div>
                    {isFamilyAdmin && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(contact)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contact.phone && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-600" />
                          {isInternationalNumber(contact.phone) ? (
                            <p className="text-sm">{contact.phone}</p>
                          ) : (
                            <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                          )}
                        </div>
                        
                        {/* International Coordination UI */}
                        {isInternationalNumber(contact.phone) && (
                          <div className="ml-6 space-y-2">
                            {/* Dominican Republic Badge */}
                            {isDominicanRepublic(contact.phone) && (
                              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                                <Globe className="h-4 w-4 text-amber-600" />
                                <span className="text-xs text-amber-700 font-medium">Dominican Republic</span>
                              </div>
                            )}
                            
                            {/* WhatsApp Button */}
                            <a
                              href={getWhatsAppUrl(contact.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message via WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-600" />
                        <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    
                    {contact.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-600" />
                        <p className="text-sm">{contact.address}</p>
                      </div>
                    )}
                    
                    {contact.notes && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">{contact.notes}</p>
                      </div>
                    )}
                    
                    {/* International Coordination Info Box */}
                    {contact.phone && isInternationalNumber(contact.phone) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">💡 International Coordination</p>
                            <p>Use WhatsApp to avoid international calling charges. This contact is in {getCountryName(contact.phone) || 'an international location'}.</p>
                          </div>
                        </div>
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

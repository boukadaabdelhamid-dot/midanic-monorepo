import React, { useState } from "react";
import {
  useGetErpStaff, useCreateErpStaff, useDeleteErpStaff,
  getGetErpStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, UserPlus, Trash2, Crown, User } from "lucide-react";

export default function Staff() {
  const qc = useQueryClient();
  const { data: staff, isLoading } = useGetErpStaff();
  const create = useCreateErpStaff();
  const del = useDeleteErpStaff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" as "employee" | "admin", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Nom, email et mot de passe sont requis / الاسم والبريد وكلمة المرور مطلوبة");
      return;
    }
    if (form.password.length < 6) {
      setError("Mot de passe min. 6 caractères / كلمة المرور 6 أحرف على الأقل");
      return;
    }
    create.mutate(
      { data: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
      } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetErpStaffQueryKey() });
          setOpen(false);
          setForm({ name: "", email: "", password: "", role: "employee", phone: "" });
        },
        onError: (err: unknown) => {
          setError((err as { message?: string })?.message ?? "Échec de la création");
        },
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Supprimer ${name} ? / حذف ${name} ؟`)) return;
    del.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetErpStaffQueryKey() }),
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Accès & Personnel / الصلاحيات والموظفون
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer les comptes administrateurs et employés / إدارة حسابات المسؤولين والموظفين
          </p>
        </div>
        <Button onClick={() => { setError(null); setOpen(true); }} data-testid="button-new-staff">
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau / جديد
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3 text-sm text-amber-900">
          <p className="font-semibold mb-1">À propos des rôles / عن الصلاحيات</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li><strong>Admin / مسؤول</strong> — accès complet (achats, fournisseurs, comptabilité, totaux clients).</li>
            <li><strong>Employee / موظف</strong> — caisse, ventes, stock et clients (sans données financières sensibles).</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Nom / الاسم</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(staff ?? []).map((s) => (
                    <TableRow key={s.id} data-testid={`row-staff-${s.id}`}>
                      <TableCell>
                        {s.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            <Crown className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                            <User className="h-3 w-3" /> Employee
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(s.id, s.name)}
                          data-testid={`btn-delete-staff-${s.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!staff || staff.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun compte</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau membre / عضو جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rôle / الصلاحية *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "employee" })}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${
                    form.role === "employee" ? "border-primary bg-primary/10 text-primary" : "border-input"
                  }`}
                  data-testid="role-employee"
                >
                  <User className="h-4 w-4 inline mr-1" /> Employee / موظف
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "admin" })}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition ${
                    form.role === "admin" ? "border-primary bg-primary/10 text-primary" : "border-input"
                  }`}
                  data-testid="role-admin"
                >
                  <Crown className="h-4 w-4 inline mr-1" /> Admin / مسؤول
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="staff-name">Nom / الاسم *</Label>
              <Input id="staff-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-staff-name" autoFocus />
            </div>
            <div>
              <Label htmlFor="staff-email">Email *</Label>
              <Input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-staff-email" />
            </div>
            <div>
              <Label htmlFor="staff-phone">Téléphone / الهاتف</Label>
              <Input id="staff-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+213 ..." data-testid="input-staff-phone" />
            </div>
            <div>
              <Label htmlFor="staff-pwd">Mot de passe / كلمة المرور * (min 6)</Label>
              <Input id="staff-pwd" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="input-staff-password" />
            </div>
            {error && <p className="text-sm text-red-600" data-testid="text-staff-error">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler / إلغاء</Button>
            <Button onClick={handleCreate} disabled={create.isPending} data-testid="button-save-staff">
              {create.isPending ? "..." : "Enregistrer / حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from "react";
import {
  useGetEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  getGetEmployeesQueryKey,
  type Employee,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

type EmpForm = {
  name: string; email: string; phone: string;
  position: string; salary: string; hireDate: string;
};

const emptyForm: EmpForm = {
  name: "", email: "", phone: "",
  position: "", salary: "", hireDate: new Date().toISOString().slice(0, 10),
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-600",
    on_leave: "bg-amber-100 text-amber-700",
    terminated: "bg-red-100 text-red-700",
  };
  return m[s] ?? "bg-gray-100 text-gray-600";
};

export default function Employees() {
  const qc = useQueryClient();
  const { data: employees, isLoading } = useGetEmployees();
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();
  const [dialog, setDialog] = useState<{ open: boolean; editing: Employee | null }>({ open: false, editing: null });
  const [form, setForm] = useState<EmpForm>(emptyForm);

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true, editing: null }); };
  const openEdit = (e: Employee) => {
    setForm({
      name: e.name ?? "",
      email: e.email ?? "",
      phone: e.phone ?? "",
      position: e.position ?? "",
      salary: String(e.salary ?? ""),
      hireDate: e.hireDate?.slice(0, 10) ?? "",
    });
    setDialog({ open: true, editing: e });
  };

  const handleSave = () => {
    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      position: form.position,
      salary: form.salary,
      hireDate: form.hireDate,
    };
    const onSettled = () => {
      qc.invalidateQueries({ queryKey: getGetEmployeesQueryKey() });
      setDialog({ open: false, editing: null });
    };
    if (dialog.editing) {
      updateEmp.mutate({ id: dialog.editing.id, data }, { onSettled });
    } else {
      createEmp.mutate({ data }, { onSettled });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees / الموظفون</h1>
          <p className="text-sm text-muted-foreground">Manage your team</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" /> Add Employee / إضافة
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>الراتب (دج)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees ?? []).map((e: Employee) => (
                    <TableRow key={e.id} data-testid={`row-employee-${e.id}`}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.position}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.phone ?? "—"}</TableCell>
                      <TableCell>دج {e.salary}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge(e.status)}`}>{e.status}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                            if (confirm("Delete?")) deleteEmp.mutate({ id: e.id }, { onSettled: () => qc.invalidateQueries({ queryKey: getGetEmployeesQueryKey() }) });
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog.editing ? "Edit Employee" : "Add Employee / إضافة موظف"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([ 
              { label: "Full Name", key: "name" as keyof EmpForm, type: "text" },
              { label: "Position", key: "position" as keyof EmpForm, type: "text" },
              { label: "Email", key: "email" as keyof EmpForm, type: "email" },
              { label: "Phone", key: "phone" as keyof EmpForm, type: "text" },
              { label: "الراتب (دج)", key: "salary" as keyof EmpForm, type: "number" },
              { label: "Hire Date", key: "hireDate" as keyof EmpForm, type: "date" },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  type={type}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSave} disabled={createEmp.isPending || updateEmp.isPending} data-testid="button-save-employee">Save / حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from "react";
import {
  useGetEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  getGetEmployeesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

type EmpForm = {
  nameEn: string; nameAr: string; position: string; department: string;
  phone: string; salary: string; hireDate: string; status: string;
};

const emptyForm: EmpForm = {
  nameEn: "", nameAr: "", position: "", department: "",
  phone: "", salary: "", hireDate: new Date().toISOString().slice(0, 10), status: "active"
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-600",
    terminated: "bg-red-100 text-red-700"
  };
  return m[s] ?? "bg-gray-100 text-gray-600";
};

export default function Employees() {
  const qc = useQueryClient();
  const { data: employees, isLoading } = useGetEmployees();
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();
  const [dialog, setDialog] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [form, setForm] = useState<EmpForm>(emptyForm);

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true, editing: null }); };
  const openEdit = (e: any) => {
    setForm({
      nameEn: e.nameEn ?? "", nameAr: e.nameAr ?? "",
      position: e.position ?? "", department: e.department ?? "",
      phone: e.phone ?? "", salary: String(e.salary ?? ""),
      hireDate: e.hireDate?.slice(0, 10) ?? "", status: e.status ?? "active"
    });
    setDialog({ open: true, editing: e });
  };

  const handleSave = () => {
    const data = { ...form, salary: parseFloat(form.salary) };
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
                    <TableHead>Name EN</TableHead>
                    <TableHead>Name AR</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees ?? []).map((e: any) => (
                    <TableRow key={e.id} data-testid={`row-employee-${e.id}`}>
                      <TableCell className="font-medium">{e.nameEn}</TableCell>
                      <TableCell dir="rtl" className="text-right">{e.nameAr}</TableCell>
                      <TableCell>{e.position}</TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.phone}</TableCell>
                      <TableCell>SAR {e.salary}</TableCell>
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
            {[
              { label: "Name (EN)", key: "nameEn" }, { label: "Name (AR)", key: "nameAr" },
              { label: "Position", key: "position" }, { label: "Department", key: "department" },
              { label: "Phone", key: "phone" }, { label: "Salary (SAR)", key: "salary" },
              { label: "Hire Date", key: "hireDate" },
            ].map(({ label, key }) => (
              <div key={key}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  type={key === "salary" ? "number" : key === "hireDate" ? "date" : "text"}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            {dialog.editing && (
              <div>
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "inactive", "terminated"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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

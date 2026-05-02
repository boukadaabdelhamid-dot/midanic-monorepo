import React, { useState } from "react";
import {
  useGetAttendance, useCreateAttendance, useGetEmployees, getGetAttendanceQueryKey
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
import { Plus } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-blue-100 text-blue-700",
};

export default function Attendance() {
  const qc = useQueryClient();
  const { data: attendance, isLoading } = useGetAttendance();
  const { data: employees } = useGetEmployees();
  const createAttendance = useCreateAttendance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "", date: new Date().toISOString().slice(0, 10),
    status: "present", checkIn: "", checkOut: ""
  });

  const handleSave = () => {
    createAttendance.mutate(
      {
        data: {
          employeeId: parseInt(form.employeeId),
          date: form.date,
          status: form.status as any,
          checkIn: form.checkIn || undefined,
          checkOut: form.checkOut || undefined,
        }
      },
      {
        onSettled: () => {
          qc.invalidateQueries({ queryKey: getGetAttendanceQueryKey() });
          setOpen(false);
        }
      }
    );
  };

  const empMap: Record<number, string> = {};
  (employees ?? []).forEach((e: any) => { empMap[e.id] = e.name; });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance / الحضور</h1>
          <p className="text-sm text-muted-foreground">Track employee attendance</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-attendance">
          <Plus className="h-4 w-4 mr-2" /> Record / تسجيل
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status / الحالة</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendance ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{empMap[a.employeeId] ?? `#${a.employeeId}`}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.date ? format(new Date(a.date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.checkIn ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.checkOut ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!attendance || attendance.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Attendance / تسجيل حضور</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["present", "absent", "late", "half_day"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Check In</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Check Out</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createAttendance.isPending || !form.employeeId} data-testid="button-save-attendance">Save / حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

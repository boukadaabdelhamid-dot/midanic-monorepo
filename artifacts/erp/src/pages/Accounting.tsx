import React, { useState } from "react";
import {
  useGetTransactions, useCreateTransaction, useGetAccountingSummary,
  getGetTransactionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";

type TxForm = { type: string; category: string; amount: string; description: string; date: string };
const emptyForm: TxForm = { type: "income", category: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10) };

export default function Accounting() {
  const qc = useQueryClient();
  const { data: transactions, isLoading } = useGetTransactions();
  const { data: summary } = useGetAccountingSummary();
  const createTx = useCreateTransaction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TxForm>(emptyForm);

  const handleSave = () => {
    createTx.mutate(
      { data: { type: form.type as any, category: form.category, amount: parseFloat(form.amount), description: form.description, date: form.date } },
      { onSettled: () => { qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }); setOpen(false); setForm(emptyForm); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounting / المحاسبة</h1>
          <p className="text-sm text-muted-foreground">Track income and expenses</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-transaction">
          <Plus className="h-4 w-4 mr-2" /> Add Transaction / إضافة
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Income / الدخل", value: summary.totalIncome, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Total Expenses / المصروفات", value: summary.totalExpense, icon: TrendingDown, color: "text-red-500" },
            { label: "Net Balance / الرصيد", value: summary.netBalance, icon: DollarSign, color: (summary.netBalance ?? 0) >= 0 ? "text-primary" : "text-destructive" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>SAR {(value ?? 0).toLocaleString()}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transactions ({transactions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(transactions ?? []).map((t: any) => (
                    <TableRow key={t.id} data-testid={`row-tx-${t.id}`}>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.date ? format(new Date(t.date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {t.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{t.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.description}</TableCell>
                      <TableCell className={`font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"} SAR {t.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactions || transactions.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions recorded</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Transaction / إضافة معاملة</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Category</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Sales, Rent..." />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Amount (SAR)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-8 text-sm" placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTx.isPending || !form.amount || !form.category} data-testid="button-save-transaction">Save / حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

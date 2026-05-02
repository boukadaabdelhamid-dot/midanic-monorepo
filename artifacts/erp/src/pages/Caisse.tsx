import React, { useState } from "react";
import { useGetTransactions, useCreateTransaction, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { type CreateTransactionRequestType } from "@workspace/api-client-react";

type CaisseEntry = { label: string; amount: string; note: string };
const emptyEntry: CaisseEntry = { label: "", amount: "", note: "" };

export default function Caisse() {
  const qc = useQueryClient();
  const { data: transactions } = useGetTransactions();
  const createTx = useCreateTransaction();

  const [openDialog, setOpenDialog] = useState<"in" | "out" | null>(null);
  const [entry, setEntry] = useState<CaisseEntry>(emptyEntry);
  const [sessionOpen, setSessionOpen] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const todayTx = (transactions ?? []).filter(
    (t) => t.date && t.date.slice(0, 10) === today && ["sales", "other", "cash"].includes(t.category ?? "")
  );

  const totalIn = todayTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount ?? "0"), 0);

  const totalOut = todayTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + parseFloat(t.amount ?? "0"), 0);

  const balance = totalIn - totalOut;

  const handleSave = () => {
    if (!entry.amount || !openDialog) return;
    createTx.mutate(
      {
        data: {
          type: openDialog === "in" ? "income" as CreateTransactionRequestType : "expense" as CreateTransactionRequestType,
          category: "other",
          amount: entry.amount,
          description: `[Caisse] ${entry.label}${entry.note ? " – " + entry.note : ""}`,
          date: today,
        },
      },
      {
        onSettled: () => {
          qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
          setOpenDialog(null);
          setEntry(emptyEntry);
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-amber-500" />
            Caisse / الصندوق
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMMM d yyyy")} · Session:{" "}
            <span className={sessionOpen ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
              {sessionOpen ? "Ouverte / مفتوحة" : "Fermée / مغلقة"}
            </span>
          </p>
        </div>
        <Button
          variant={sessionOpen ? "destructive" : "default"}
          size="sm"
          onClick={() => setSessionOpen(!sessionOpen)}
        >
          {sessionOpen ? "Fermer la session / إغلاق" : "Ouvrir la session / فتح"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full">
              <ArrowUpCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entrées du jour / دخل اليوم</p>
              <p className="text-2xl font-bold text-emerald-600">دج {totalIn.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-100 bg-red-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowDownCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sorties du jour / مصروف اليوم</p>
              <p className="text-2xl font-bold text-red-500">دج {totalOut.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-2 ${balance >= 0 ? "border-blue-100 bg-blue-50/50" : "border-red-100 bg-red-50/50"}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full ${balance >= 0 ? "bg-blue-100" : "bg-red-100"}`}>
              <Wallet className={`h-6 w-6 ${balance >= 0 ? "text-blue-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solde / الرصيد</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                دج {balance.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {sessionOpen && (
        <div className="flex gap-3">
          <Button
            className="flex-1 h-14 text-base bg-emerald-500 hover:bg-emerald-600"
            onClick={() => { setEntry(emptyEntry); setOpenDialog("in"); }}
            data-testid="button-cash-in"
          >
            <Plus className="h-5 w-5 mr-2" />
            Entrée / إدخال نقدي
          </Button>
          <Button
            className="flex-1 h-14 text-base bg-red-500 hover:bg-red-600"
            onClick={() => { setEntry(emptyEntry); setOpenDialog("out"); }}
            data-testid="button-cash-out"
          >
            <Minus className="h-5 w-5 mr-2" />
            Sortie / إخراج نقدي
          </Button>
        </div>
      )}

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mouvements du jour / حركات اليوم ({todayTx.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Heure / الوقت</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant / المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayTx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Aucun mouvement aujourd'hui / لا توجد حركات اليوم
                    </TableCell>
                  </TableRow>
                ) : (
                  [...todayTx].reverse().map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.date ? format(new Date(t.date), "HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {t.type === "income" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {t.type === "income" ? "Entrée" : "Sortie"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{t.description}</TableCell>
                      <TableCell className={`text-right font-bold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"} دج {parseFloat(t.amount ?? "0").toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openDialog !== null} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={openDialog === "in" ? "text-emerald-600" : "text-red-600"}>
              {openDialog === "in" ? "✚ Entrée de caisse / إدخال نقدي" : "✖ Sortie de caisse / إخراج نقدي"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Libellé / التسمية *</Label>
              <Input
                value={entry.label}
                onChange={(e) => setEntry((f) => ({ ...f, label: e.target.value }))}
                placeholder={openDialog === "in" ? "Vente, versement..." : "Achat, dépense..."}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Montant (دج) *</Label>
              <Input
                type="number"
                min="0"
                value={entry.amount}
                onChange={(e) => setEntry((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="h-9 text-lg font-bold"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Note / ملاحظة</Label>
              <Input
                value={entry.note}
                onChange={(e) => setEntry((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optionnel..."
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Annuler / إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={createTx.isPending || !entry.amount || !entry.label}
              className={openDialog === "in" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}
              data-testid="button-save-cash"
            >
              Enregistrer / حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

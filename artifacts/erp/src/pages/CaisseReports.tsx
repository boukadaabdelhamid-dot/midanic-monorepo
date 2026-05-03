import React, { useMemo, useState } from "react";
import { useGetErpCaisseReports, type CaisseReportRow } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart2, Download, Wallet } from "lucide-react";

const todayISO = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmt = (v: string | number | undefined | null): string => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const personLabel = (r: CaisseReportRow): string =>
  r.owner?.name || r.owner?.email || `Caisse #${r.caisseId}`;

const csvEscape = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function CaisseReports() {
  const [from, setFrom] = useState<string>(todayISO());
  const [to, setTo] = useState<string>(todayISO());

  const { data, isLoading, isFetching, refetch } = useGetErpCaisseReports(
    { from, to },
    { query: { staleTime: 10_000 } },
  );

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const totals = data?.totals;

  const handleExport = () => {
    if (!rows.length) return;
    const headers = [
      "Caisse ID", "Propriétaire", "Email", "Solde actuel",
      "Ventes", "Transferts reçus", "Transferts envoyés",
      "Transferts en attente", "Remboursements",
      "Dépôts → principale", "Retraits ← principale",
      "Ajustements (+)", "Ajustements (-)",
      "Mouvement net", "Nb mouvements",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.caisseId,
        csvEscape(r.owner?.name ?? ""),
        csvEscape(r.owner?.email ?? ""),
        r.currentBalance,
        r.totalSales, r.transfersIn, r.transfersOut,
        r.transfersHeld, r.transfersRefunded,
        r.adminDeposits, r.adminWithdrawals,
        r.adjustmentsCredit, r.adjustmentsDebit,
        r.netMovement, r.movementCount,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caisse-report-${from}-to-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (days: number) => {
    setFrom(todayISO(-days + 1));
    setTo(todayISO());
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-amber-500" />
          Rapport caisses / تقرير الصناديق
        </h1>
        <p className="text-sm text-muted-foreground">
          Activité agrégée par caisse staff sur la période choisie.
          / النشاط المجمّع لكل صندوق موظف خلال الفترة المحددة.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Période / الفترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs mb-1 block">Du / من</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-[160px]"
                data-testid="input-from-date"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Au / إلى</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-[160px]"
                data-testid="input-to-date"
              />
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setQuickRange(1)} data-testid="button-range-today">
                Aujourd'hui
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickRange(7)} data-testid="button-range-7d">
                7 jours
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickRange(30)} data-testid="button-range-30d">
                30 jours
              </Button>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh">
                Actualiser
              </Button>
              <Button
                size="sm"
                className="bg-[#1B3057] hover:bg-[#152544]"
                onClick={handleExport}
                disabled={rows.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-1.5" /> Exporter CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-600" />
            Activité par caisse / النشاط لكل صندوق
          </CardTitle>
          {data && (
            <span className="text-xs text-muted-foreground">
              {new Date(data.from).toLocaleString("fr-DZ")} → {new Date(data.to).toLocaleString("fr-DZ")}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Solde actuel</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Transf. reçus</TableHead>
                  <TableHead className="text-right">Transf. envoyés</TableHead>
                  <TableHead className="text-right">En attente</TableHead>
                  <TableHead className="text-right">Remb.</TableHead>
                  <TableHead className="text-right">Dépôts→princ.</TableHead>
                  <TableHead className="text-right">Retraits←princ.</TableHead>
                  <TableHead className="text-right">Ajust. (±)</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Mvts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Chargement... / جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Aucune caisse staff dans ce magasin / لا توجد صناديق موظفين
                    </TableCell>
                  </TableRow>
                ) : rows.map((r) => {
                  const adjNet = parseFloat(r.adjustmentsCredit) - parseFloat(r.adjustmentsDebit);
                  const net = parseFloat(r.netMovement);
                  return (
                    <TableRow key={r.caisseId} data-testid={`row-report-${r.caisseId}`}>
                      <TableCell>
                        <div className="font-medium">{personLabel(r)}</div>
                        {r.owner?.email && (
                          <div className="text-xs text-muted-foreground">{r.owner.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">دج {fmt(r.currentBalance)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{fmt(r.totalSales)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{fmt(r.transfersIn)}</TableCell>
                      <TableCell className="text-right text-red-700">{fmt(r.transfersOut)}</TableCell>
                      <TableCell className="text-right text-amber-700">{fmt(r.transfersHeld)}</TableCell>
                      <TableCell className="text-right">{fmt(r.transfersRefunded)}</TableCell>
                      <TableCell className="text-right text-red-700">{fmt(r.adminDeposits)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{fmt(r.adminWithdrawals)}</TableCell>
                      <TableCell className={`text-right ${adjNet >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {adjNet >= 0 ? "+" : ""}{fmt(adjNet)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {net >= 0 ? "+" : ""}{fmt(net)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.movementCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {totals && rows.length > 0 && (
                <TableFooter>
                  <TableRow data-testid="row-totals">
                    <TableCell className="font-bold">Totaux / المجموع</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-bold">{fmt(totals.totalSales)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.transfersIn)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.transfersOut)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.transfersHeld)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.transfersRefunded)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.adminDeposits)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.adminWithdrawals)}</TableCell>
                    <TableCell className="text-right font-bold">
                      {fmt(parseFloat(totals.adjustmentsCredit) - parseFloat(totals.adjustmentsDebit))}
                    </TableCell>
                    <TableCell className="text-right font-bold">{fmt(totals.netMovement)}</TableCell>
                    <TableCell className="text-right font-bold">{totals.movementCount}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

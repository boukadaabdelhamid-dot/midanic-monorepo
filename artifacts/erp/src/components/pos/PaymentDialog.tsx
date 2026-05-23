import { useEffect, useState } from "react";
import type { CustomerSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, Check } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentDialog({
  open, onOpenChange, net, client, versement, setVersement, onConfirm, isPending,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  net: number; client: CustomerSummary | null;
  versement: number; setVersement: (n: number) => void;
  onConfirm: (opts: { mode: "comptant" | "terme"; cloture: boolean; impression: boolean }) => void;
  isPending: boolean;
}) {
  const [cloture, setCloture] = useState(true);
  const [impression, setImpression] = useState(true);
  const [versementOn, setVersementOn] = useState(false);
  const [localAmount, setLocalAmount] = useState("");

  const soldeClient = Number(client?.total_spent ?? 0);
  const seuilCredit = 20000;

  useEffect(() => {
    if (open) { setLocalAmount(""); setVersement(0); }
  }, [open, setVersement]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Règlement de la commande / تسوية الطلبية</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-4 text-sm pb-2 border-b">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={cloture} onCheckedChange={setCloture} data-testid="switch-cloture" />
              <span>Clôture</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={impression} onCheckedChange={setImpression} data-testid="switch-impression" />
              <span>Impression</span>
            </label>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solde actuel du client</span>
              <span className={soldeClient < 0 ? "text-red-600 font-semibold" : "font-semibold"}>{fmt(soldeClient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seuil de crédit</span>
              <span className="font-semibold">{fmt(seuilCredit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versement sur cet achat</span>
              <span className="font-semibold">{fmt(versement)}</span>
            </div>
          </div>

          <div className="relative">
            <Input
              type="number" step="0.01" min="0" value={localAmount}
              onChange={(e) => { setLocalAmount(e.target.value); setVersement(parseFloat(e.target.value) || 0); }}
              placeholder="0,00"
              className="h-12 text-xl font-bold pr-12 text-right"
              disabled={!versementOn}
              data-testid="input-versement"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">DA</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versement min nécessaire</span>
            <span className="font-semibold">0,00</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Switch checked={versementOn} onCheckedChange={setVersementOn} data-testid="switch-versement" />
            <span>Versement</span>
          </label>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-stretch">
          <Button variant="outline"
            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => !isPending && onConfirm({ mode: "terme", cloture, impression })}
            data-testid="button-aterme">
            <RotateCcw className="h-4 w-4 mr-1.5" />À terme
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => !isPending && onConfirm({ mode: "comptant", cloture, impression })}
            data-testid="button-comptant">
            <Check className="h-4 w-4 mr-1.5" />Comptant ({fmt(net)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

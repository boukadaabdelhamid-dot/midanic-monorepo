import { useState } from "react";
import type { CustomerSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

export function ClientPickerButton({
  onPick, customers,
}: { onPick: (c: CustomerSummary | null) => void; customers: CustomerSummary[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600"
        onClick={() => setOpen(true)} aria-label="Choisir client" data-testid="button-pick-client">
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un client / اختيار العميل</DialogTitle>
          </DialogHeader>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtre" className="h-10" autoFocus />
          <div className="max-h-80 overflow-y-auto border rounded">
            <button type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b"
              onClick={() => { onPick(null); setOpen(false); }}>
              <span className="font-semibold">DIVER COMPTOIR</span>
              <span className="text-xs text-muted-foreground block">Client par défaut</span>
            </button>
            {filtered.map((c) => (
              <button key={c.id} type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b"
                onClick={() => { onPick(c); setOpen(false); }}
                data-testid={`button-client-${c.id}`}>
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground block">{c.email}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun client</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

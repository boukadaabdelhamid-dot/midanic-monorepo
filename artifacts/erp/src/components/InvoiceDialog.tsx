import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import InvoiceTemplate, { type InvoiceData } from "./InvoiceTemplate";

export default function InvoiceDialog({
  open, onOpenChange, data, autoPrint,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: InvoiceData | null;
  autoPrint?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !autoPrint) return;
    const t = setTimeout(() => handlePrint(), 250);
    return () => clearTimeout(t);
  }, [open, autoPrint]);

  function handlePrint() {
    const node = printRef.current;
    if (!node) { window.print(); return; }
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { window.print(); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Facture</title></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); w.close(); } catch { /* noop */ } }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[230mm] p-0 max-h-[92vh] overflow-y-auto">
        <div className="invoice-no-print sticky top-0 z-20 bg-white border-b px-4 py-2 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Aperçu facture / معاينة الفاتورة</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Fermer
            </Button>
            <Button size="sm" className="bg-[#1B3057] hover:bg-[#142441]" onClick={handlePrint} data-testid="button-print-invoice">
              <Printer className="h-4 w-4 mr-1" /> Imprimer / طباعة
            </Button>
          </div>
        </div>
        <div ref={printRef} className="p-3 bg-slate-100">
          {data && <InvoiceTemplate data={data} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

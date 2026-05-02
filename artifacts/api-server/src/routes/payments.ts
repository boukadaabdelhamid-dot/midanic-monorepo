import { Router } from "express";
import Stripe from "stripe";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../lib/auth";

const router = Router();

let _stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  if (_stripe) return _stripe;
  _stripe = new Stripe(key);
  return _stripe;
}

function getDomain(): string {
  const domains = process.env["REPLIT_DOMAINS"] || "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  const dev = process.env["REPLIT_DEV_DOMAIN"];
  if (dev) return `https://${dev}`;
  return "http://localhost:3000";
}

// POST /payments/create-intent
// Creates a Stripe PaymentIntent for an existing order (used by web checkout)
router.post("/payments/create-intent", authenticate, async (req: AuthRequest, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Payment processing is not configured" });
    return;
  }

  try {
    const { orderId } = req.body as { orderId?: number };
    if (!orderId) {
      res.status(400).json({ error: "orderId is required" });
      return;
    }

    const [order] = await db
      .select()
      .from(schema.ordersTable)
      .where(eq(schema.ordersTable.id, Number(orderId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.totalAmount) * 100), // halalas (SAR × 100)
      currency: "sar",
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: String(order.id),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// POST /payments/checkout-session
// Creates a Stripe Checkout Session URL (used by mobile app via expo-web-browser)
router.post("/payments/checkout-session", async (req: AuthRequest, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Payment processing is not configured" });
    return;
  }

  try {
    const { orderId } = req.body as { orderId?: number };
    if (!orderId) {
      res.status(400).json({ error: "orderId is required" });
      return;
    }

    const [order] = await db
      .select()
      .from(schema.ordersTable)
      .where(eq(schema.ordersTable.id, Number(orderId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const base = getDomain();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "sar",
            product_data: {
              name: `طلب ميدانيك #${order.id} | Midanic Order #${order.id}`,
              description: order.customerName,
            },
            unit_amount: Math.round(parseFloat(order.totalAmount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${base}/orders/${order.id}?payment=success`,
      cancel_url: `${base}/checkout?payment=cancelled`,
      metadata: {
        orderId: String(order.id),
        customerName: order.customerName,
      },
      customer_email: undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    if (req.log) req.log.error(err);
    else console.error(err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /payments/webhook
// Stripe sends events here. Raw body required (configured in app.ts).
router.post("/payments/webhook", async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!stripe || !webhookSecret) {
    // Silently accept if not configured
    res.json({ received: true });
    return;
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = parseInt(pi.metadata?.orderId ?? "0");
        if (orderId) {
          await db
            .update(schema.ordersTable)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(schema.ordersTable.id, orderId));
          console.log(`[Payments] PaymentIntent succeeded → Order #${orderId} → processing`);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = parseInt(session.metadata?.orderId ?? "0");
        if (orderId) {
          await db
            .update(schema.ordersTable)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(schema.ordersTable.id, orderId));
          console.log(`[Payments] Checkout session completed → Order #${orderId} → processing`);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`[Payments] Payment failed for order #${pi.metadata?.orderId}`);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[Payments] Webhook handler error:", err);
  }

  res.json({ received: true });
});

export default router;

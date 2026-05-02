import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!accountSid || !authToken) return null;
  if (_client) return _client;
  _client = twilio(accountSid, authToken);
  return _client;
}

export async function sendOrderConfirmationSMS(
  phone: string,
  orderId: number,
  total: number,
  customerName: string
): Promise<void> {
  const client = getTwilioClient();
  const fromPhone = process.env["TWILIO_PHONE_NUMBER"];

  if (!client || !fromPhone) {
    console.warn("[SMS] Twilio not configured — skipping SMS for order #" + orderId);
    return;
  }

  const body =
    `ميدانيك: شكراً ${customerName}! طلبك رقم #${orderId} بقيمة ${total.toFixed(2)} ر.س تم استلامه وسنتواصل معك قريباً. | Midanic: Thank you ${customerName}! Order #${orderId} (SAR ${total.toFixed(2)}) received. We'll contact you soon.`;

  try {
    await client.messages.create({ body, from: fromPhone, to: phone });
    console.log(`[SMS] Confirmation sent to ${phone} for order #${orderId}`);
  } catch (err) {
    console.error(`[SMS] Failed to send message: ${(err as Error).message}`);
  }
}

export async function sendAdminOrderAlertSMS(
  orderId: number,
  customerName: string,
  total: number
): Promise<void> {
  const client = getTwilioClient();
  const adminPhone = process.env["TWILIO_ADMIN_PHONE"] || process.env["TWILIO_PHONE_NUMBER"];
  const fromPhone = process.env["TWILIO_PHONE_NUMBER"];

  if (!client || !fromPhone || !adminPhone || adminPhone === fromPhone) {
    return;
  }

  const body = `[ميدانيك] طلب جديد #${orderId} من ${customerName} — ${total.toFixed(2)} ر.س | [Midanic] New order #${orderId} from ${customerName} — SAR ${total.toFixed(2)}`;

  try {
    await client.messages.create({ body, from: fromPhone, to: adminPhone });
  } catch (err) {
    console.error(`[SMS] Admin alert failed: ${(err as Error).message}`);
  }
}

import crypto from "crypto";
import { db } from "@/lib/db";
import { webhookEvents, webhookLogs } from "@/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (hash.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const signature = req.headers.get("x-webhook-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 401 });

  const body = await req.text();
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: { message?: string; hubId?: string; metadata?: Record<string, unknown> };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, hubId, metadata } = parsed;
  if (!message || typeof message !== "string") return NextResponse.json({ error: "Missing message" }, { status: 400 });
  if (!hubId || typeof hubId !== "string") return NextResponse.json({ error: "Missing hubId" }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const eventId = crypto.randomUUID();

  try {
    await db.insert(webhookEvents).values({
      id: eventId, hubId, message,
      payload: metadata ? JSON.stringify(metadata) : null,
      status: "pending",
    });

    await db.insert(webhookLogs).values({
      id: crypto.randomUUID(),
      webhookEventId: eventId,
      statusCode: 200,
      responseMessage: "Event queued",
      ipAddress, userAgent,
    });

    return NextResponse.json({ success: true, eventId });
  } catch (err) {
    console.error("[Webhook] DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

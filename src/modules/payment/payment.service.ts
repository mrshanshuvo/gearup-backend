import { PaymentStatus, RentalOrderStatus, Role } from "@prisma/client";
import Stripe from "stripe";
import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";

const stripe = new Stripe(config.stripe_secret_key || "");

const createPaymentIntentInDB = async (
  rentalOrderId: string,
  customerId: string,
) => {
  const rentalOrder = await prisma.rentalOrder.findUnique({
    where: { id: rentalOrderId },
    include: { gearItem: true },
  });

  if (!rentalOrder) {
    throw new Error("Rental order not found");
  }

  if (rentalOrder.customerId !== customerId) {
    throw new Error("You are not authorized to pay for this rental order");
  }

  if (rentalOrder.status === RentalOrderStatus.CANCELLED) {
    throw new Error("Cannot pay for a cancelled rental order");
  }

  // Create Stripe Payment Intent
  const amountInCents = Math.round(rentalOrder.totalCost * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "bdt",
    metadata: {
      rentalOrderId: rentalOrder.id,
      customerId,
    },
  });

  // Check if a payment already exists for this order
  const existingPayment = await prisma.payment.findFirst({
    where: { rentalOrderId },
  });

  let paymentRecord;
  if (existingPayment) {
    paymentRecord = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        transactionId: paymentIntent.id,
        amount: rentalOrder.totalCost,
        status: PaymentStatus.PENDING,
      },
    });
  } else {
    paymentRecord = await prisma.payment.create({
      data: {
        rentalOrderId,
        transactionId: paymentIntent.id,
        amount: rentalOrder.totalCost,
        method: "Stripe",
        status: PaymentStatus.PENDING,
      },
    });
  }

  return {
    clientSecret: paymentIntent.client_secret,
    transactionId: paymentIntent.id,
    amount: rentalOrder.totalCost,
    paymentId: paymentRecord.id,
  };
};

const confirmPaymentInDB = async (transactionId: string) => {
  const isMock =
    transactionId.startsWith("mock_") ||
    process.env.ALLOW_MOCK_PAYMENTS === "true" ||
    process.env.NODE_ENV !== "production";

  if (!isMock) {
    const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
    if (paymentIntent.status !== "succeeded") {
      throw new Error(
        `Payment intent status is ${paymentIntent.status}, not succeeded`,
      );
    }
  }

  const paymentRecord = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!paymentRecord) {
    throw new Error("Payment record not found in database");
  }

  if (paymentRecord.status === PaymentStatus.COMPLETED) {
    return paymentRecord;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update Payment
    const updatedPayment = await tx.payment.update({
      where: { transactionId },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    });

    // Update Rental Order status to PAID
    await tx.rentalOrder.update({
      where: { id: paymentRecord.rentalOrderId },
      data: {
        status: RentalOrderStatus.PAID,
      },
    });

    return updatedPayment;
  });

  return result;
};

const handleStripeWebhook = async (
  rawBody: string | Buffer,
  signature: string,
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe_webhook_secret || "",
    );
  } catch (err: any) {
    throw new Error(`Webhook Signature verification failed: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const transactionId = paymentIntent.id;

    const paymentRecord = await prisma.payment.findUnique({
      where: { transactionId },
    });

    if (paymentRecord && paymentRecord.status !== PaymentStatus.COMPLETED) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { transactionId },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        await tx.rentalOrder.update({
          where: { id: paymentRecord.rentalOrderId },
          data: {
            status: RentalOrderStatus.PAID,
          },
        });
      });
    }
  }

  return { received: true };
};

const getUserPaymentsFromDB = async (userId: string, role: Role) => {
  if (role === Role.Admin) {
    const total = await prisma.payment.count();
    const result = await prisma.payment.findMany({
      include: {
        rentalOrder: {
          include: {
            customer: {
              select: { name: true, email: true },
            },
            gearItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      meta: { page: 1, limit: total, total },
      data: result,
    };
  } else {
    // Return payments for rentals belong to this customer
    const total = await prisma.payment.count({
      where: { rentalOrder: { customerId: userId } },
    });
    const result = await prisma.payment.findMany({
      where: {
        rentalOrder: {
          customerId: userId,
        },
      },
      include: {
        rentalOrder: {
          include: {
            gearItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      meta: { page: 1, limit: total, total },
      data: result,
    };
  }
};

const getPaymentByIdFromDB = async (id: string, userId: string, role: Role) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      rentalOrder: {
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          gearItem: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (role !== Role.Admin && payment.rentalOrder.customerId !== userId) {
    throw new Error("You are not authorized to view this payment details");
  }

  return payment;
};

export const PaymentService = {
  createPaymentIntentInDB,
  confirmPaymentInDB,
  handleStripeWebhook,
  getUserPaymentsFromDB,
  getPaymentByIdFromDB,
};

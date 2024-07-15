"use server";
import { z } from "zod";
import { Customer, Invoice, InvoicesTable } from "./definitions";
import { http2, http3 } from "./http";
import { RESOURCE } from "../constants/resources";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invoices, invoices_table } from "./placeholder-data";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  const invoice: Omit<Invoice, "id"> = {
    amount: amountInCents.toString(),
    customer_id: customerId,
    date,
    status,
  };

  const createInvoicePromise = http2.post<Invoice>(
    `${RESOURCE.INVOICES}`,
    invoice
  );

  const customerPromise = http2.get<Customer>(
    `${RESOURCE.CUSTOMER}/${customerId}`
  );

  const {
    "0": { data: createdInvoice },
    "1": { data: customer },
  } = await Promise.all([createInvoicePromise, customerPromise]);

  if (customer) {
    const invoiceTable: InvoicesTable = {
      id: createdInvoice.id,
      customer_id: createdInvoice.customer_id,
      name: customer.name,
      email: customer.email,
      image_url: customer.image_url,
      date: createdInvoice.date,
      amount: Number(invoice.amount),
      status: invoice.status,
    };

    try {
      await http3.post<InvoicesTable>(
        `${RESOURCE.INVOICES_TABLE}`,
        invoiceTable
      );
    } catch (error) {
      return {
        message: "Database Error: Failed to Create Invoice.",
      };
    }

    revalidatePath("/dashboard/invoices");

    redirect("/dashboard/invoices");
  }
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// ...

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  const invoiceTablePromise = http3.get<InvoicesTable>(
    `${RESOURCE.INVOICES_TABLE}/${id}`
  );
  const invoicePromise = http2.get<Invoice>(`${RESOURCE.INVOICES}/${id}`);

  const {
    "0": { data: invoiceTable },
    "1": { data: invoice },
  } = await Promise.all([invoiceTablePromise, invoicePromise]);

  const updateInvoiceTable: InvoicesTable = {
    ...invoiceTable,
    customer_id: customerId,
    amount: amountInCents,
    status,
  };

  const updateInvoice: Invoice = {
    ...invoice,
    customer_id: customerId,
    amount: amountInCents.toString(),
    status,
  };

  try {
    await Promise.all([
      http3.put<InvoicesTable>(
        `${RESOURCE.INVOICES_TABLE}/${id}`,
        updateInvoiceTable
      ),
      http2.put<Invoice>(`${RESOURCE.INVOICES}/${id}`, updateInvoice),
    ]);
  } catch (error) {
    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices", "page");

  redirect("/dashboard/invoices");
}

export const deleteInvoice = async (id: string) => {
  const deleteInvoiceTablePromise = http3.delete<InvoicesTable>(
    `${RESOURCE.INVOICES_TABLE}/${id}`
  );
  const deleteInvoicePromise = http2.delete<Invoice>(
    `${RESOURCE.INVOICES}/${id}`
  );

  try {
    await Promise.all([deleteInvoiceTablePromise, deleteInvoicePromise]);
  } catch (error) {
    return { message: "Database Error: Failed to Delete Invoice" };
  }

  revalidatePath("/dashboard/invoices");
};

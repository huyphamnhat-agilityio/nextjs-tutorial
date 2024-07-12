"use server";
import { z } from "zod";
import { Invoice, InvoicesTable } from "./definitions";
import { http2 } from "./http";
import { RESOURCE } from "../constants/resources";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customers, invoices, invoices_table } from "./placeholder-data";

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

  const invoice: Invoice = {
    id: (invoices.length + 1).toString(),
    amount: amountInCents.toString(),
    customer_id: customerId,
    date,
    status,
  };

  // await http2.post<Invoice>(`${RESOURCE.INVOICES}`, invoice);

  invoices.push({
    ...invoice,
    amount: Number(invoice.amount),
  });

  const customer = customers.find((c) => c.id === customerId);

  if (customer) {
    const invoiceTable: InvoicesTable = {
      id: invoice.id,
      customer_id: invoice.customer_id,
      name: customer.name,
      email: customer.email,
      image_url: customer.image_url,
      date: invoice.date,
      amount: Number(invoice.amount),
      status: invoice.status,
    };

    invoices_table.push(invoiceTable);

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

  const updateTableIndex = invoices_table.findIndex(
    (invoice) => invoice.id === id
  );

  const updatedInvoiceTable = {
    ...invoices_table[updateTableIndex],
    customer_id: customerId,
    amount: amountInCents,
    status,
  };

  console.log("updateTableIndex", updateTableIndex);
  console.log("updatedInvoiceTable", updatedInvoiceTable);

  invoices_table.toSpliced(updateTableIndex, 1, updatedInvoiceTable);

  console.log("invoices_table", invoices_table);

  const updatedInvoiceIndex = invoices.findIndex(
    (invoice) => invoice.id === id
  );

  const updateInvoice = {
    ...invoices[updatedInvoiceIndex],
    customer_id: customerId,
    amount: amountInCents,
    status,
  };

  invoices.splice(updatedInvoiceIndex, 1, updateInvoice);

  // console.log("invoices[updatedInvoiceIndex]", invoices[updatedInvoiceIndex]);

  revalidatePath("/dashboard/invoices", "page");

  redirect("/dashboard/invoices");
}

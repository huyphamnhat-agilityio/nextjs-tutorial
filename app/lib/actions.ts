"use server";
import { z } from "zod";
import { Customer, Invoice, InvoicesTable } from "./definitions";
import { fetchApi, http2, http3 } from "./http";
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

  const formattedInvoice = {
    ...invoice,
    amount: Number(invoice.amount),
  };

  const createInvoicePromise = await fetchApi<Invoice>(
    `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}`,
    {
      body: JSON.stringify(formattedInvoice),
      method: "POST",
    }
  );

  const customerPromise = fetchApi<Customer>(
    `${process.env.MOCK_API_V2}/${RESOURCE.CUSTOMER}/${customerId}`
  );

  const [createdInvoice, customer] = await Promise.all([
    createInvoicePromise,
    customerPromise,
  ]);

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
      await fetchApi<InvoicesTable>(
        `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}`,
        {
          body: JSON.stringify(invoiceTable),
          method: "POST",
        }
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

  const invoiceTablePromise = fetchApi<InvoicesTable>(
    `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}/${id}`
  );

  const invoicePromise = await fetchApi<Invoice>(
    `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}/${id}`
  );

  const [invoiceTable, invoice] = await Promise.all([
    invoiceTablePromise,
    invoicePromise,
  ]);

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
      fetchApi<InvoicesTable>(
        `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}/${id}`,
        { body: JSON.stringify(updateInvoiceTable), method: "PUT" }
      ),
      fetchApi<Invoice>(
        `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}/${id}`,
        { body: JSON.stringify(updateInvoice), method: "PUT" }
      ),
    ]);
  } catch (error) {
    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices", "page");

  redirect("/dashboard/invoices");
}

export const deleteInvoice = async (id: string) => {
  // const deleteInvoiceTablePromise = http3.delete<InvoicesTable>(
  //   `${RESOURCE.INVOICES_TABLE}/${id}`
  // );
  // const deleteInvoicePromise = http2.delete<Invoice>(
  //   `${RESOURCE.INVOICES}/${id}`
  // );

  const deleteInvoiceTablePromise = fetchApi<InvoicesTable>(
    `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}/${id}`,
    { method: "DELETE" }
  );

  const deleteInvoicePromise = fetchApi<Invoice>(
    `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}/${id}`,
    { method: "DELETE" }
  );

  try {
    await Promise.all([deleteInvoiceTablePromise, deleteInvoicePromise]);
  } catch (error) {
    return { message: "Database Error: Failed to Delete Invoice" };
  }

  revalidatePath("/dashboard/invoices");
};

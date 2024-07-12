import { sql } from "@vercel/postgres";
import {
  Customer,
  CustomerField,
  CustomersTableType,
  Invoice,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import axios from "axios";
import { RESOURCE } from "../constants/resources";
import {
  customers,
  invoices,
  invoices_table,
  revenue,
} from "./placeholder-data";

const http1 = axios.create({
  baseURL: `${process.env.MOCK_API_V1}`,
});

const http2 = axios.create({
  baseURL: `${process.env.MOCK_API_V2}`,
});

function filterByValue<T extends Record<string, any>>(
  array: Array<T>,
  value: string
) {
  return array.filter((item) =>
    Object.keys(item).some(
      (k) =>
        item[k] != null &&
        item[k].toString().toLowerCase().includes(value.toLowerCase())
    )
  );
}

export async function fetchRevenue() {
  try {
    const placeHolderRevenue = new Promise<Array<Revenue>>((resolve) => {
      resolve(revenue);
    });
    return placeHolderRevenue;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const latestInvoices = (
      await http2.get<Array<Invoice>>(
        `/${RESOURCE.INVOICES}?p=1&l=5&sortBy=date&order=desc`
      )
    ).data;

    const latestFormattedInvoices = latestInvoices.map<LatestInvoice>(
      (invoice) => {
        const customer = customers.find((c) => c.id === invoice.customer_id);

        return {
          id: invoice.id,
          name: customer?.name ?? "",
          amount: invoice.amount,
          email: customer?.email ?? "",
          image_url: customer?.image_url ?? "",
        };
      }
    );

    const formatCurrencyInvoices = latestFormattedInvoices.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(Number(invoice.amount)),
    }));

    return formatCurrencyInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    const invoiceCountPromise = new Promise<number>((resolve) => {
      resolve(invoices.length);
    });

    const customerCountPromise = new Promise<number>((resolve) => {
      resolve(customers.length);
    });

    const invoiceStatusPromise = new Promise<Array<Invoice>>((resolve) => {
      resolve(
        invoices.map((invoice) => ({
          ...invoice,
          amount: invoice.amount.toString(),
          status: invoice.status as "paid" | "pending",
        }))
      );
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = data[0];
    const numberOfCustomers = data[1];
    const totalPaidInvoices = formatCurrency(
      data[2]
        .filter((invoice) => invoice.status === "paid")
        .reduce((current, next) => current + Number(next.amount), 0) ?? "0"
    );
    const totalPendingInvoices = formatCurrency(
      data[2]
        .filter((invoice) => invoice.status === "pending")
        .reduce((current, next) => current + Number(next.amount), 0) ?? "0"
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  try {
    // const latestInvoicesTable = invoices_table.sort(
    //   (current, next) => -current.date.localeCompare(next.date)
    // );

    const invoicesTableByQuery = filterByValue(invoices_table, query);

    const latestInvoicesTable = invoicesTableByQuery.sort(
      (current, next) => -current.date.localeCompare(next.date)
    );

    const paginatedInvoicesTable = latestInvoicesTable.splice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    // const invoicesTable = new Promise<Array<InvoicesTable>>((resolve) => {
    //   resolve(
    //     latestInvoices.map<InvoicesTable>((invoice) => {
    //       const customer = customers.find((c) => c.id === invoice.customer_id);
    //       return {
    //         id: invoice.id,
    //         customer_id: invoice.customer_id,
    //         name: customer?.name ?? "",
    //         email: customer?.email ?? "",
    //         image_url: customer?.image_url ?? "",
    //         date: invoice.date,
    //         amount: Number(invoice.amount),
    //         status: invoice.status as "pending" | "paid",
    //       };
    //     })
    //   );
    // });

    return paginatedInvoicesTable;
  } catch (error) {
    return [];
    // console.error("Database Error:", error);
    // throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const invoicesTableByQuery = filterByValue(invoices_table, query);

    return Math.ceil(invoicesTableByQuery.length / ITEMS_PER_PAGE);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

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
import { RESOURCE } from "../constants/resources";
import { fetchApi, http1, http2, http3 } from "./http";

// function filterByValue<T extends Record<string, any>>(
//   array: Array<T>,
//   value: string
// ) {
//   return array.filter((item) =>
//     Object.keys(item).some(
//       (k) =>
//         item[k] != null &&
//         item[k].toString().toLowerCase().includes(value.toLowerCase())
//     )
//   );
// }

export async function fetchRevenue() {
  try {
    const revenues = await fetchApi<Array<Revenue>>(
      `${process.env.MOCK_API_V1}/${RESOURCE.REVENUE}`
    );

    return revenues;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const latestInvoices = await fetchApi<Array<Invoice>>(
      `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}?p=1&l=5&sortBy=date&order=desc`
    );

    const customers = await fetchApi<Array<Customer>>(
      `${process.env.MOCK_API_V2}/${RESOURCE.CUSTOMER}`
    );

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
    const invoices = await fetchApi<Array<Invoice>>(
      `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}?p=1&l=5&sortBy=date&order=desc`
    );

    const customersPromise = fetchApi<Array<Customer>>(
      `${process.env.MOCK_API_V2}/${RESOURCE.CUSTOMER}?p=1&l=5&sortBy=date&order=desc`
    );

    const invoiceStatusPromise = new Promise<Array<Invoice>>((resolve) => {
      resolve(
        invoices.map((invoice) => ({
          ...invoice,
          amount: invoice.amount.toString(),
          status: invoice.status as "paid" | "pending",
        }))
      );
    });

    const data = await Promise.all([customersPromise, invoiceStatusPromise]);

    const numberOfInvoices = invoices.length;
    const numberOfCustomers = data[0].length;
    const totalPaidInvoices = formatCurrency(
      data[1]
        .filter((invoice) => invoice.status === "paid")
        .reduce((current, next) => current + Number(next.amount), 0) ?? "0"
    );
    const totalPendingInvoices = formatCurrency(
      data[1]
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
    const filteredInvoices = await fetchApi<Array<InvoicesTable>>(
      `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}?p=${currentPage}&l=${ITEMS_PER_PAGE}&filter=${query}&sortBy=date&order=desc`
    );
    return filteredInvoices;
  } catch (error) {
    return [];
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const invoicesTableByQuery = await fetchApi<Array<InvoicesTable>>(
      `${process.env.MOCK_API_V3}/${RESOURCE.INVOICES_TABLE}?filter=${query}`
    );

    return Math.ceil(invoicesTableByQuery.length / ITEMS_PER_PAGE);
  } catch (error) {
    return 0;
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await fetchApi<Invoice>(
      `${process.env.MOCK_API_V2}/${RESOURCE.INVOICES}/${id}`
    );

    const formattedInvoice = {
      ...invoice,
      amount: Number(invoice.amount) / 100,
      status: invoice.status,
    };

    return formattedInvoice;
  } catch (error) {
    return undefined;
  }
}

export async function fetchCustomers() {
  try {
    const customers = await fetchApi<Array<Customer>>(
      `${process.env.MOCK_API_V2}/${RESOURCE.CUSTOMER}?sortBy=name`
    );

    const customerFields = customers.map<CustomerField>((customer) => ({
      id: customer.id,
      name: customer.name,
    }));

    return customerFields;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

// export async function fetchFilteredCustomers(query: string) {
//   try {
//     const data = await sql<CustomersTableType>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));

//     return customers;
//   } catch (err) {
//     console.error("Database Error:", err);
//     throw new Error("Failed to fetch customer table.");
//   }
// }

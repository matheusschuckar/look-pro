// lib/airtableClient.ts

// --- ENV (aceitamos alguns nomes antigos como fallback) ---
const apiKey =
  process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ||
  process.env.NEXT_PUBLIC_AIRTABLE_TOKEN || // fallback
  "";

const baseId =
  process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID ||
  process.env.AIRTABLE_BASE_ID || // fallback
  "";

const tableName =
  process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME ||
  process.env.AIRTABLE_TABLE_NAME || // fallback
  "Orders";

// URL base da API REST do Airtable
const apiBaseUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
  tableName
)}`;

// Validação simples das variáveis de ambiente
function assertEnv() {
  if (!apiKey)
    throw new Error(
      "Airtable API key ausente (.env): defina NEXT_PUBLIC_AIRTABLE_API_KEY"
    );
  if (!baseId)
    throw new Error(
      "Airtable Base ID ausente (.env): defina NEXT_PUBLIC_AIRTABLE_BASE_ID"
    );
  if (!tableName)
    throw new Error(
      "Airtable Table Name ausente (.env): defina NEXT_PUBLIC_AIRTABLE_TABLE_NAME"
    );
}

// ---------- Criar pedido ----------
export async function createOrder(fields: Record<string, any>) {
  assertEnv();

  const res = await fetch(apiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`, // PAT (pat_...)
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true, // ajuda a casar tipos de coluna automaticamente
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Erro detalhado (401/403 normalmente é token/base/tabela inválidos)
    throw new Error(`Airtable ${res.status}: ${JSON.stringify(data)}`);
  }

  return data as {
    records: Array<{ id: string; fields: Record<string, any> }>;
  };
}

// ---------- Listar pedidos por e-mail ----------
export async function listOrders(userEmail: string) {
  assertEnv();

  const formula = `LOWER({User Email})='${userEmail.toLowerCase()}'`;
  const url =
    `${apiBaseUrl}?filterByFormula=${encodeURIComponent(formula)}` +
    `&sort[0][field]=Created%20At&sort[0][direction]=desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Airtable ${res.status}: ${JSON.stringify(data)}`);
  }

  return (data.records || []) as Array<{
    id: string;
    fields: Record<string, any>;
    createdTime: string;
  }>;
}

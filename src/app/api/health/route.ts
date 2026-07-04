export const dynamic = "force-dynamic";

// Healthcheck simple: en esta app usamos Supabase como base de datos
// principal, así que no dependemos de la conexión PostgreSQL local del
// template original. Este endpoint simplemente indica que la API está
// viva y que el servidor puede responder.
export async function GET() {
  return Response.json({ ok: true });
}
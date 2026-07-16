# 🗺️ ROADMAP DE DATOS — YOLE SHOP (Gestor-Manager)
*Qué carga cada pantalla, de dónde, y qué debería mostrar*

---

## 📐 ARQUITECTURA DE DATOS (resumen)

```
2 Proyectos Supabase:
  P1 (yole-auth)     → auth + identidad  →lustmqeqbninkavixttz
  P2 (yole-business) → datos comerciales →lqwyidsixjzjffwtrltw

Cada usuario vive en UN proyecto. El admin tiene cuenta espejo en P2.
La sesión del cliente SIEMPRE consulta su proyecto asignado.
```

---

## 📱 PÁGINA POR PÁGINA

### 1. `/` (Inicio / Dashboard del Gestor)
**Componente:** `GestorDashboard.tsx`
| Dato | Fuente | Método | Nota |
|------|--------|--------|------|
| Pedidos totales | P1 o P2 | `rpc("get_gestor_dashboard")` | ✅ fixed snake_case |
| Pedidos pendientes | P1 o P2 | mismo RPC | ✅ fixed |
| Pedidos vendidos | P1 o P2 | mismo RPC | ✅ fixed |
| Saldo | P1 o P2 | mismo RPC | ✅ fixed |
| Perfil (nombre, rol, estado) | sesión | `useSession()` | ✅ |

> Si es admin → redirige a `/admin`

### 2. `/admin` (Panel Admin)
**Componente:** `admin/page.tsx`
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| KPIs (usuarios, pedidos, retiros) | P1 + P2 | `rpc("get_admin_dashboard")` x2 | ⚠️ cuenta admins en "Usuarios" |
| Lista de gestores | P1 + P2 | `.from("profiles").neq("role","admin")` | ⚠️ P2 sin paginación cursor |
| Solicitudes de retiro | P1 | `.from("payout_requests")` | ⚠️ solo P1, falta P2 |
| Árbol comercial | P1 | `CommercialTree` → `.from("profiles")` | 🔴 solo P1 |
| Analytics | P1 | `.from("orders"/"profiles"/"wallet_entries")` | 🔴 solo P1 |
| Editar billetera gestor | P1 | `rpc("get_wallet_full")` | ⚠️ solo P1 |

**BUG "6 vs 4":** `total_users` = 6 (P1: 4 perfiles, P2: 2 perfiles). Pero 2 son admins (no gestores). La lista filtra admins → muestra 4. **Es correcto pero confuso.**

### 3. `/profile` (Perfil)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Datos personales | sesión | `useSession()` profile | ✅ |
| Tab Wallet: saldo/comisiones | P1 | `manager_wallet_summary` (VIEW) | ✅ |
| Tab Orders: pedidos | P1 | `.from("orders").eq("manager_id")` | ✅ |
| Tab Network: stats | P1 | `rpc("get_network_stats")` | ⚠️ solo P1 |
| Tab Network: descendientes | P1 | `rpc("get_descendants")` | ⚠️ solo P1 |

**BUG "3 usuarios":** `get_network_stats` solo cuenta P1. Admin ve 3 gestores en P1 (correcto) pero no los de P2.

### 4. `/network` (Árbol Comercial)
**Componente:** `CommercialTree.tsx` + `useNetworkTree.ts`
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Árbol jerárquico | P1 | `.from("profiles")` (admin) o `rpc("get_descendants")` (gestor) | 🔴 solo P1 |
| Stats red | P1 | `rpc("get_network_stats")` | 🔴 solo P1 |
| Detalle de nodo | P1 | `.from("profiles"/"orders"/"wallet_entries")` | 🔴 solo P1 |

### 5. `/orders` (Lista de Pedidos)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Lista de pedidos | P1 o P2 | `.from("orders").eq("manager_id")` infinite | ✅ |
| Filtro por estado | — | cliente-side | ✅ |

### 6. `/orders/new` (Nuevo Pedido)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Ancestros (cadena) | P1 o P2 | `rpc("get_ancestors")` | ✅ |
| Márgenes calculados | P1 o P2 | `rpc("calculate_margins")` | ✅ |
| Insertar pedido | P1 o P2 | `.from("orders").insert()` | ✅ |
| Subir imágenes | P1 o P2 | `storage.from("order-images")` | ✅ |

### 7. `/orders/[id]` (Detalle de Pedido)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Pedido + imágenes | P1 o P2 | `.from("orders").select("*, order_images(*)")` | ✅ |
| URL de imágenes | P1 o P2 | `storage.getPublicUrl()` | ✅ |
| Cambiar estado | P1 o P2 | `.from("orders").update()` | ✅ |

### 8. `/wallet` (Billetera)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Balances multi-moneda | P1 o P2 | `rpc("get_wallet_full")` | ✅ |
| Movimientos | P1 o P2 | incluido en el RPC | ✅ |
| Solicitar retiro | P1 o P2 | `.from("payout_requests").insert()` | ✅ |

### 9. `/chat` (Chat)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Conversaciones | P1 o P2 | `rpc("get_chat_overview")` | ✅ fixed guard |
| Mensajes | P1 o P2 | `.from("messages").eq("conversation_id")` | ✅ fixed RLS |
| Contactos | P1 o P2 | `.from("profiles")` + `rpc("get_descendants")` | ✅ |

### 10. `/notifications` (Notificaciones)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Lista de notificaciones | P1 o P2 | `.from("notifications").eq("user_id")` | ✅ |
| Marcar leída | P1 o P2 | `.from("notifications").update()` | ✅ |

### 11. `/settings` (Ajustes)
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Tema (claro/oscuro) | localStorage | `next-themes` | ⚠️ ver issue tema |
| Logout | — | `client.auth.signOut()` | ✅ |

### 12. `/login`, `/register`, `/welcome`
| Dato | Fuente | Método | Estado |
|------|--------|--------|--------|
| Login round-robin | ambos | busca en P1 y P2 | ✅ |
| Registro round-robin | ambos | counter + signUp | ✅ fixed unique |

---

## 🔴 PROBLEMAS DETECTADOS (priorizados)

| # | Problema | Páginas | Severidad | Estado |
|---|----------|---------|-----------|--------|
| BUG-1 | "6 usuarios" confuso — KPI cuenta admins | /admin | 🟡 UX | ✅ FIXED |
| BUG-2 | Árbol comercial solo P1 (no ve P2) | /admin, /network | 🔴 datos | ✅ FIXED |
| BUG-3 | Profile/Network stats solo P1 | /profile | 🟡 datos | ✅ FIXED |
| BUG-4 | Tema oscuro: botones grises | todas | 🔴 visual | ✅ FIXED |
| BUG-5 | AdminAnalytics solo P1 | /admin | 🟡 datos | ✅ FIXED |
| BUG-6 | Retiros del admin solo P1 | /admin | 🟡 datos | ✅ FIXED |

---

## ✅ TODOS LOS BUGS RESUELTOS (commit e6559f6)

| Bug | Fix |
|-----|-----|
| BUG-1 KPI confuso | RPC devuelve total_gestores; label = "Gestores" |
| BUG-2 Árbol sin P2 | CommercialTree mergea perfiles P1+P2 para admin |
| BUG-3 Profile sin P2 | TabNetwork mergea stats+descendientes de ambos |
| BUG-4 Tema oscuro | @custom-variant dark en globals.css (Tailwind 4) |
| BUG-5 Analytics sin P2 | AdminAnalytics mergea orders/wallets/gestores P1+P2 |
| BUG-6 Retiros sin P2 | Payouts query incluye P2 cross-project |

### ✅ Todo funcionando:
- Login/Registro round-robin (ambos proyectos)
- Dashboard del gestor (pedidos, saldo)
- Panel admin unificado: KPIs, gestores, árbol, analytics, retiros (P1+P2)
- Árbol comercial cross-project (admin ve Marian)
- Perfil cross-project (admin ve stats de ambos)
- Lista de pedidos + detalle + imágenes
- Wallet multi-moneda (CUP/USD/CUP-Transf)
- Chat (mensajes, conversaciones)
- Notificaciones
- Tema oscuro funcional

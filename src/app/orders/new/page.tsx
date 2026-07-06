"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, invalidate } from "@/hooks";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { logger } from "@/lib/logger";
import {
  ArrowLeft, Package, DollarSign, User, Phone, MapPin,
  Truck, Clock, FileText, Loader2, CheckCircle2,
  Image as ImageIcon, X, Upload,
} from "lucide-react";
import {
  processImageForUpload,
  revokePreviewUrl,
  type ProcessedImage,
} from "@/lib/imageProcessor";

export default function NewOrderPage() {
  return (
    <AuthGate>
      <MainLayout>
        <NewOrderContent />
      </MainLayout>
    </AuthGate>
  );
}

function NewOrderContent() {
  const { user, client, project, profile, isActive } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const MAX_IMAGES = 10;

  const [form, setForm] = useState({
    product_name: "",
    base_price: "",
    sale_price: "",
    size: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    delivery_price: "",
    delivery_time: "",
    payment_type: "transferencia",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { setError("Máximo 10 imágenes por pedido"); return; }
    const selectedFiles = Array.from(files).slice(0, remaining);
    setProcessingImages(true);
    setError(null);
    try {
      const processed: ProcessedImage[] = [];
      // Allowed MIME types — strict validation (no SVG to prevent XSS)
      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
      for (const file of selectedFiles) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          setError(`Tipo de archivo no permitido: ${file.type || "desconocido"}. Solo JPG, PNG y WebP.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) { setError("Cada imagen debe ser menor a 10MB"); continue; }
        const result = await processImageForUpload(file);
        processed.push(result);
      }
      setImages((prev) => [...prev, ...processed].slice(0, MAX_IMAGES));
    } catch (err: any) {
      setError("Error procesando imágenes: " + (err.message || "desconocido"));
    } finally {
      setProcessingImages(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const img = prev[index];
      if (img) revokePreviewUrl(img.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => { images.forEach((img) => revokePreviewUrl(img.previewUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!user || !client || !project) return;
    if (!form.product_name.trim()) { setError("El nombre del producto es obligatorio"); return; }
    if (!form.base_price || Number(form.base_price) <= 0) { setError("El precio base debe ser mayor a 0"); return; }
    if (!form.sale_price || Number(form.sale_price) <= 0) { setError("El precio de venta debe ser mayor a 0"); return; }
    if (!form.customer_name.trim()) { setError("El nombre del cliente es obligatorio"); return; }
    if (!form.customer_phone.trim()) { setError("El teléfono del cliente es obligatorio"); return; }
    if (!form.customer_address.trim()) { setError("La dirección del cliente es obligatoria"); return; }

    setError(null);
    setLoading(true);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      // Crear el pedido (con .select para obtener ID)
      const { data: orderData, error: insertError } = await supabase.from("orders").insert([{
        manager_id: user.id,
        product_name: form.product_name.trim(),
        base_price: Number(form.base_price),
        sale_price: Number(form.sale_price),
        size: form.size.trim() || null,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: form.customer_address.trim(),
        delivery_price: Number(form.delivery_price) || 0,
        delivery_time: form.delivery_time.trim() || null,
        payment_type: form.payment_type,
        notes: form.notes.trim() || null,
        status: "pending",
      }]).select("id");

      if (insertError) {
        setError("Error al crear pedido: " + insertError.message);
        logger.error("order_create_failed", { error: insertError.message });
        return;
      }

      // Subir imágenes a Storage
      if (images.length > 0 && orderData?.[0]?.id) {
        const orderId = orderData[0].id;
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const fileName = `${orderId}/${Date.now()}-${i}.webp`;
          const { error: uploadError } = await supabase.storage
            .from("order-images")
            .upload(fileName, img.file, { contentType: "image/webp", upsert: false });
          if (uploadError) {
            logger.error("order_image_upload_failed", { orderId: orderData[0].id, error: uploadError.message });
            continue;
          }
          await supabase.from("order_images").insert([{
            order_id: orderId,
            storage_path: fileName,
            sort_order: i,
            mime_type: "image/webp",
            width: img.width,
            height: img.height,
            size_kb: img.sizeKb,
          }]);
        }
      }

      // Invalidar queries afectadas para que se refresquen
      const uid = user.id;
      invalidate.orders(queryClient, uid);
      invalidate.gestorDashboard(queryClient, uid);
      invalidate.gestorAnalytics(queryClient, uid);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Cuenta no activa</h2>
        <p className="text-sm text-muted-foreground">Tu cuenta debe estar activa para crear pedidos.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary font-bold text-sm">Volver</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">¡Pedido creado!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          El pedido de <strong>{form.product_name}</strong> fue registrado. El admin será notificado.
        </p>
        <div className="flex gap-3">
          <button onClick={() => { setSuccess(false); setForm({ product_name: "", base_price: "", sale_price: "", size: "", customer_name: "", customer_phone: "", customer_address: "", delivery_price: "", delivery_time: "", payment_type: "transferencia", notes: "" }); setImages([]); }} className="px-6 py-3 card-filled rounded-2xl font-bold text-sm">Otro pedido</button>
          <button onClick={() => router.push("/orders")} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-sm">Ver pedidos</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-2xl card-filled"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold">Nuevo pedido</h1>
          <p className="text-xs text-muted-foreground">Registra un pedido de cliente</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        {/* Producto */}
        <div className="card-filled rounded-[20px] p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Producto</h3>
          <InputField label="Nombre del producto" placeholder="Ej: Zapatos Nike Air Max" value={form.product_name} onChange={(v) => handleChange("product_name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Precio base ($)" type="number" placeholder="0.00" value={form.base_price} onChange={(v) => handleChange("base_price", v)} icon={DollarSign} />
            <InputField label="Precio de venta ($)" type="number" placeholder="0.00" value={form.sale_price} onChange={(v) => handleChange("sale_price", v)} icon={DollarSign} />
          </div>
          <InputField label="Talla (opcional)" placeholder="Ej: 42, M, Grande" value={form.size} onChange={(v) => handleChange("size", v)} />
        </div>

        {/* Cliente */}
        <div className="card-filled rounded-[20px] p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Cliente</h3>
          <InputField label="Nombre del cliente" placeholder="Nombre completo" value={form.customer_name} onChange={(v) => handleChange("customer_name", v)} />
          <InputField label="Teléfono" placeholder="+53 5 1234567" value={form.customer_phone} onChange={(v) => handleChange("customer_phone", v)} icon={Phone} />
          <InputField label="Dirección" placeholder="Calle, #, Municipio, Provincia" value={form.customer_address} onChange={(v) => handleChange("customer_address", v)} icon={MapPin} />
        </div>

        {/* Entrega y Pago */}
        <div className="card-filled rounded-[20px] p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Entrega y Pago</h3>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Precio entrega ($)" type="number" placeholder="0.00" value={form.delivery_price} onChange={(v) => handleChange("delivery_price", v)} />
            <InputField label="Tiempo est." placeholder="Ej: 3-5 días" value={form.delivery_time} onChange={(v) => handleChange("delivery_time", v)} icon={Clock} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {(["transferencia", "efectivo", "zelle", "otro"] as const).map((type) => (
                <button key={type} type="button" onClick={() => handleChange("payment_type", type)}
                  className={`py-2.5 rounded-[14px] text-xs font-bold transition-all ${form.payment_type === type ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-glow" : "card-filled text-muted-foreground"}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1">Notas (opcional)</label>
            <textarea placeholder="Observaciones sobre el pedido..." value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={3}
              className="w-full card-filled border border-border/40 rounded-2xl px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none" />
          </div>
        </div>

        {/* Imágenes */}
        <div className="card-filled rounded-[20px] p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Imágenes ({images.length}/{MAX_IMAGES})
          </h3>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-accent group">
                  <img src={img.previewUrl} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{img.sizeKb}KB</span>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Añadir</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" disabled={processingImages} />
                </label>
              )}
            </div>
          )}

          {images.length === 0 && (
            <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 transition-colors">
              {processingImages ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Toca para añadir fotos del producto</p>
                  <p className="text-[10px] text-muted-foreground/50">Máximo 10 imágenes · Se comprimen automáticamente</p>
                </>
              )}
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" disabled={processingImages} />
            </label>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
            <p className="text-sm text-red-700 dark:text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-[20px] font-bold text-base text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 shadow-glow disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando pedido...</> : <><Package className="w-5 h-5" /> Crear pedido</>}
        </motion.button>
      </motion.div>
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, type = "text", icon: Icon }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold pl-1">{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2"><Icon className="w-4 h-4 text-muted-foreground" /></div>}
        <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full card-filled border border-border/40 rounded-2xl py-3 ${Icon ? "pl-10" : "px-4"} pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition`} />
      </div>
    </div>
  );
}
